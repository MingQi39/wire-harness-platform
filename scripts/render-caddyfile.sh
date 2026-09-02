#!/usr/bin/env bash
# 生成 deploy/Caddyfile.ecs：优先复用 certbot 证书，否则 Caddy 自动 ACME。
set -euo pipefail

DEPLOY_DIR="${DEPLOY_DIR:-/opt/wire-harness-deploy}"
OUT="${1:-${DEPLOY_DIR}/deploy/Caddyfile.ecs}"
SITE="${SITE_ADDRESS:-wire.houmq.cn}"
EMAIL="${ACME_EMAIL:-}"
CERT_DIR="/etc/letsencrypt/live/${SITE}"

tls_directive=""
if [[ -f "${CERT_DIR}/fullchain.pem" && -f "${CERT_DIR}/privkey.pem" ]]; then
  echo "[render-caddyfile] 使用 certbot 证书: ${CERT_DIR}"
  tls_directive=$'	tls '"${CERT_DIR}/fullchain.pem ${CERT_DIR}/privkey.pem"
else
  echo "[render-caddyfile] 未找到 certbot 证书，Caddy 将自动申请 Let's Encrypt"
fi

global_block=""
if [[ -n "$EMAIL" ]]; then
  global_block="{ email ${EMAIL} }"
fi

mkdir -p "$(dirname "$OUT")"
cat > "$OUT" <<EOF
${global_block}

${SITE} {
	encode gzip
${tls_directive}
	header {
		Strict-Transport-Security "max-age=31536000; includeSubDomains"
		X-Content-Type-Options "nosniff"
		X-Frame-Options "SAMEORIGIN"
		Referrer-Policy "strict-origin-when-cross-origin"
		-Server
	}

	handle {
		reverse_proxy web:80 {
			health_uri /ready
			health_interval 5s
			health_timeout 3s
		}
	}
}
EOF

echo "[render-caddyfile] 已写入 $OUT"
