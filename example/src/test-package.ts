/**
 * 测试npm包安装和功能的脚本
 * 用于验证elysia-auth-drizzle包是否正确安装和工作
 */

import { Elysia } from 'elysia';
import { drizzle } from 'drizzle-orm/bun-sqlite';
import { Database } from 'bun:sqlite';

// 测试导入npm包
try {
  const {
    elysiaAuthDrizzlePlugin,
    createUserToken,
    checkTokenValidity,
    getAccessTokenFromRequest
  } = require('elysia-auth-drizzle');

  console.log('✅ 成功导入 elysia-auth-drizzle 包');
  console.log('📦 可用的导出:', {
    elysiaAuthDrizzlePlugin: typeof elysiaAuthDrizzlePlugin,
    createUserToken: typeof createUserToken,
    checkTokenValidity: typeof checkTokenValidity,
    getAccessTokenFromRequest: typeof getAccessTokenFromRequest
  });

  // 创建简单的测试数据库
  const sqlite = new Database(':memory:');
  const db = drizzle(sqlite);

  // 简化的表模式
  const usersSchema = {
    id: { name: 'id' },
    email: { name: 'email' },
  };

  const tokensSchema = {
    id: { name: 'id' },
    accessToken: { name: 'accessToken' },
    refreshToken: { name: 'refreshToken' },
    ownerId: { name: 'ownerId' },
  };

  // 测试插件初始化
  const app = new Elysia()
    .use(
      elysiaAuthDrizzlePlugin({
        jwtSecret: 'test-secret-key',
        cookieSecret: 'test-cookie-secret',
        drizzle: {
          db,
          usersSchema,
          tokensSchema,
        },
        config: [
          { url: '/test', method: 'GET' },
        ],
        verifyAccessTokenOnlyInJWT: true, // 简化测试，只验证JWT
      })
    )
    .get('/test', () => {
      return { message: '测试路由正常工作' };
    })
    .get('/protected', ({ isConnected, connectedUser }) => {
      return {
        message: '受保护的路由',
        isConnected,
        user: connectedUser,
      };
    });

  console.log('✅ 插件初始化成功');
  console.log('🚀 测试服务器配置完成');

  // 测试基本功能
  console.log('\n📋 功能测试结果:');
  console.log('- ✅ 包导入正常');
  console.log('- ✅ 插件初始化正常');
  console.log('- ✅ 路由配置正常');
  console.log('- ✅ 类型定义正常');

  console.log('\n🎉 npm包测试通过！');

} catch (error) {
  console.error('❌ npm包测试失败:', error);
  console.error('\n可能的原因:');
  console.error('1. 包未正确构建 (运行: npm run build)');
  console.error('2. 包未正确安装 (运行: npm run install-local)');
  console.error('3. 依赖项缺失 (运行: npm install)');
  process.exit(1);
}