#!/usr/bin/env bash
# 将 wire.houmq.cn 注册到主机 Nginx（与 ops.houmq.cn / houmq.cn 等同机共享 443）。
#
# 前提：线束 web 已监听 WEB_HOST_BIND:WEB_HOST_PORT（默认 127.0.0.1:8096）。

set -euo pipefail

WIRE_SITE="${WIRE_SITE:-wire.houmq.cn}"
WEB_HOST_PORT="${WEB_HOST_PORT:-8096}"
NGINX_AVAILABLE="${NGINX_AVAILABLE:-/etc/nginx/sites-available/${WIRE_SITE}}"
NGINX_ENABLED="${NGINX_ENABLED:-/etc/nginx/sites-enabled/${WIRE_SITE}}"
TEMPLATE="${TEMPLATE:-$(dirname "$0")/../deploy/nginx-host.wire.houmq.cn.example}"

log() { echo "[register-wire-nginx] $*"; }

if [[ ! -f "$TEMPLATE" ]]; then
  echo "缺少 Nginx 模板：$TEMPLATE" >&2
  exit 1
fi

if ! curl -fsS "http://127.0.0.1:${WEB_HOST_PORT}/healthz" >/dev/null 2>&1; then
  echo "线束 web 未在 127.0.0.1:${WEB_HOST_PORT} 就绪，请先 docker compose up -d web" >&2
  exit 1
fi

rendered="$(mktemp)"
trap 'rm -f "$rendered"' EXIT
sed "s/127.0.0.1:8096/127.0.0.1:${WEB_HOST_PORT}/g" "$TEMPLATE" > "$rendered"

if [[ -f "$NGINX_AVAILABLE" ]] && cmp -s "$rendered" "$NGINX_AVAILABLE"; then
  log "Nginx 站点 ${WIRE_SITE} 已是最新，跳过写入"
else
  log "写入 ${NGINX_AVAILABLE}"
  sudo cp "$rendered" "$NGINX_AVAILABLE"
fi

if [[ ! -L "$NGINX_ENABLED" ]]; then
  log "启用站点：${NGINX_ENABLED}"
  sudo ln -sf "$NGINX_AVAILABLE" "$NGINX_ENABLED"
fi

if ! sudo nginx -t; then
  echo "Nginx 配置校验失败" >&2
  exit 1
fi

if systemctl is-active --quiet nginx; then
  sudo systemctl reload nginx
else
  sudo systemctl enable nginx
  sudo systemctl start nginx
fi

log "完成。验证：curl -fsSk --resolve ${WIRE_SITE}:443:127.0.0.1 https://${WIRE_SITE}/ready"
