// 使用npm包方式导入（需要先构建和安装包）

import { eq } from "drizzle-orm";
import { Elysia } from "elysia";
import { elysiaAuthDrizzlePlugin } from "../../src";
import { db } from "./db";
import { tokenSchema, userSchema } from "./db/schema";

// 创建 Elysia 应用
const app = new Elysia();

// 使用认证插件
app.use(
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
		// 用户验证示例 - 现在可以正确获取用户类型
		userValidation: async (user) => {
			// 现在 TypeScript 可以正确推断 user 的类型
			console.log("User ID:", user.id);
			console.log("Username:", user.username);

			// 检查用户是否被禁用等
			if (user.username === "banned") {
				throw new Error("User is banned");
			}
		},
	}),
);

// 受保护的路由 - 现在可以正确获取 connectedUser 的类型
app.get("/profile", ({ connectedUser }) => {
	if (!connectedUser) {
		return "Not authenticated";
	}

	// TypeScript 现在可以正确推断 connectedUser 的类型
	return {
		id: connectedUser.id,
		username: connectedUser.username,
		createdAt: connectedUser.createdAt,
	};
});

// 登录路由示例
app.post("/login", async ({ body }) => {
	// @ts-expect-error - 示例代码
	const { username, password } = body;

	// 查找用户
	const users = await db
		.select()
		.from(userSchema)
		.where(eq(userSchema.username, username));
	const user = users[0];

	if (!user || user.password !== password) {
		return { error: "Invalid credentials" };
	}

	// 创建令牌的示例代码...
	return { message: "Login successful" };
});

app.listen(3000, () => {
	console.log("Server running on port 3000");
});
