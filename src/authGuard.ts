import type { HTTPMethod } from "elysia";
import { isMatch } from "micromatch";
export interface UrlConfig {
	url: string;
	method: HTTPMethod | "*";
}

type Unit =
	| "Years"
	| "Year"
	| "Yrs"
	| "Yr"
	| "Y"
	| "Weeks"
	| "Week"
	| "W"
	| "Days"
	| "Day"
	| "D"
	| "Hours"
	| "Hour"
	| "Hrs"
	| "Hr"
	| "H"
	| "Minutes"
	| "Minute"
	| "Mins"
	| "Min"
	| "M"
	| "Seconds"
	| "Second"
	| "Secs"
	| "Sec"
	| "s"
	| "Milliseconds"
	| "Millisecond"
	| "Msecs"
	| "Msec"
	| "Ms";

type UnitAnyCase = Unit | Uppercase<Unit> | Lowercase<Unit>;

export type StringValue =
	| `${number}`
	| `${number}${UnitAnyCase}`
	| `${number} ${UnitAnyCase}`;

/**
 * 支持的HTTP方法列表
 */
const methods: HTTPMethod[] = [
	"ACL",
	"BIND",
	"CHECKOUT",
	"CONNECT",
	"COPY",
	"DELETE",
	"GET",
	"HEAD",
	"LINK",
	"LOCK",
	"M-SEARCH",
	"MERGE",
	"MKACTIVITY",
	"MKCALENDAR",
	"MKCOL",
	"MOVE",
	"NOTIFY",
	"OPTIONS",
	"PATCH",
	"POST",
	"PROPFIND",
	"PROPPATCH",
	"PURGE",
	"PUT",
	"REBIND",
	"REPORT",
	"SEARCH",
	"SOURCE",
	"SUBSCRIBE",
	"TRACE",
	"UNBIND",
	"UNLINK",
	"UNLOCK",
	"UNSUBSCRIBE",
	"ALL",
] as const;

const expandConfig = (config: UrlConfig[]): UrlConfig[] => {
	const expanded: UrlConfig[] = [];

	for (const { url, method } of config) {
		if (method === "*") {
			methods.forEach((m) => {
				expanded.push({ url, method: m });
			});
		} else {
			expanded.push({ url, method });
		}
	}

	return expanded;
};

/**
 * 检查当前URL和HTTP方法是否在允许列表中
 *
 * 支持以下匹配规则：
 * 1. 精确匹配 - URL和方法完全匹配
 * 2. 通配符匹配 - URL以/*结尾表示匹配所有子路径
 * 3. 动态参数匹配 - URL包含/:参数的路径匹配
 *
 * @param url 当前请求URL
 * @param method 当前HTTP方法
 * @param config URL配置列表
 * @returns 如果允许访问返回true，否则返回false
 */
export const currentUrlAndMethodIsAllowed = (
	requestUrl: string,
	requestMethod: HTTPMethod,
	config: UrlConfig[],
): boolean => {
	// 1. 规范化 URL：移除查询参数和末尾斜杠
	const normalizedUrl = requestUrl.split("?")[0]?.replace(/\/+$/, "") || "/";
	// 2. 展开配置（处理通配符方法）
	const expandedConfig = expandConfig(config);
	// 3. 使用 Bun.glob 检查匹配
	for (const { url: pattern, method } of expandedConfig) {
		if (method !== requestMethod) continue;
		// 将动态参数 `/users/:id` 转换为 glob 模式 `/users/*`
		const globPattern = pattern.replace(/\/:[^/]+/g, "/*");
		const isMatched = isMatch(normalizedUrl, globPattern);
		if (isMatched) return true;
	}
	return false;
};
