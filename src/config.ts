import type { UrlConfig } from "./authGuard";
import type { tokenSchema, userSchema } from "./db/shema";
import type { BaseUser, DrizzleConfig } from "./types";

/**
 * ORM 配置选项
 * @template TUser 用户类型
 * @template TUsersSchema 用户表模式类型
 * @template TTokensSchema 令牌表模式类型
 */
export interface ORMOptions<
	TUser extends BaseUser,
	TUsersSchema = typeof userSchema,
	TTokensSchema = typeof tokenSchema,
> {
	/** Drizzle ORM 配置 */
	drizzle: DrizzleConfig<TUsersSchema, TTokensSchema>;

	/** 令牌获取配置 */
	getTokenFrom: GetTokenOptions;

	// 可选配置
	/** 公开URL配置，不需要认证的路由 */
	PublicUrlConfig?: UrlConfig[];

	/** 用户自定义验证函数 */
	userValidation?: (user: TUser) => void | Promise<void>;

	/** 是否仅在JWT中验证访问令牌（不查数据库） */
	verifyAccessTokenOnlyInJWT?: boolean;

	/** 路由前缀 */
	prefix?: string;

	/** JWT 签名密钥 */
	jwtSecret?: string;

	/** Cookie 签名密钥 */
	cookieSecret?: string;
}

/**
 * Token 获取配置选项
 * 支持三种获取方式：header、cookie、query
 */
export interface GetTokenOptions {
	/** 从哪里获取 token */
	from: "header" | "cookie" | "query";

	/** Cookie 名称，默认 'authorization' */
	cookieName?: string;

	/** Header 名称，默认 'authorization' */
	headerName?: string;

	/** Query 参数名称，默认 'access_token' */
	queryName?: string;
}
