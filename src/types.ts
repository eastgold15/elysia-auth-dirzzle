/**
 * 类型定义文件
 * 提供更好的类型安全性，减少 @ts-expect-error 的使用
 */

import type { PgTableWithColumns } from "drizzle-orm/pg-core";

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
 * 用户表类型
 */
export interface UserSchema extends PgTableWithColumns<any> {
	id: any;
	username?: any;
	email?: any;
	password?: any;
	[key: string]: any;
}

/**
 * 令牌表类型
 */
export interface TokenSchema extends PgTableWithColumns<any> {
	id: any;
	accessToken: any;
	refreshToken: any;
	ownerId: any;
	[key: string]: any;
}

/**
 * Drizzle 配置类型
 */
export interface DrizzleConfig<
	TUserSchema extends UserSchema = UserSchema,
	TTokenSchema extends TokenSchema = TokenSchema,
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
 * 用户类型基础接口
 */
export interface BaseUser {
	id: string | number;
	[key: string]: any;
}

/**
 * 令牌类型基础接口
 */
export interface BaseToken {
	id: string | number;
	accessToken: string;
	refreshToken: string;
	ownerId: string | number;
	[key: string]: any;
}

/**
 * 认证结果类型
 */
export interface AuthResult<TUser extends BaseUser> {
	connectedUser: TUser;
	isConnected: true;
}

/**
 * 令牌创建结果类型
 */
export interface TokenResult {
	accessToken: string;
	refreshToken: string;
}
