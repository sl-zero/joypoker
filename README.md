# JoyPoker — 联机扑克规则编辑器

在线创建扑克牌局、自定义地方规则、实时联机对战。支持二十一点、斗地主、德州扑克、上游四种玩法。

> **在线体验**：[joypoker-web.vercel.app](https://joypoker-web.vercel.app)

## 技术栈

| 层 | 技术 |
|----|------|
| 前端 | Next.js 15 (App Router) + React 19 + Tailwind CSS v4 |
| 认证 | NextAuth v5 (Credentials + JWT Session) |
| 游戏服务 | Node.js + Express + Socket.IO |
| 数据库 | SQLite（本地）/ PostgreSQL（生产，Supabase） |
| ORM | Prisma |
| 校验 | Zod + TypeScript |
| 部署 | Vercel（前端）+ Render（游戏服）+ Supabase（DB） |
| 结构 | npm Workspaces Monorepo |

## 项目结构

```
joypoker/
├── apps/
│   ├── web/                  # Next.js 前端
│   │   ├── app/
│   │   │   ├── editor/       # 规则编辑器
│   │   │   ├── rooms/[id]/   # 游戏房间
│   │   │   ├── login/        # 登录
│   │   │   ├── register/     # 注册
│   │   │   └── join/         # 加入房间
│   │   ├── lib/              # 工具库 (auth, prisma, labels)
│   │   └── prisma/           # 数据库 schema
│   └── game-server/          # WebSocket 游戏服务器
│       └── src/              # 各玩法状态机
├── packages/
│   ├── cards-core/           # 卡牌游戏核心逻辑
│   └── rules-schema/         # 规则定义 (Zod schemas + 预设)
└── docs/
    └── superpowers/
        ├── specs/            # 设计文档
        └── plans/            # 实现计划
```

## 快速开始

### 环境要求

- Node.js >= 20
- npm >= 10

### 安装与启动

```bash
# 1. 克隆仓库
git clone https://github.com/sl-zero/joypoker.git
cd joypoker

# 2. 安装依赖
npm install

# 3. 编译 monorepo 本地包
npm run build -w @poker/rules-schema
npm run build -w @poker/cards-core

# 4. 配置环境变量
cp apps/web/.env.example apps/web/.env
# 编辑 apps/web/.env，替换 AUTH_SECRET 和 GAME_JWT_SECRET 为随机值
# 生成随机密钥: openssl rand -base64 32

# 5. 初始化数据库
npm run db:push

# 6. 启动开发服务器（需要两个终端）
# 终端 1: 前端
npm run dev:web

# 终端 2: 游戏服务器
npm run dev:game
```

打开 http://localhost:3000 即可使用。

## 可用命令

| 命令 | 说明 |
|------|------|
| `npm run dev:web` | 启动 Next.js 前端 |
| `npm run dev:game` | 启动游戏服务器 |
| `npm run build` | 构建全部包 |
| `npm run db:push` | 同步 Prisma schema 到数据库 |
| `npm run db:generate` | 生成 Prisma Client |
| `npm run db:migrate:dev` | 创建数据库迁移文件 |

## 玩法

### 二十一点 (Blackjack)
经典 21 点，支持多副牌、分牌、加倍、H17/S17 庄家规则。

### 斗地主
三人/四人场，单副/两副牌，抢地主/叫分制，炸弹翻倍、春天加成、四带二等多种地方规则。

### 德州扑克 (Texas Hold'em)
无限注/底池限注/固定限注，满员桌/单挑/六人桌，可配置盲注、前注、带入、Straddle、Run It Twice。

### 上游 / 争上游
四人/两人场，单副/两副牌，组队 2v2，可配置首出规则、计分方式、炸弹/王炸、跟牌型规则。

## 环境变量

复制 `apps/web/.env.example` 为 `apps/web/.env` 后配置：

| 变量 | 说明 |
|------|------|
| `DATABASE_URL` | SQLite 文件路径（默认 `file:./dev.db`） |
| `AUTH_SECRET` | NextAuth JWT 加密密钥（必须替换） |
| `AUTH_URL` | 站点 URL（默认 `http://localhost:3000`） |
| `GAME_JWT_SECRET` | 游戏服 JWT 签名密钥（必须替换） |
| `INTERNAL_GAME_SECRET` | 内部 API 密钥 |
| `NEXT_PUBLIC_SOCKET_URL` | 游戏服 WebSocket 地址 |

## 常见问题

**Q: 启动报 `@poker/rules-schema` 找不到？**

A: 执行 `npm run build -w @poker/rules-schema` 编译本地包。

**Q: 注册/登录报 `main.User` 表不存在？**

A: 执行 `npm run db:push` 初始化数据库。

**Q: 页面报 JWT 解密错误？**

A: `.env` 中的 `AUTH_SECRET` 被修改过，清除浏览器 localhost:3000 的 cookie 后刷新。

**Q: Windows 下 Prisma Client 生成失败？**

A: 关闭 dev server 后重试 `npx prisma generate`，文件锁导致的问题。
