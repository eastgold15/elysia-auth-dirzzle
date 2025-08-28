import type { UrlConfig } from "./authGuard";
import type { User } from "./types";

/**
 * ORM 配置选项
 * @template TUsersSchema 用户表模式类型
 * @template TTokensSchema 令牌表模式类型
 */
export interface ORMOptions<TUsersSchema, TTokensSchema> {
	/** Drizzle ORM 配置 */
	drizzle: {
		db: any;
		usersSchema: TUsersSchema;
		tokensSchema: TTokensSchema;
	};

	/** 令牌获取配置 */
	getTokenFrom: GetTokenOptions;

	// 可选配置
	/** 公开URL配置，不需要认证的路由 */
	PublicUrlConfig?: UrlConfig[];

	/** 用户自定义验证函数 */
	userValidation?: (user: User) => void | Promise<void>;

	/** 是否仅在JWT中验证访问令牌（不查数据库） */
	verifyAccessTokenOnlyInJWT?: boolean;

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
