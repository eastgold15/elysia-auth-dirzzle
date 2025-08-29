/**
 * 类型定义文件
 * any 大法，数据库使用具体类型太麻烦了，一定要使用any
 */

/**
 * 令牌创建结果类型
 */
export interface TokenResult {
	accessToken: string;
	refreshToken: string;
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
