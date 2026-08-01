# Railway deployment — GlamAI full stack

Deploy the API, Next.js dashboard, Celery worker, Celery beat, PostgreSQL, and Redis from this monorepo via GitHub.

## Architecture

| Service | Root | Dockerfile | Start command |
|---------|------|------------|---------------|
| `glamai-api` | `/` | `Dockerfile` | `scripts/start-api.sh` |
| `glamai-worker` | `/` | `Dockerfile` | `scripts/start-worker.sh` |
| `glamai-beat` | `/` | `Dockerfile` | `scripts/start-beat.sh` |
| `glamai-dashboard` | `/dashboard` | `dashboard/Dockerfile` | default (`next start`) |
| Postgres | plugin | — | — |
| Redis | plugin | — | — |

## 1. Create Railway project

1. [Railway](https://railway.app) → **New Project** → **Deploy from GitHub** → select `glamai`.
2. Add **PostgreSQL** and **Redis** plugins.
3. Create four services from the same repo (duplicate the service or use multi-service config in the UI).

## 2. Configure each service

### API (`glamai-api`)

- **Root directory:** `/`
- **Dockerfile path:** `Dockerfile`
- **Start command:** `scripts/start-api.sh`
- **Variables:** copy from [`env.api.template`](./env.api.template)
  - `DATABASE_URL=${{Postgres.DATABASE_URL}}`
  - `REDIS_URL=${{Redis.REDIS_URL}}`
  - Set `APP_BASE_URL` to the public API domain after first deploy.
  - Set `APP_CORS_ORIGINS` to `["https://<dashboard-domain>"]`.

`scripts/start-api.sh` bootstraps tables (`bootstrap_db`) then starts uvicorn on `$PORT`.

### Worker & Beat

Same image as API; only the start command differs:

```bash
scripts/start-worker.sh
scripts/start-beat.sh
```

Share all env vars from the API service (reference the API service variables in Railway). Also set `SERPAPI_KEY` for Map Pack rankings.

### Dashboard (`glamai-dashboard`)

- **Root directory:** `/dashboard`
- **Dockerfile path:** `Dockerfile`
- **Build args** (set in Railway build settings):
  - `NEXT_PUBLIC_API_URL`
  - `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY`
  - `NEXT_PUBLIC_ADMIN_SECRET`
  - `NEXT_PUBLIC_DISABLE_CLERK=false`
- **Runtime env:** `CLERK_SECRET_KEY` and templates from [`env.dashboard.template`](./env.dashboard.template)

## 3. Domains

Generate public domains for API and dashboard. Update:

- `APP_BASE_URL` / `GOOGLE_REDIRECT_URI` on API
- `NEXT_PUBLIC_API_URL` on dashboard (rebuild required)
- `APP_CORS_ORIGINS` on API

## 4. Post-deploy integrations (one-time)

| Integration | Action |
|-------------|--------|
| **Google Cloud Console** | Add OAuth redirect: `https://<api>/api/v1/gbp/oauth/callback` |
| **360dialog / Meta** | Webhook: `https://<api>/api/webhooks/whatsapp/` |
| **Clerk** | Add production dashboard domain |
| **Demo data** | Run `make demo-seed-reset` locally against prod DB, or use admin seed (demo routes disabled when `APP_ENV=production`) |

## 5. Verification checklist

```bash
curl https://<api>/health
# Expect: {"status":"healthy","checks":{"database":true,"redis":true}}

# Dashboard
open https://<dashboard>/
open https://<dashboard>/admin/journey

# Celery — check worker/beat logs for registered tasks and beat schedule
```

## Notes

- **Schema:** MVP uses `bootstrap_db` / `create_all_tables` on API startup — no Alembic versions yet.
- **Media:** Railway disks are ephemeral; mount a volume at `STORAGE_LOCAL_PATH` or set `STORAGE_BACKEND=s3`.
- **Auth:** API trusts `X-Org-Id` headers; Clerk secures the dashboard UI only until JWT validation is added.
- **LLM:** Use `LLM_PROVIDER=anthropic` on Railway (Ollama is not available).
