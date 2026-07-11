# Railway GitHub connection checklist

Code is on `main` at https://github.com/aamirsec6/glamai — use these steps in the Railway dashboard.

## 1. Login and link (CLI)

```bash
railway login
cd /path/to/glamai
railway init          # new project, or railway link for existing
```

## 2. Connect GitHub repo

In Railway UI: **Project → New Service → GitHub Repo → aamirsec6/glamai**

Create four services from the same repo (see [README.md](./README.md)).

## 3. Environment variables

Copy from:

- [`env.api.template`](./env.api.template) → API, worker, beat
- [`env.dashboard.template`](./env.dashboard.template) → dashboard

Set `DATABASE_URL=${{Postgres.DATABASE_URL}}` and `REDIS_URL=${{Redis.REDIS_URL}}`.

## 4. Domains and integrations

After first deploy, set public domains and update:

| Variable | Value |
|----------|-------|
| `APP_BASE_URL` | `https://<api-domain>` |
| `GOOGLE_REDIRECT_URI` | `https://<api-domain>/api/v1/gbp/oauth/callback` |
| `APP_CORS_ORIGINS` | `["https://<dashboard-domain>"]` |
| `NEXT_PUBLIC_API_URL` | `https://<api-domain>` (dashboard rebuild) |

External consoles:

- **Google Cloud:** OAuth redirect URI
- **360dialog/Meta:** `https://<api-domain>/api/webhooks/whatsapp`
- **Clerk:** production dashboard domain

## 5. Verify

```bash
curl https://<api-domain>/health
open https://<dashboard-domain>/admin/journey
```

Check worker logs for `src.workers.*` task registration and beat schedule output.
