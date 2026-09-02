#!/usr/bin/env bash
# GitHub Actions 或手工：load 镜像后 retag 并滚动更新 compose。
set -euo pipefail

DEPLOY_DIR="${DEPLOY_DIR:-/opt/wire-harness-deploy}"
ENV_FILE="${ENV_FILE:-$DEPLOY_DIR/.env}"
COMPOSE_FILE="${COMPOSE_FILE:-$DEPLOY_DIR/deploy/docker-compose.ecs.yml}"
PROJECT_NAME="${PROJECT_NAME:-wire-harness-prod}"
RUNTIME_BACKEND_TAG="${RUNTIME_BACKEND_TAG:-wire-harness-backend:ecs}"
RUNTIME_WEB_TAG="${RUNTIME_WEB_TAG:-wire-harness-web:ecs}"
EDGE_MODE="${WIRE_HARNESS_EDGE_MODE:-host-nginx}"

# shellcheck disable=SC1090
[[ -f "$ENV_FILE" ]] && set -a && source "$ENV_FILE" && set +a
EDGE_MODE="${WIRE_HARNESS_EDGE_MODE:-host-nginx}"
MAIN_LIMS_DIR="${MAIN_LIMS_DIR:-/opt/lims-deploy}"

if [[ "$EDGE_MODE" == "shared-caddy" && ! -f "${MAIN_LIMS_DIR}/config/Caddyfile" ]]; then
  echo "未找到 ${MAIN_LIMS_DIR}/config/Caddyfile，自动切换为 host-nginx（不占用 80/443，避免影响 ops.houmq.cn 等站点）"
  EDGE_MODE=host-nginx
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

assert_standalone_ports_available() {
  local port
  for port in 80 443; do
    if ss -tlnp 2>/dev/null | grep -q ":${port} "; then
      echo "ERROR: 端口 ${port} 已被占用。" >&2
      if systemctl is-active --quiet nginx 2>/dev/null; then
        echo "主机 Nginx 正在运行（ops.houmq.cn / houmq.cn 等依赖它）。" >&2
        echo "同机部署请使用 WIRE_HARNESS_EDGE_MODE=host-nginx，勿使用 standalone-caddy。" >&2
      else
        echo "standalone-caddy 需要独占 80/443，请先释放端口或改用 host-nginx。" >&2
      fi
      exit 1
    fi
  done
}

stop_standalone_caddy() {
  docker compose "${compose_args[@]}" --profile standalone-caddy stop caddy 2>/dev/null || true
  docker compose "${compose_args[@]}" --profile standalone-caddy rm -f caddy 2>/dev/null || true
}

ensure_host_nginx() {
  bash "$DEPLOY_DIR/scripts/register-wire-host-nginx.sh"
}

docker network inspect lims-edge >/dev/null 2>&1 || docker network create lims-edge

cd "$DEPLOY_DIR"
compose_args=(-f "$COMPOSE_FILE" --env-file "$ENV_FILE" -p "$PROJECT_NAME")
if [[ "$EDGE_MODE" == "standalone-caddy" ]]; then
  mkdir -p /data/wire-harness/caddy/{data,config}
  assert_standalone_ports_available
  bash "$DEPLOY_DIR/scripts/render-caddyfile.sh" "$DEPLOY_DIR/deploy/Caddyfile.ecs"
  docker compose "${compose_args[@]}" --profile standalone-caddy up -d --remove-orphans
else
  stop_standalone_caddy
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

wait_ready_with_host() {
  local base_url="$1"
  local host="$2"
  local attempts="${3:-45}"
  for i in $(seq 1 "$attempts"); do
    if curl -fsS -H "Host: ${host}" "${base_url}/healthz" >/dev/null \
      && curl -fsS -H "Host: ${host}" "${base_url}/ready" >/dev/null; then
      return 0
    fi
    sleep 2
  done
  return 1
}

wait_https_local() {
  local host="$1"
  local attempts="${2:-60}"
  for i in $(seq 1 "$attempts"); do
    if curl -fsSk --resolve "${host}:443:127.0.0.1" "https://${host}/healthz" >/dev/null \
      && curl -fsSk --resolve "${host}:443:127.0.0.1" "https://${host}/ready" >/dev/null; then
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
  site_host="${SITE_ADDRESS:-wire.houmq.cn}"
  if ! wait_ready_with_host "http://127.0.0.1" "$site_host"; then
    docker compose "${compose_args[@]}" logs caddy --tail 100 || true
    echo "Caddy HTTP health check failed on 127.0.0.1" >&2
    exit 1
  fi
  echo "Caddy HTTP OK (127.0.0.1)"
  if wait_https_local "$site_host"; then
    echo "Deploy OK: https://${site_host}"
  else
    docker compose "${compose_args[@]}" logs caddy --tail 100 || true
    echo "WARN: HTTPS 尚未就绪（ACME 可能仍在申请或安全组未放行 443）" >&2
    echo "HTTP 已可用；请确认 DNS 指向本机且安全组放行 80/443，稍后执行: curl -vk https://${site_host}/ready" >&2
    echo "Deploy OK (HTTP only for now): http://${site_host}"
  fi
else
  ensure_host_nginx
  site_host="${SITE_ADDRESS:-wire.houmq.cn}"
  if wait_https_local "$site_host"; then
    echo "Deploy OK: https://${site_host} (host-nginx, 与 ops.houmq.cn 等同机共享 443)"
  else
    echo "WARN: host-nginx HTTPS 检查未通过: https://${site_host}" >&2
    echo "Deploy OK: ${local_health_url} (container healthy; check nginx/certbot)"
  fi
fi

if [[ "${DEPLOY_CLEANUP_DOCKER:-0}" == "1" ]]; then
  keep_days="${DEPLOY_CLEANUP_KEEP_DAYS:-1}"
  docker image prune -af --filter "until=${keep_days}h" || true
fi
