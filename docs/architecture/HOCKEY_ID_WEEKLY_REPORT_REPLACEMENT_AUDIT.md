# Hockey ID Weekly Report Replacement Audit

**Phase:** 3I — **audit / planning only** (no runtime changes, no Prisma schema changes, no route removal, no refactors outside this analysis).  
**Scope:** **`GET /api/coach/reports/weekly`** — `src/app/api/coach/reports/weekly/route.ts` and **direct** coach-app wiring (`coachReportsService`, `weeklyReportHelpers`).  
**Out of scope for this document:** **`GET /api/coach/reports/player/[id]`** (separate phase).  
**Evidence:** Source reads (April 2026).

### Phase 3J (implemented)

**`GET /api/coach/reports/weekly`** was migrated to canonical **`LiveTrainingSessionReportDraft`** + **`summaryJson`** extraction (**`build-weekly-report-items-from-live-training-drafts.ts`**, same **`extractParentFacingFromSummary`** / **`collectPlayerIdsForParentDraftScan`** as **3G/3H**). **Query:** `coachId`, **`session.status === confirmed`**, **`orderBy: draft.updatedAt desc`**, **`take: 50`**. **Ready:** non-empty extracted parent-facing **`message`**. **`updatedAt` per row:** `session.confirmedAt` → `session.endedAt` → **`draft.updatedAt`** (ISO). **`Player`** backfill when **`playerName === "Игрок"`**. **`GET /api/coach/reports/player/[id]`** unchanged (**CoachSession**-backed).

The sections below record the **3I** pre-migration audit (behavior and risks before **3J**).

---

## Current route overview

| Aspect | Detail |
|--------|--------|
| **File** | `src/app/api/coach/reports/weekly/route.ts` |
| **Auth** | `requireCrmRole` (Bearer) |
| **Data scope** | Coach’s **`CoachSession`** rows with **`endedAt != null`** and at least one **`CoachSessionParentDraft`**, **`orderBy: endedAt desc`**, **`take: 50`**. |
| **Access filter** | `getAccessiblePlayerIds` — skips drafts for players outside scope. |
| **Dedup** | **One list row per `playerId`**: first occurrence while iterating sessions **newest-ended first**, then **parentDrafts** in Prisma include order (not explicitly `orderBy` on nested drafts). |
| **Helpers** | None beyond **`@/lib/prisma`**, **`@/lib/api-rbac`**, **`@/lib/data-scope`**. No imports from `live-training/*`. |

---

## CoachSession dependency map

| Prisma model | Fields used | Role |
|--------------|-------------|------|
| **`CoachSession`** | `coachUserId`, `endedAt`, `startedAt` | Filter “ended” sessions; **`updatedAt` proxy** for list item timestamp. |
| **`CoachSessionParentDraft`** | `playerId`, `playerName`, `headline`, `parentMessage`, **`positives`** (JSON array), **`improvementAreas`** (JSON array) | Per-player row content; **`shortSummary`** and **`keyPoints`** derivation. |

No **`CoachSessionObservation`**, **`CoachSessionPlayerSnapshot`**, or other tables in this route.

---

## Response shape summary

**Success:** `NextResponse.json(items)` where `items` is an **array** of objects:

| JSON field | Type | Server behavior today |
|------------|------|------------------------|
| **`playerId`** | `string` | From **`CoachSessionParentDraft.playerId`**. |
| **`playerName`** | `string` | `d.playerName \|\| "Игрок"`. |
| **`shortSummary`** | `string` | `headline` → else `parentMessage` → else first **`positives[0]`** → else first **`improvementAreas[0]`** → else `"—"`. |
| **`keyPoints`** | `string[]` | Up to **3** entries from **`positives`** (stringified elements). |
| **`updatedAt`** | `string` (ISO) | **`CoachSession.endedAt`** else **`startedAt`**. |
| **`ready`** | `boolean` | Always **`true`** for included rows. |

**Error:** `{ error, details }` with **500**.

**Not emitted by this route (but allowed by client type):** `observationsCount`, `topSkillKeys`, `recommendations`, `avgScore` — **`WeeklyReportApiItem`** in `coachReportsService.ts` includes them; weekly list path leaves them **undefined**; **`mapWeeklyApiToItem`** only needs **`shortSummary` / `keyPoints` / `recommendations`** fallbacks for **`summary`** string.

---

## Coach-app call chain (direct)

| Layer | Path | Role |
|-------|------|------|
| **Service** | `coach-app/services/coachReportsService.ts` — `getCoachWeeklyReports()` | `GET /api/coach/reports/weekly`, maps via **`mapWeeklyApiToItem`** → **`WeeklyReportItem`**. |
| **Helper** | `coach-app/lib/weeklyReportHelpers.ts` — `getWeeklyReadyReports()` | Thin re-export. |
| **UI / usage** | `coach-app/app/reports.tsx`, `app/(tabs)/home.tsx` (count), `components/dashboard/WeeklyReportsBlock.tsx`, `lib/coachHomePrioritiesHelpers.ts`, `lib/coachMarkDigestHelpers.ts` | List, counts, digest. |

**Client contract:** **`WeeklyReportItem`**: `playerId`, `playerName`, **`summary`** (truncated ~70 chars from API **`shortSummary`** / first keyPoint / first recommendation), optional **`updatedAt`**, **`avgScore`**, **`observationsCount`**.

**Stable ID assumptions:** **None** at HTTP level (no row `id` in weekly response). Navigation uses **`playerId`** to open **`/player/[id]/report`** (separate **player report** API).

---

## Canonical replacement feasibility by field/section

| Field / section | Current source | Possible canonical source (schema / code exists) | Feasibility | Compatibility risk | Notes |
|-----------------|----------------|---------------------------------------------------|-------------|----------------------|--------|
| **Eligibility (“has a ready row”)** | **`CoachSession`** ended + has **`CoachSessionParentDraft`** | **`LiveTrainingSessionReportDraft`** with **`session.status === confirmed`** and **`extractParentFacingFromSummary`** (or equivalent) returns non-empty **`message`** — same pattern as **`GET /api/coach/parent-drafts`** `session_draft` | **Adapter / projection** | **High** if definition of “ready” differs | Today “ready” = parallel sync wrote parent drafts. Canonical = derived text from **`summaryJson`**. |
| **`playerId`** | Draft row | Same player id from canonical scan | **Direct** | Low | Align with **`collectPlayerIdsForParentDraftScan`** + extract. |
| **`playerName`** | **`CoachSessionParentDraft.playerName`** | **`extractParentFacingFromSummary`** / **`Player`** table fallback (as in parent-drafts / share-report) | **Adapter** | Low–medium | Name drift vs CRM **`Player`** if draft name was stale. |
| **`shortSummary`** | headline → parentMessage → positive[0] → improvement[0] | **`extractParentFacingFromSummary.shortSummary`** or **first line of `message`**; optional fallback to first **`keyPoints`** entry | **Adapter** | **Medium** | Wording will **not** match legacy headline/parentMessage priority 1:1. **Product** may accept parity on “one-line teaser”. |
| **`keyPoints`** (max 3) | First 3 **`positives`** JSON strings | **`extractParentFacingFromSummary.keyPoints`** (already capped to 5 in **`live-training-report-draft-parent-extract.ts`**) → **`.slice(0, 3)`** | **Adapter** | **Medium** | Canonical points come from **`notes.positives` / evidence**, not legacy **`CoachSessionParentDraft.positives`**. |
| **`updatedAt`** | **`CoachSession.endedAt`** (else `startedAt`) | **`LiveTrainingSession.confirmedAt`** → **`endedAt`** → **`LiveTrainingSessionReportDraft.updatedAt`** (same precedence as **3H** parent-drafts) | **Adapter** | **Medium** | **`endedAt`** vs **`confirmedAt`** changes sort/recency vs old **`CoachSession.endedAt`**. |
| **`ready: true`** | Implicit for all returned rows | **`true`** whenever row included | **Direct** | Low | Client filters **`ready !== false`**. |
| **List dedup** | First **`playerId`** wins across sessions (newest session first) | Same: iterate **`liveTrainingSessionReportDraft`** **`orderBy: updatedAt desc`**, **`take: 50`**, mark **`seen`** per **`playerId`** — mirrors **3H** | **Adapter** | **Medium** | Within-session draft order differed (Prisma include order vs sorted id list in **3H**); **minor ordering** differences possible for which session “wins” for a player when multiple drafts qualify. |
| **`observationsCount` / `avgScore`** (optional) | Not set | Could be filled from **`LiveTrainingReportDraftPlayerSummary`** / signals — **not required** for weekly list today | **Blocked / optional** | Low if omitted | Extending response is **optional**; would be **product** choice. |

**Sources explicitly in schema / code (no invention):**

- **`LiveTrainingSession`**, **`LiveTrainingSessionReportDraft`** (`summaryJson`, `coachId`, `updatedAt`, relation **`session`**).
- **`LiveTrainingSessionReportDraftSummary`** shape and **`extractParentFacingFromSummary`**, **`parseLiveTrainingReportDraftSummary`**, **`collectPlayerIdsForParentDraftScan`** in **`src/lib/coach/live-training-report-draft-parent-extract.ts`** (already used by **3G** / **3H**).
- **`LiveTrainingPlayerSignal`** — usable for extra metrics **only if** product wants counts on weekly cards (not current weekly route behavior).
- **`TrainingSessionReport`**, **`LiveTrainingSessionReportDraft.publishedAt`** — exist in schema; **not used** by weekly route today; could define stricter “ready = published” later (**product**).

---

## Biggest replacement risks

1. **Historical gap:** Coaches with **only** parallel **`CoachSessionParentDraft`** data and **no** populated canonical **`summaryJson`** for confirmed sessions will **disappear** from the weekly list (same class of risk as **3F–3H**).
2. **“Ready” semantics:** Legacy = “had synced parent draft on ended **`CoachSession`**.” Canonical = “has derivable parent-facing text from report draft.” **Different predicates.**
3. **Copy / tone:** **`shortSummary`** and **`keyPoints`** will follow the **fixed parent-facing chain** (parent actions → highlights → positives → evidence), **not** headline / parentMessage / improvementAreas precedence.
4. **Timestamps & ordering:** **`updatedAt`** tied to **live-training** session/draft times vs **`CoachSession.endedAt`** may **reorder** the list relative to legacy.
5. **Intra-session ordering:** Legacy nested **`parentDrafts`** order vs **3H-style** sorted **`collectPlayerIdsForParentDraftScan`** may change which player appears first when the same canonical draft yields **multiple** players in one pass (weekly still **one row per player globally**).
6. **No stable server row id** in weekly response today — **low** ID risk; **`playerId`** remains stable.

---

## Recommended implementation approach

1. **Smallest safe replacement path:** Reimplement **`GET` handler** only in **`weekly/route.ts`** using the **same query + scan pattern** as **`parent-drafts`** **`session_draft`** branch: **`liveTrainingSessionReportDraft.findMany`** (`coachId`, **`session.status: confirmed`**, **`orderBy: updatedAt desc`**, **`take: 50`**), then for each draft **`collectPlayerIdsForParentDraftScan`** → **`extractParentFacingFromSummary`**; on hit, push **weekly-shaped** object; **batch-resolve** **`"Игрок"`** names via **`Player`** (as **3H**).
2. **Shared helper first (recommended):** Add a **thin** function (e.g. **`buildWeeklyReportItemsFromLiveTrainingDrafts`**) in **`src/lib/coach/`** that returns the **weekly JSON shape**, **or** import/call existing extract + a small mapper in-route — avoids duplicating the **50-line** scan loop a fourth time. **Do not** expand **`live-training-report-draft-parent-extract.ts`** unless the weekly mapper is trivially delegated there.
3. **Whole route vs branch:** The route is **single-purpose**; replace **entire read path** (no meaningful “branch” besides error handling). **Dual-read** merge (`CoachSession` + canonical) is **optional** and **larger** — defer unless product mandates legacy visibility.
4. **Tests / manual checks:** After a future implementation pass, verify **`reports.tsx`**, **`WeeklyReportsBlock`**, **`home`** count, **`coachHomePrioritiesHelpers`**, **`coachMarkDigestHelpers`** with empty list, single player, multi-draft ordering.

---

## DONE / PARTIAL / NOT DONE

| Status | Meaning |
|--------|---------|
| **DONE** | **3I** audit documented. **3J** route migration implemented (**`weekly/route.ts`**, **`build-weekly-report-items-from-live-training-drafts.ts`**). |
| **PARTIAL** | **Product** sign-off on “ready” / copy parity was not a gate; behavior follows shared extract (**3G/3H**). |
| **NOT DONE** | Dual-read merge with legacy **`CoachSession`**, published-only filter, **`GET /api/coach/reports/player/[id]`** migration. |
