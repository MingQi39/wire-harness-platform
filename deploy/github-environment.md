# GitHub Actions 部署（wire.houmq.cn）

参考 `lims-electron` 的 **Deploy LIMS Frontend (Full Edition)**（`deploy-full.yml`）：同机 ECS、SSH 传镜像、独立数据目录。

## 仓库 Environment

在 `MingQi39/wire-harness-platform` 创建 Environment：**`production`**

### Secrets（可与 LIMS `full` / `ecs` 环境共用 ECS 凭证）

| Secret | 说明 |
|--------|------|
| `ECS_HOST` | 与 LIMS main 相同腾讯云 ECS 公网 IP |
| `ECS_USER` | 通常 `ecs-user` |
| `ECS_SSH_PRIVATE_KEY` | 部署 SSH 私钥 |
| `ECS_PORT` | 可选，默认 `22` |
| `VITE_PASSWORD_ENCRYPT_KEY` | 须与服务器 `/opt/wire-harness-deploy/.env` 中 `PASSWORD_ENCRYPT_KEY` 一致 |

### Variables（可选）

| Variable | 默认值 |
|----------|--------|
| `ECS_DEPLOY_DIR` | `/opt/wire-harness-deploy` |
| `ECS_RUNTIME_ENV` | `/opt/wire-harness-deploy/.env` |
| `ECS_RUNTIME_COMPOSE` | `/opt/wire-harness-deploy/deploy/docker-compose.ecs.yml` |
| `ECS_RUNTIME_PROJECT` | `wire-harness-prod` |
| `VITE_API_BASE_URL` | `https://wire.houmq.cn/` |

## 服务器首次初始化

```bash
# 在 ECS 上（需 sudo）
sudo mkdir -p /opt/wire-harness-deploy
# 将 deploy/ scripts/ 同步到 /opt/wire-harness-deploy 后：
sudo bash /opt/wire-harness-deploy/scripts/bootstrap-ecs.sh
vim /opt/wire-harness-deploy/.env   # 填入密钥，确认 WIRE_HARNESS_EDGE_MODE=shared-caddy
docker network create lims-edge 2>/dev/null || true
docker compose -f /opt/wire-harness-deploy/deploy/docker-compose.ecs.yml \
  --env-file /opt/wire-harness-deploy/.env -p wire-harness-prod up -d
sudo bash /opt/wire-harness-deploy/scripts/register-wire-shared-caddy.sh
```

## 数据隔离（重要）

| 项目 | 数据目录 | 部署目录 |
|------|----------|----------|
| LIMS 主站 | `/data/lims` | `/opt/lims-deploy` |
| LIMS 完整版 | `/data/lims-cnas` | `/opt/lims-cnas-deploy` |
| **线束平台** | **`/data/wire-harness`** | **`/opt/wire-harness-deploy`** |

PostgreSQL / Redis / 上传附件均在线束独立 compose 内，**不与 LIMS 共用库或卷**。

## 触发部署

Actions → **Deploy Wire Harness Platform** → Run workflow（`main` 分支）

推送 `main` 也会自动触发（与 lims-ops 类似）。

## 验证

```bash
curl -fsS https://wire.houmq.cn/ready
curl -fsS http://127.0.0.1:8096/healthz
docker compose -f /opt/wire-harness-deploy/deploy/docker-compose.ecs.yml -p wire-harness-prod ps
ls -la /data/wire-harness/
```
