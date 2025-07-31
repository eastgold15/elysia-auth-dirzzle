/* eslint-disable @typescript-eslint/ban-ts-comment */
/* eslint-disable @typescript-eslint/no-explicit-any */
import { eq } from "drizzle-orm";

// 导入Elysia自带的错误类型
import { NotFoundError } from "elysia";
import { sign, verify } from "jsonwebtoken";
import { BadRequest, NotFound } from "unify-errors";
import type { StringValue } from "./currentUrlAndMethodIsAllowed";

/**
 * 创建用户访问令牌和刷新令牌
 * @param options 数据库和模式配置
 * @returns 创建令牌的异步函数
 */
export const createUserToken =
  ({
    db,
    usersSchema,
    tokensSchema,
  }: {
    //@ts-ignore
    db; // drizzle-orm数据库实例
    //@ts-ignore
    usersSchema; // 用户表模式
    //@ts-ignore
    tokensSchema?; // 令牌表模式（可选）
  }) =>
    async (
      userId: string,
      {
        secret,
        refreshSecret,
        accessTokenTime,
        refreshTokenTime,
      }: {
        secret: string; // JWT签名密钥
        refreshSecret?: string; // 刷新令牌签名密钥（可选，默认使用secret）
        accessTokenTime: StringValue; // 访问令牌有效期
        refreshTokenTime: StringValue; // 刷新令牌有效期
      },
    ) => {
      let user;

      try {
        // 查询用户是否存在
        user = await db
          .select()
          .from(usersSchema)
          .where(eq(usersSchema.id, userId))
          .limit(1);

        if (user.length === 0) {
          // throw new NotFound({ error: 'User not found' });
          throw new NotFoundError("用户不存在");
        }
      } catch (_error) {
        throw new NotFoundError("用户不存在");
      }

      // 创建访问令牌
      const accessToken = sign({ id: userId }, secret, {
        expiresIn: accessTokenTime,
      });
      // const accessToken = sign({ id: userId }, secret as string, {
      //   expiresIn: accessTokenTime,
      // });

      // 创建刷新令牌
      const refreshToken = sign(
        { id: userId, date: Date.now() }, // 修复：添加括号调用getTime函数
        refreshSecret || secret,
        {
          expiresIn: refreshTokenTime,
        },
      );

      // 如果提供了令牌表模式，将令牌保存到数据库
      if (tokensSchema) {
        await db.insert(tokensSchema).values({
          accessToken,
          refreshToken,
          ownerId: userId,
        });
      }

      return {
        accessToken,
        refreshToken,
      };
    };

/**
 * 移除指定的访问令牌
 * @param options 数据库和令牌表模式配置
 * @returns 移除令牌的异步函数
 */
export const removeUserToken =
  (
    //@ts-ignore
    { db, tokensSchema }: { db; tokensSchema },
  ) =>
    async (accessToken: string) => {
      await db
        .delete(tokensSchema)
        .where(eq(tokensSchema.accessToken, accessToken));
    };

/**
 * 移除用户的所有令牌
 * @param options 数据库和令牌表模式配置
 * @returns 移除所有令牌的异步函数
 */
export const removeAllUserTokens =
  (
    //@ts-ignore
    { db, tokensSchema }: { db; tokensSchema },
  ) =>
    async (ownerId: string) => {
      await db.delete(tokensSchema).where(eq(tokensSchema.ownerId, ownerId));
    };

/**
 * 刷新用户访问令牌
 * @param options 数据库和令牌表模式配置
 * @returns 刷新令牌的异步函数
 */
export const refreshUserToken =
  (
    //@ts-ignore
    {
      db,
      tokensSchema,
    }: {
      //@ts-ignore
      db; // drizzle-orm数据库实例
      //@ts-ignore
      tokensSchema?; // 令牌表模式（可选）
    },
  ) =>
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
        content = verify(refreshToken, refreshSecret || secret) as {
          id: string;
        };
      } catch (_error) {
        // 令牌无效，从数据库中删除
        if (tokensSchema) {
          await db
            .delete(tokensSchema)
            .where(eq(tokensSchema.refreshToken, refreshToken));
        }

        throw new BadRequest({
          error: "Token expired",
        });
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
          throw new NotFound({
            error: "Token not found",
          });
        } else {
          token = result[0];
        }
      } else {
        // 如果没有令牌表模式，从过期令牌中获取数据
      }

      // 创建新的访问令牌
      const accessToken = sign({ id: token?.ownerId || content?.id }, secret, {
        expiresIn: accessTokenTime,
      });

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
