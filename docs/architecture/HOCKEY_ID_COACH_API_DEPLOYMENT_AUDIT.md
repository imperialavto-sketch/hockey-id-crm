# Hockey ID Coach API Deployment Audit

**Phase:** 4A — **audit only** (no runtime changes, no schema changes, no route removal, no refactors).  
**Purpose:** Map **what the repo can prove** about **API host selection** and **Next.js vs `hockey-server`** overlap for **`/api/coach/*`**, so retirement/unification decisions are grounded in **deployment reality** (logs, gateways, env), not static guesses alone.

**Evidence:** Repository file reads and grep (April 2026). **Does not** prove production routing, traffic volumes, or load-balancer rules.

**Related:** [`HOCKEY_ID_COACHSESSION_CALLER_VERIFICATION_MAP.md`](./HOCKEY_ID_COACHSESSION_CALLER_VERIFICATION_MAP.md), [`HOCKEY_ID_COACHSESSION_CLEANUP_CLOSURE.md`](./HOCKEY_ID_COACHSESSION_CLEANUP_CLOSURE.md), [`docs/RENDER_DEPLOY.md`](../RENDER_DEPLOY.md). **Execution runbook:** [`HOCKEY_ID_COACH_API_OPERATIONAL_VERIFICATION_CHECKLIST.md`](./HOCKEY_ID_COACH_API_OPERATIONAL_VERIFICATION_CHECKLIST.md) (Phase **4B**).

---

## Client/API host map

### Coach mobile (`coach-app`)

| Mechanism | Detail |
|-----------|--------|
| **Env var** | **`EXPO_PUBLIC_API_URL`** — trimmed; trailing slash stripped in code. |
| **Resolution** | `coach-app/lib/config.ts` → `resolveApiBaseUrl()`: use **`EXPO_PUBLIC_API_URL`** if set; else **`http://localhost:3000`**. |
| **Production** | If **`EXPO_PUBLIC_ENV=production`**, missing **`EXPO_PUBLIC_API_URL`** throws at module load (**required** for prod builds). |
| **Request shape** | `coach-app/lib/api.ts` → `${API_BASE_URL}${path}` for paths like **`/api/coach/...`** (single origin for all coach APIs, auth, trainings, live-training, etc.). |
| **Other coach-related env** | **`EXPO_PUBLIC_COACH_ANALYTICS_URL`** — optional absolute or path; default empty in `liveTrainingTelemetry.ts`. Commented example: **`/api/coach/analytics/events`** — **no** matching route under `src/app/api/coach/**` found in repo (telemetry URL is **config-only** until implemented). |
| **`.env.example`** | Documents **`EXPO_PUBLIC_API_URL=http://localhost:3000`**. Old comments about targeting another port (e.g. **`:4000`**) refer to a **separate** API host, not an in-repo path — the former **`hockey-server/`** package is **removed** from this tree. |

**Per-environment reality:** **Not in repo.** EAS/Expo **production** env for **`EXPO_PUBLIC_API_URL`** (Render URL vs custom API vs any **external** legacy host) is **deployment-specific**.

### CRM web (Next dashboard)

| Mechanism | Detail |
|-----------|--------|
| **Pattern** | Dashboard code uses **same-origin** **`fetch('/api/...')`** for CRM features; coach **mobile** paths are **`/api/coach/*`** vs CRM coach profile **`/api/coaches/*`** (different namespace). |
| **Grep** | No `src/` UI **`fetch('/api/coach/`** usage found for dashboard flows in the sampled audit; architecture docs list **coach-app** as consumer of **`/api/coach/schedule`**, **`messages`**, **`players`**, etc. (`src/lib/architecture/appFlowContours.ts`). |

### Root / server deployment docs

| Source | Detail |
|--------|--------|
| **`docs/RENDER_DEPLOY.md`** | Primary backend: **root Next** **`src/app/api/*`**. Legacy **`hockey-server`** is **not** in this repository (removed). |
| **Root `.env.example`** | **`DATABASE_URL`**, auth, Stripe, etc. — **no** variable that points coach-app at a host (coach-app is separate Expo env). |

**Uncertainty:** Reverse proxy path prefixes (e.g. `/api` → Next vs Express), CDN, and **multi-service** routing are **not** defined in application source code.

---

## Next vs hockey-server overlap

**Next coach routes** live under **`src/app/api/coach/**/route.ts`** (30 route files in audit snapshot). **`hockey-server/server.js`** registers the **`/api/coach/*`** handlers below.

### Overlap table (same URL family on both stacks)

| Path family | Next | `hockey-server` | Same URL shape? | Same data model / contract? | Risk if both reachable |
|-------------|------|-----------------|-----------------|----------------------------|-------------------------|
| **`POST /api/coach/sessions/start`** | Yes — **`CoachSession`** (`prisma.coachSession`) | Yes — **`TrainingSession`** (`prisma.trainingSession`, `status: active`) | Yes (method + path) | **No** — different tables; response id semantics differ (`sessionId` vs training `id`) | Client or script gets **wrong session type** for same path. |
| **`GET /api/coach/sessions/active`** | Yes — **`CoachSession`** | Yes — **`TrainingSession`** | Yes | **No** | **High** — “active session” answers differ; coach-app uses **canonical** `liveTrainingService`, not this path. |
| **`POST /api/coach/observations`** | Yes — **`CoachSessionObservation`** | Yes — **`prisma.observation`** (with **`trainingSession`** linkage per handler) | Yes | **No** — body / keys differ (e.g. Express notes **`teamId`** requirement in verification map) | **High** — duplicate write pipelines. |
| **`GET /api/coach/sessions/.../observations`** | Yes — `[sessionId]` segment, **`CoachSessionObservation`** | Yes — `:id` segment | Nearly (param name) | **No** | Wrong observation set for “session” id type. |
| **`GET /api/coach/sessions/.../review`** | Yes — **`CoachSession`** review | Yes — **`TrainingSession`** + obs | Nearly | **No** | Different payloads. |
| **`GET /api/coach/actions`** | Yes — **`LiveTrainingPlayerSignal`** (negative, **confirmed** live session) | Yes — aggregates **`prisma.observation`** | Yes | **No** — Phase **3F** Next ≠ Express heuristic | **High** for coach-app if **`EXPO_PUBLIC_API_URL`** points at Express — **wrong action center**. |
| **`GET /api/coach/messages`** (+ detail / send) | Yes — **Prisma** chat (`coach/messages/route.ts`, etc.) | Yes — **in-memory mock** (`COACH_MESSAGES_MOCK` in `server.js`) | Yes | **No** | Coach inbox **empty or fake** on Express vs real on Next. |
| **`GET /api/coach/parent-drafts`** | Yes — **`ParentDraft`** + **`session_draft`** from **`LiveTrainingSessionReportDraft`** | Yes — **observation-derived** list only (no `source` / `session_draft` parity) | Yes | **No** | **High** — different list shape and SSOT. |
| **`GET /api/coach/players/:id/share-report`** | Yes — **`summaryJson`** extract (**3G**) | Yes — **`buildPlayerReportData`** from **`observation`** | Yes (`:id` vs `[id]` routing equivalent) | **No** | **High** — message vs canonical draft. |
| **`GET /api/coach/reports/weekly`** | Yes — **`build-weekly-report-items-from-live-training-drafts`** (**3J**) | Yes — **`observation`** + **`buildPlayerReportData`** | Yes | **No** | **High** — weekly list diverges completely. |
| **`GET /api/coach/reports/player/:playerId`** | Yes — **3L** canonical draft + signals; **no** `avgScore` | Yes — **`observation`** + **`observations[]`**, **`avgScore`** from `buildPlayerReportData` | Yes | **No** | **High** — report screen wrong backend. |

### Express-only (no Next counterpart in `src/app/api/coach`)

| Path | Notes |
|------|--------|
| **`POST /api/coach/auth/dev-token`** | Dev coach token helper when **`isDevCoachFallback`**; **not** found under **`src/app/api/coach`**. |

### Next-only (no `hockey-server` registration in grep)

| Examples | Notes |
|----------|--------|
| **`POST /api/coach/sessions/sync`** | Large **`CoachSession`** bulk writer — **not** in `hockey-server` grep. |
| **`GET /api/coach/schedule`**, **`/api/coach/players`**, **`/api/coach/teams`**, **`POST .../push/register`**, **`/api/live-training/*`**, **`/api/coach/trainings`**, player subroutes (**`report-analytics`**, **`published-session-reports`**, **`live-training-signals`**, action candidates, etc.) | Product coach-app relies on these for **schedule, roster, push, Arena**; pointing **`EXPO_PUBLIC_API_URL`** at **`hockey-server`** would **404** or miss features unless proxied elsewhere. |

---

## Confirmed consumers vs unknowns

### Confirmed in-repo callers (`coach-app` services / hooks)

Paths are relative to **`API_BASE_URL`** (`EXPO_PUBLIC_API_URL`).

| Consumer | Coach paths used (non-exhaustive) |
|----------|-----------------------------------|
| **`coachScheduleService.ts`** | **`/api/coach/schedule`**, **`/api/trainings/*`** |
| **`liveTrainingService.ts`** | **`/api/live-training/sessions`**, start-planning, external-coach-feedback |
| **`coachPlayersService.ts`** | **`/api/coach/players`** |
| **`coachTeamsService.ts`** | **`/api/coach/teams`** |
| **`coachMessagesService.ts`** | **`/api/coach/messages`**, **`/api/coach/messages/:id`**, send, **`/api/coach/conversations/:id/ai-signals`** |
| **`coachActionsService.ts`** | **`/api/coach/actions`** |
| **`coachReportsService.ts`** | **`/api/coach/reports/weekly`**, **`/api/coach/reports/player/`** |
| **`coachParentDraftsService.ts`** | **`/api/coach/parent-drafts`**, **`/api/coach/players/:id/share-report`** |
| **`useCoachPushNotifications.ts`** | **`/api/coach/push/register`** |
| **`authService.ts`** | **`/api/auth/login`** (same origin) |
| **`voiceUploadService.ts`** | **`/api/voice/upload`** |

### No in-repo product caller found (frozen / dormant)

| Module | Paths embedded |
|--------|----------------|
| **`coachSessionLiveService.ts`** | **`/api/coach/sessions/start`**, **`active`**, **`observations`**, **`sessions/:id/observations`** |
| **`coachSessionSyncService.ts`** | **`POST /api/coach/sessions/sync`** |

**Static grep:** no **`import`** of these services from other **`coach-app`** `.ts`/`.tsx` files (per **3D** map).

### Scripts / tests

| Artifact | Finding |
|----------|---------|
| **`scripts/crm-e2e-sanity.ts`** | Calls **`/api/coach/trainings?coachId=...`** (and **`/api/coaches/.../trainings`**) — **CRM sanity**, not mobile parallel session routes. |
| **Unit/e2e tests** | No **`/api/coach`** hits found under common **`*.test.ts` / `*.spec.ts`** patterns in repo grep. |

### Deployment-unknown

| Category | Why unknown |
|----------|-------------|
| **Production coach-app** | **`EXPO_PUBLIC_API_URL`** value per build/channel not in git. |
| **External HTTP clients** | Postman, old binaries, other repos — not searchable here. |
| **Gateway** | Which upstream receives **`Host` + `/api/coach/*`** — not in repo. |

---

## Operational evidence gaps

The following **cannot** be proven from the repository alone:

1. **Which process** serves **`https://<prod-host>/api/coach/actions`** (Next vs Express vs worker).
2. **Request counts** per path on each stack (access logs, APM, or legacy **Express** host logs if one exists **outside** this repo).
3. **Whether any externally hosted legacy Express** process still runs next to Next (same hostname or e.g. legacy `:4000`); the in-tree `hockey-server/` copy is **gone**.
4. **Auth identity mapping** — Next **`requireCrmRole`** / Bearer vs Express **`getCoachIdOr401`** — whether **`coachId`** means the same principal as CRM **`User.id`**.
5. **Database identity** — both may share **`DATABASE_URL`** in some setups or use different DBs; schema overlap is **not** deployment proof.
6. **Staging vs prod** — different routing per environment.

---

## Recommended verification checklist

Run **outside** the repo (ops / SRE / on-call). Repeat per **environment** (e.g. staging, production).

| # | Environment | Path family | Evidence to capture | Decision unlocked |
|---|-------------|-------------|---------------------|-------------------|
| 1 | Staging + Prod | **`GET /api/coach/actions`** | One authenticated request; inspect JSON shape (signals vs legacy obs heuristic) and response headers (**`x-powered-by`**, server header, or trace id). | Confirm coach-app **actually** hits **Next 3F** implementation. |
| 2 | Same | **`GET /api/coach/reports/weekly`** | Same — check for **`ready`**, **`keyPoints`** from draft vs obs-only shape. | Confirm **3J** vs Express. |
| 3 | Same | **`GET /api/coach/reports/player/:id`** | Compare **`observations`[]** presence (**Express** adds) vs **3L** (omits). | Backend identification. |
| 4 | Same | **`GET /api/coach/messages`** | Real threads vs mock list. | Inbox backend. |
| 5 | Same | **`POST /api/coach/sessions/start`** | Response body: **`sessionId`** (Next) vs **`id`** training row (Express). | Parallel session **misrouting** risk. |
| 6 | Infra | **Gateway / Render / nginx** | Config snippet: upstream for **`/api`**. | Single vs split backend. |
| 7 | Build | **EAS / Expo env** | Actual **`EXPO_PUBLIC_API_URL`** for **production** coach builds. | Authoritative mobile target host. |
| 8 | Logs | **7d window** | Count **`/api/coach/sessions/*`**, **`POST .../observations`**, **`.../sync`** on each service. | Whether frozen parallel endpoints are **dormant** or **hot**. |

**Only after** rows 1–4 match **intended** Next behavior should **`hockey-server`** duplicate handlers be candidates for deprecation (separate phase).

---

## DONE / PARTIAL / NOT DONE

| Status | Meaning |
|--------|---------|
| **DONE** | **4A** audit doc: host map from **`coach-app/lib/config.ts`** + **`.env.example`**, overlap table Next vs **`hockey-server`**, consumer map, evidence gaps, checklist. |
| **PARTIAL** | Real-world routing — **requires** ops steps above. |
| **NOT DONE** | Route removal, proxy changes, or **`hockey-server`** edits — **out of scope** for **4A**. |
