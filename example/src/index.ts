// 使用npm包方式导入（需要先构建和安装包）

import { elysiaAuthDrizzlePlugin } from "@pori15/elysia-auth-drizzle";
import { eq } from "drizzle-orm";
// 添加数据库连接代码
import { drizzle } from "drizzle-orm/postgres-js";
import { Elysia, t } from "elysia";
import postgres from "postgres";
import { tokenSchema, userSchema } from "./db/schema";

// 创建数据库连接
const client = postgres("postgres://postgres:postgres@localhost:5432/postgres");
const db = drizzle(client);

// 创建 Elysia 应用
export const app = new Elysia()
	.use(
		elysiaAuthDrizzlePlugin({
			drizzle: {
				db,
				usersSchema: userSchema,
				tokensSchema: tokenSchema,
			},
			getTokenFrom: {
				from: "header",
			},
			jwtSecret: "my-jwt-secret",
			cookieSecret: "my-cookie-secret",
			PublicUrlConfig: [
				{ url: "/login", method: "POST" },
				{ url: "/register", method: "POST" },
			],
		}),
	)

	// 受保护的路由 - 现在可以正确获取 connectedUser 的类型
	.get("/profile", ({ connectedUser, isConnected }) => {
		if (!isConnected) {
			return "Not authenticated";
		}

		// TypeScript 现在可以正确推断 connectedUser 的类型
		return {
			id: connectedUser.id,
			username: connectedUser.username,
			createdAt: connectedUser.createdAt,
		};
	})

	// 登录路由示例
	.post(
		"/login",
		async ({ body: { username, password } }) => {
			// 查找用户
			const users = await db
				.select()
				.from(userSchema)
				.where(eq(userSchema.username, username));
			const user = users[0];

			if (!user || user.password !== password) {
				return { error: "Invalid credentials" };
			}

			return { message: "Login successful" };
		},
		{
			body: t.Object({
				username: t.String(),
				password: t.String(),
			}),
		},
	)

	.listen(3000, () => {
		console.log("Server running on port 3000");
	});
