# OC CLI

一个基于 TypeScript 的 Monorepo 模板与资源管理脚手架。采用类似 Shadcn UI 的 Registry 方案，支持通过远程 HTTP 地址按需安装代码片段。

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
├── template/               # 子模块模板仓库
│   ├── apps/
│   │   ├── server-auth/    # 认证服务模板
│   │   ├── server-template/ # API 服务模板
│   │   └── web-template/   # Web 应用模板
│   └── packages/
│       ├── biome-config/   # Biome 配置模板
│       ├── typescript-config/ # TypeScript 配置模板
│       ├── share-auth/     # 鉴权共享库模板
│       ├── share-backend/  # 后端共享库模板
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
# 验证安装
oc --version
# 显示帮助信息
oc --help
# 运行测试
bun test
```

### 2. 如何使用

```bash
# 快速初始化一个集成 auth 的 monorepo 项目
oc init my-monorepo-name

# 默认会创建完整三应用：
# - apps/server-auth
# - apps/server-api
# - apps/web-app

# 添加 一个web应用
oc add app web-template my-web-app

# 添加 一个hono服务端应用
oc add app server-template server-api

# 同步 UI 共享库
oc sync package share-ui

# 同步 packages 目录下的共享库
oc sync packages
```

## 其他

### 子模板仓库：

[oc-template](https://github.com/ecafe8/oc-template)

```bash
git submodule add git@github.com:ecafe8/oc-template.git template
```

### 注意:

`template` 目录作为子模块存在，CLI 只会读取并复制其中内容，不直接修改 submodule 源码。

克隆本仓库时请使用 `--recursive` 参数:

```bash
git clone --recursive
```
