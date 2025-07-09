import { Elysia, t } from 'elysia';

// 使用npm包方式导入（需要先构建和安装包）
import { elysiaAuthDrizzlePlugin, createUserToken } from '@pori15/elysia-auth-drizzle';
import { drizzle } from 'drizzle-orm/node-postgres';

const db = drizzle(process.env.DATABASE_URL!);

import { tokens, users } from './db/schema';
import { eq } from 'drizzle-orm';




// 创建Elysia应用并使用认证插件
const app = new Elysia()
  .use(
    elysiaAuthDrizzlePlugin<typeof users>({
      jwtSecret: 'your-jwt-secret-key', // 统一JWT密钥

      drizzle: {
        db,
        usersSchema: users,
        tokensSchema: tokens,
      },
      config: [
        // 公开路径配置
        { url: '/', method: '*' },
        { url: '/register', method: '*' },
        { url: '/login', method: '*' },
        // { url: '/test', method: '*' }
        // 移除 /test 路径，使其需要认证
      ],
    })
  )
  .post('/register', async ({ body: { username, password } }) => {
    console.log(username)

    try {
      const user = await db.select({}).from(users).where(eq(users.username, username))
      console.log(user)
      if (user.length > 0) {
        return {
          code: 1,
          msg: '用户名已存在'
        }
      }
      const res = await db.insert(users).values({
        username,
        password
      }).returning({
        id: users.id,
        username: users.username
      })

      return res
    } catch (error) {

      console.log(error)
    }




  }, {
    body: t.Object({
      username: t.String(),
      password: t.Any()
    })
  })
  .post('/login', async ({ body: { username, password } }) => {
    console.log(username, password)
    try {
      const user = await db.select().from(users).where(eq(users.username, username))
      console.log(user)
      if (user.length === 0) {
        return {
          code: 1,
          msg: '用户名不存在'
        }
      }
      console.log("username", user[0])
      if (+user[0].password !== password) {
        return {
          code: 2,
          msg: '密码错误'
        }
      }
      const token = createUserToken({
        db,
        usersSchema: users,
        tokensSchema: tokens
      })
      const str = await token(
        user[0].id,
        {
          secret: 'your-jwt-secret-key', // 使用与插件配置相同的secret
          accessTokenTime: '12h', // 修正时间格式
          refreshTokenTime: '1d',
        }
      )



      return str
    } catch (error) {

      console.log(error)
    }
  }, {
    body: t.Object({
      username: t.String(),
      password: t.Any()
    })
  })
  // 添加路由
  .get('/', ({ isConnected, connectedUser }) => {
    console.log(isConnected, connectedUser)
    return {
      isConnected,
      connectedUser
    }
  })
  .get('/test', ({ isConnected, connectedUser }) => {
    console.log(isConnected, connectedUser)
    return {
      isConnected,
      connectedUser
    }
  })

  .listen(3007);

console.log(
  `🔐 Auth server is running at http://${app.server?.hostname}:${app.server?.port}`
);
