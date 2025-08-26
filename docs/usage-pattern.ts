/**
 * @file This file demonstrates the recommended pattern for using an Elysia plugin
 * that depends on an asynchronously initialized resource, such as a database connection.
 * The key is to wrap the application setup in an async function.
 */

import { eq } from "drizzle-orm";
// This is a placeholder for your actual drizzle driver
import { drizzle } from "drizzle-orm/postgres-js";
import { Elysia, t } from "elysia";
import postgres from "postgres";
// Import your plugin and schemas
// Adjust the import paths based on your project structure
import { createUserToken, elysiaAuthDrizzlePlugin } from "../src";
import { tokenSchema, userSchema } from "../src/db/shema";

// --- 1. Asynchronous Database Setup ---
/**
 * This function simulates an async task, like establishing a database connection pool.
 * @returns A promise that resolves to a Drizzle instance.
 */
async function setupDatabase() {
	console.log("Connecting to the database...");

	// In a real app, you would get this from environment variables
	const connectionString =
		process.env.DATABASE_URL || "postgres://user:password@host:port/db";

	// `postgres` creates a connection pool, which can be an async operation.
	const client = postgres(connectionString);

	// Drizzle ORM is then initialized with the client.
	const db = drizzle(client);

	console.log("Database connection pool established.");
	return db;
}

// --- 2. Asynchronous App Initialization ---
/**
 * We wrap the Elysia app creation in an async function to allow for `await`.
 * This is the core of the pattern.
 * @returns A promise that resolves to a configured Elysia app instance.
 */
async function createApp() {
	// Await the asynchronous database setup
	const db = await setupDatabase();

	// Now that we have the `db` instance, we can create our Elysia app
	const app = new Elysia()
		.use(
			// The plugin is configured synchronously, but it depends on the
			// asynchronously created `db` object.
			elysiaAuthDrizzlePlugin({
				jwtSecret: "your-jwt-secret",
				cookieSecret: "your-cookie-secret",
				drizzle: {
					db,
					usersSchema: userSchema,
					tokensSchema: tokenSchema,
				},
				getTokenFrom: {
					from: "header",
				},
			}),
		)
		.get("/", ({ connectedUser }) => {
			if (connectedUser) {
				return `Hello ${connectedUser.username}`;
			}
			return "Hello! Please login or register.";
		})
		.post(
			"/register",
			async ({ body: { username, password } }) => {
				console.log(username);

				try {
					const user = await db
						.select()
						.from(userSchema)
						.where(eq(userSchema.username, username));
					console.log(user);
					if (user.length > 0) {
						return {
							code: 1,
							msg: "用户名已存在",
						};
					}
					const res = await db
						.insert(userSchema)
						.values({
							username,
							password,
						})
						.returning({
							id: userSchema.id,
							username: userSchema.username,
						});

					return res;
				} catch (error) {
					console.log(error);
				}
			},
			{
				body: t.Object({
					username: t.String(),
					password: t.Any(),
				}),
			},
		)
		.post(
			"/login",
			async ({ body: { username, password } }) => {
				console.log(username, password);
				try {
					const user = await db
						.select()
						.from(userSchema)
						.where(eq(userSchema.username, username));
					console.log(user);
					if (user.length === 0) {
						return {
							code: 1,
							msg: "用户名不存在",
						};
					}
					console.log("username", user[0]);
					if (+user[0].password !== password) {
						return {
							code: 2,
							msg: "密码错误",
						};
					}
					const token = createUserToken({
						db,
						usersSchema: userSchema,
						tokensSchema: tokenSchema,
					});
					const str = await token(`${user[0].id}`, {
						secret: "your-jwt-secret", // 使用与插件配置相同的secret
						accessTokenTime: "12h", // 修正时间格式
						refreshTokenTime: "1d",
					});

					return str;
				} catch (error) {
					console.log(error);
				}
			},
			{
				body: t.Object({
					username: t.String(),
					password: t.Any(),
				}),
			},
		);

	return app;
}

// --- 3. Start the Server ---
/**
 * The final step is to initialize the app and start the server.
 * Using a self-invoking async function is a clean way to do this at the top level.
 */
(async () => {
	try {
		console.log("Initializing application...");
		const app = await createApp();

		app.listen(3007);

		console.log(
			`🦊 Elysia is running at http://${app.server?.hostname}:${app.server?.port}`,
		);
	} catch (err) {
		console.error("Failed to start application:", err);
		process.exit(1);
	}
})();
