# ── Builder ──────────────────────────────────────────────────
FROM python:3.11-slim AS builder

WORKDIR /app

RUN apt-get update && apt-get install -y --no-install-recommends \
    gcc \
    libpq-dev \
    && rm -rf /var/lib/apt/lists/*

COPY pyproject.toml README.md ./
COPY src ./src

RUN pip install --no-cache-dir --upgrade pip \
    && pip install --no-cache-dir .

# ── Runtime ──────────────────────────────────────────────────
FROM python:3.11-slim AS runtime

WORKDIR /app

RUN apt-get update && apt-get install -y --no-install-recommends \
    libpq5 \
    && rm -rf /var/lib/apt/lists/* \
    && groupadd --gid 1000 glamai \
    && useradd --uid 1000 --gid glamai --create-home glamai

COPY --from=builder /usr/local/lib/python3.11/site-packages /usr/local/lib/python3.11/site-packages
COPY --from=builder /usr/local/bin /usr/local/bin

COPY pyproject.toml README.md ./
COPY src ./src
COPY scripts ./scripts
COPY alembic.ini ./
COPY alembic ./alembic

RUN chmod +x scripts/start-api.sh scripts/start-worker.sh scripts/start-beat.sh \
    && mkdir -p /app/media/posts \
    && chown -R glamai:glamai /app

USER glamai

ENV PYTHONUNBUFFERED=1
ENV PYTHONDONTWRITEBYTECODE=1

EXPOSE 8000

CMD ["scripts/start-api.sh"]
