/**
 * Elysia Auth Drizzle Plugin
 * 基于Elysia框架的身份验证插件，使用Drizzle ORM进行数据库操作
 * 
 * @description 提供完整的身份验证解决方案，包括JWT令牌管理、用户验证、权限控制等功能
 * @author 原作者改版而来
 * @version 1.0.0
 */

// === 核心插件导出 ===
export {
    elysiaAuthDrizzlePlugin,
    checkTokenValidity,
    getAccessTokenFromRequest,
    signCookie,
    unsignCookie
} from './elysia-auth-plugin';

// === 工具函数导出 ===
export {
    createUserToken,
    removeUserToken,
    removeAllUserTokens,
    refreshUserToken
} from './utils';

// === 辅助函数导出 ===
export {
    currentUrlAndMethodIsAllowed
} from './currentUrlAndMethodIsAllowed';

// === 默认导出 ===
export { elysiaAuthDrizzlePlugin as default } from './elysia-auth-plugin';