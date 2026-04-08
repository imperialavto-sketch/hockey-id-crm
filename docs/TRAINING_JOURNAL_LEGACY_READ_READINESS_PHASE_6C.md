# Legacy Coach Trainings Read-Path Readiness — Phase 6C

## A. Goal

Prepare **`GET /api/legacy/coaches/[id]/trainings`** (legacy coach-detail list including embedded **`TrainingJournal`**) for **future** deprecation or disablement, **without** removing the route, **without** schema changes, and **without** backfill.

Relations:

- **Phase 6B** — HTTP **write** kill-switch for `/api/training-journal*`.
- **Phase 5F** — in-repo dependency inventory and sunset preconditions.

---

## B. Audit findings

| Question | Answer |
|----------|--------|
| **Route implementation** | `src/app/api/legacy/coaches/[id]/trainings/route.ts` — `Training` rows for coach’s teams, `include.journal` filtered by `coachId`, `_count.attendances`, RBAC `coaches` `view`. |
| **In-repo `src/` consumers** | **None** — no `fetch`/`import` of this URL path (grep). `coachLegacyTrainingsListUrl` has **zero** importers. |
| **Scripts / e2e** | **`scripts/crm-e2e-sanity.ts`** does **not** call this path (removed Phase 5E). |
| **CRM product runtime** | Coach trainings tab uses **canonical** `GET /api/coaches/[id]/trainings` + session journal (Phase 5C). |
| **Why data still appears** | **`prisma/seed.ts`** / **`seed-full.js`** still create **`Training`** + **`TrainingJournal`**; legacy GET is one way to **read** that data. |

**Disable-ready:** **Not** claimed — external HTTP callers may exist; disabling would hide legacy journal embeds unless clients migrate to canonical list shape.

---

## C. Current read-path status (after Phase 6C)

| Aspect | Behavior |
|--------|----------|
| **JSON body** | Unchanged — array of `Training` with `journal`, `team`, `_count`. |
| **Successful GET (200)** | Response headers: **`Deprecation: true`** (RFC 8594), **`Link: </api/coaches/{id}/trainings>; rel="alternate"`** pointing at canonical list. |
| **Errors** | 500 JSON unchanged; **no** deprecation headers on error responses (handler catch path). |
| **RBAC failures** | Unchanged (`requirePermission` response). |
| **Opt-in log** | `LOG_LEGACY_COACH_TRAININGS_READ=1` → `console.warn` with `coachId` and `rowCount` after DB read. |

---

## D. Deprecation readiness recommendation

| Strategy | Status |
|----------|--------|
| **Stay live** | Yes — route remains **enabled** by default. |
| **Deprecation signal** | **Implemented** on **200** responses: `Deprecation` + `Link` alternate. |
| **Instrumentation** | **Opt-in** env log (same pattern as Phase 6A `LOG_LEGACY_TRAINING_JOURNAL`). |
| **Future cut (documented only)** | **Phase 6D+ (example):** env `DISABLE_LEGACY_COACH_TRAININGS_READ=1` → **404** or **410** with JSON body pointing to canonical URL; or remove route after traffic proof + seed policy update. |

**Read-path shutdown is separate from:** (1) HTTP journal **write** kill-switch (6B), (2) **seed** Prisma writes, (3) **`TrainingJournal` model removal**.

---

## E. Evidence still needed before future shutdown

1. **Production/staging access logs** for `GET /api/legacy/coaches/*/trainings`.  
2. **Decision** whether any consumer still needs **legacy** `Training` shape vs canonical **`TrainingSession`** shape.  
3. **Seed policy** if legacy list is removed — who still needs demo legacy rows for other features (player edit, schedule compat, etc.).  
4. **Communication** and timeline if header deprecation is insufficient and **hard disable** is planned.

---

## F. Risks not resolved

- Clients that **ignore headers** may not migrate until forced.  
- **`Deprecation: true`** without a date (RFC 8594 allows `Deprecation` as boolean in some interpretations; date is optional in common practice).  
- **Canonical list** does not return raw `Training` — migration is **not** header-only for clients that depend on legacy shape.

---

## G. Recommended next phase

1. Enable **`LOG_LEGACY_COACH_TRAININGS_READ=1`** briefly in staging to measure traffic.  
2. Implement **read kill-switch** env (mirror 6B) when evidence supports it.  
3. Align **seed** strategy with legacy list retirement (Phase 5F / 6A seed notes).  
4. **Final** route removal only after reads + writes + model plan are aligned.
