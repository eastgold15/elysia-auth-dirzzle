# Elysia Auth Drizzle - NPM包测试示例

这个示例展示了如何通过npm包的方式安装和测试 `elysia-auth-drizzle` 认证插件。

## 🚀 快速开始

### 1. 构建主包

首先，在主项目目录中构建npm包：

```bash
# 在主项目根目录 (elysia-auth-dirzzle2) 执行
cd ..
npm run build
```

### 2. 打包为本地npm包

```bash
# 在主项目根目录执行
npm pack
# 这会生成 elysia-auth-drizzle-1.0.0.tgz 文件
```

### 3. 安装依赖和本地包

```bash
# 在 example2 目录执行
cd example2
npm install

# 安装本地构建的包
npm run install-local
# 或者手动安装：
# npm install ../elysia-auth-drizzle-1.0.0.tgz
```

### 4. 测试包功能

```bash
# 运行包功能测试
npm run test-package
```

### 5. 运行示例服务器

```bash
# 启动开发服务器
npm run dev
```

## 📁 文件说明

- `src/index.ts` - 使用npm包方式导入的完整示例
- `src/test-package.ts` - 包功能测试脚本
- `package.json` - 包含本地包安装脚本的配置

## 🔧 测试流程

### 方法一：完整测试流程

```bash
# 1. 构建主包
cd .. && npm run build

# 2. 打包
npm pack

# 3. 安装测试
cd example2
npm install
npm run install-local

# 4. 功能测试
npm run test-package

# 5. 运行示例
npm run dev
```

### 方法二：使用发布的npm包

如果包已发布到npm registry：

```bash
# 直接安装发布的包
npm install elysia-auth-drizzle

# 运行测试
npm run test-package
npm run dev
```

## 🧪 测试内容

测试脚本会验证以下功能：

1. ✅ **包导入** - 验证所有导出的函数和类型
2. ✅ **插件初始化** - 测试插件配置和初始化
3. ✅ **路由配置** - 验证公开和受保护路由
4. ✅ **类型定义** - 确保TypeScript类型正确
5. ✅ **依赖兼容性** - 检查与Elysia和Drizzle的兼容性

## 🔍 故障排除

### 常见问题

1. **包导入失败**
   ```bash
   # 确保包已正确构建
   cd .. && npm run build
   
   # 重新安装本地包
   npm run install-local
   ```

2. **依赖缺失**
   ```bash
   # 安装所有依赖
   npm install
   ```

3. **类型错误**
   ```bash
   # 确保TypeScript配置正确
   npx tsc --noEmit
   ```

### 验证安装

检查包是否正确安装：

```bash
# 查看已安装的包
npm list elysia-auth-drizzle

# 查看包内容
ls node_modules/elysia-auth-drizzle/
```

## 📋 API测试

启动服务器后，可以测试以下端点：

```bash
# 公开路由（无需认证）
curl http://localhost:3000/public/test

# 受保护路由（需要认证）
curl http://localhost:3000/protected
```

## 🔄 开发模式切换

在开发过程中，可以在本地包和源码之间切换：

```typescript
// 使用npm包（生产模式）
import { elysiaAuthDrizzlePlugin } from 'elysia-auth-drizzle';

// 使用源码（开发模式）
// import { elysiaAuthDrizzlePlugin } from '../../src/index';
```

## 📦 包结构验证

成功安装后，包应包含以下文件：

```
node_modules/elysia-auth-drizzle/
├── dist/
│   ├── index.mjs          # ESM格式
│   ├── index.d.ts         # TypeScript类型定义
│   └── cjs/
│       └── index.js       # CommonJS格式
├── package.json
└── README.md
```

这样就可以完全模拟真实的npm包使用场景，确保插件在实际部署时能够正常工作。