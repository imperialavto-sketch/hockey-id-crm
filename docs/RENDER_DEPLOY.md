# Render Deployment (First Production Run)

This is the canonical first deployment flow for the main `Next.js` CRM backend on Render.

## 1) Deployment Shape

- **Service type:** `Web Service` (Node)
- **Repo root directory:** repository root (`.`)
- **Runtime:** Node 20+
- **Primary backend:** root Next.js app (`src/app/api/*`)
- **Legacy `hockey-server`:** optional, separate service only if explicitly needed

## 2) Required Render Settings

- **Name:** `hockey-id-crm` (or your production naming)
- **Environment:** `Node`
- **Branch:** production branch (e.g. `main`)
- **Root Directory:** `.`
- **Build Command:**
  - `npm ci && npx prisma generate && npm run build`
- **Start Command:**
  - `npx prisma migrate deploy && npm run start`
- **Auto Deploy:** enabled for production branch (recommended)
- **Health Check Path:** `/api/health`

## 3) PostgreSQL Setup (Render)

1. Create a Render PostgreSQL instance.
2. Copy the **Internal Database URL** from Render Postgres.
3. Add it to web service env as:
   - `DATABASE_URL=<internal postgres url>`
4. Confirm `DATABASE_URL` points to production DB only.

Prisma in this repo uses:

```prisma
datasource db {
  provider = "postgresql"
  url      = env("DATABASE_URL")
}
```

No code changes are required for Render DB wiring.

## 4) Env Vars for Render

## Required
- `NODE_ENV=production`
- `DATABASE_URL=<Render Postgres internal URL>`

## Required if feature is enabled
- `OPENAI_API_KEY` (AI routes)
- `STRIPE_SECRET_KEY` (payments)
- `STRIPE_WEBHOOK_SECRET` (Stripe webhook verification)

## Optional
- `RESEND_API_KEY`, `EMAIL_FROM` (email notifications)
- `FIREBASE_SERVER_KEY`, `VAPID_PUBLIC_KEY` (push notifications)

## Must stay disabled/unset in public production
- `DEMO_AUTH_ENABLED` (unset or `false`)
- `PARENT_API_USE_MOCK` (unset or `0/false`)
- `DEV_AUTH` (unset or `false`)

## 5) Prisma / Runtime Notes

- `prisma generate` runs during build (`npx prisma generate`).
- `prisma migrate deploy` runs at each start before Next server.
- This is safe for first deploy and subsequent deploys.
- No `postinstall` hook is required for Render with the commands above.

## 6) First Deploy Checklist

1. Create Render PostgreSQL.
2. Create Render Web Service for this repo (root directory `.`).
3. Set build/start commands exactly as above.
4. Add required env vars (`NODE_ENV`, `DATABASE_URL`).
5. Add feature env vars only for enabled features.
6. Verify hardening flags remain disabled (`DEMO_AUTH_ENABLED`, `PARENT_API_USE_MOCK`, `DEV_AUTH`).
7. Trigger first deploy.
8. Wait for successful build and start logs.
9. Verify health endpoint:
   - `curl https://<render-service-url>/api/health`
10. Run post-deploy sanity:
   - `BASE_URL=https://<render-service-url> npx tsx scripts/crm-e2e-sanity.ts`

## 7) Post-Deploy Verification

- Health endpoint returns `200` and `{ ok: true, ... }`.
- No Prisma migration errors in Render logs.
- Auth, players, teams, trainings, finance, marketplace, communications pass sanity script.
- `BROKEN FLOWS: none` in `crm-e2e-sanity`.

## 8) Rollback Quick Path

- Use Render deploy history and rollback to previous successful deploy.
- Keep DB backups/snapshots enabled on Render Postgres.
