#!/usr/bin/env bash
# 首次在 ECS 上初始化线束平台部署目录与独立数据盘路径（/data/wire-harness）。
set -euo pipefail

DEPLOY_DIR="${DEPLOY_DIR:-/opt/wire-harness-deploy}"
DATA_ROOT="${DATA_ROOT:-/data/wire-harness}"
ENV_FILE="${ENV_FILE:-$DEPLOY_DIR/.env}"
COMPOSE_FILE="${COMPOSE_FILE:-$DEPLOY_DIR/deploy/docker-compose.ecs.yml}"
RUN_USER="${RUN_USER:-ubuntu}"

if [[ "$(id -u)" -ne 0 ]]; then
  echo "请使用 sudo 运行：sudo bash scripts/bootstrap-ecs.sh" >&2
  exit 1
fi

mkdir -p "$DEPLOY_DIR"
mkdir -p "$DATA_ROOT"/{postgres,redis,uploads,backups,caddy/{data,config}}
chown -R "$RUN_USER:$RUN_USER" "$DEPLOY_DIR" "$DATA_ROOT"

docker network inspect lims-edge >/dev/null 2>&1 || docker network create lims-edge

if [[ ! -f "$ENV_FILE" ]]; then
  if [[ -f "$DEPLOY_DIR/deploy/.env.ecs.example" ]]; then
    cp "$DEPLOY_DIR/deploy/.env.ecs.example" "$ENV_FILE"
  elif [[ -f "$(dirname "$0")/../deploy/.env.ecs.example" ]]; then
    cp "$(dirname "$0")/../deploy/.env.ecs.example" "$ENV_FILE"
  else
    echo "缺少 deploy/.env.ecs.example，请先同步部署文件到 $DEPLOY_DIR" >&2
    exit 1
  fi
  chown "$RUN_USER:$RUN_USER" "$ENV_FILE"
  chmod 600 "$ENV_FILE"
  echo "已生成 $ENV_FILE，请编辑 DB/Redis/JWT/PASSWORD_ENCRYPT_KEY 后重新执行 compose up"
fi

echo "部署目录: $DEPLOY_DIR"
echo "数据目录: $DATA_ROOT （独立于 LIMS /data/lims）"
echo "下一步："
echo "  1. 编辑 $ENV_FILE（确认 SITE_ADDRESS=wire.houmq.cn、WIRE_HARNESS_EDGE_MODE=host-nginx）"
echo "  2. cd $DEPLOY_DIR && docker compose -f $COMPOSE_FILE --env-file $ENV_FILE -p wire-harness-prod up -d"
echo "  3. 注册 HTTPS：sudo bash $DEPLOY_DIR/scripts/register-wire-host-nginx.sh"
echo "     （wire.houmq.cn 写入主机 Nginx，与 ops.houmq.cn 等同机共享 443）"
