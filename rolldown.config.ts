/**
 * Rolldown 配置文件
 * 用于替代 build.ts，提供更简洁和易懂的打包配置
 * 
 * Rolldown 是一个用 Rust 编写的高性能 JavaScript 打包工具，
 * 兼容 Rollup API，但性能更好，支持原生 CommonJS/ESM 混合模块处理
 * 
 * 此配置同时处理 JavaScript 和 TypeScript 声明文件的生成
 */

import { defineConfig } from 'rolldown';
import { dts } from 'rolldown-plugin-dts';

// ESM 格式构建配置
const esmConfig = defineConfig({
  // 入口文件
  input: 'src/index.ts',
  // ESM 输出配置
  output: {
    dir: 'dist',
    format: 'esm',
    entryFileNames: 'index.mjs', // 自定义输出文件名
    sourcemap: false,
  },
  // 外部依赖 - 不打包进最终文件
  external: [
    // Elysia 相关
    'elysia',
    '@elysiajs/cookie',
    '@elysiajs/jwt',

    // Drizzle ORM 相关
    'drizzle-orm',
    'drizzle-orm/pg-core',
    'drizzle-orm/mysql-core',
    'drizzle-orm/sqlite-core',

    // 依赖包
    'jsonwebtoken',
    '@bogeychan/elysia-logger',
    'unify-errors',

    // Node.js 内置模块
    'crypto',
    'util',
    'path',
    'fs',
    'stream',
    'buffer',

    // 其他可能的依赖
    /^node:/,  // Node.js 内置模块的新格式
  ],

  // 代码分割和优化
  treeshake: true,
});


// TypeScript 声明文件配置
const dtsConfig = defineConfig({
  input: 'src/index.ts',
  output: {
    dir: 'dist/types',
    format: 'esm',
  },
  plugins: [dts()],
  external: [
    // Elysia 相关
    'elysia',
    '@elysiajs/cookie',
    '@elysiajs/jwt',

    // Drizzle ORM 相关
    'drizzle-orm',
    'drizzle-orm/pg-core',
    'drizzle-orm/mysql-core',
    'drizzle-orm/sqlite-core',

    // 依赖包
    'jsonwebtoken',
    '@bogeychan/elysia-logger',
    'unify-errors',

    // Node.js 内置模块
    'crypto',
    'util',
    'path',
    'fs',
    'stream',
    'buffer',

    // 其他可能的依赖
    /^node:/,  // Node.js 内置模块的新格式
  ],
  treeshake: true
});

// 导出多个配置：ESM 和类型声明文件
export default [esmConfig, dtsConfig];

