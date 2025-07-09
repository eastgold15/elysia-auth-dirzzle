# Rolldown 构建指南

## 概述

本项目已成功迁移到使用 Rolldown 作为主要构建工具，替代了之前的 Tsup。Rolldown 是一个基于 Rust 的高性能 JavaScript 打包工具，提供了更快的构建速度和更好的性能。

## 构建输出

### 生成的文件格式

构建过程会生成以下文件：

```
dist/
├── index.mjs          # ES 模块格式 (ESM)
├── index.cjs          # CommonJS 格式 (CJS)
├── index.d.ts         # TypeScript 声明文件
└── *.d.ts             # 其他模块的声明文件
```

### 双包格式支持

1. **ESM 格式 (`.mjs`)**
   - 现代 JavaScript 模块格式
   - 支持静态分析和 Tree Shaking
   - 适用于现代打包工具和 Node.js ESM 环境

2. **CommonJS 格式 (`.cjs`)**
   - 传统 Node.js 模块格式
   - 向后兼容性好
   - 适用于传统 Node.js 项目

## 构建配置详解

### Rolldown 配置 (`rolldown.config.js`)

```javascript
import { defineConfig } from 'rolldown';

const mainConfig = defineConfig({
  // 入口文件
  input: 'src/index.ts',
  
  // 双格式输出
  output: [
    {
      file: 'dist/index.mjs',
      format: 'esm',
      sourcemap: false,
    },
    {
      file: 'dist/index.cjs',
      format: 'cjs',
      sourcemap: false,
      exports: 'named',
    }
  ],
  
  // 外部依赖配置
  external: [
    'elysia',
    'drizzle-orm',
    'jsonwebtoken',
    // ... 其他依赖
  ],
  
  // 启用 Tree Shaking
  treeshake: true,
});
```

### TypeScript 声明文件生成

使用 `tsconfig.dts.json` 配置文件生成 TypeScript 声明文件：

```json
{
  "compilerOptions": {
    "declaration": true,
    "emitDeclarationOnly": true,
    "outDir": "./dist",
    "rootDir": "./src",
    "skipLibCheck": true
  },
  "include": ["src/**/*"],
  "exclude": ["node_modules", "test", "example", "example2", "dist"]
}
```

## 构建命令

### 主要构建命令

```bash
# 完整构建（JavaScript + TypeScript 声明文件）
bun run build

# 等价于
rolldown -c rolldown.config.js && tsc --project tsconfig.dts.json
```

### 其他可用命令

```bash
# 使用旧的 Tsup 构建（备用）
bun run build:old

# 运行测试
bun run test

# 发布到 npm
bun run release
```

## 包的使用方式

### package.json 配置

```json
{
  "main": "./dist/index.cjs",
  "module": "./dist/index.mjs",
  "types": "./dist/index.d.ts",
  "exports": {
    ".": {
      "types": "./dist/index.d.ts",
      "import": "./dist/index.mjs",
      "require": "./dist/index.cjs"
    }
  }
}
```

### 在项目中使用

#### ESM 项目
```javascript
import { elysiaAuthDrizzlePlugin } from '@pori15/elysia-auth-drizzle';
```

#### CommonJS 项目
```javascript
const { elysiaAuthDrizzlePlugin } = require('@pori15/elysia-auth-drizzle');
```

#### TypeScript 项目
```typescript
import { elysiaAuthDrizzlePlugin } from '@pori15/elysia-auth-drizzle';
// 自动获得完整的类型支持
```

## Rolldown 的优势

### 性能优势
- **构建速度**：比传统 JavaScript 打包工具快 10-30 倍
- **内存使用**：更低的内存占用
- **并行处理**：充分利用多核 CPU

### 功能优势
- **Rollup 兼容**：完全兼容 Rollup API，迁移成本低
- **原生支持**：无需插件即可处理 CommonJS/ESM 混合模块
- **现代特性**：内置 Tree Shaking、代码分割等功能

### 开发体验
- **配置简单**：相比 Webpack 等工具配置更简洁
- **错误提示**：清晰的错误信息和警告
- **热重载**：支持开发时的快速重新构建

## 故障排除

### 常见问题

1. **模块类型警告**
   ```
   Warning: Module type of file:///path/to/rolldown.config.js is not specified
   ```
   **解决方案**：在 `package.json` 中添加 `"type": "module"`

2. **外部依赖未解析**
   ```
   Warning: Could not resolve 'some-module'
   ```
   **解决方案**：在 `rolldown.config.js` 的 `external` 数组中添加该模块

3. **TypeScript 声明文件生成失败**
   **解决方案**：检查 `tsconfig.dts.json` 配置，确保 `include` 和 `exclude` 路径正确

### 调试技巧

1. **查看构建输出**
   ```bash
   # 详细输出
   rolldown -c rolldown.config.js --verbose
   ```

2. **分析包大小**
   ```bash
   # 生成分析报告
   rolldown -c rolldown.config.js --analyze
   ```

3. **检查生成的文件**
   ```bash
   # 查看生成的文件结构
   ls -la dist/
   ```

## 最佳实践

### 1. 依赖管理
- 将所有运行时依赖标记为 `external`
- 只打包项目自身的代码
- 使用 `peerDependencies` 声明必需的外部依赖

### 2. 构建优化
- 启用 `treeshake` 减小包体积
- 合理配置 `external` 避免重复打包
- 使用适当的 `target` 和 `format` 设置

### 3. 类型安全
- 始终生成 TypeScript 声明文件
- 使用严格的 TypeScript 配置
- 定期检查类型覆盖率

### 4. 版本管理
- 遵循语义化版本控制
- 在发布前进行充分测试
- 维护详细的变更日志

## 总结

Rolldown 为本项目提供了：
- ✅ 更快的构建速度
- ✅ 双格式输出支持（ESM + CommonJS）
- ✅ 完整的 TypeScript 支持
- ✅ 简洁的配置
- ✅ 优秀的开发体验

通过这次迁移，项目的构建效率得到了显著提升，同时保持了对各种使用场景的兼容性。