
import type { PgTableWithColumns } from "drizzle-orm/pg-core";
import type { UrlConfig } from "./currentUrlAndMethodIsAllowed";
import type { tokenSchema, userSchema } from "./db/shema";

export type ORMOptions<
  TUser,
  TUsersSchema extends any = typeof userSchema,
  TTokensSchema extends any = typeof tokenSchema
> = {
  drizzle: {
    db: any;
    usersSchema: TUsersSchema;
    tokensSchema: TTokensSchema;
  };
  getTokenFrom: GetTokenOptions;

  // 可选配置
  PublicUrlConfig?: UrlConfig[];
  userValidation?: (user: TUser) => void | Promise<void>;
  verifyAccessTokenOnlyInJWT?: boolean;
  prefix?: string;
  jwtSecret?: string;
  cookieSecret?: string;
};

/**
 * Token 获取配置选项
 * cookie  直接
 * only-cookie 把jwt 装到cookie 签名
 */
export interface GetTokenOptions {
  // 优先级配置：指定从哪里获取 token
  from: "header" | "cookie" | "query";
  // 可选的自定义字段名
  cookieName?: string; // 默认 'authorization'
  headerName?: string; // 默认 'authorization'
  queryName?: string; // 默认 'access_token'
}
