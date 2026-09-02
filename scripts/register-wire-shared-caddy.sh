#!/usr/bin/env bash
# 将 wire.houmq.cn 注册到主 LIMS Caddy（与 cnas.houmq.cn 同机共享 443）。
#
# 前提：线束栈已启动，容器 wire-harness-web 已接入 lims-edge 网络。

set -euo pipefail

MAIN_LIMS_DIR="${MAIN_LIMS_DIR:-/opt/lims-deploy}"
MAIN_CADDYFILE="${MAIN_CADDYFILE:-$MAIN_LIMS_DIR/config/Caddyfile}"
MAIN_ENV="${MAIN_ENV:-$MAIN_LIMS_DIR/.env}"
MAIN_COMPOSE="${MAIN_COMPOSE:-$MAIN_LIMS_DIR/compose/docker-compose.yml}"
MAIN_PROJECT="${MAIN_PROJECT:-lims-prod}"
WIRE_SITE="${WIRE_SITE:-wire.houmq.cn}"
WEB_CONTAINER="${WEB_CONTAINER:-wire-harness-web}"

log() { echo "[register-wire-caddy] $*"; }

if [[ ! -f "$MAIN_CADDYFILE" ]]; then
  echo "未找到主 LIMS Caddyfile：$MAIN_CADDYFILE" >&2
  echo "若 ECS 无 LIMS 主栈，请改用 WIRE_HARNESS_EDGE_MODE=standalone-caddy" >&2
  exit 1
fi

if ! docker ps --format '{{.Names}}' | grep -qx "$WEB_CONTAINER"; then
  echo "未找到线束 web 容器：$WEB_CONTAINER，请先 docker compose up -d web" >&2
  exit 1
fi

docker network inspect lims-edge >/dev/null 2>&1 || docker network create lims-edge
docker network connect lims-edge "$WEB_CONTAINER" 2>/dev/null || true

if grep -q "^${WIRE_SITE} {" "$MAIN_CADDYFILE"; then
  log "Caddyfile 已包含 ${WIRE_SITE}，跳过写入"
else
  log "追加 ${WIRE_SITE} 到 $MAIN_CADDYFILE"
  caddy_block="$(cat <<EOF

${WIRE_SITE} {
	encode gzip
	header {
		Strict-Transport-Security "max-age=31536000; includeSubDomains"
		X-Content-Type-Options "nosniff"
		X-Frame-Options "SAMEORIGIN"
		Referrer-Policy "strict-origin-when-cross-origin"
		-Server
	}
	handle {
		reverse_proxy ${WEB_CONTAINER}:80 {
			health_uri /ready
			health_interval 5s
			health_timeout 3s
		}
	}
}
EOF
)"
  if [[ -w "$MAIN_CADDYFILE" ]]; then
    printf '%s\n' "$caddy_block" >> "$MAIN_CADDYFILE"
  else
    printf '%s\n' "$caddy_block" | sudo tee -a "$MAIN_CADDYFILE" >/dev/null
  fi
fi

caddy_container="$(docker ps --filter "label=com.docker.compose.project=${MAIN_PROJECT}" --filter "name=caddy" --format '{{.Names}}' | head -1)"
if [[ -z "$caddy_container" ]]; then
  caddy_container="$(docker ps --format '{{.Names}}' | grep -E 'caddy' | head -1 || true)"
fi

if [[ -n "$caddy_container" ]]; then
  docker network connect lims-edge "$caddy_container" 2>/dev/null || true
  log "重建 Caddy：$caddy_container"
  if [[ -f "$MAIN_COMPOSE" && -f "$MAIN_ENV" ]]; then
    if docker compose -p "$MAIN_PROJECT" -f "$MAIN_COMPOSE" --env-file "$MAIN_ENV" up -d --force-recreate caddy --no-build 2>/dev/null; then
      :
    else
      sudo docker compose -p "$MAIN_PROJECT" -f "$MAIN_COMPOSE" --env-file "$MAIN_ENV" up -d --force-recreate caddy --no-build
    fi
  else
    docker restart "$caddy_container"
  fi
else
  log "未找到 Caddy 容器，请手动 reload 主 LIMS Caddy"
  exit 1
fi

log "完成。验证：curl -fsS https://${WIRE_SITE}/ready"
