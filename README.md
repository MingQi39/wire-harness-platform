# 线束管理平台（wire-harness-platform）

基于 LIMS 登录体系与表格 UI 风格的 Web 端线束管理平台。

> 目录名使用 `wire-harness-platform`，明确指 **wire harness（线束）**，避免与 AI 领域的 evaluation harness 等概念混淆。

## 目录结构

```
wire-harness-platform/
├── web/          # React + Vite 前端（Web 专用，无 Electron）
├── server/       # Go + Gin 后端（复用 LIMS 认证）
└── docker-compose.yml
```

## 快速开始

### 1. 启动基础设施

```bash
docker compose up -d
```

### 2. 后端

```bash
cd server
cp .env.example .env
go run ./cmd/server/main.go migrate up
go run ./cmd/server/main.go
```

默认管理员：`bjy` / `qwer.123`

### 3. 前端

```bash
cd web
pnpm install
pnpm dev
```

访问 http://localhost:5173，登录后进入 **线束台账**。

## 线束台账功能

- **上表（线束信息）**：项目名称、平台型号、回路数、开关量、附件（Word/Excel/PDF）
- **下表（线束明细）**：线束名称、编号、用途、状态（在用/空闲/报废）、责任人
- 支持新增/编辑/删除、CSV 导入导出、下载导入模板

## 生产部署（wire.houmq.cn）

与 LIMS 共用腾讯云 ECS，数据目录 **`/data/wire-harness`**（独立 PostgreSQL/Redis，不与 LIMS 混用）。

详见 [deploy/README.md](./deploy/README.md) 与 [deploy/github-environment.md](./deploy/github-environment.md)。

```bash
# GitHub Actions：main 推送或手动 Run workflow
# 首次 ECS：sudo bash scripts/bootstrap-ecs.sh
```

## 技术栈

- 前端：React 19 + Vite 6 + Tailwind CSS 4 + TanStack Table
- 后端：Go + Gin + PostgreSQL + Redis + JWT
- 认证：与 LIMS 一致（AES 密码加密 + JWT access + HttpOnly Cookie refresh）
