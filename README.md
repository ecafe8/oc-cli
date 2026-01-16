# OC CLI

一个基于 TypeScript 和 Monorepo 结构模版和资源管理脚手架。采用类似 Shadcn UI 的 Registry 方案，支持通过远程 HTTP 地址按需安装代码片段。

## 核心特性

- **Registry 模式**: 类似 Shadcn UI，通过 `registry.json` 索引文件管理资源，无需克隆整个仓库。
- **轻量化**: 仅下载你需要的代码，不引入多余的依赖。

## 项目结构

```
oc-cli/
├── bin/
│   └── oc.js              # CLI 可执行入口
├── src/
│   ├── commands/
│   │   ├── init.ts         # `init` 命令实现逻辑
│   │   ├── sync.ts         # `sync` 命令实现逻辑
│   │   └── add.ts          # `add` 命令实现逻辑
│   ├── utils/
│   │   └── config.ts       # 配置文件加载器
│   └── index.ts            # CLI 主程序
├── template/               # 代码片段模板存放目录
│   ├── .gitignore          # 模板目录的 git 忽略文件
│   ├── .editorconfig       # 代码风格配置文件
│   ├── biome.jsonc         # Biome 代码格式化工具配置
│   ├── turbo.json          # Turborepo 配置文件
│   ├── package.json        # 模板项目配置
│   ├── README.md           # 模板使用说明
│   ├── apps/
│   │   ├── electron-template/  # electron 应用模板
│   │   ├── ext-template/       # 浏览器插件 应用模板
│   │   ├── python-template/    # python 应用模板
│   │   ├── web-template/       # web 应用模板
│   │   └── server-hono-template/    # hono 应用模板
│   └── packages/
│       ├── biome-config/   # Biome 配置模板
│       ├── typescript-config/ # TypeScript 配置模板
│       ├── share-frontend/  # 前端共享库模板
│       ├── share-backend/   # 后端共享库模板
│       └── share-ui/       # 组件库模板
├── registry.json           # 资源索引文件
├── package.json            # 项目配置与依赖
├── tsconfig.json           # TypeScript 配置
├── oc.config.ts            # 默认配置文件
└── README.md               # 使用说明
```

## 快速开始

### 1. 安装与构建
```bash
# 安装依赖
bun install
# 构建项目
bun build
# 全局链接 CLI 工具
bun link
```

### 2. 如何使用

```bash
# 快速初始化一个 monorepo 项目
oc init my-monorepo-name

# 添加 一个web应用
oc add app web-template my-web-app

# 同步 前端共享库
oc sync package share-frontend

# 同步 packages 目录下的共享库
oc sync packages
```