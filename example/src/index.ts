// 使用npm包方式导入（需要先构建和安装包）

import { Elysia } from "elysia";

import "dotenv/config";

import { elysiaAuthDrizzlePlugin } from "@pori15/elysia-auth-drizzle";
import { drizzle } from "drizzle-orm/node-postgres";
import { tokenSchema, userSchema } from "./db/schema.js";

const db = drizzle(process.env.DATABASE_URL || "postgres://localhost/mydb");

// 创建Elysia应用并使用认证插件
const app = new Elysia()
	.use(
		elysiaAuthDrizzlePlugin({
			jwtSecret: "your-jwt-secret-key",
			cookieSecret: "your-cookie-secret-key",
			drizzle: {
				db,
				usersSchema: userSchema,
				tokensSchema: tokenSchema,
			},
			getTokenFrom: {
				from: "header", // 从请求头获取token
				headerName: "authorization",
			},
			PublicUrlConfig: [
				{ url: "/", method: "*" },
				{ url: "/register", method: "*" },
				{ url: "/login", method: "*" },
			],
		}),
	)

	// .use(
	//   await elysiaAuthDrizzlePlugin({
	//     jwtSecret: 'your-jwt-secret-key',
	//     cookieSecret: 'your-cookie-secret-key',
	//     drizzle: {
	//       db,
	//       usersSchema: userSchema,
	//       tokensSchema: tokenSchema,
	//     },
	//     getTokenFrom: {
	//       from: 'header', // 从请求头获取token
	//       headerName: 'authorization',
	//     },
	//     PublicUrlConfig: [
	//       { url: '/', method: '*' },
	//       { url: '/register', method: '*' },
	//       { url: '/login', method: '*' },
	//     ],
	//   })
	// )

	// .post(
	//   "/register",
	//   async ({ body: { username, password } }) => {
	//     console.log(username);

	//     try {
	//       const user = await db
	//         .select()
	//         .from(userSchema)
	//         .where(eq(userSchema.username, username));
	//       console.log(user);
	//       if (user.length > 0) {
	//         return {
	//           code: 1,
	//           msg: "用户名已存在",
	//         };
	//       }
	//       const res = await db
	//         .insert(userSchema)
	//         .values({
	//           username,
	//           password,
	//         })
	//         .returning({
	//           id: userSchema.id,
	//           username: userSchema.username,
	//         });

	//       return res;
	//     } catch (error) {
	//       console.log(error);
	//     }
	//   },
	//   {
	//     body: t.Object({
	//       username: t.String(),
	//       password: t.Any(),
	//     }),
	//   },
	// )
	// .post(
	//   "/login",
	//   async ({ body: { username, password } }) => {
	//     console.log(username, password);
	//     try {
	//       const user = await db
	//         .select()
	//         .from(userSchema)
	//         .where(eq(userSchema.username, username));
	//       console.log(userSchema);
	//       if (userSchema.length === 0) {
	//         return {
	//           code: 1,
	//           msg: "用户名不存在",
	//         };
	//       }
	//       console.log("username", user[0]);
	//       if (+user[0].password !== password) {
	//         return {
	//           code: 2,
	//           msg: "密码错误",
	//         };
	//       }
	//       const token = createUserToken({
	//         db,
	//         usersSchema: userSchema,
	//         tokensSchema: tokenSchema,
	//       });
	//       const str = await token("" + user[0].id, {
	//         secret: "your-jwt-secret-key", // 使用与插件配置相同的secret
	//         accessTokenTime: "12h", // 修正时间格式
	//         refreshTokenTime: "1d",
	//       });

	//       return str;
	//     } catch (error) {
	//       console.log(error);
	//     }
	//   },
	//   {
	//     body: t.Object({
	//       username: t.String(),
	//       password: t.Any(),
	//     }),
	//   },
	// )
	// // 添加路由
	// .get("/", ({ isConnected, connectedUser }) => {
	//   console.log(isConnected, connectedUser);
	//   return {
	//     isConnected,
	//     connectedUser,
	//   };
	// })
	// .get("/test", ({ isConnected, connectedUser }) => {
	//   console.log(isConnected, connectedUser);
	//   return {
	//     isConnected,
	//     connectedUser,
	//   };
	// })

	.listen(3007);

console.log(
	`🔐 Auth server is running at http://${app.server?.hostname}:${app.server?.port}`,
);
