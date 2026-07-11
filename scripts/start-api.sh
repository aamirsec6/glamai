#!/usr/bin/env bash
set -euo pipefail

cd "$(dirname "$0")/.."

echo "Bootstrapping database schema..."
python scripts/bootstrap_db.py

PORT="${PORT:-8000}"
echo "Starting API on port ${PORT}..."
exec uvicorn src.main:app --host 0.0.0.0 --port "${PORT}"
