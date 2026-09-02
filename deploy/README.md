# 线束管理平台 ECS 部署

生产域名：**https://wire.houmq.cn**

与 LIMS 共用同一台腾讯云 ECS，但使用**独立数据目录** `/data/wire-harness`（PostgreSQL、Redis、上传文件均隔离，勿与 `/data/lims` 混用）。

## 目录

| 路径 | 用途 |
|------|------|
| `/opt/wire-harness-deploy` | 部署配置、compose、脚本 |
| `/data/wire-harness/postgres` | 数据库 |
| `/data/wire-harness/redis` | Redis |
| `/data/wire-harness/uploads` | 附件 |
| `/data/wire-harness/backups` | 备份（预留） |

HTTPS 由**主机 Nginx** 统一终结（`WIRE_HARNESS_EDGE_MODE=host-nginx`，`scripts/register-wire-host-nginx.sh` 注册 `wire.houmq.cn → 127.0.0.1:8096`）。与 `ops.houmq.cn`、`houmq.cn` 等同机共享 443，**勿**在本 compose 启 `standalone-caddy`（会抢占 80/443 并停掉其它站点）。

本机调试：`http://127.0.0.1:8096`（不对外暴露明文 HTTP）。

## GitHub Actions

见 [github-environment.md](./github-environment.md)。

## 本地构建 smoke test

```bash
docker build -f deploy/Dockerfile.server -t wire-harness-backend:local .
docker build -f deploy/Dockerfile.web \
  --build-arg VITE_PASSWORD_ENCRYPT_KEY=da6b71d7f087bceec4b116994472c499 \
  -t wire-harness-web:local .
```
