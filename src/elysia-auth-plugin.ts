/* eslint-disable @typescript-eslint/ban-ts-comment */

import {
	InvalidTokenError,
	UserNotFoundError,
} from "@pori15/elysia-unified-errors";
import { eq, type InferSelectModel } from "drizzle-orm";
import type { PgTableWithColumns } from "drizzle-orm/pg-core";
import type { Cookie, HTTPMethod } from "elysia";
import jwt from "jsonwebtoken";
import type { UrlConfig } from "./authGuard.js";
import { authLogger, tokenLogger } from "./logger.js";
import type { GetTokenOptions } from "./types.js";

// REF: https://github.com/elysiajs/elysia/blob/main/src/utils.ts
const encoder = new TextEncoder();
// 移除 base64 字符串末尾的等号
function removeTrailingEquals(digest: string): string {
	let trimmedDigest = digest;
	while (trimmedDigest.endsWith("=")) {
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
	if (typeof val !== "string")
		throw new TypeError("Cookie value must be provided as a string.");

	if (secret === null) throw new TypeError("Secret key must be provided.");

	const secretKey = await crypto.subtle.importKey(
		"raw",
		encoder.encode(secret),
		{ name: "HMAC", hash: "SHA-256" },
		false,
		["sign"],
	);
	const hmacBuffer = await crypto.subtle.sign(
		"HMAC",
		secretKey,
		encoder.encode(val),
	);

	return `${val}.${removeTrailingEquals(Buffer.from(hmacBuffer).toString("base64"))}`;
};

/**
 * 校验 cookie 签名是否正确
 * @param input 签名后的cookie字符串
 * @param secret 签名密钥
 * @returns 验证通过返回原值，否则返回false
 */
export const unsignCookie = async (input: string, secret: string | null) => {
	if (typeof input !== "string")
		throw new TypeError("Signed cookie string must be provided.");

	if (null === secret) throw new TypeError("Secret key must be provided.");

	const tentativeValue = input.slice(0, input.lastIndexOf("."));
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
		from = "header", // 默认从 header 获取
		cookieName = "authorization",
		headerName = "authorization",
		queryName = "access_token",
	} = getTokenFrom;

	switch (from) {
		case "header": {
			const authHeader = req.headers[headerName];
			if (!authHeader) {
				break; // 如果是 'header'，继续往下看其它 case（但其实后面我们直接 return，可以优化）
			}

			const parts = authHeader.trim().split(" ");
			if (parts.length === 2 && parts[0]?.toLowerCase() === "bearer") {
				return parts[1]; // Bearer <token> → 返回未解密的 bearer token
			}

			// 如果不是 Bearer，直接返回原始 header 值（未解密）
			return authHeader.trim();
		}

		case "cookie": {
			const cookie = req.cookie?.[cookieName];
			if (!cookie?.value) {
				break;
			}
			if (cookieSecret) {
				const result = await unsignCookie(cookie.value, cookieSecret);
				if (result === false) {
					tokenLogger.error("Cookie signature validation failed", {
						cookieName,
						hasSecret: !!cookieSecret,
					});
					throw new InvalidTokenError("Invalid or tampered token in cookie");
				}
				return result; // ✅ 返回解密后的 token
			} else {
				return cookie.value; // ✅ 直接返回未加密的 token
			}
		}
		case "query": {
			const queryToken = req.query?.[queryName];
			if (!queryToken) {
				break;
			}
			return queryToken; // ✅ 直接返回 query 中的 token（未解密）
		}
		default:
			// 未知的 from 值，返回 undefined
			authLogger.warn("Unknown 'from' value in getAccessTokenFromRequest", {
				from,
			});
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
export const checkTokenValidity =
	<TUserSchema extends PgTableWithColumns<any>>(
		jwtSecret: string,
		verifyAccessTokenOnlyInJWT: boolean,
		drizzle: {
			db: any;
			usersSchema: TUserSchema;
			tokensSchema: any;
		},
		userValidation: (
			user: InferSelectModel<TUserSchema>,
		) => void | Promise<void>,
		publicUrlConfig: UrlConfig[],
		currentUrl: string,
		currentMethod: HTTPMethod,
		cookieManager: { [x: string]: { remove: () => void } },
	) =>
	async (
		tokenValue?: string,
	): Promise<
		| { connectedUser: InferSelectModel<TUserSchema>; isConnected: true }
		| undefined
		| Error
	> => {
		// 检查 token 是否存在
		if (!tokenValue) {
			authLogger.debug("No token provided", {
				url: currentUrl,
				method: currentMethod,
			});
			return new Error("No token provided");
		}

		authLogger.debug("Starting token validation", {
			hasToken: !!tokenValue,
			verifyAccessTokenOnlyInJWT,
			url: currentUrl,
			method: currentMethod,
		});

		let userId: number;

		try {
			// 先用 JWT 校验 token
			const tokenData = jwt.verify(tokenValue, jwtSecret);
			// 如果需要查数据库，进一步校验 token 是否有效
			if (!verifyAccessTokenOnlyInJWT) {
				const result = await drizzle.db
					.select()
					.from(drizzle.tokensSchema)
					.where(eq(drizzle.tokensSchema.accessToken, tokenValue))
					.limit(1);

				if (!result[0]?.ownerId) {
					throw "Token not valid in DB";
				} else {
					userId = result[0].ownerId;
				}
			} else {
				// 3. 如果信任 JWT，直接从 payload 中取 id
				if (typeof tokenData !== "object" || !tokenData?.id) {
					throw new Error("Invalid JWT payload: missing id");
				}
				userId = Number(tokenData.id); // ✅ 确保是 number 类型
			}
		} catch (_error) {
			// 4. 校验失败处理
			tokenLogger.error("Token validation failed", {
				error: _error,
				url: currentUrl,
				method: currentMethod,
				hasToken: !!tokenValue,
				verifyAccessTokenOnlyInJWT,
			});

			const isPublicPage = publicUrlConfig.some(
				(config) =>
					config.url === currentUrl && config.method === currentMethod,
			);

			if (!isPublicPage) {
				const authCookie = cookieManager?.authorization;
				authCookie?.remove();

				authLogger.warn("Unauthorized access attempt on protected route", {
					url: currentUrl,
					method: currentMethod,
				});

				throw new InvalidTokenError("Token is not valid");
			}

			authLogger.debug(
				"Token validation failed on public route, allowing access",
				{
					url: currentUrl,
					method: currentMethod,
				},
			);

			// 如果是公开路由，直接返回，不查询用户
			return;
		}

		// 查找用户信息
		const userResult = await drizzle.db
			.select()
			.from(drizzle.usersSchema)
			.where(eq((drizzle.usersSchema as any).id, +userId))
			.limit(1);

		const user = userResult[0];
		if (!user) {
			authLogger.error("User not found in database", { userId });
			throw new UserNotFoundError("User not found");
		}

		// 可选的自定义用户校验
		if (userValidation) {
			try {
				await userValidation(user as InferSelectModel<TUserSchema>);
			} catch (validationError) {
				authLogger.error("User validation failed", {
					userId: user.id,
					error: validationError,
				});
				throw validationError;
			}
		}

		return {
			connectedUser: user as InferSelectModel<TUserSchema>,
			isConnected: true,
		};
	};
