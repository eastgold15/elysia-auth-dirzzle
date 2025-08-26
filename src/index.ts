/**
 * Elysia Auth Drizzle Plugin
 * 基于Elysia框架的身份验证插件，使用Drizzle ORM进行数据库操作
 *
 * @description 提供完整的身份验证解决方案，包括JWT令牌管理、用户验证、权限控制等功能
 * @author 原作者改版而来
 * @version 1.1.0
 */

import { InvalidCredentialsError } from "@pori15/elysia-unified-errors";
import Elysia from "elysia";
import { currentUrlAndMethodIsAllowed, type HTTPMethods } from "./authGuard";
import type { ORMOptions } from "./config";
import type { tokenSchema, userSchema } from "./db/shema";
import {
	checkTokenValidity,
	getAccessTokenFromRequest,
} from "./elysia-auth-plugin";
import type { BaseUser } from "./types";

// === 统一错误处理导出 ===
// 直接导出统一错误处理包的所有内容
export * from "@pori15/elysia-unified-errors";
export type {
	HTTPMethods,
	StringValue,
	UrlConfig,
} from "./authGuard";
// === 辅助函数导出 ===
export { currentUrlAndMethodIsAllowed } from "./authGuard";
// === 类型导出 ===
export type {
	GetTokenOptions,
	ORMOptions,
} from "./config";
// === 核心插件导出 ===
export {
	checkTokenValidity,
	getAccessTokenFromRequest,
	signCookie,
	unsignCookie,
} from "./elysia-auth-plugin";
export type {
	AuthResult,
	BaseToken,
	BaseUser,
	DrizzleConfig,
	JWTPayload,
	TokenResult,
} from "./types";
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
 * @returns Elysia 插件实例
 */
export const elysiaAuthDrizzlePlugin = <
	TUser extends BaseUser,
	TUserSchema = typeof userSchema,
	TTokenSchema = typeof tokenSchema,
>(
	ORMOptions: ORMOptions<TUser, TUserSchema, TTokenSchema>,
) => {
	// 拆解必需配置
	const { drizzle, getTokenFrom } = ORMOptions;

	// 设置默认值
	const PublicUrlConfig = ORMOptions?.PublicUrlConfig ?? [
		{ url: "*/login", method: "POST" },
		{ url: "*/register", method: "POST" },
	];
	const userValidation = ORMOptions?.userValidation;
	const verifyAccessTokenOnlyInJWT =
		ORMOptions?.verifyAccessTokenOnlyInJWT ?? false;
	const prefix = ORMOptions?.prefix ?? "/api/auth";

	// 验证必需的密钥
	const jwtSecret = ORMOptions?.jwtSecret;
	const cookieSecret = ORMOptions?.cookieSecret;

	if (!jwtSecret) {
		throw new Error("elysia-auth-drizzle-plugin: jwtSecret is required");
	}

	if (getTokenFrom.from === "cookie" && !cookieSecret) {
		throw new Error(
			"elysia-auth-drizzle-plugin: cookieSecret is required when using cookie authentication",
		);
	}

	const plugin = new Elysia({ name: "elysia-auth-drizzle" }).derive(
		{ as: "global" },
		async ({ headers, query, cookie, request }) => {
			// 初始化登录状态
			let isConnected = false;
			let connectedUser: TUser | undefined;

			// 构建请求对象
			const req = {
				headers,
				query,
				cookie,
				url: new URL(request.url).pathname,
				method: request.method as HTTPMethods,
			};

			try {
				// 提取 token
				const tokenValue = await getAccessTokenFromRequest(
					req,
					getTokenFrom,
					cookieSecret || "",
				);

				// 校验 token
				const authResult = await checkTokenValidity<
					TUser,
					TUserSchema,
					TTokenSchema
				>(
					jwtSecret,
					verifyAccessTokenOnlyInJWT,
					drizzle,
					userValidation,
					PublicUrlConfig,
					req.url,
					req.method,
					req.cookie,
				)(tokenValue);

				if (authResult) {
					connectedUser = authResult.connectedUser;
					isConnected = authResult.isConnected;
				}
			} catch (error) {
				// 日志记录错误，但不抛出，由后续逻辑处理
				console.warn("Token validation failed:", error);
			}

			// 检查是否需要认证
			const isProtectedRoute =
				(prefix ? req.url.startsWith(prefix) : true) &&
				!currentUrlAndMethodIsAllowed(req.url, req.method, PublicUrlConfig);

			if (!isConnected && isProtectedRoute) {
				throw new InvalidCredentialsError(
					"Authentication required for this resource",
				);
			}

			// 返回登录状态和用户信息
			return {
				isConnected,
				connectedUser,
			};
		},
	);

	return plugin;
};
