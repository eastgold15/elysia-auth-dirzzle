/**
 * 日志配置模块
 * 使用 logixlysia 进行日志记录，确保在生产环境中也能正常工作
 */

import { createLogger } from "logixlysia";

/**
 * 创建日志记录器实例
 */
const logger = createLogger();

/**
 * 创建带有标签的日志记录器
 */
export const createLoggerWithTag = (tag: string) => {
	// 创建一个假的请求对象，用于 logixlysia
	const fakeRequest = {
		method: "@pori15/elysia-auth-drizzle",
		url: `internal://${tag.toLowerCase()}`,
		headers: { get: (_key: string) => null },
	};

	return {
		info: (message: string, data?: any) => {
			logger.info(fakeRequest, `[${tag}] ${message}`, data);
		},
		warn: (message: string, data?: any) => {
			logger.warn(fakeRequest, `[${tag}] ${message}`, data);
		},
		error: (message: string, error?: any) => {
			logger.error(fakeRequest, `[${tag}] ${message}`, error);
		},
		debug: (message: string, data?: any) => {
			logger.debug(fakeRequest, `[${tag}] ${message}`, data);
		},
	};
};

/**
 * 认证相关日志记录器
 */
export const authLogger = createLoggerWithTag("AUTH");

/**
 * 令牌相关日志记录器
 */
export const tokenLogger = createLoggerWithTag("TOKEN");

/**
 * 数据库相关日志记录器
 */
export const dbLogger = createLoggerWithTag("DB");

/**
 * 通用错误日志记录器
 */
export const errorLogger = createLoggerWithTag("ERROR");
