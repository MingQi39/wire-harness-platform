#!/usr/bin/env bash
# GitHub Actions 或手工：load 镜像后 retag 并滚动更新 compose。
set -euo pipefail

DEPLOY_DIR="${DEPLOY_DIR:-/opt/wire-harness-deploy}"
ENV_FILE="${ENV_FILE:-$DEPLOY_DIR/.env}"
COMPOSE_FILE="${COMPOSE_FILE:-$DEPLOY_DIR/deploy/docker-compose.ecs.yml}"
PROJECT_NAME="${PROJECT_NAME:-wire-harness-prod}"
RUNTIME_BACKEND_TAG="${RUNTIME_BACKEND_TAG:-wire-harness-backend:ecs}"
RUNTIME_WEB_TAG="${RUNTIME_WEB_TAG:-wire-harness-web:ecs}"

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

cd "$DEPLOY_DIR"
docker compose -f "$COMPOSE_FILE" --env-file "$ENV_FILE" -p "$PROJECT_NAME" up -d --remove-orphans
docker compose -f "$COMPOSE_FILE" --env-file "$ENV_FILE" -p "$PROJECT_NAME" ps

web_port="$(grep -E '^WEB_HOST_PORT=' "$ENV_FILE" | tail -n1 | cut -d= -f2- || true)"
web_port="${web_port:-8096}"
curl -fsS "http://127.0.0.1:${web_port}/healthz" >/dev/null
curl -fsS "http://127.0.0.1:${web_port}/ready" >/dev/null
echo "Deploy OK: http://127.0.0.1:${web_port}"

if [[ "${DEPLOY_CLEANUP_DOCKER:-0}" == "1" ]]; then
  keep_days="${DEPLOY_CLEANUP_KEEP_DAYS:-1}"
  docker image prune -af --filter "until=${keep_days}h" || true
fi
