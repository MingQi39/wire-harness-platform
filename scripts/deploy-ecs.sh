#!/usr/bin/env bash
# GitHub Actions 或手工：load 镜像后 retag 并滚动更新 compose。
set -euo pipefail

DEPLOY_DIR="${DEPLOY_DIR:-/opt/wire-harness-deploy}"
ENV_FILE="${ENV_FILE:-$DEPLOY_DIR/.env}"
COMPOSE_FILE="${COMPOSE_FILE:-$DEPLOY_DIR/deploy/docker-compose.ecs.yml}"
PROJECT_NAME="${PROJECT_NAME:-wire-harness-prod}"
RUNTIME_BACKEND_TAG="${RUNTIME_BACKEND_TAG:-wire-harness-backend:ecs}"
RUNTIME_WEB_TAG="${RUNTIME_WEB_TAG:-wire-harness-web:ecs}"
EDGE_MODE="${WIRE_HARNESS_EDGE_MODE:-shared-caddy}"

# shellcheck disable=SC1090
[[ -f "$ENV_FILE" ]] && set -a && source "$ENV_FILE" && set +a
EDGE_MODE="${WIRE_HARNESS_EDGE_MODE:-shared-caddy}"

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

docker network inspect lims-edge >/dev/null 2>&1 || docker network create lims-edge

cd "$DEPLOY_DIR"
compose_args=(-f "$COMPOSE_FILE" --env-file "$ENV_FILE" -p "$PROJECT_NAME")
if [[ "$EDGE_MODE" == "standalone-caddy" ]]; then
  docker compose "${compose_args[@]}" --profile standalone-caddy up -d --remove-orphans
else
  docker compose "${compose_args[@]}" up -d --remove-orphans
fi
docker compose "${compose_args[@]}" ps

web_port="$(grep -E '^WEB_HOST_PORT=' "$ENV_FILE" | tail -n1 | cut -d= -f2- || true)"
web_port="${web_port:-127.0.0.1:8096:80}"
local_health_url="http://127.0.0.1:8096"
public_site="${PUBLIC_SITE_URL:-https://wire.houmq.cn}"
public_site="${public_site%/}"

wait_ready() {
  local url="$1"
  for i in 1 2 3 4 5 6 7 8 9 10; do
    if curl -fsS "${url}/healthz" >/dev/null && curl -fsS "${url}/ready" >/dev/null; then
      return 0
    fi
    sleep 2
  done
  return 1
}

if ! wait_ready "$local_health_url"; then
  echo "local health check failed on ${local_health_url}" >&2
  exit 1
fi
echo "Local health OK: ${local_health_url}"

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
