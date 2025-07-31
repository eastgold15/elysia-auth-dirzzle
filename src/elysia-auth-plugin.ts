/* eslint-disable @typescript-eslint/ban-ts-comment */
import { eq } from 'drizzle-orm';
import { Cookie, Elysia } from 'elysia';
import { verify } from 'jsonwebtoken';
import { Unauthorized } from 'unify-errors';


import { currentUrlAndMethodIsAllowed } from './currentUrlAndMethodIsAllowed';
import { HTTPMethods, UrlConfig } from './currentUrlAndMethodIsAllowed.type';

// REF: https://github.com/elysiajs/elysia/blob/main/src/utils.ts
const encoder = new TextEncoder();
// 移除 base64 字符串末尾的等号
function removeTrailingEquals(digest: string): string {
  let trimmedDigest = digest;
  while (trimmedDigest.endsWith('=')) {
    trimmedDigest = trimmedDigest.slice(0, -1);
  }
  return trimmedDigest;
}

/**
 * 对 cookie 值进行 HMAC-SHA256 签名，防止被伪造
 * @param val cookie值
 * @param secret 签名密钥
 */
export const signCookie = async (val: string, secret: string | null) => {
  if (typeof val !== 'string')
    throw new TypeError('Cookie value must be provided as a string.');

  if (secret === null) throw new TypeError('Secret key must be provided.');

  const secretKey = await crypto.subtle.importKey(
    'raw',
    encoder.encode(secret),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign'],
  );
  const hmacBuffer = await crypto.subtle.sign(
    'HMAC',
    secretKey,
    encoder.encode(val),
  );

  return (
    val + '.' + removeTrailingEquals(Buffer.from(hmacBuffer).toString('base64'))
  );
};


/**
 * 校验 cookie 签名是否正确
 * @param input 签名后的cookie字符串
 * @param secret 签名密钥
 * @returns 验证通过返回原值，否则返回false
 */
export const unsignCookie = async (input: string, secret: string | null) => {
  if (typeof input !== 'string')
    throw new TypeError('Signed cookie string must be provided.');

  if (null === secret) throw new TypeError('Secret key must be provided.');

  const tentativeValue = input.slice(0, input.lastIndexOf('.'));
  const expectedInput = await signCookie(tentativeValue, secret);

  return expectedInput === input ? tentativeValue : false;
};




/**
 * 从请求中提取 accessToken，支持按配置惰性获取
 * @param req 请求对象
 * @param options 获取配置选项
 */
export const getAccessTokenFromRequest = async (
  req: {
    cookie?: Record<string, Cookie<string | undefined>>;
    query?: Record<string, string | undefined>;
    headers: Record<string, string | undefined>;
  },
  getTokenFrom: GetTokenOptions,
  cookieSecret: string,
): Promise<string | undefined> => {


  const {
    from = 'header', // 默认从 header 获取
    cookieName = 'authorization',
    headerName = 'authorization',
    queryName = 'access_token',
  } = getTokenFrom;

  switch (from) {
    case 'header': {
      const authHeader = req.headers[headerName];
      if (!authHeader) {
        break; // 如果是 'header'，继续往下看其它 case（但其实后面我们直接 return，可以优化）
      }

      const parts = authHeader.trim().split(' ');
      if (parts.length === 2 && parts[0]!.toLowerCase() === 'bearer') {
        return parts[1]; // Bearer <token> → 返回未解密的 bearer token
      }

      // 如果不是 Bearer，直接返回原始 header 值（未解密）
      return authHeader.trim();
    }

    case 'cookie': {
      const cookie = req.cookie?.[cookieName];
      if (!cookie?.value) {
        break;
      }
      if (cookieSecret) {
        const result = await unsignCookie(cookie.value, cookieSecret);
        if (result === false) {
          throw new Unauthorized({
            error: 'Invalid or tampered token in cookie',
          });
        }
        return result; // ✅ 返回解密后的 token
      } else {
        return cookie.value; // ✅ 直接返回未加密的 token
      }
    }
    case 'query':
      {
        const queryToken = req.query?.[queryName];
        if (!queryToken) {

          break;
        }
        return queryToken; // ✅ 直接返回 query 中的 token（未解密）
      }
    default:
      // 未知的 from 值，返回 undefined
      console.log("getAccessTokenFromRequest: 未知的 from 值，返回 undefined");
      return undefined;
  }

};

/**
 * 校验 token 是否有效，支持 JWT 校验和数据库校验
 * @param options 插件配置
 * @param currentUrl 当前请求url
 * @param currentMethod 当前请求方法
 * @param cookieManager cookie管理器
 * @returns 校验通过返回用户和登录态，否则抛出异常或返回void
 */
export const checkTokenValidity = <T>(
  jwtSecret: string,
  verifyAccessTokenOnlyInJWT: boolean,
  drizzle: ORMOptions<T>['drizzle'],
  userValidation: ORMOptions<T>['userValidation'],
  publicUrlConfig: UrlConfig[],
  currentUrl: string,
  currentMethod: HTTPMethods,
  cookieManager: { [x: string]: { remove: () => void } },
) =>
  async (
    tokenValue?: string,
  ): Promise<{ connectedUser: T; isConnected: true } | void> => {
    // 检查 token 是否存在
    if (!tokenValue) {
      // 如果没有 token，且是公开路由，可以继续；否则应该已经由上层控制
      return
    }

    let userId: number;


    try {
      // 先用 JWT 校验 token
      const tokenData = verify(tokenValue, jwtSecret);
      // 如果需要查数据库，进一步校验 token 是否有效
      if (!verifyAccessTokenOnlyInJWT) {
        const result = await drizzle.db
          .select()
          .from(drizzle.tokensSchema)
          .where(eq(drizzle.tokensSchema.accessToken, tokenValue))
          .limit(1);

        if (!result[0]?.ownerId) {
          throw 'Token not valid in DB';
        } else {
          userId = result[0].ownerId;
        }
      }
      else {

        // 3. 如果信任 JWT，直接从 payload 中取 id
        if (typeof tokenData !== 'object' || !tokenData?.id) {
          throw new Error('Invalid JWT payload: missing id');
        }
        userId = Number(tokenData.id); // ✅ 确保是 number 类型


      }
    } catch (error) {
      // 4. 校验失败处理
      const isPublicPage = publicUrlConfig.some(
        (config) => config.url === currentUrl && config.method === currentMethod
      );

      if (!isPublicPage) {
        const authCookie = cookieManager?.['authorization'];
        authCookie?.remove();

        throw new Unauthorized({
          error: 'Token is not valid',
        });
      }

      // 如果是公开路由，直接返回，不查询用户
      return;
    }


    // 查找用户信息
    const userResult = await drizzle.db
      .select()
      .from(drizzle.usersSchema)
      .where(eq(drizzle.usersSchema.id, userId))
      .limit(1);

    const user = userResult[0];
    if (!user) {
      throw new Unauthorized({
        error: 'User not found',
      });
    }

    // 可选的自定义用户校验
    userValidation && (await userValidation(user as T));

    return {
      connectedUser: user as T,
      isConnected: true,
    };
  }





import { GetTokenOptions, ORMOptions } from './config';
import { userSchema } from './db/shema';





/**
 * Elysia 插件主入口，自动注入 isConnected/connectedUser 到 context
 * @param ORMOptions 插件配置
 */
export const elysiaAuthDrizzlePlugin = <T extends typeof userSchema.$inferSelect>(ORMOptions: ORMOptions<T>) => {

  // 拿到必选
  const { drizzle, getTokenFrom } = ORMOptions;

  // 给可选加上默认值
  const PublicUrlConfig = ORMOptions?.PublicUrlConfig ?? [{ url: '*/login', method: 'POST' }, { url: '*/register', method: 'POST' }];
  const userValidation = ORMOptions?.userValidation ?? ORMOptions['userValidation']
  /**
   * 校验token是否只在JWT中校验，默认false
   */
  const verifyAccessTokenOnlyInJWT = ORMOptions?.verifyAccessTokenOnlyInJWT ?? false;
  /**
   *  插件路由前缀，默认/api/auth
   */
  const prefix = ORMOptions?.prefix ?? '/api/auth';
  // 
  let jwtSecret = '';
  let cookieSecret = '';


  // 没有 jwtSecret 则打印
  if (!ORMOptions.jwtSecret || !ORMOptions.cookieSecret) {
    console.log('elysia-auth-drizzle-plugin: jwtSecret or cookieSecret is not defined');
  }
  // 根据getTokenFrom的form， 确定Secret的类型
  switch (getTokenFrom.from) {
    case 'header':
      jwtSecret = ORMOptions?.jwtSecret || 'jwtSecret';
      break;
    case 'cookie':
      cookieSecret = ORMOptions?.cookieSecret || 'cookieSecret';
      jwtSecret = ORMOptions?.jwtSecret || 'jwtSecret';
      break;
    case 'query':
      jwtSecret = ORMOptions?.jwtSecret || 'jwtSecret';
      break;
    default:
      break;
  }
  // 注册 derive 钩子，自动注入登录态和用户信息
  return new Elysia({ name: 'elysia-auth-drizzle' }).derive(
    { as: 'global' },
    async ({ headers, query, cookie, request }) => {
      // 是否已登录
      let isConnected = false;
      // 登录用户
      let connectedUser: T | undefined;

      // 组装请求对象
      const req = {
        headers,
        query,
        cookie,
        url: new URL(request.url).pathname,
        method: request.method as HTTPMethods,
      };

      // 根据getTokenFrom的值来结合惰性函数， 获取提取token的逻辑

      // 提取 token
      const tokenValue: string | undefined = await getAccessTokenFromRequest(
        req,
        getTokenFrom,
        cookieSecret,
      );

      // 校验 token
      const res = await checkTokenValidity<T>(
        jwtSecret,
        verifyAccessTokenOnlyInJWT,
        drizzle,
        userValidation,
        PublicUrlConfig,
        req.url,
        req.method,
        req.cookie,
      )(tokenValue);

      if (res) {
        connectedUser = res.connectedUser;
        isConnected = res.isConnected;
      }


      // 如果未登录且不是公开页面，抛出未授权
      if (
        !isConnected &&
        (prefix ? req.url.startsWith(prefix) : true) &&
        !currentUrlAndMethodIsAllowed(
          req.url,
          req.method as HTTPMethods,
          PublicUrlConfig!,
        )
      ) {
        throw new Unauthorized({
          error: 'Page is not public',
        });
      }
      // 注入 context
      return {
        isConnected,
        connectedUser,
      };
    },
  );

};
