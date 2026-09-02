#!/usr/bin/env bash
# GitHub Actions 或手工：load 镜像后 retag 并滚动更新 compose。
set -euo pipefail

DEPLOY_DIR="${DEPLOY_DIR:-/opt/wire-harness-deploy}"
ENV_FILE="${ENV_FILE:-$DEPLOY_DIR/.env}"
COMPOSE_FILE="${COMPOSE_FILE:-$DEPLOY_DIR/deploy/docker-compose.ecs.yml}"
PROJECT_NAME="${PROJECT_NAME:-wire-harness-prod}"
RUNTIME_BACKEND_TAG="${RUNTIME_BACKEND_TAG:-wire-harness-backend:ecs}"
RUNTIME_WEB_TAG="${RUNTIME_WEB_TAG:-wire-harness-web:ecs}"
EDGE_MODE="${WIRE_HARNESS_EDGE_MODE:-standalone-caddy}"

# shellcheck disable=SC1090
[[ -f "$ENV_FILE" ]] && set -a && source "$ENV_FILE" && set +a
EDGE_MODE="${WIRE_HARNESS_EDGE_MODE:-standalone-caddy}"
MAIN_LIMS_DIR="${MAIN_LIMS_DIR:-/opt/lims-deploy}"

if [[ "$EDGE_MODE" == "shared-caddy" && ! -f "${MAIN_LIMS_DIR}/config/Caddyfile" ]]; then
  echo "未找到 ${MAIN_LIMS_DIR}/config/Caddyfile，自动切换为 standalone-caddy"
  EDGE_MODE=standalone-caddy
fi

retag_if_set() {
  local src="$1"
  local dst="$2"
  if [[ -n "$src" ]]; then
    docker tag "$src" "$dst"
    echo "Retagged $src -> $dst"
  fi
}

retag_if_set "${RETAG_BACKEND:-}" "$RUNTIME_BACKEND_TAG"
retag_if_set "${RETAG_WEB:-}" "$RUNTIME_WEB_TAG"

ensure_caddy_ports() {
  local port pid
  for port in 80 443; do
    if ss -tlnp 2>/dev/null | grep -q ":${port} "; then
      if systemctl is-active --quiet nginx 2>/dev/null; then
        echo "Port ${port} occupied by nginx; stopping nginx so Caddy can bind 80/443..."
        sudo systemctl stop nginx || true
      fi
    fi
  done
}

docker network inspect lims-edge >/dev/null 2>&1 || docker network create lims-edge

cd "$DEPLOY_DIR"
compose_args=(-f "$COMPOSE_FILE" --env-file "$ENV_FILE" -p "$PROJECT_NAME")
if [[ "$EDGE_MODE" == "standalone-caddy" ]]; then
  mkdir -p /data/wire-harness/caddy/{data,config}
  ensure_caddy_ports
  docker compose "${compose_args[@]}" --profile standalone-caddy up -d --remove-orphans
else
  docker compose "${compose_args[@]}" up -d --remove-orphans
fi
docker compose "${compose_args[@]}" ps

wait_ready() {
  local url="$1"
  local attempts="${2:-30}"
  for i in $(seq 1 "$attempts"); do
    if curl -fsS "${url}/healthz" >/dev/null && curl -fsS "${url}/ready" >/dev/null; then
      return 0
    fi
    sleep 2
  done
  return 1
}

wait_ready_in_container() {
  for i in 1 2 3 4 5 6 7 8 9 10; do
    if docker compose "${compose_args[@]}" exec -T web curl -fsS http://127.0.0.1/healthz >/dev/null \
      && docker compose "${compose_args[@]}" exec -T web curl -fsS http://127.0.0.1/ready >/dev/null; then
      return 0
    fi
    sleep 2
  done
  return 1
}

if ! wait_ready_in_container; then
  echo "container health check failed on wire-harness-web" >&2
  exit 1
fi
echo "Container health OK"

web_port="${WEB_HOST_PORT:-8096}"
web_bind="${WEB_HOST_BIND:-127.0.0.1}"
local_health_url="http://${web_bind}:${web_port}"
public_site="${PUBLIC_SITE_URL:-https://wire.houmq.cn}"
public_site="${public_site%/}"

if [[ "$EDGE_MODE" == "shared-caddy" ]]; then
  bash "$DEPLOY_DIR/scripts/register-wire-shared-caddy.sh"
  if wait_ready "$public_site"; then
    echo "Deploy OK: ${public_site}"
  else
    echo "Caddy registered but HTTPS health check failed: ${public_site}" >&2
    exit 1
  fi
elif [[ "$EDGE_MODE" == "standalone-caddy" ]]; then
  if wait_ready "$public_site"; then
    echo "Deploy OK: ${public_site}"
  else
    echo "standalone Caddy health check failed: ${public_site}" >&2
    exit 1
  fi
else
  echo "Deploy OK: ${local_health_url} (host-nginx mode)"
fi

if [[ "${DEPLOY_CLEANUP_DOCKER:-0}" == "1" ]]; then
  keep_days="${DEPLOY_CLEANUP_KEEP_DAYS:-1}"
  docker image prune -af --filter "until=${keep_days}h" || true
fi
