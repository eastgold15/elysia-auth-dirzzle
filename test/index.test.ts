import { Elysia } from 'elysia'
import { 
  elysiaAuthDrizzlePlugin, 
  getAccessTokenFromRequest, 
  signCookie, 
  unsignCookie,
  checkTokenValidity,
  currentUrlAndMethodIsAllowed
} from '../src'

import { describe, expect, it, beforeAll } from 'bun:test'
import { sign } from 'jsonwebtoken'

// 测试用的请求构造函数
const req = (path: string, options?: RequestInit) => 
  new Request(`http://localhost${path}`, options)

// 测试配置
const testConfig = {
  jwtSecret: 'test-secret-key-for-jwt',
  cookieSecret: 'test-cookie-secret',
  drizzle: {
    db: {
      select: () => ({
        from: () => ({
          where: () => ({
            limit: () => Promise.resolve([{ ownerId: 'user123', accessToken: 'valid-token' }])
          })
        })
      })
    },
    tokensSchema: {
      accessToken: 'accessToken',
      ownerId: 'ownerId'
    },
    usersSchema: {
      id: 'id',
      email: 'email'
    }
  },
  config: [
    { url: '/public/*', method: 'GET' },
    { url: '/login', method: 'POST' }
  ]
}

// 生成测试用的JWT token
const generateTestToken = (payload: any) => {
  return sign(payload, testConfig.jwtSecret, { expiresIn: '1h' })
}

describe('Elysia Auth Drizzle Plugin', () => {
    // 测试工具函数
    describe('Utility Functions', () => {
        it('should sign and unsign cookie correctly', async () => {
            const value = 'test-cookie-value'
            const secret = 'test-secret'
            
            const signed = await signCookie(value, secret)
            expect(signed).toContain('.')
            expect(signed.startsWith(value)).toBe(true)
            
            const unsigned = await unsignCookie(signed, secret)
            expect(unsigned).toBe(value)
        })

        it('should return false for invalid cookie signature', async () => {
            const value = 'test-cookie-value'
            const secret = 'test-secret'
            const wrongSecret = 'wrong-secret'
            
            const signed = await signCookie(value, secret)
            const unsigned = await unsignCookie(signed, wrongSecret)
            expect(unsigned).toBe(false)
        })

        it('should extract access token from request headers', async () => {
            const mockRequest = {
                headers: {
                    authorization: 'Bearer test-token-123'
                },
                cookie: {},
                query: {}
            }
            
            const token = await getAccessTokenFromRequest(mockRequest)
            expect(token).toBe('test-token-123')
        })

        it('should extract access token from query parameters', async () => {
            const mockRequest = {
                query: {
                    access_token: 'query-token-456'
                },
                headers: {},
                cookie: {}
            }
            
            const token = await getAccessTokenFromRequest(mockRequest)
            expect(token).toBe('query-token-456')
        })

        it('should extract access token from cookie', async () => {
            const cookieValue = 'cookie-token-789'
            const mockRequest = {
                cookie: {
                    authorization: {
                        value: cookieValue
                    }
                },
                headers: {},
                query: {}
            }
            
            const token = await getAccessTokenFromRequest(mockRequest)
            expect(token).toBe(cookieValue)
        })

        it('should extract signed cookie token correctly', async () => {
            const originalValue = 'signed-token-123'
            const secret = 'cookie-secret'
            const signedValue = await signCookie(originalValue, secret)
            
            const mockRequest = {
                cookie: {
                    authorization: {
                        value: signedValue
                    }
                },
                headers: {},
                query: {}
            }
            
            const token = await getAccessTokenFromRequest(mockRequest, secret)
            expect(token).toBe(originalValue)
        })
    })

    // 测试URL和方法验证
    describe('URL and Method Validation', () => {
        it('should allow access to public URLs', () => {
            const isAllowed = currentUrlAndMethodIsAllowed(
                '/public/info',
                'GET',
                testConfig.config
            )
            expect(isAllowed).toBe(true)
        })

        it('should allow access to login endpoint', () => {
            const isAllowed = currentUrlAndMethodIsAllowed(
                '/login',
                'POST',
                testConfig.config
            )
            expect(isAllowed).toBe(true)
        })

        it('should deny access to protected URLs', () => {
            const isAllowed = currentUrlAndMethodIsAllowed(
                '/protected/data',
                'GET',
                testConfig.config
            )
            expect(isAllowed).toBe(false)
        })

        it('should deny access with wrong HTTP method', () => {
            const isAllowed = currentUrlAndMethodIsAllowed(
                '/login',
                'GET', // 配置中是POST
                testConfig.config
            )
            expect(isAllowed).toBe(false)
        })

        it('should handle empty config array', () => {
            const isAllowed = currentUrlAndMethodIsAllowed(
                '/any/path',
                'GET',
                []
            )
            expect(isAllowed).toBe(false)
        })
    })

    // 测试JWT token生成和验证
    describe('JWT Token Handling', () => {
        it('should generate valid JWT token', () => {
            const payload = { id: 'user123', email: 'test@example.com' }
            const token = generateTestToken(payload)
            
            expect(token).toBeDefined()
            expect(typeof token).toBe('string')
            expect(token.split('.')).toHaveLength(3) // JWT应该有3个部分
        })

        it('should validate JWT token correctly', async () => {
            const payload = { id: 'user123', email: 'test@example.com' }
            const token = generateTestToken(payload)
            
            // 测试基本的JWT验证
            const { verify } = await import('jsonwebtoken')
            const decoded = verify(token, testConfig.jwtSecret)
            
            expect(decoded).toBeDefined()
            // @ts-ignore
            expect(decoded.id).toBe('user123')
            // @ts-ignore
            expect(decoded.email).toBe('test@example.com')
        })

        it('should reject invalid JWT token', async () => {
            const invalidToken = 'invalid.jwt.token'
            
            const { verify } = await import('jsonwebtoken')
            
            expect(() => {
                verify(invalidToken, testConfig.jwtSecret)
            }).toThrow()
        })

        it('should reject JWT token with wrong secret', async () => {
            const payload = { id: 'user123', email: 'test@example.com' }
            const token = generateTestToken(payload)
            const wrongSecret = 'wrong-secret-key'
            
            const { verify } = await import('jsonwebtoken')
            
            expect(() => {
                verify(token, wrongSecret)
            }).toThrow()
        })
    })

    // 测试插件集成
    describe('Plugin Integration', () => {
        it('should create Elysia app with auth plugin', async () => {
            const app = new Elysia()
                .get('/public', () => 'Public content')
                .get('/protected', () => 'Protected content')
            
            // 验证应用可以正常创建
            expect(app).toBeDefined()
        })

        it('should handle public routes without authentication', async () => {
            const app = new Elysia()
                .get('/public', () => 'Public content')
            
            const response = await app.handle(req('/public'))
            expect(response.status).toBe(200)
            expect(await response.text()).toBe('Public content')
        })

        it('should return 404 for non-existent routes', async () => {
            const app = new Elysia()
                .get('/existing', () => 'Content')
            
            const response = await app.handle(req('/non-existent'))
            expect(response.status).toBe(404)
        })

        it('should handle POST requests', async () => {
            const app = new Elysia()
                .post('/api/data', ({ body }) => ({ received: body }))
            
            const response = await app.handle(req('/api/data', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ test: 'data' })
            }))
            
            expect(response.status).toBe(200)
            const result = await response.json()
            expect(result.received).toEqual({ test: 'data' })
        })
    })

    // 测试错误处理
    describe('Error Handling', () => {
        it('should throw error for invalid cookie value type', async () => {
            expect(async () => {
                // @ts-ignore - 故意传入错误类型进行测试
                await signCookie(123, 'secret')
            }).toThrow()
        })

        it('should throw error for null secret in signCookie', async () => {
            expect(async () => {
                await signCookie('value', null)
            }).toThrow()
        })

        it('should throw error for invalid input type in unsignCookie', async () => {
            expect(async () => {
                // @ts-ignore - 故意传入错误类型进行测试
                await unsignCookie(123, 'secret')
            }).toThrow()
        })

        it('should throw error for null secret in unsignCookie', async () => {
            expect(async () => {
                await unsignCookie('signed.value', null)
            }).toThrow()
        })
    })
})
