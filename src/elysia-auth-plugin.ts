/* eslint-disable @typescript-eslint/ban-ts-comment */
import { eq } from 'drizzle-orm';
import { Cookie, Elysia } from 'elysia';
import { verify } from 'jsonwebtoken';
import { Unauthorized } from 'unify-errors';


import { HTTPMethods, UrlConfig } from './currentUrlAndMethodIsAllowed.type';
import { currentUrlAndMethodIsAllowed } from './currentUrlAndMethodIsAllowed';

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

// 插件配置项类型，T为用户类型
export interface Options<T> {
  jwtSecret: string; // JWT密钥
  cookieSecret?: string; // cookie签名密钥
  drizzle: {
    //@ts-ignore
    db; // drizzle-orm数据库实例
    //@ts-ignore
    tokensSchema?; // token表schema
    //@ts-ignore
    usersSchema; // 用户表schema
  };
  config?: UrlConfig[]; // 公开页面配置
  userValidation?: (user: T) => void | Promise<void>; // 自定义用户校验
  verifyAccessTokenOnlyInJWT?: boolean; // 是否只校验JWT，不查数据库
  prefix?: string; // 路由前缀
}

/**
 * 从请求中提取 accessToken，支持 cookie、query、header
 * @param req 请求对象
 * @param cookieSecret cookie签名密钥
 */
export const getAccessTokenFromRequest = async (
  req: {
    cookie?: Record<string, Cookie<string | undefined>>;
    query?: Record<string, string | undefined>;
    headers: Record<string, string | undefined>;
  },
  cookieSecret?: string,
) => {
  let token: string | undefined;

  // 优先从 cookie 里取
  if (
    req.cookie &&
    req.cookie['authorization'] &&
    req.cookie['authorization'].value
  ) {
    if (cookieSecret) {
      const result = await unsignCookie(
        req.cookie['authorization'].value,
        cookieSecret,
      );

      if (result === false) {
        throw new Unauthorized({
          error: 'Token is not valid',
        });
      } else {
        token = result;
      }
    } else {
      token = req.cookie['authorization'].value;
    }
  }

  // 其次从 query 里取
  if ((req.query as { access_token: string }).access_token) {
    token = (req.query as { access_token: string }).access_token;
  }

  // 最后从 header 里取
  if (req.headers.authorization) {
    token = (req.headers.authorization as string).trim().split(' ')[1];
  }

  return token;
};

/**
 * 校验 token 是否有效，支持 JWT 校验和数据库校验
 * @param options 插件配置
 * @param currentUrl 当前请求url
 * @param currentMethod 当前请求方法
 * @param cookieManager cookie管理器
 * @returns 校验通过返回用户和登录态，否则抛出异常或返回void
 */
export const checkTokenValidity =
  <T>(
    options: Options<T>,
    currentUrl: string,
    currentMethod: HTTPMethods,
    cookieManager: { [x: string]: { remove: () => void } },
  ) =>
    async (
      tokenValue?: string,
    ): Promise<{ connectedUser: T; isConnected: true } | void> => {
      // 检查 token 是否存在
      if (tokenValue) {
        let userId;

        try {
          // 先用 JWT 校验 token
          const tokenData = verify(tokenValue, options.jwtSecret);

          // 如果需要查数据库，进一步校验 token 是否有效
          if (!options.verifyAccessTokenOnlyInJWT) {
            const result = await options.drizzle.db
              .select()
              .from(options.drizzle.tokensSchema)
              .where(eq(options.drizzle.tokensSchema.accessToken, tokenValue))
              .limit(1);

            if (result.length !== 1) {
              throw 'Token not valid in DB';
            } else {
              userId = result[0].ownerId;
            }
          } else {
            //@ts-ignore
            userId = tokenData.id;
          }
        } catch (error) {
          // token 校验失败，且不是公开页面则抛出未授权
          if (
            !currentUrlAndMethodIsAllowed(
              currentUrl,
              currentMethod as HTTPMethods,
              options.config!,
            )
          ) {
            if (cookieManager && cookieManager['authorization']) {
              cookieManager['authorization'].remove();
            }

            throw new Unauthorized({
              error: 'Token is not valid',
            });
          }

          return;
        }

        // 查找用户信息
        const result = await options.drizzle.db
          .select()
          .from(options.drizzle.usersSchema)
          .where(eq(options.drizzle.usersSchema.id, userId))
          .limit(1);

        const user = result[0];

        // 可选的自定义用户校验
        options.userValidation && (await options.userValidation(user));

        return {
          connectedUser: user as T,
          isConnected: true,
        };
      }
    };

/**
 * Elysia 插件主入口，自动注入 isConnected/connectedUser 到 context
 * @param userOptions 插件配置
 */
export const elysiaAuthDrizzlePlugin = <T>(userOptions?: Options<T>) => {
  // 默认配置
  const defaultOptions: Omit<
    Required<Options<T>>,
    'jwtSecret' | 'cookieSecret' | 'drizzle' | 'prefix'
  > = {
    config: [],
    userValidation: () => { },
    verifyAccessTokenOnlyInJWT: false,
  };

  // 合并用户配置和默认配置
  const options = {
    ...defaultOptions,
    ...userOptions,
  } as Required<Options<T>>;

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

      // 提取 token
      //@ts-ignore
      const tokenValue: string | undefined = await getAccessTokenFromRequest(
        req,
        options?.cookieSecret,
      );

      // 校验 token
      const res = await checkTokenValidity<T>(
        options as Options<T>,
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
        (options.prefix ? req.url.startsWith(options.prefix) : true) &&
        !currentUrlAndMethodIsAllowed(
          req.url,
          req.method as HTTPMethods,
          options.config!,
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
