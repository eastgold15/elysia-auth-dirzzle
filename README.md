# elysia-auth-drizzle

Library who handle authentification (Header/Cookie/QueryParam).

## Installation
```bash
bun add elysia-auth-drizzle
```

## Usage

```typescript
import { elysiaAuthDrizzlePlugin } from 'elysia-auth-drizzle';
import { Elysia } from 'elysia';

export const app = new Elysia()
  .use(
    elysiaAuthDrizzlePlugin<typeof users.$inferSelect>({
      config: [
        {
          url: '/public',
          method: 'GET',
        },
      ],
      jwtSecret: 'test',
      drizzle: {
        db: db,
        usersSchema: users,
        tokensSchema: tokens,
      },
    }),
  )
```

## Plugin options

| name                       | default   | description                                                                                                                                            |
|--------------------------|---------|------------------------------------------------------------------------------------------------------------------------------------------------------|
| jwtSecret                  | undefined | Secret used to sign JWT                                                                                                                                |
| drizzle                    | undefined | Contain drizzle db + users schema + tokens schemas ({db, userSchemas, tokenSchemas} / Token Schemas is optional if you use verifyAccessTokenOnlyInJWT) |
| config                     | []        | Array who contain url with method allowed in public                                                                                                    |
| cookieSecret               | undefined | (optional) Secret used to sign cookie value                                                                                                            |
| verifyAccessTokenOnlyInJWT | false     | (optional) Check only JWT expiration not token validity in DB                                                                                          |
| userValidation             | undefined | (optional) (user) => void or `Promise<void>` / Allow to make more check regarding user (ex: check if user is banned)                                   |

## Tests

To execute jest tests (all errors, type integrity test)

```
bun test
```
### 项目概述
这是一个为 Elysia 框架设计的认证插件，支持多种认证方式（Header/Cookie/QueryParam），并与 Drizzle ORM 深度集成。

### 核心功能
1. 多种认证方式支持 ：支持通过 HTTP Header、Cookie 或查询参数进行身份验证
2. JWT 集成 ：内置 JWT 令牌生成和验证功能
3. Drizzle ORM 集成 ：直接与数据库用户和令牌表交互
4. 灵活的公共路由配置 ：可配置无需认证的公共访问路径
5. 用户自定义验证 ：支持额外的用户状态检查（如封禁状态）
### 配置选项详解
- jwtSecret ：JWT 签名密钥，必需参数
- drizzle ：数据库配置，包含 db 实例、用户表和令牌表 schema
- config ：公共路由配置数组，定义无需认证的 URL 和 HTTP 方法
- cookieSecret ：Cookie 签名密钥（可选）
- verifyAccessTokenOnlyInJWT ：仅验证 JWT 过期时间，不检查数据库中的令牌有效性
- userValidation ：自定义用户验证函数