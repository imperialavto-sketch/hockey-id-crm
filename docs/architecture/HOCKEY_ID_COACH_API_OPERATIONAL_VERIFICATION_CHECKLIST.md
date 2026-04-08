# Hockey ID Coach API Operational Verification Checklist

**Phase:** 4B — **runbook only** (no code, schema, or route changes).  
**Purpose:** Manual steps to learn **which backend** serves **`/api/coach/*`** for coach-app and whether **Next** vs **`hockey-server`** overlap is safe to retire later.

**Prerequisite:** [`HOCKEY_ID_COACH_API_DEPLOYMENT_AUDIT.md`](./HOCKEY_ID_COACH_API_DEPLOYMENT_AUDIT.md) (Phase 4A).

**Assumption:** A human with access to **EAS/Expo env**, **hosting dashboards**, **logs**, and a **Bearer token** (or dev auth) runs these checks.

---

## Verification goals

Prove, per **environment**:

1. **Which host** the coach mobile app calls (`EXPO_PUBLIC_API_URL` or equivalent build config).
2. For **overlapping** **`/api/coach/*`** paths, whether the responding process is **Next** (this repo’s `src/app/api/coach`) or **`hockey-server`** (Express in `hockey-server/server.js`), or **split**.
3. Whether **frozen parallel** **`CoachSession`** HTTP surfaces (`sessions/*`, `observations`) still see **non-zero traffic**.
4. Whether **high-value reads** (**actions**, **reports**, **parent-drafts**, **messages**) return **Next-shaped** JSON (post–Phase 3F–3L / Prisma chat) vs **Express-shaped** JSON (observation aggregates, mock inbox, `TrainingSession` session start).

---

## Environment checks

### Local / dev

| Step | Inspect | Record | If unavailable |
|------|---------|--------|----------------|
| L1 | Developer machine **`coach-app/.env`** (or Expo env) **`EXPO_PUBLIC_API_URL`** | Full URL (scheme + host + port), e.g. `http://192.168.x.x:3000` or `http://localhost:4000` | Note “unknown”; capture how app is started (`npx expo start` + which `.env`). |
| L2 | Ports listening | Is **:3000** Next? **:4000** `hockey-server`? Both? | Document “only one stack running” vs “both running — mobile must match intended target.” |
| L3 | Auth | How Bearer is obtained (login against same **`API_BASE_URL`**) | Same token must be used for route checks below. |

### Staging

| Step | Inspect | Record | If unavailable |
|------|---------|--------|----------------|
| S1 | **EAS / Expo** env vars for **staging** build profile: **`EXPO_PUBLIC_API_URL`**, **`EXPO_PUBLIC_ENV`** | Exact staging API origin | Escalate to mobile release owner; without this, **L1-style** device proxy or release notes. |
| S2 | **Hosting** (e.g. Render) **staging** web service URL(s) | Next staging base URL | Note if staging API is **not** public (VPN only). |
| S3 | Is **`hockey-server`** deployed for staging? | Yes / No / Unknown | If unknown, treat overlap risk as **high** until S4–S6 route probes run. |

### Production

| Step | Inspect | Record | If unavailable |
|------|---------|--------|----------------|
| P1 | **EAS / Expo** **production** channel **`EXPO_PUBLIC_API_URL`** | Exact prod API origin | **Critical gap** — cannot interpret mobile behavior without this. |
| P2 | **Render** (or other) **production** Next service URL | Public API host | Compare **P1** — should match if coach-app hits Next directly. |
| P3 | **`hockey-server`** prod deployment | Hostname / port / “not deployed” | If deployed, note whether **same hostname** as Next (gateway) or **different** (e.g. legacy `:4000`). |
| P4 | **Reverse proxy / CDN** rules for **`/api/*`** | Upstream target(s) | If no access, rely on **Route checks** (response shape) + **Traffic checks**. |

---

## Route checks

**How to run:** `curl` or HTTP client against **`{API_ORIGIN}/api/coach/...`** with the same **Authorization: Bearer &lt;token&gt;** the app uses. Save **status**, **response body** (redact PII), and **response headers** (`Server`, `x-powered-by`, `via`, any trace id).

**Trait legend**

- **Next — actions (3F):** Array of action rows from **live-training signals** (negative); items include fields aligned with `src/app/api/coach/actions/route.ts` (e.g. `playerId`, `reason`, `severity`, `observationsCount` as **signal count**, `updatedAt`). No dependency on legacy **`prisma.observation`** rollups in Express.
- **hockey-server — actions:** Built from **`prisma.observation`** aggregation in `server.js` (~`buildActionItem` / `playerQualifiesForActions` pattern) — different heuristics and data source.
- **Next — reports / share / parent-drafts (3G–3L, 3H):** **`parent-drafts`** items may include **`source`: `parent_draft` | `session_draft`**; **`session_draft`** rows tie to live report draft semantics. **Weekly** / **player report** lack Express-only **`observations[]`** on player report; **player report** typically **omits `avgScore`** (3L).
- **hockey-server — reports / parent-drafts / share:** **`parent-drafts`** and **weekly** driven by **observation** density (`>= 3` obs per player pattern in server); **player report** includes **`observations`** array and often **`avgScore`**.

| # | Method + path | Why it matters | Suggests **Next** | Suggests **hockey-server** | Save |
|---|---------------|----------------|-------------------|---------------------------|------|
| R1 | **`GET /api/coach/actions`** | Wrong backend breaks action center | Structure matches **signal-based** 3F; grouping/fields consistent with Prisma live-training migration | Structure from **observation** rollups; different player qualification logic | Full JSON sample (1 player); headers |
| R2 | **`GET /api/coach/reports/weekly`** | Weekly list SSOT | Array items like **`shortSummary`**, **`keyPoints`**, **`ready`**, **`updatedAt`** per **draft** migration; no Express-only observation batching signature | Items shaped like **`buildPlayerReportData`** from **observations** only | Full JSON (truncate long strings) |
| R3 | **`GET /api/coach/reports/player/{playerId}`** | Detail screen | **No** top-level **`observations`** array (Next 3L); **`avgScore`** absent/omitted | **`observations`** array with `id`, `skillKey`, `noteText`, `createdAt`; **`avgScore`** often present | Full JSON |
| R4 | **`GET /api/coach/parent-drafts`** | Drafts inbox | Response includes **`source`** field on items (**`parent_draft` / `session_draft`**) as in Next combined list | List derived only from **observations** — no **`session_draft`** / **`source`** parity | First 2 items + headers |
| R5 | **`GET /api/coach/messages`** | Inbox | Real conversations from DB; non-trivial IDs; matches production data | **Mock** fixtures (e.g. fixed `conv_coach1_*` style titles in `server.js`) or tiny static set | First page JSON + count |
| R6 | **`POST /api/coach/sessions/start`** (body: `teamId` per contract) | Parallel session contour | Response emphasizes **`CoachSession`** API shape (e.g. **`sessionId`** string client id in Next handler) | Response uses **`TrainingSession`** row shape (**`id`** UUID, **`trainingSession`** fields) | Status + JSON keys only (no secrets) |
| R7 | **`GET /api/coach/sessions/active`** (optional `?teamId=`) | Same | **`CoachSession`**-backed payload or null | **`TrainingSession`**-shaped object or null | JSON |
| R8 | **`POST /api/coach/observations`** | Hidden parallel writes | Creates **`CoachSessionObservation`** (requires **`CoachSession`**-compatible **`sessionId`**) | Express may require **`teamId`** / different body per 4A map | **Do not** run destructive tests on prod without approval; prefer **staging** or read **logs** for POST volume |

**Order to run first (highest product impact):** **R1 → R3 → R2 → R4 → R5**, then **R6–R8** on **staging** first.

---

## Traffic checks

| Path family | Window | Metric / evidence | Unlocks |
|-------------|--------|-------------------|---------|
| **`GET /api/coach/actions`** | **7 days** (adjust if low volume) | Request count + **upstream** tag in logs (service name / container) | Confirms **which stack** serves coach actions in prod. |
| **`GET /api/coach/reports/*`**, **`GET .../share-report`**, **`GET .../parent-drafts`** | Same | Counts per path | Same; also validates **canonical** read traffic. |
| **`GET /api/coach/messages`** | Same | Counts | Detects **mock** vs **real** if R5 was ambiguous. |
| **`POST /api/coach/sessions/start`**, **`GET .../active`**, **`POST .../observations`**, **`POST .../sync`** | Same | Counts (and **4xx/5xx** rate) | If **~0**, frozen parallel endpoints may be **candidates** for deprecation **after** product sign-off; if **>0**, keep until callers identified. |

**Capture:** Export from **Render logs**, **CloudWatch**, **nginx access.log**, or APM **grouped by path** — whatever the org uses. **Save** screenshot or CSV snippet + date range.

---

## Decision matrix

| Evidence | Likely conclusion | Safe next action |
|----------|-------------------|------------------|
| **P1** matches Next host; **R1–R5** traits **Next**; logs show **Next** upstream only | **Next only** for coach reads | Document in 4A appendix; **defer** `hockey-server` coach duplicates until explicit retirement project. |
| **R1–R5** traits **hockey-server**; **`EXPO_PUBLIC_API_URL`** points at **:4000** or Express host | **hockey-server** (or Express) serving mobile | **Urgent:** align **`EXPO_PUBLIC_API_URL`** to Next **or** port Next parity to Express — product reads are **not** on canonical 3F–3L. |
| **R1** Next-shaped, **R5** mock-shaped, different hosts in logs | **Split** (mixed routing / misconfig) | Fix **gateway** or **URL**; do **not** retire either stack until consistent. |
| Log counts **>0** on **`POST .../sessions/sync`** or **`POST .../observations`** | Parallel **writes** still in use | **Do not** remove Next **`CoachSession`** routes; trace caller (UA, API key, IP). |
| Log counts **~0** for **7d** on parallel paths; **R6–R8** unused in staging | **Dormant** parallel HTTP | Eligible for **deprecation proposal** (separate phase: legal/product + announce). |
| **No log access** | **Unknown** | Complete **Route checks** only; record “traffic unverified”; **no** retirement. |

---

## Handoff

This checklist enables **future** (separate) decisions:

- **Deprecate** duplicate **`hockey-server`** **`/api/coach/*`** handlers when evidence shows **Next-only** traffic and mobile **`EXPO_PUBLIC_API_URL`** is locked to Next.
- **Unify** serving path (single upstream for **`/api`**) once gateway + mobile env are aligned.
- **Retire** frozen **Next** **`CoachSession`** HTTP surfaces only after **parallel path traffic ≈ 0** and **no** external callers — **not** implied by completing this checklist alone.
- **Keep** **`hockey-server`** (or Next parallel routes) as a **compatibility layer** if logs show ongoing use or **unknown** clients.

---

## DONE / PARTIAL / NOT DONE

| Status | Meaning |
|--------|---------|
| **DONE** | **4B** runbook created; goals, per-env checks, route table, traffic table, decision matrix, handoff. |
| **PARTIAL** | Actual execution — operator fills in recorded values; may stop at “unknown” where access is missing. |
| **NOT DONE** | Route removal, proxy changes, **`hockey-server`** edits — **out of scope** for **4B**. |
