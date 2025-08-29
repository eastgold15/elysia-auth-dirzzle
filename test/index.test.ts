// test/types.test.ts
import { tokenSchema, userSchema } from "../src/db/schema.js";
import { elysiaAuthDrizzlePlugin } from "../src/index.js";
import type { ORMOptions } from "../src/types.js";

// 创建一个测试用的 Drizzle 配置对象类型
interface TestUsersSchema {
	id: number;
	username: string;
	email: string;
	password: string;
}

interface TestSessionsSchema {
	id: number;
	userId: number;
	token: string;
	expiresAt: Date;
}

interface TestDrizzle {
	usersSchema: TestUsersSchema;
	sessionsSchema: TestSessionsSchema;
}

// 测试 ORMOptions 类型
type TestORMOptions = ORMOptions<TestDrizzle>;

// 测试 elysiaAuthDrizzlePlugin 的类型推断
const testPlugin = elysiaAuthDrizzlePlugin({
	drizzle: {
		db: {} as any,
		usersSchema: userSchema,
		tokensSchema: tokenSchema,
	},
	getTokenFrom: { from: "header" },
	jwtSecret: "test-secret",
});

// 查看推断出的用户类型
type InferredUser = typeof testPlugin extends {
	derive: (config: any, fn: (context: infer Context) => any) => any;
}
	? Context extends { connectedUser: infer U }
		? U
		: never
	: never;

// 这里你可以看到 T 和 drizzle 的类型信息
type PluginType = typeof testPlugin;
type DrizzleType = TestDrizzle;
type UserType = InferredUser;

// 导出类型以便在 IDE 中查看
export type { PluginType, DrizzleType, UserType, TestORMOptions };
