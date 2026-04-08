# Hockey ID Player Report Replacement Audit

**Phase 3K — planning / audit only.** No runtime, schema, or route changes in this pass.

**Scope:** `GET /api/coach/reports/player/[id]` (`src/app/api/coach/reports/player/[id]/route.ts`), its direct Prisma reads, shared helpers it could align with, and **`coach-app`** consumers only.

**Context:** Canonical live-training SSOT is **`LiveTrainingSession`** + related models. **`CoachSession*`** parallel capture is frozen for writes/clients. **`GET /api/coach/reports/weekly`**, **`GET /api/coach/players/[id]/share-report`**, **`GET /api/coach/parent-drafts`** (`session_draft`), and **`GET /api/coach/actions`** already use canonical read paths.

**Phase 3L (implemented):** **`GET /api/coach/reports/player/[id]`** now uses **`prisma.liveTrainingSessionReportDraft.findMany`** (**`session.status === confirmed`**, **`orderBy: updatedAt desc`**, **`take: 40`**) and the same **`extractParentFacingFromSummary`** scan as **`share-report`**. **`observationsCount`** = **`LiveTrainingPlayerSignal.count`** for the matched **`liveTrainingSessionId`** + **`playerId`**. **`avgScore`** is **not** serialized (no invented heuristic); **`coach-app`** **`mapPlayerReportApiToUi`** treats absent **`avgScore`** as **`overallScore: null`**. Projection: **`src/lib/coach/build-player-report-item-from-live-training-draft.ts`**.

---

## Current route overview

**Pre-3L reference (for diff context):** the route previously read **`CoachSession*`** only.

- **Path:** `GET /api/coach/reports/player/[id]`
- **Auth / scope:** `requireCrmRole` + `getAccessiblePlayerIds`; **403** if player not in scope.
- **Selection rule:** Loads **one** row: `CoachSessionParentDraft` for `playerId === id` where **`coachSession.coachUserId === user.id`** and **`coachSession.endedAt` is not null**, ordered by **`coachSession.endedAt` descending** (`findFirst`).
- **Empty state:** If no matching draft, returns **200** with `{ playerId, playerName: "Игрок", ready: false }` (no **404**). The file header comment says “404 when no parent draft” — that is **incorrect** relative to the implementation.
- **No other HTTP entrypoints in `src/`** for this contract; **`hockey-server/server.js`** exposes a **different** implementation (`prisma.observation`, `buildPlayerReportData`, returns **`observations`[]**). Coach-app targets the **Next** API per `coachReportsService`.

---

## CoachSession dependency map

| Step | Model / API | Role |
|------|-------------|------|
| 1 | **`CoachSessionParentDraft`** | Parent-facing copy: `headline`, `parentMessage`, `positives` (JSON array), `improvementAreas` (JSON), `focusSkills` (JSON), `playerId`, `playerName`, `coachSessionId`. |
| 2 | **`CoachSession`** (via `include`) | Scoped by `coachUserId`, `endedAt != null`; provides **`updatedAt` analogue**: `endedAt ?? startedAt` for response `updatedAt`. |
| 3 | **`CoachSessionObservation`** | **`count`** where `coachSessionId` + `playerId` → **`observationsCount`**. |
| 4 | **`CoachSessionPlayerSnapshot`** | **`findFirst`** same session + player; **`skills` JSON** (array or record of objects with numeric **`score`**) → **`avgScore`** (rounded mean of scores, or omitted). |

**Helpers:** None imported from `@/lib/coach/*`; logic is **inline** in the route.

**Prisma schema references:** `CoachSession`, `CoachSessionParentDraft`, `CoachSessionObservation`, `CoachSessionPlayerSnapshot` (`prisma/schema.prisma` — parallel legacy models).

---

## Response shape summary

**Success (with draft)** — JSON object (see `coach-app/services/coachReportsService.ts` **`PlayerReportApiItem`** for client expectations):

| Field | In Next route today | Notes |
|-------|---------------------|--------|
| `playerId` | Yes | From draft |
| `playerName` | Yes | `draft.playerName` or `"Игрок"` |
| `observationsCount` | Yes | Integer |
| `shortSummary` | Yes | `headline` or `parentMessage` (trimmed); optional |
| `keyPoints` | Yes | `positives` if non-empty; else omitted |
| `recommendations` | Yes | If `focusSkills.length > 0`: one string `Сфокусироваться на …`; else up to 2 strings from `improvementAreas` |
| `updatedAt` | Yes | ISO string: `coachSession.endedAt` ?? `coachSession.startedAt` |
| `ready` | Yes | `true` |
| `avgScore` | Yes | Optional number (0–100 style from snapshot skills mean) |
| `topSkillKeys` | No | Not set by Next route; client tolerates absent |
| `observations` | No | **Not returned** by Next route; client maps empty array |

**Empty (no draft):** `{ playerId, playerName: "Игрок", ready: false }` — other fields absent; **`getCoachPlayerReport`** returns **`null`** when `ready === false`.

---

## Canonical replacement feasibility by field/section

Canonical sources **actually present** in schema/code (this repo):

- **`LiveTrainingSession`** — `status`, `startedAt`, `endedAt`, `confirmedAt`, `coachId`, optional `trainingSessionId`
- **`LiveTrainingSessionReportDraft`** — `summaryJson`, `updatedAt`, `coachId`, 1:1 `session`
- **`LiveTrainingPlayerSignal`** — per player + session; `signalStrength`, `signalDirection`, `metricKey`, `evidenceText`, `createdAt`
- **`LiveTrainingSessionReportDraftSummary`** — typed in `src/lib/live-training/live-training-session-report-draft.ts`: `players[]` (counts, `topDomains`, `evidence`), `notes.positives` / `notes.needsAttention`, `counters`, `coachPreviewNarrativeV1`, `sessionMeaningParentActionsV1`, etc.
- **`TrainingSessionReport`** / **`PlayerSessionReport`** — scheduled-training / publish layer; used elsewhere (**`published-session-reports`**, analytics), **not** the same row as one live session’s draft; optional **future** enrichment only if product wants “published” wording

Shared extraction already used by **share-report** / **parent-drafts** / **weekly**:

- `parseLiveTrainingReportDraftSummary`, `extractParentFacingFromSummary` — `src/lib/coach/live-training-report-draft-parent-extract.ts`
- **Share-report** scan pattern: `liveTrainingSessionReportDraft.findMany` where `coachId`, `session.status === "confirmed"`, `orderBy: { updatedAt: "desc" }`, `take: 40`, first draft where `extractParentFacingFromSummary` yields non-empty `message` (`src/app/api/coach/players/[id]/share-report/route.ts`).

| Field / section | Current source | Possible canonical source | Feasibility | Compatibility risk | Notes |
|-----------------|----------------|---------------------------|-------------|-------------------|--------|
| **Session row choice** | Latest **`CoachSession` with `endedAt`** that has a **parent draft** for player | Scan **`LiveTrainingSessionReportDraft`** (confirmed), **`orderBy: updatedAt desc`**, first hit with extractable parent text for **playerId** (same as **share-report**) | **Adapter** | **Ordering differs** from `CoachSession.endedAt` vs **draft `updatedAt`**; align with **3G/3J** for CRM consistency | Alternative: order by **`session.endedAt` desc** — closer to legacy but diverges from weekly/share |
| `playerId` | Draft | Path param / extract | **Direct** | Low | Unchanged |
| `playerName` | `CoachSessionParentDraft.playerName` | `extractParentFacingFromSummary` + **`Player`** backfill if `"Игрок"` (same as weekly/share) | **Direct / adapter** | Low | Reuse established pattern |
| `ready` | `false` if no draft; else `true` | `false` if no extractable message; else `true` | **Direct** | Low | Matches **3J** “ready” semantics |
| `shortSummary` | `headline \|\| parentMessage` | `extracted.shortSummary` or first line of `message` (weekly builder pattern) | **Adapter** | **Medium** | Wording differs from legacy headline/parentMessage precedence; same family as **weekly** |
| `keyPoints` | `positives` | `extracted.keyPoints` (from positives notes / positive evidence) | **Adapter** | **Medium** | Structure similar; exact strings differ from parallel-only drafts |
| `recommendations` | `focusSkills` → Russian template; else `improvementAreas` slice | `extracted.recommendations` (`deriveRecommendations` → `notes.needsAttention`) or map **`coachPreviewNarrativeV1.focusAreas`** / **`sessionMeaningNextActionsV1`** | **Adapter** | **High** | No **`focusSkills`** JSON on canonical draft; template **«Сфокусироваться на …»** may disappear unless reproduced from `focusDomains` / narrative |
| `observationsCount` | **`CoachSessionObservation.count`** | **`LiveTrainingPlayerSignal.count`** for `(playerId, liveTrainingSessionId)` of chosen session | **Adapter** | **Medium** | Count semantics differ (legacy “observations” vs canonical **signals**); likely acceptable as “activity count” if product agrees |
| `avgScore` | Mean of numeric **`score`** in **`CoachSessionPlayerSnapshot.skills`** | **No 1:1 field** in `summaryJson.players` (counts/evidence/topDomains, not 0–100 skill scores). **`LiveTrainingPlayerSignal.signalStrength`** is not the same scale | **Blocked / product** | **High** | UI maps score to **good/stable/needs-attention** (`mapPlayerReportApiToUi`). Omitting **`avgScore`** forces **“stable”** band unless heuristic added |
| `updatedAt` | `session.endedAt ?? session.startedAt` | **`session.confirmedAt` → `session.endedAt` → `draft.updatedAt`** (ISO), same as **share-report / weekly** | **Adapter** | **Medium** | **`confirmedAt`** may differ from legacy **`endedAt`**-only emphasis |
| `topSkillKeys` | Not sent | Derive from **`summary.players[].topDomains`** or frequent **`metricKey`** from signals for that session | **Optional extension** | Low if omitted | Client already optional; adding would be **new projection**, not required for parity |
| `observations`[] | Not sent by Next | Could map **`LiveTrainingPlayerSignal`** rows to `{ id, skillKey: metricKey, noteText: evidenceText, createdAt }` — **no** `score` on signal | **Adapter / optional** | Medium | Would align **client** type with **canonical** data; **not** required for current Next behavior |

---

## Biggest replacement risks

1. **`avgScore` / overall assessment** — Legacy derives a **parent-facing 0–100-style** metric from **snapshot JSON**. Canonical path has **no equivalent**; dropping it changes **`coach-app`** labels (**«Хороший прогресс»** / **«Требует внимания»**) unless product accepts **null** or a **new heuristic** (e.g. from positive/negative signal counts — **not** implemented today, needs spec).
2. **`recommendations` copy** — Legacy **`focusSkills`**-driven Russian sentence and **`improvementAreas`** list do not map 1:1 to **`summaryJson`**. **`extractParentFacingFromSummary`** already exposes **`recommendations`** from **needs-attention** notes; merging with **next-actions** / **focusDomains** is a **product** choice.
3. **Historical gap** — Coaches with **only** parallel **`CoachSessionParentDraft`** data and **no** confirmed live draft with **`summaryJson`** for that player will get **`ready: false`** after cutover unless **dual-read** or backfill exists.
4. **Session selection** — **`endedAt` desc** (legacy) vs **`draft.updatedAt` desc** (share/weekly) can pick **different** “latest” sessions for the same player.
5. **Stable IDs** — Response has no session id today; any future field for deep links should use **`LiveTrainingSession.id`**, not **`CoachSession.id`**.
6. **Comment inaccuracy** — Route header claims **404** without draft; actual behavior is **200 + `ready: false`** — avoid copying the wrong contract into docs.

---

## Recommended implementation approach

1. **Smallest safe replacement path**  
   - Reuse the **same draft scan** as **`GET /api/coach/players/[id]/share-report`**: confirmed sessions, **`orderBy: draft.updatedAt desc`**, bounded `take`, first draft where **`extractParentFacingFromSummary`** returns non-empty **`message`**.  
   - Map **`shortSummary`**, **`keyPoints`**, **`recommendations`** from **`ParentFacingExtract`** + the same fallbacks as **`build-weekly-report-items-from-live-training-drafts.ts`** where needed for string shape.  
   - Set **`observationsCount`** via **`prisma.liveTrainingPlayerSignal.count`** for the chosen **`liveTrainingSessionId`** + **`playerId`**.  
   - Set **`updatedAt`** with **`confirmedAt` → `endedAt` → `draft.updatedAt`** (align **3G/3J**).  
   - **`avgScore`:** ship **omitted** (`undefined`) unless product approves a **documented heuristic** (otherwise UI stays in **stable** lane).

2. **Whole route vs branches**  
   - **Single implementation path** is enough: there is no multi-branch DTO today. Optional **temporary dual-read** (try canonical first, fallback **`CoachSessionParentDraft`**) increases complexity and was **not** required for **weekly**; **default recommendation: no dual-read** unless product mandates zero regression for parallel-only history.

3. **Shared projection helper**  
   - Add a **small pure helper** (e.g. “player report row from one draft row + signal count”) that reuses **`extractParentFacingFromSummary`** and mirrors **weekly** string rules — **avoids a fourth diverging copy** of extract + fallbacks. **Do not** duplicate full **`summaryJson`** parsing logic outside **`live-training-report-draft-parent-extract.ts`**.

4. **Published reports (`TrainingSessionReport`)**  
   - **Out of scope** for minimal parity unless product wants the player report to reflect **published** school copy; that would be a **separate** branch or later phase (see **`published-session-reports`**).

5. **Documentation / comment fix**  
   - **Done in 3L:** route header documents **200 + `ready: false`** and canonical backing.

---

## DONE / PARTIAL / NOT DONE

| Status | Meaning |
|--------|---------|
| **DONE** | Audit (**3K**) + **3L** route migration (**`build-player-report-item-from-live-training-draft.ts`**, **`avgScore`** omitted by design). |
| **PARTIAL** | **`hockey-server`** **`/api/coach/reports/player/:id`** remains a **different** implementation; optional **`observations[]`** on Next route still not populated. |
| **NOT DONE** | Dual-read merge with legacy **`CoachSession*`**, tests, **`hockey-server`** alignment if prod still routes there. |

---

## Cross-references

- Implementation pattern: `src/app/api/coach/players/[id]/share-report/route.ts`  
- Extraction: `src/lib/coach/live-training-report-draft-parent-extract.ts`  
- Weekly projection: `src/lib/coach/build-weekly-report-items-from-live-training-drafts.ts`  
- Player report projection: `src/lib/coach/build-player-report-item-from-live-training-draft.ts`  
- Client: `coach-app/services/coachReportsService.ts` (`getCoachPlayerReport`, `mapPlayerReportApiToUi`), `coach-app/app/player/[id]/report.tsx`  
- Plan index: `docs/architecture/HOCKEY_ID_COACHSESSION_READMODEL_REPLACEMENT_PLAN.md`
