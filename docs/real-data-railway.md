# Real data integrations + Railway deploy

Order of work: **GBP → WhatsApp → Rankings → Railway**.

Dashboard pages read Postgres. Live Google / WhatsApp / SerpAPI data only appears after connect + sync (or scheduled Celery jobs).

---

## 0. Keys checklist

| Key | Needed for |
|-----|------------|
| `GOOGLE_CLIENT_ID` / `GOOGLE_CLIENT_SECRET` / `GOOGLE_REDIRECT_URI` | Full GBP OAuth (views, clicks, publish) |
| `GOOGLE_PLACES_API_KEY` | Place search, link, competitors |
| `ENCRYPTION_KEY` | Store OAuth tokens safely |
| `WHATSAPP_360DIALOG_API_KEY` (or `WHATSAPP_API_KEY`) | Send / receive WhatsApp |
| `WHATSAPP_WEBHOOK_VERIFY_TOKEN` / `WHATSAPP_WEBHOOK_SECRET` | Webhook verify + signature |
| `SERPAPI_KEY` | Map Pack rankings |
| `ANTHROPIC_API_KEY` | Lead qualify + agents |
| `DATABASE_URL` / `REDIS_URL` | API + Celery |
| `ADMIN_API_SECRET` | Admin / some agent routes |

Generate encryption key:

```bash
python -c "from cryptography.fernet import Fernet; print(Fernet.generate_key().decode())"
```

Your local `.env` already has Google + WhatsApp keys. Still missing for full stack: **`SERPAPI_KEY`** and usually **`ENCRYPTION_KEY`**.

---

## 1. Google Business Profile (first)

### Google Cloud console

1. Enable **Business Profile API**, **Places API (New)**, OAuth consent.
2. Create OAuth client (Web). Authorized redirect URI must match `GOOGLE_REDIRECT_URI`.
3. Local: `http://localhost:8000/api/v1/gbp/oauth/callback`
4. Railway: `https://<api-host>/api/v1/gbp/oauth/callback`

### Pilot org flow

1. Clear demo seed if needed: `python scripts/clear_seeded_data.py` (or demo clear API).
2. Create / select real org in dashboard onboarding.
3. **Places search → link** (gets `place_id`, coords, public reviews).
4. **Connect Google** (OAuth) → pick the Business Profile location (unlocks insights + posts).
5. Sync now (dashboard Sync or):

```bash
curl -X POST "$API/api/v1/gbp/sync?org_id=ORG_ID" \
  -H "X-Org-Id: ORG_ID" \
  -H "Content-Type: application/json" \
  -d '{"async": false, "resources": ["insights","reviews","competitors","posts"]}'
```

6. Confirm Home / Marketing → GBP shows views, reviews, posts.

**Note:** Places-only link without OAuth = no search/maps views or publish. OAuth is required for full data.

Sync now also **pulls remote Google posts** into `gbp_posts` (inbound ingest).

---

## 2. WhatsApp (second)

### Webhook URL (fixed)

Mounted path is:

```text
GET/POST  https://<api-host>/api/webhooks/whatsapp/
```

(Previously double-prefixed `/api/webhooks/webhooks/whatsapp/` — fixed.)

### 360dialog

1. Set API key + verify token + webhook secret in env.
2. Point BSP webhook to the URL above.
3. In Settings, save the business WhatsApp number on the org (digits; `+91` optional — matching is digit-normalized).
4. Send a test message to that number → lead should appear on `/client/leads`.

Org matching uses full digits or last-10 of `org.whatsapp_number`.

---

## 3. Rankings (third)

1. Set `SERPAPI_KEY`.
2. Org must have latitude/longitude (from Places link or onboarding).
3. Run growth or SEO agent once:

```bash
curl -X POST "$API/api/v1/agents/growth/run?org_id=ORG_ID" \
  -H "X-Org-Id: ORG_ID" \
  -H "X-Admin-Secret: $ADMIN_API_SECRET"
```

4. Open `/client/growth` — Path to Top 3 should show SerpAPI positions (`source=serpapi`).

Without SerpAPI, rankings stay empty or manual only.

---

## 4. Local services to keep data fresh

```bash
make dev          # API
make dev-worker   # Celery worker
make dev-beat     # schedules insights / reviews / competitors / Monday growth
```

Dashboard: `cd dashboard && npm run dev` with `NEXT_PUBLIC_API_URL` pointing at the API.

---

## 5. Railway — deploy all services

Create **one project**, shared variables, these services:

| Service | Image / start | Role |
|---------|---------------|------|
| **api** | `Dockerfile` → `scripts/start-api.sh` | FastAPI + migrations bootstrap |
| **worker** | same image, override CMD | `celery -A src.workers.celery_app worker --loglevel=info` |
| **beat** | same image, override CMD | `celery -A src.workers.celery_app beat --loglevel=info` |
| **dashboard** | `dashboard/Dockerfile` | Next.js client + marketing |

Also attach: **Postgres** (`DATABASE_URL`), **Redis** (`REDIS_URL`).

### Shared env (API / worker / beat)

Copy from `.env.example`. Set production:

- `APP_ENV=production`
- `APP_CORS_ORIGINS` = dashboard public URL(s)
- `GOOGLE_REDIRECT_URI` = `https://<api>/api/v1/gbp/oauth/callback`
- `APP_BASE_URL` = API public URL
- WhatsApp webhook URL in 360dialog → `https://<api>/api/webhooks/whatsapp/`

### Dashboard env

- `NEXT_PUBLIC_API_URL=https://<api>`
- Clerk keys (or disable for internal pilot)

### After deploy smoke test

1. Health: `GET https://<api>/health` (or docs `/docs`)
2. OAuth start from onboarding → returns to dashboard with location linked
3. Sync → insights on Home
4. WhatsApp test message → lead
5. Growth run → rankings on `/client/growth`
6. Confirm worker/beat logs show scheduled syncs

---

## Known limits (honest)

- WhatsApp is **platform-level** 360dialog key, not per-customer WABA OAuth yet.
- Meta direct WhatsApp connector is stubbed.
- Rankings come from SerpAPI, not Google Business Profile API.
- Clear demo orgs before treating dashboard numbers as a real customer.
