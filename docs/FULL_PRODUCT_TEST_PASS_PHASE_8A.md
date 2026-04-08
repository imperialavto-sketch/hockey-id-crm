# Full product test pass — Phase 8A (prep)

## A. Surfaces checked

Static **code-path audit** (route components, primary `fetch` targets, error/loading UI) for the main CRM shell:

| Surface | App route |
|---------|-----------|
| Dashboard | `/dashboard` |
| Coaches list | `/coaches` |
| Coach detail + trainings tab + journal modal | `/coaches/[id]` |
| Trainings list (global) | `/trainings` |
| Teams list | `/teams` |
| Team detail | `/teams/[id]` |
| Players list | `/players` |
| Player detail | `/players/[id]` (canonical; `/player/[id]` is frozen duplicate) |
| Schedule list | `/schedule` |
| Schedule / training detail | `/schedule/[id]` |
| Communications inbox | `/communications` |
| Chat thread | `/communications/chat/[id]` |

**Limitation:** No live browser or E2E run was executed in this pass. Status reflects **implementation review**; operators should still run a **manual smoke** on a staging URL with a real session.

---

## B. PASS / PASS WITH NOTES / FAIL by surface

| Surface | Status | Notes |
|---------|--------|--------|
| **Dashboard** | **PASS** | Uses `credentials: "include"`, `parseOkJson` + global fetch error + retry. |
| **Coaches list** | **PASS WITH NOTES** → **PASS** (after fix) | Fetches omitted `credentials: "include"` vs other pages — **aligned in 8A**. |
| **Coach detail / trainings / journal** | **PASS WITH NOTES** → **PASS** (after fix) | Canonical session journal APIs; journal save had **no user-visible error on failure** — **fixed in 8A**. Header training count vs session tab **known divergence** (documented in-page) — **P3**, not a regression fix here. |
| **Trainings list** | **PASS WITH NOTES** → **PASS** (after fix) | `credentials: "include"` added for cookie-auth consistency. |
| **Teams list** | **PASS WITH NOTES** → **PASS** (after fix) | `credentials: "include"` added. |
| **Team detail** | **PASS WITH NOTES** → **PASS** (after fix) | GET/DELETE lacked explicit `credentials: "include"` — **fixed in 8A**. |
| **Players list** | **PASS WITH NOTES** → **PASS** (after fix) | Teams + players fetches now send cookies explicitly. |
| **Player detail** | **PASS** | Large surface; no specific break identified in spot checks (fetch patterns use include in hot paths reviewed). |
| **Schedule list** | **PASS WITH NOTES** → **PASS** (after fix) | Schedule week fetches now use `credentials: "include"`. |
| **Schedule detail** | **PASS WITH NOTES** | `ScheduleDetailPage` is legacy + session dual-stack (documented in file headers); **no change** — expect continued architecture debt, not treated as P1/P2 unless a concrete break is filed. |
| **Communications** | **PASS** | Inbox uses `/api/chat/conversations` with error + retry + row guard. |
| **Chat thread** | **PASS** | Loads conversation + messages; send restores input on failure. |

### Prior FAIL / PASS WITH NOTES → addressed (P2)

| Issue | Severity | Fix |
|-------|-----------|-----|
| Journal modal: failed save left user with no feedback | **P2** | `journalSaveError` + API message / status on `/coaches/[id]` |
| Several list/detail pages used `fetch` without `credentials: "include"` while dashboard/chat use it | **P2** | Added `credentials: "include"` on affected CRM fetches (cookie-auth consistency, some hosting/CORS setups) |

---

## C. Files changed

- `src/app/(dashboard)/coaches/[id]/page.tsx`
- `src/app/(dashboard)/coaches/page.tsx`
- `src/app/(dashboard)/teams/page.tsx`
- `src/app/(dashboard)/teams/[id]/page.tsx`
- `src/app/(dashboard)/players/page.tsx`
- `src/app/(dashboard)/trainings/page.tsx`
- `src/app/(dashboard)/schedule/page.tsx`
- `docs/FULL_PRODUCT_TEST_PASS_PHASE_8A.md`

---

## D. Fixes made

1. **Coach journal save:** On non-OK response, parse JSON `error` / `message` or show status-based fallback; clear error when opening/closing modal or on success.
2. **Auth cookie alignment:** `credentials: "include"` on team detail GET/DELETE, coaches list, teams list, players list (teams + players), trainings list, schedule week fetches.

---

## E. Remaining issues

| Item | Severity |
|------|-----------|
| **Manual / E2E QA** not executed in-repo | — |
| **Coach header** “тренировок” uses legacy `Team._count.trainings`; tab uses `TrainingSession` | **P3** (documented) |
| **`/schedule/[id]`** dual legacy/session stack | **P3** architecture debt |
| Duplicate player routes **`/player/[id]`** vs **`/players/[id]`** | **P3** (architecture freeze) |

---

## F. Recommended next phase

1. **Manual smoke** on staging: one flow per surface above with `SCHOOL_ADMIN` and `COACH` (and parent-facing only if in scope).  
2. **Playwright or Cypress** minimal suite: dashboard load, coach detail trainings tab open journal, communications → thread.  
3. **Phase 8B:** file tickets for any **P3** architecture cleanups only after smoke finds real user pain.
