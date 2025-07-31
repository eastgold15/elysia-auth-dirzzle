# @pori15/elysia-auth-drizzle

一个为 Elysia 框架设计的强大认证插件，支持多种认证方式并与 Drizzle ORM 深度集成。

[![npm version](https://badge.fury.io/js/@pori15%2Felysia-auth-drizzle.svg)](https://badge.fury.io/js/@pori15%2Felysia-auth-drizzle)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)

## ✨ 特性

- 🔐 **多种认证方式**：支持 HTTP Header、Cookie、查询参数三种认证方式
- 🎯 **JWT 集成**：内置 JWT 令牌生成、验证和管理
- 🗄️ **Drizzle ORM 集成**：与数据库用户和令牌表无缝集成
- 🛡️ **Cookie 安全**：支持 HMAC-SHA256 签名的安全 Cookie
- 🚦 **灵活路由控制**：可配置公共路由，无需认证即可访问
- 🔍 **自定义验证**：支持用户状态检查（如封禁、权限验证等）
- ⚡ **高性能**：基于 Elysia 的高性能 Web 框架
- 📝 **TypeScript 支持**：完整的类型定义和类型安全

## 📦 安装

```bash
bun add @pori15/elysia-auth-drizzle
```

或使用 npm：

```bash
npm install @pori15/elysia-auth-drizzle
```

## 🚀 快速开始

### 完整示例

```typescript
import { Elysia, t } from 'elysia'
import { elysiaAuthDrizzlePlugin, createUserToken } from '@pori15/elysia-auth-drizzle'
import { drizzle } from "drizzle-orm/bun-sql"
import { eq } from 'drizzle-orm'
import { tokenSchema, userSchema } from './db/schema'

const db = drizzle(process.env.DATABASE_URL!)

const app = new Elysia()
  .use(
    elysiaAuthDrizzlePlugin<
      typeof userSchema.$inferSelect,
      typeof userSchema,
      typeof tokenSchema
    >({
      jwtSecret: 'your-jwt-secret-key',
      cookieSecret: 'your-cookie-secret-key',
      drizzle: {
        db,
        usersSchema: userSchema,
        tokensSchema: tokenSchema,
      },
      getTokenFrom: {
        from: 'header', // 从请求头获取token
        headerName: 'authorization',
      },
      PublicUrlConfig: [
        { url: '/', method: '*' },
        { url: '/register', method: '*' },
        { url: '/login', method: '*' },
      ],
    })
  )
  .post('/register', async ({ body: { username, password } }) => {
    // 检查用户是否已存在
    const existingUser = await db.select().from(userSchema)
      .where(eq(userSchema.username, username))
    
    if (existingUser.length > 0) {
      return { code: 1, msg: '用户名已存在' }
    }
    
    // 创建新用户
    const newUser = await db.insert(userSchema).values({
      username,
      password
    }).returning({
      id: userSchema.id,
      username: userSchema.username
    })
    
    return newUser
  }, {
    body: t.Object({
      username: t.String(),
      password: t.Any()
    })
  })
  .post('/login', async ({ body: { username, password } }) => {
    // 验证用户
    const user = await db.select().from(userSchema)
      .where(eq(userSchema.username, username))
    
    if (user.length === 0) {
      return { code: 1, msg: '用户名不存在' }
    }
    
    if (+user[0].password !== password) {
      return { code: 2, msg: '密码错误' }
    }
    
    // 创建token
    const token = createUserToken({
      db,
      usersSchema: userSchema,
      tokensSchema: tokenSchema
    })
    
    const tokenResult = await token(
      '' + user[0].id,
      {
        secret: 'your-jwt-secret-key',
        accessTokenTime: '12h',
        refreshTokenTime: '1d',
      }
    )
    
    return tokenResult
  }, {
    body: t.Object({
      username: t.String(),
      password: t.Any()
    })
  })
  .get('/', ({ isConnected, connectedUser }) => {
    return {
      isConnected,
      connectedUser
    }
  })
  .get('/protected', ({ isConnected, connectedUser }) => {
    if (!isConnected) {
      return { error: 'Unauthorized' }
    }
    return { user: connectedUser }
  })
  .listen(3000)

console.log(
  `🔐 Auth server is running at http://${app.server?.hostname}:${app.server?.port}`
)
```

### 基本用法

```typescript
import { Elysia } from 'elysia'
import { elysiaAuthDrizzlePlugin } from '@pori15/elysia-auth-drizzle'
import { db } from './db' // 你的 Drizzle 数据库实例
import { userSchema, tokenSchema } from './schema' // 你的数据库 schema

const app = new Elysia()
  .use(
    elysiaAuthDrizzlePlugin<
      typeof userSchema.$inferSelect,
      typeof userSchema,
      typeof tokenSchema
    >({
      // JWT 密钥
      jwtSecret: process.env.JWT_SECRET!,
      
      // Cookie 签名密钥（可选）
      cookieSecret: process.env.COOKIE_SECRET,
      
      // 数据库配置
      drizzle: {
        db: db,
        usersSchema: userSchema,
        tokensSchema: tokenSchema,
      },
      
      // 认证方式配置（必需）
      getTokenFrom: {
        from: 'header', // 'header' | 'cookie' | 'query'
        headerName: 'authorization', // 默认值
        cookieName: 'authorization', // 默认值
        queryName: 'access_token', // 默认值
      },
      
      // 公共路由配置（无需认证）
      PublicUrlConfig: [
        { url: '/login', method: 'POST' },
        { url: '/register', method: 'POST' },
        { url: '/public/*', method: 'GET' },
      ],
    })
  )
  .get('/protected', ({ isConnected, connectedUser }) => {
    if (!isConnected) {
      return { error: 'Unauthorized' }
    }
    return { user: connectedUser }
  })
  .listen(3000)
```

### 数据库 Schema 示例

```typescript
import { pgTable, serial, text, timestamp, integer } from 'drizzle-orm/pg-core'

// 用户表
export const users = pgTable('users', {
  id: serial('id').primaryKey(),
  username: text('username').notNull().unique(),
  password: text('password').notNull(),
  createdAt: timestamp('created_at').defaultNow(),
  updatedAt: timestamp('updated_at').defaultNow(),
})

// 令牌表（如果不使用 verifyAccessTokenOnlyInJWT）
export const tokens = pgTable('tokens', {
  id: serial('id').primaryKey(),
  ownerId: integer('owner_id').references(() => users.id),
  accessToken: text('access_token').notNull(),
  refreshToken: text('refresh_token'),
  createdAt: timestamp('created_at').defaultNow(),
})
```

## 🔧 配置选项

| 参数 | 类型 | 默认值 | 描述 |
|------|------|--------|------|
| `drizzle` | `object` | **必需** | 数据库配置对象 |
| `getTokenFrom` | `GetTokenOptions` | **必需** | 令牌获取方式配置 |
| `jwtSecret` | `string` | `undefined` | JWT 签名密钥（可选） |
| `cookieSecret` | `string` | `undefined` | Cookie 签名密钥（可选） |
| `PublicUrlConfig` | `UrlConfig[]` | `[{url: '*/login', method: 'POST'}, {url: '*/register', method: 'POST'}]` | 公共路由配置 |
| `verifyAccessTokenOnlyInJWT` | `boolean` | `false` | 仅验证 JWT，不检查数据库 |
| `userValidation` | `function` | `undefined` | 自定义用户验证函数 |
| `prefix` | `string` | `'/api/auth'` | 插件路由前缀 |

### GetTokenOptions 配置

```typescript
interface GetTokenOptions {
  from: 'header' | 'cookie' | 'query'
  headerName?: string // 默认: 'authorization'
  cookieName?: string // 默认: 'authorization'
  queryName?: string  // 默认: 'access_token'
}
```

## 🔐 认证方式

### 1. Header 认证

```typescript
// 配置
getTokenFrom: { from: 'header', headerName: 'authorization' }

// 请求示例
fetch('/api/protected', {
  headers: {
    'Authorization': 'Bearer your-jwt-token'
  }
})
```

### 2. Cookie 认证

```typescript
// 配置
getTokenFrom: { from: 'cookie', cookieName: 'auth_token' }
cookieSecret: 'your-cookie-secret' // 启用 Cookie 签名

// Cookie 会自动包含在请求中
```

### 3. 查询参数认证

```typescript
// 配置
getTokenFrom: { from: 'query', queryName: 'token' }

// 请求示例
fetch('/api/protected?token=your-jwt-token')
```

## 🛠️ 工具函数

插件还导出了一些有用的工具函数：

### 创建用户令牌

```typescript
import { createUserToken } from '@pori15/elysia-auth-drizzle'

// 创建token生成器
const token = createUserToken({
  db,
  usersSchema: userSchema,
  tokensSchema: tokenSchema
})

// 生成用户token
const tokenResult = await token(
  userId, // 用户ID（字符串）
  {
    secret: 'your-jwt-secret-key',
    accessTokenTime: '12h', // 访问令牌有效期
    refreshTokenTime: '1d', // 刷新令牌有效期
  }
)

// 返回结果包含：
// {
//   accessToken: string,
//   refreshToken: string,
//   accessTokenTime: string,
//   refreshTokenTime: string
// }
```

### 其他工具函数

```typescript
import {
  signCookie,
  unsignCookie,
  getAccessTokenFromRequest,
  checkTokenValidity,
  currentUrlAndMethodIsAllowed
} from '@pori15/elysia-auth-drizzle'

// Cookie 签名
const signedCookie = await signCookie('value', 'secret')

// Cookie 验证
const originalValue = await unsignCookie(signedCookie, 'secret')

// 检查 URL 是否为公共路由
const isPublic = currentUrlAndMethodIsAllowed('/login', 'POST', publicRoutes)
```

## 🧪 测试

运行测试套件：

```bash
bun test
```

项目包含完整的测试覆盖：
- ✅ Cookie 签名和验证
- ✅ 多种认证方式的令牌提取
- ✅ URL 和方法验证
- ✅ JWT 令牌处理
- ✅ 插件集成测试
- ✅ 错误处理测试

## 📝 高级用法

### 自定义用户验证

```typescript
elysiaAuthDrizzlePlugin({
  // ... 其他配置
  userValidation: async (user) => {
    // 检查用户是否被封禁
    if (user.status === 'banned') {
      throw new Error('User is banned')
    }
    
    // 检查用户权限
    if (!user.isActive) {
      throw new Error('User account is inactive')
    }
  }
})
```

### 仅 JWT 验证模式

```typescript
elysiaAuthDrizzlePlugin({
  // ... 其他配置
  verifyAccessTokenOnlyInJWT: true, // 不检查数据库中的令牌
  // 在此模式下，tokensSchema 是可选的
})
```

### 动态公共路由

```typescript
const publicRoutes = [
  { url: '/api/health', method: 'GET' },
  { url: '/api/docs/*', method: 'GET' },
  { url: '/auth/*', method: 'POST' },
]

elysiaAuthDrizzlePlugin({
  // ... 其他配置
  PublicUrlConfig: publicRoutes
})
```

## 🤝 贡献

欢迎贡献代码！请确保：

1. 运行测试：`bun test`
2. 遵循代码风格
3. 添加适当的测试用例

## 📄 许可证

MIT License - 详见 [LICENSE](LICENSE) 文件。

## 🔗 相关链接

- [Elysia 框架](https://elysiajs.com/)
- [Drizzle ORM](https://orm.drizzle.team/)
- [JWT.io](https://jwt.io/)

---

如果这个项目对你有帮助，请给个 ⭐️ 支持一下！