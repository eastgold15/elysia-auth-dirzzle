import type { HTTPMethod } from "elysia";

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

/**
 * 将URL和HTTP方法添加到配置列表中
 * @param u URL路径
 * @param m HTTP方法或通配符'*'
 * @param urls 现有URL配置列表
 * @returns 更新后的URL配置列表
 */
const addUrl = (
	u: string,
	m: HTTPMethod | "*",
	urls: UrlConfig[],
): UrlConfig[] => {
	if (m === "*") {
		// 如果方法为'*'，为每个支持的HTTP方法添加一个配置
		for (const HTTPMethod of methods) {
			urls.push({ url: u, method: HTTPMethod });
		}
	} else {
		// 否则只添加指定方法的配置
		urls.push({ url: u, method: m as HTTPMethod });
	}

	return urls;
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
	url: string,
	method: HTTPMethod,
	config: UrlConfig[],
): boolean => {
	let urlsConfig: UrlConfig[] = [];
	let result = false;

	// 展开配置，处理通配符方法
	for (let i = 0, len = config.length; i < len; i += 1) {
		const val = config[i];
		if (val?.url && val?.method) {
			urlsConfig = addUrl(val.url, val.method, urlsConfig);
		}
	}

	let currentUrl = url;

	// 移除查询参数
	currentUrl = currentUrl.split("?")[0] || currentUrl;

	// 移除末尾斜杠以确保URL格式一致（根路径'/'除外）
	if (currentUrl !== "/" && currentUrl.slice(-1) === "/") {
		currentUrl = currentUrl.slice(0, -1);
	}

	for (let index = 0; index < urlsConfig.length; index += 1) {
		const urlConfig: UrlConfig = urlsConfig[index];

		// 规则1: 通配符匹配 - 如果URL以/*结尾，检查当前URL是否以该前缀开始
		if (urlConfig.url.endsWith("/*")) {
			if (currentUrl.startsWith(urlConfig.url.replace("/*", ""))) {
				result = true;
				break;
			}
		}

		// 规则2: 精确匹配 - 检查当前URL和方法是否完全匹配配置
		if (currentUrl === urlConfig.url && method === urlConfig.method) {
			result = true;
			break;
		}

		// 规则3: 动态参数匹配 - 忽略动态参数部分进行匹配
		if (urlConfig.url.indexOf("/:") !== -1) {
			const splitUrl = currentUrl.split("/");
			const splitConfigUrl = urlConfig.url.split("/");

			// 检查路径段数是否相同且HTTP方法匹配
			if (
				splitUrl.length === splitConfigUrl.length &&
				method === urlConfig.method
			) {
				let similar = true;
				for (let j = 0; j < splitUrl.length; j += 1) {
					// 如果配置路径段不是参数(:开头)且与当前URL不同，则不匹配
					if (
						splitConfigUrl[j]?.indexOf(":") === -1 &&
						splitUrl[j] !== splitConfigUrl[j]
					) {
						similar = false;
						break;
					}
				}

				// 如果所有路径段都匹配（考虑参数），则允许访问
				if (similar) {
					result = true;
					break;
				}
			}
		}
	}

	return result;
};
