import { Elysia } from 'elysia';

// 使用npm包方式导入（需要先构建和安装包）
import { elysiaAuthDrizzlePlugin } from '@pori15/elysia-auth-drizzle';
import { drizzle } from 'drizzle-orm/node-postgres';

const db = drizzle(process.env.DATABASE_URL!);

import { tokens, users } from './db/schema';




// 创建Elysia应用并使用认证插件
const app = new Elysia()
  .use(
    elysiaAuthDrizzlePlugin<typeof users>({
      jwtSecret: 'your-jwt-secret-key',
      cookieSecret: 'your-cookie-secret-key',
      drizzle: {
        db,
        usersSchema: users,
        tokensSchema: tokens,
      },
      config: [
        // 公开路径配置
        { url: '/protected', method: 'GET' },
        { url: '/register', method: 'POST' },
        { url: '/public/*', method: '*' },
      ],
    })
  )
  // 添加路由
  .get('/protected', ({ isConnected, connectedUser }) => {
    console.log(isConnected, connectedUser)
  })
  .listen(3000);

console.log(
  `🔐 Auth server is running at http://${app.server?.hostname}:${app.server?.port}`
);
