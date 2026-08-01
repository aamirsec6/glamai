#!/usr/bin/env bash
# Provision GlamAI services on an already-linked Railway project.
# Prereqs: railway login && railway link
set -euo pipefail

cd "$(dirname "$0")/../.."

echo "==> Ensuring Postgres + Redis plugins exist (add manually in UI if this fails)"
railway add --database postgres 2>/dev/null || true
railway add --database redis 2>/dev/null || true

echo ""
echo "Create these four GitHub-connected services in the Railway UI (same repo aamirsec6/glamai):"
echo ""
echo "  1) glamai-api"
echo "     Root: /"
echo "     Dockerfile: Dockerfile"
echo "     Start: scripts/start-api.sh"
echo "     Env: deploy/railway/env.api.template"
echo "          DATABASE_URL=\${{Postgres.DATABASE_URL}}"
echo "          REDIS_URL=\${{Redis.REDIS_URL}}"
echo ""
echo "  2) glamai-worker"
echo "     Same image as API"
echo "     Start: scripts/start-worker.sh"
echo "     Share API env vars"
echo ""
echo "  3) glamai-beat"
echo "     Same image as API"
echo "     Start: scripts/start-beat.sh"
echo "     Share API env vars"
echo ""
echo "  4) glamai-dashboard"
echo "     Root: /dashboard"
echo "     Dockerfile: Dockerfile"
echo "     Env: deploy/railway/env.dashboard.template"
echo "     Build arg NEXT_PUBLIC_API_URL = public API URL"
echo ""
echo "After domains exist, update APP_BASE_URL, GOOGLE_REDIRECT_URI, APP_CORS_ORIGINS,"
echo "and rebuild dashboard with NEXT_PUBLIC_API_URL."
echo ""
echo "Generate secrets:"
echo "  APP_SECRET_KEY:    openssl rand -hex 32"
echo "  ENCRYPTION_KEY:    python -c \"from cryptography.fernet import Fernet; print(Fernet.generate_key().decode())\""
echo "  ADMIN_API_SECRET:  openssl rand -hex 24"
