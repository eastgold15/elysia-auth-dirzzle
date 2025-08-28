/**
 * 类型定义文件
 * 提供更好的类型安全性，减少 @ts-expect-error 的使用
 */

import type { PgTableWithColumns } from "drizzle-orm/pg-core";



import type { userSchema } from "./db/shema";

export type User = typeof userSchema.$inferSelect;

/**
 * 数据库实例类型
 */
export interface DatabaseInstance {
	select: () => any;
	insert: (table: any) => any;
	update: (table: any) => any;
	delete: (table: any) => any;
	[key: string]: any;
}

/**
 * Drizzle 配置类型
 */
export interface DrizzleConfig<
	TUserSchema ,
	TTokenSchema 
> {
	db: DatabaseInstance;
	usersSchema: TUserSchema;
	tokensSchema: TTokenSchema;
}

/**
 * JWT 有效载荷类型
 */
export interface JWTPayload {
	id: string | number;
	[key: string]: any;
}




/**
 * 认证结果类型
 */
export interface AuthResult<T> {
	connectedUser: T;
	isConnected: true;
}

/**
 * 令牌创建结果类型
 */
export interface TokenResult {
	accessToken: string;
	refreshToken: string;
}