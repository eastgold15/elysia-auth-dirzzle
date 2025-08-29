import {
	ExpiredTokenError,
	OperationFailedError,
	ResourceNotFoundError,
	ValidationError,
} from "@pori15/elysia-unified-errors";
import { eq } from "drizzle-orm";
// 导入Elysia自带的错误类型
import { NotFoundError } from "elysia";
import jwt from "jsonwebtoken";
import type { StringValue } from "./authGuard.js";
import type { TokenSchema, UserSchema } from "./db/schema.js";
import { tokenLogger } from "./logger.js";
import type { TokenResult } from "./types.js";

/**
 * 创建用户访问令牌和刷新令牌
 * @param config 数据库和模式配置
 * @returns 创建令牌的异步函数
 */
export const createUserToken =
	<TUserSchema extends UserSchema, TTokenSchema>(config: {
		db: any;
		usersSchema: TUserSchema;
		tokensSchema?: TTokenSchema;
	}) =>
	async (
		userId: string,
		options: {
			secret: string;
			refreshSecret?: string;
			accessTokenTime: StringValue;
			refreshTokenTime: StringValue;
		},
	): Promise<TokenResult> => {
		const { db, usersSchema, tokensSchema } = config;
		const { secret, refreshSecret, accessTokenTime, refreshTokenTime } =
			options;

		// 验证参数
		if (!userId || !secret) {
			tokenLogger.error("Missing required parameters for token creation", {
				hasUserId: !!userId,
				hasSecret: !!secret,
			});
			throw new ValidationError("userId and secret are required");
		}

		let user;

		try {
			// 查询用户是否存在
			tokenLogger.debug("Checking if user exists", { userId });
			user = await db
				.select()
				.from(usersSchema)

				.where(eq(usersSchema.id, +userId))
				.limit(1);

			if (user.length === 0) {
				tokenLogger.warn("User not found during token creation", { userId });
				throw new NotFoundError("用户不存在");
			}
		} catch (error) {
			if (error instanceof NotFoundError) {
				throw error;
			}
			tokenLogger.error("Database error while checking user existence", {
				error,
				userId,
			});
			throw new NotFoundError("用户不存在");
		}

		// 创建访问令牌
		const accessToken = jwt.sign({ id: userId }, secret, {
			expiresIn: accessTokenTime,
		});

		// 创建刷新令牌
		const refreshToken = jwt.sign(
			{ id: userId, date: Date.now() },
			refreshSecret || secret,
			{
				expiresIn: refreshTokenTime,
			},
		);

		// 如果提供了令牌表模式，将令牌保存到数据库
		if (tokensSchema) {
			try {
				await db.insert(tokensSchema).values({
					accessToken,
					refreshToken,
					ownerId: userId,
				});
			} catch (error) {
				console.error("Failed to save tokens to database:", error);
				// 不抛出错误，允许令牌正常返回
			}
		}

		return {
			accessToken,
			refreshToken,
		};
	};

/**
 * 移除指定的访问令牌
 * @param config 数据库和令牌表模式配置
 * @returns 移除令牌的异步函数
 */
export const removeUserToken =
	<TTokenSchema extends TokenSchema>(config: {
		db: any;
		tokensSchema: TTokenSchema;
	}) =>
	async (accessToken: string): Promise<void> => {
		if (!accessToken) {
			throw new ValidationError("Access token is required");
		}

		const { db, tokensSchema } = config;

		try {
			await db
				.delete(tokensSchema)
				.where(eq(tokensSchema.accessToken, accessToken));
		} catch (error) {
			console.error("Failed to remove token:", error);
			throw new OperationFailedError("Failed to remove token");
		}
	};

/**
 * 移除用户的所有令牌
 * @param config 数据库和令牌表模式配置
 * @returns 移除所有令牌的异步函数
 */
export const removeAllUserTokens =
	<TTokenSchema extends TokenSchema>(config: {
		db: any;
		tokensSchema: TTokenSchema;
	}) =>
	async (ownerId: string): Promise<void> => {
		if (!ownerId) {
			throw new ValidationError("Owner ID is required");
		}

		const { db, tokensSchema } = config;

		try {
			await db.delete(tokensSchema).where(eq(tokensSchema.ownerId, +ownerId));
		} catch (error) {
			console.error("Failed to remove all user tokens:", error);
			throw new OperationFailedError("Failed to remove all user tokens");
		}
	};

/**
 * 刷新用户访问令牌
 * @param options 数据库和令牌表模式配置
 * @returns 刷新令牌的异步函数
 */
export const refreshUserToken =
	<TTokenSchema extends TokenSchema>({
		db,
		tokensSchema,
	}: {
		db: any;
		tokensSchema: TTokenSchema;
	}) =>
	async (
		refreshToken: string,
		{
			secret,
			refreshSecret,
			accessTokenTime,
		}: {
			secret: string; // JWT签名密钥
			refreshSecret?: string; // 刷新令牌签名密钥（可选，默认使用secret）
			accessTokenTime: StringValue; // 新访问令牌有效期
		},
	) => {
		let content;
		try {
			// 验证刷新令牌
			content = jwt.verify(refreshToken, refreshSecret || secret) as {
				id: string;
			};
		} catch (_error) {
			// 令牌无效，从数据库中删除
			if (tokensSchema) {
				await db
					.delete(tokensSchema)
					.where(eq(tokensSchema.refreshToken, refreshToken));
			}

			throw new ExpiredTokenError("Token expired");
		}

		let token;
		if (tokensSchema) {
			// 从数据库查询令牌
			const result = await db
				.select()
				.from(tokensSchema)
				.where(eq(tokensSchema.refreshToken, refreshToken))
				.limit(1);

			if (result.length === 0) {
				throw new ResourceNotFoundError("Token not found");
			} else {
				token = result[0];
			}
		} else {
			// 如果没有令牌表模式，从过期令牌中获取数据
		}

		// 创建新的访问令牌
		const accessToken = jwt.sign(
			{ id: token?.ownerId || content?.id },
			secret,
			{
				expiresIn: accessTokenTime,
			},
		);

		// 更新数据库中的访问令牌
		if (tokensSchema && token) {
			await db
				.update(tokensSchema)
				.set({
					accessToken,
				})
				.where(eq(tokensSchema.id, token.id));
		}

		return { accessToken, refreshToken };
	};
