// 测试 Node.js ESM 环境下的 elysia-auth-drizzle 插件导入
if ("Bun" in globalThis) {
	throw new Error("❌ Use Node.js to run this test!");
}

// 导入认证插件
import { elysiaAuthDrizzlePlugin } from "../../../dist/index.mjs";

// 验证插件是否正确导入
if (typeof elysiaAuthDrizzlePlugin !== "function") {
	throw new Error(
		"❌ ESM Node.js failed - elysiaAuthDrizzlePlugin is not a function",
	);
}

// 验证插件的基本结构
if (
	!elysiaAuthDrizzlePlugin.name ||
	elysiaAuthDrizzlePlugin.name !== "elysiaAuthDrizzlePlugin"
) {
	console.warn("⚠️ Plugin name might not be set correctly");
}

console.log(
	"✅ ESM Node.js works! elysia-auth-drizzle plugin imported successfully",
);
console.log("Plugin type:", typeof elysiaAuthDrizzlePlugin);
console.log("Plugin name:", elysiaAuthDrizzlePlugin.name || "unnamed");
