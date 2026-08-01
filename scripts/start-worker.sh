#!/usr/bin/env bash
set -euo pipefail
cd "$(dirname "$0")/.."
exec celery -A src.workers.celery_app worker --loglevel=info
