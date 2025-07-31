/**
 * Elysia Auth Drizzle Plugin
 * 基于Elysia框架的身份验证插件，使用Drizzle ORM进行数据库操作
 *
 * @description 提供完整的身份验证解决方案，包括JWT令牌管理、用户验证、权限控制等功能
 * @author 原作者改版而来
 * @version 1.0.0
 */

import type Elysia from "elysia";
import { Unauthorized } from "unify-errors";
import type { ORMOptions } from "./config";
import { currentUrlAndMethodIsAllowed, type HTTPMethods } from "./currentUrlAndMethodIsAllowed";

import type { tokenSchema, userSchema } from "./db/shema";
import {
  checkTokenValidity,
  getAccessTokenFromRequest,
} from "./elysia-auth-plugin";

// === 辅助函数导出 ===
export { currentUrlAndMethodIsAllowed } from "./currentUrlAndMethodIsAllowed";
// === 核心插件导出 ===
export {
  checkTokenValidity,
  getAccessTokenFromRequest,
  signCookie,
  unsignCookie,
} from "./elysia-auth-plugin";
// === 工具函数导出 ===
export {
  createUserToken,
  refreshUserToken,
  removeAllUserTokens,
  removeUserToken,
} from "./utils";

/**
 * Elysia 插件主入口，自动注入 isConnected/connectedUser 到 context
 * @param ORMOptions 插件配置
 */
export const elysiaAuthDrizzlePlugin = <
  TUser = typeof userSchema.$inferSelect,
  TUserSchema extends typeof userSchema = typeof userSchema,
  TTokenSchema extends typeof tokenSchema = typeof tokenSchema,
>(
  ORMOptions: ORMOptions<TUser, TUserSchema, TTokenSchema>,
) => {
  // 拿到必选
  const { drizzle, getTokenFrom } = ORMOptions;

  // 给可选加上默认值
  const PublicUrlConfig = ORMOptions?.PublicUrlConfig ?? [
    { url: "*/login", method: "POST" },
    { url: "*/register", method: "POST" },
  ];
  const userValidation =
    ORMOptions?.userValidation ?? ORMOptions.userValidation;
  /**
   * 校验token是否只在JWT中校验，默认false
   */
  const verifyAccessTokenOnlyInJWT =
    ORMOptions?.verifyAccessTokenOnlyInJWT ?? false;
  /**
   *  插件路由前缀，默认/api/auth
   */
  const prefix = ORMOptions?.prefix ?? "/api/auth";
  //
  let jwtSecret = "";
  let cookieSecret = "";

  // 没有 jwtSecret 则打印
  if (!ORMOptions.jwtSecret || !ORMOptions.cookieSecret) {
    console.log(
      "elysia-auth-drizzle-plugin: jwtSecret or cookieSecret is not defined",
    );
  }
  // 根据getTokenFrom的form， 确定Secret的类型
  switch (getTokenFrom.from) {
    case "header":
      jwtSecret = ORMOptions?.jwtSecret || "jwtSecret";
      break;
    case "cookie":
      cookieSecret = ORMOptions?.cookieSecret || "cookieSecret";
      jwtSecret = ORMOptions?.jwtSecret || "jwtSecret";
      break;
    case "query":
      jwtSecret = ORMOptions?.jwtSecret || "jwtSecret";
      break;
    default:
      break;
  }

  // const plugin = new Elysia({ name: 'elysia-auth-drizzle' })

  // 注册 derive 钩子，自动注入登录态和用户信息
  return async (app: Elysia) => {
    app.derive(
      { as: "global" },
      async ({ headers, query, cookie, request }) => {
        // 是否已登录
        let isConnected = false;
        // 登录用户
        let connectedUser: TUser | undefined;

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
        const res = await checkTokenValidity<TUser, TUserSchema, TTokenSchema>(
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
            PublicUrlConfig,
          )
        ) {
          throw new Unauthorized({
            error: "Page is not public",
          });
        }
        // 注入 context
        return {
          isConnected,
          connectedUser,
        };
      },
    );

    return app;
  };
};
