# Production Deploy Checklist (Release Pass)

This guide covers production deployment for the main CRM runtime (`Next.js app`). The legacy Express `hockey-server/` tree **is not part of this repository** (removed); do not run or deploy it from this checkout.

## Deployment Audit

### Runtime services
- **Required**
  - Node.js runtime (Next.js 14 app)
  - PostgreSQL (Prisma)
- **Optional integrations**
  - OpenAI (AI routes)
  - Stripe (checkout + webhook)
  - Email (Resend)
  - Push providers (Firebase/VAPID)
  - SMS provider (SMSC/sms.ru for mobile auth flows)

### Backend entrypoint
- **Primary production backend:** root Next.js app (`src/app/api/*`)
  - Build: `npm run build`
  - Start: `npm run start`
- **Legacy Express (`hockey-server`):** not shipped in this repo. A separate out-of-tree Express host (if any) is **ops-owned**; there is no `hockey-server/` directory or `server.js` to start here.

### Database
- PostgreSQL required via `DATABASE_URL`
- Prisma migrations required on release: `prisma migrate deploy`

### Build/start/migrate/seed/smoke commands
- Install: `npm ci`
- Prisma client: `npx prisma generate`
- Migrate (prod): `npx prisma migrate deploy`
- Seed (optional demo data): `npm run db:seed`
- Build: `npm run build`
- Start: `npm run start`
- Health check: `GET /api/health`
- E2E sanity: `BASE_URL=https://<host> npx tsx scripts/crm-e2e-sanity.ts`

## Required Environment Variables

### Core CRM (Next.js)
- `DATABASE_URL`
  - **Required**
  - Used by Prisma (`src/lib/prisma.ts`, `prisma.config`)
  - No safe runtime fallback
- `NODE_ENV`
  - **Required** (`production`)
  - Affects auth/cookies/security behavior

### Feature-gated (required only if feature enabled)
- `OPENAI_API_KEY`
  - Required for AI endpoints (`src/lib/ai/*`, `src/app/api/chat/ai/*`, voice helpers)
- `STRIPE_SECRET_KEY`
  - Required for Stripe checkout runtime (`src/lib/stripe.ts`)
- `STRIPE_WEBHOOK_SECRET`
  - Required for Stripe webhook verification (`src/app/api/payments/stripe/webhook/route.ts`)

## Optional Environment Variables

### Core CRM (Next.js)
- `RESEND_API_KEY`, `EMAIL_FROM`
  - Optional email notifications (`src/lib/notifications.ts`)
- `FIREBASE_SERVER_KEY`, `VAPID_PUBLIC_KEY`
  - Optional push paths (`src/lib/notifications.ts`)
- `PARENT_API_USE_MOCK`
  - Dev/debug only (`.env.example`); keep unset in production
- `DEMO_AUTH_ENABLED`
  - Dev/demo only for `/api/auth/login`; must stay unset/false in production

### Legacy Express stack (out of tree only)
If you still operate an **external** legacy Express process (not this repo), document its env in your ops runbook. There is no in-repo `hockey-server` to configure here.

### Mobile/public env (runtime-impacting for apps)
- `EXPO_PUBLIC_API_URL`
  - Required for production mobile builds (no localhost in prod)
- `EXPO_PUBLIC_EXPO_PROJECT_ID`
  - Required for Expo push token flow
- `EXPO_PUBLIC_DEMO_MODE`
  - Must be `false` in production apps
- `EXPO_PUBLIC_ENABLE_API_FALLBACK`
  - Keep `false` in production for honest error behavior

## Release Blockers / Hardening Findings

1. **Demo-only auth behavior**
   - `src/app/api/auth/login/route.ts` demo users are now gated by `DEMO_AUTH_ENABLED=true`.
   - Public production requirement: keep `DEMO_AUTH_ENABLED` unset/false.

2. **Mobile API URL fallback hardening**
   - `parent-app/config/api.ts` no longer falls back to a hardcoded production URL.
   - Public production requirement: `EXPO_PUBLIC_API_URL` must be explicitly set for release builds.

3. **Localhost defaults in mobile env examples**
   - `coach-app/.env.example`, `parent-app/.env.example` use localhost defaults.
   - Ensure release env overrides with production API URL.

4. **Dev auth bypass in legacy server (historical)**
   - The former in-tree Express `hockey-server` has been **removed** from the repository. Do not rely on or deploy that path; keep `DEV_AUTH` unset in production for any custom legacy host you may run **outside** this tree.

5. **Watcher/EMFILE dev assumption**
   - Local dev may hit file watcher limits; not a direct prod blocker but impacts release verification reliability.

## Production Checklist

1. **Install**
   - `npm ci`

2. **Environment setup**
   - Set required envs (`DATABASE_URL`, `NODE_ENV=production`)
   - Set feature envs if using AI/Stripe/Email/SMS
   - Set mobile `EXPO_PUBLIC_API_URL` and disable demo flags
   - Keep these disabled for public release:
     - `DEMO_AUTH_ENABLED` (unset/false)
     - `PARENT_API_USE_MOCK` (unset/false)
     - `EXPO_PUBLIC_DEMO_MODE=false`
     - `EXPO_PUBLIC_ENABLE_API_FALLBACK=false`
     - `DEV_AUTH` (unset/false)

3. **Database migrate**
   - `npx prisma generate`
   - `npx prisma migrate deploy`

4. **Seed/demo data (optional)**
   - `npm run db:seed` only for non-production/demo/staging bootstrap

5. **Build**
   - `npm run build`

6. **Start**
   - `npm run start`

7. **Health check**
   - `curl https://<host>/api/health`
   - Expect `200` and `{ ok: true, ... }`

8. **Sanity script**
   - `BASE_URL=https://<host> npx tsx scripts/crm-e2e-sanity.ts`
   - Must report `BROKEN FLOWS: none`

## Local Production-like Run

```bash
npm ci
npx prisma generate
npx prisma migrate deploy
npm run build
PORT=3000 NODE_ENV=production npm run start
curl http://localhost:3000/api/health
BASE_URL=http://localhost:3000 npx tsx scripts/crm-e2e-sanity.ts
```

## Render / VPS / Self-hosted Notes

- Use root app as primary service.
- Start command should include migrations before server start, e.g.:
  - `npx prisma migrate deploy && npm run start`
- Set `NODE_ENV=production`.
- Configure external PostgreSQL and `DATABASE_URL`.
- Ensure Stripe/OpenAI keys are present only if those features are enabled.
- Do not add a second service from a non-existent `hockey-server/` path in this repo; any extra Node host is outside this project’s default deploy story.
