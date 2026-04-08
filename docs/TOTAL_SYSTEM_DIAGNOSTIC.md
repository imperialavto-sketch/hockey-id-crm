# Total system diagnostic — Hockey ID

**Scope:** Monorepo CRM (`src/app`), API (`src/app/api`), Prisma, `coach-app`, `parent-app`.  
**Method:** Schema + route inventory + architecture docs + targeted code reads (not a live prod audit).  
**Related:** `docs/ARCHITECTURE_FREEZE_PHASE_0.md`, `docs/ARCHITECTURE_API_AUDIT_PHASE_2.md`, journal sunset docs, Phase 8A smoke prep.

---

## A. SYSTEM INVENTORY

### A.1 Prisma models — grouped

**Ambiguity rule:** “LEGACY” = parallel or superseded domain object with active reads/writes somewhere. “CANDIDATE FOR REMOVAL” = safe removal requires a **deliberate** program (migrations, route deletion, data export) — not “unused in one screen.”

#### CORE (school + identity + canonical training & comms)

| Model(s) | Role |
|----------|------|
| `School`, `User`, `Team`, `TeamGroup`, `PlayerGroupAssignment` | Tenancy, roster, weekly group assignment |
| `Coach`, `Player`, `Parent`, `ParentPlayer`, `ParentInvite` | People graph; **`ParentPlayer`** = link SSOT per freeze |
| **`TrainingSession`**, **`TrainingAttendance`**, **`PlayerSessionEvaluation`**, **`PlayerSessionStructuredMetrics`**, **`TrainingSessionReport`**, **`PlayerSessionReport`**, **`TrainingSessionCoachJournal`** | Canonical scheduled session, attendance, quick eval, structured foundation, session/player narrative reports, **session journal SSOT** |
| **`LiveTrainingSession`** + `LiveTrainingEvent`, `LiveTrainingObservationDraft`, `LiveTrainingPlayerSignal`, `LiveTrainingSessionReportDraft` | Coach-app live training SSOT (`coachId` = `User.id`) |
| **`ChatConversation`**, **`ChatMessage`**, `ParentPeerBlock`, `ChatMessageReport`, `messengerDedupeKey` | Current messenger stack (kinds: coach–parent, parent–parent, team channels) |
| **`ExternalTrainingRequest`**, **`ExternalTrainingReport`** | Persisted parent “external Arena” contour (separate from school session) |
| `CoachRating` | CRM/player ratings of coach |
| `TeamFeedPost`, `ParentTeamAnnouncementRead` | Team feed + announcement read cursor |
| `ActivityLog` | CRM activity stream |

#### ACTIVE SUPPORT (real data, product-adjacent, not “core slot” SSOT)

| Model(s) | Role |
|----------|------|
| `UserSettings`, `LoginHistory`, `Notification`, `NotificationSetting`, `SystemSetting` | Account / prefs / notifications |
| `CoachPushDevice`, `PushDevice` | Parallel push pipelines (coach vs parent) |
| `VoiceNote`, `VoiceTrainingDraftSession`, `VoiceTrainingDraftObservation` | Voice capture → draft → suggestions (not structured SSOT without explicit mapping) |
| `PlayerProgressSnapshot`, `Passport`, `Skills`, `TeamHistory`, `Medical`, `Achievement`, `Video`, `PlayerVideoAnalysis`, `PlayerProfile`, `PlayerStat`, `AiAnalysis`, `PlayerNote`, `PlayerPayment` | Passport / media / AI / payments — **many surfaces**, uneven API coverage |
| `GameEvent`, `BehaviorLog`, `SkillProgress`, `OFPResult`, `PlayerTrainingReport`, `PlayerIndex`, `PlayerStatsSnapshot` | **Hockey ID foundation** stats layer (growing; CRM blocks depend on subset) |
| `Report`, `ActionItem`, `ParentDraft` | Coach deliverables to parents (separate from `TrainingSessionReport`) |
| **`CoachAvailability`**, **`MarketplaceSlotBooking`**, **`CoachBookingRequest`**, `CoachProfile`, `CoachService`, `Subscription`, `SubscriptionBillingRecord` | **Marketplace / independent coach / billing** contour |
| `Role`, `Permission` | DB RBAC matrix — **parallel** to `src/lib/rbac` + `User.role` (see A.3) |

#### LEGACY (parallel or superseded; still in DB and often still reachable)

| Model(s) | Role |
|----------|------|
| **`Training`**, **`Attendance`**, **`TrainingJournal`** | Legacy CRM training slot + attendance + journal; HTTP writes may be kill-switched; reads/embeds may still exist |
| **`CoachSession`**, **`CoachSessionObservation`**, **`CoachSessionPlayerSnapshot`**, **`CoachSessionParentDraft`** | Parallel “coach session” API stack (`/api/coach/sessions/*`) — **not** `LiveTrainingSession` SSOT |
| **`Message`** | Older message store still on `Parent` relation; **overlaps conceptually** with `ChatMessage` |
| **`Player.parentId`** | Transitional single-parent pointer; can diverge from `ParentPlayer` |

#### CANDIDATE FOR REMOVAL (only after explicit program)

| Candidate | Why “candidate,” not “delete now” |
|-----------|-------------------------------------|
| **`Training` / `Attendance` / `TrainingJournal`** | Removal = sunset plan (routes, seeds, exports, parent legacy reads) — in progress elsewhere |
| **`CoachSession*`** | Removal = migrate any remaining coach-app/resume flows to `LiveTrainingSession` or formally deprecate |
| **`Message` + `/api/messages`** | Removal = confirm zero consumers, migrate history if needed |
| **Duplicate CRM player pages** | Remove one **route tree** after merging UX — not a Prisma drop |
| **`Role`/`Permission` tables** | Removal = consolidate on one RBAC source or wire CRM admin to DB for real |

---

### A.2 API routes — grouped (~264 `route.ts` files)

Classification is **by primary intent**; some routes internally branch (canonical + legacy fallback).

#### CANONICAL (intended SSOT for new work)

| Prefix / area | Examples |
|---------------|----------|
| **`/api/trainings/*`** | Session CRUD, attendance, evaluations, structured metrics, report, voice-draft attachments |
| **`/api/coach/schedule`** | Coach weekly `TrainingSession` |
| **`/api/schedule`** | CRM calendar week fetch (session-based in current design) |
| **`/api/live-training/sessions/*`** | Live training lifecycle, review, report draft, events |
| **`/api/chat/conversations*`** | List, thread, messages, read receipts (SSOT for **new** inbox) |
| **`/api/coach/messages*`** | Coach inbox/detail (aligned; uses chat read for receipts per service comments) |
| **`/api/dashboard/*`** | Summary, upcoming, activity |
| **`/api/players`, `/api/players/[id]`, `/api/teams`, `/api/coaches`, `/api/ratings`, …** | CRM CRUD and school ops |
| **`/api/training-session-journal*`** | Session journal writes (CRM + kill-switch for legacy journal) |
| **`/api/coaches/[id]/trainings`** | Canonical session list for CRM coach tab |
| **`/api/me/*`, `/api/parent/*`, `parent/mobile/*`** | Parent mobile and me-scoped reads |
| **`/api/arena/external-training/*`** (persisted paths) | request, report, narrative, follow-up, confirm — backed by `ExternalTraining*` models |
| **`/api/bookings`, marketplace-adjacent** | Parent marketplace bookings |
| **`/api/external-coach/requests*`** | External coach (staff) request queue |
| **`/api/auth/*`, `/api/health`** | Auth and liveness |

#### TRANSITIONAL (still production, dual meaning or straddling legacy)

| Area | Note |
|------|------|
| **`/api/training-journal*`** | Legacy journal HTTP; may return **403** when kill-switch on; routes still present |
| **`GET /api/legacy/coaches/[id]/trainings`** | Legacy list + journal embed; deprecation headers (6C) |
| **CRM schedule detail** | Loads **canonical + legacy** training fetch paths per `ScheduleDetailPage` / `scheduleDetailTrainingFetch` comments |
| **Parallel parent messaging** | `parent/messages/*` vs `chat/*` — both exist; product uses chat for primary inbox |

#### LEGACY (explicit namespace)

| Prefix | Role |
|--------|------|
| **`/api/legacy/trainings/*`**, **`/api/legacy/coaches/*`**, **`/api/legacy/player/*`** | Compatibility for old shapes and CRM fallback paths |

#### DEAD / MOCK / TEST CANDIDATE

| Item | Role |
|------|------|
| **`POST /api/arena/external-training/report/mock-submit`** | Mock copy — not production truth |
| **`arena-external-training-match-store`** (in-memory) | Autonomous match MVP — **lost on restart** |
| **`external-training-agent.ts`** | **Mock coach list + slots** when not null; real **gap** only when `computeDevelopmentGapFromPlayerSignals` fires |
| **`hockey-server/server.js`** (if still deployed) | Separate legacy server shape — **not** Next API SSOT |
| **Dev-only coach input / sandbox routes** | Explicitly non-prod or narrow QA |

---

### A.3 Main surfaces — APIs, entities, cleanliness

| Surface | Primary APIs (representative) | DB entities | Flow quality |
|---------|------------------------------|-------------|--------------|
| **CRM `/dashboard`** | `/api/dashboard/summary`, `upcoming-trainings`, `recent-activity` | `TrainingSession`, `TrainingAttendance`, `ActivityLog`, aggregates | **Clean** for dashboard scope |
| **CRM `/coaches`, `/coaches/[id]`** | `/api/coaches*`, `/api/coaches/[id]/trainings`, `/api/training-session-journal*`, `/api/ratings`, `/api/players` | `Coach`, `Team`, `TrainingSession`, `TrainingSessionCoachJournal`, `CoachRating` | **Mixed** on coach header counts (legacy `Team._count.trainings` vs session tab) — documented in UI |
| **CRM `/trainings`, `/schedule`, `/schedule/[id]`** | `/api/trainings`, `/api/schedule`, `/api/trainings/[id]`, **legacy fallbacks** | `TrainingSession` + legacy `Training`/`Attendance` on some paths | **Legacy-contaminated** on session **detail** (explicit in code comments) |
| **CRM `/teams`, `/teams/[id]`, `/players*`** | `/api/teams*`, `/api/players*` | `Team`, `Player`, `ParentPlayer`, … | **Mostly clean**; watch `Player.parentId` vs `ParentPlayer` on edge APIs |
| **CRM `/communications`, `/communications/chat/[id]`** | `/api/chat/conversations*` | `ChatConversation`, `ChatMessage` | **Clean** for SSOT inbox |
| **Coach app — План / session** | `/api/coach/schedule`, `/api/trainings/[id]*` | `TrainingSession`, attendance, evals, structured metrics | **Canonical** |
| **Coach app — Live / Арена (live)** | `/api/live-training/sessions/*` | `LiveTrainingSession` graph | **Canonical** |
| **Coach app — resume / old session** | `/api/coach/sessions/*`, `coachSessionLiveService` | `CoachSession*` | **Legacy-contaminated** (parallel stack) |
| **Coach app — messages** | `/api/coach/messages*`, `/api/chat/conversations/*/read` | `ChatConversation`, `ChatMessage` | **Mixed** (two URL families, intentional alignment) |
| **Parent app — home / player / schedule** | `/api/me/*`, `parent/mobile/*`, schedule services | `TrainingSession`, `ParentPlayer`, … | **Mostly canonical** for schedule when using me/mobile paths |
| **Parent app — messages / chat** | `/api/chat/conversations*` | `ChatConversation`, `ChatMessage` | **Clean** for primary path |
| **Parent app — marketplace** | `marketplaceService`, `/api/bookings`, coach availability APIs | `Coach`, `CoachAvailability`, `MarketplaceSlotBooking`, … | **Separate commercial contour** — large UI surface |
| **Parent app — Arena external training** | `arenaExternalTrainingService`, `/api/arena/external-training/*` | `ExternalTrainingRequest`, `ExternalTrainingReport` | **Transitional** — real persistence + **mock agent** pieces |

---

## B. DATA FLOW MAP

### 1. Training / session data

| | |
|--|--|
| **SSOT** | **`TrainingSession`** (+ `teamId`, `groupId`, `coachId`, `startAt`/`endAt`) |
| **Write path** | CRM `/api/trainings`, `/api/coach/schedule`; coach-app `coachScheduleService`; attendance via `/api/trainings/[id]/attendance` and related |
| **Read path** | Same + `/api/me/schedule` / parent mobile schedule; CRM `/api/schedule` |
| **Downstream** | Attendance, evaluations, structured metrics, session report, voice drafts, live training (separate entity) |
| **Divergence** | **`Training`** + **`Attendance`** still power **legacy** APIs and **CRM detail fallbacks**; dashboard/coach tab count mismatches |

### 2. Journal / report / evaluations

| | |
|--|--|
| **SSOT (coach journal fields on a school session)** | **`TrainingSessionCoachJournal`** keyed by `(trainingSessionId, coachId)` |
| **Write path** | `/api/training-session-journal` POST/PUT (CRM coach tab) |
| **Read path** | `GET /api/coaches/[id]/trainings` embeds `journal[]` |
| **Legacy** | **`TrainingJournal`** on **`Training.id`**; `/api/training-journal*` (kill-switchable) |
| **Narrative reports (different intent)** | `TrainingSessionReport` (whole session), `PlayerSessionReport` (per player), `PlayerTrainingReport` (foundation), live `LiveTrainingSessionReportDraft` → can publish to session report |
| **Divergence** | Multiple “report” tables **by design**; risk is **UX** confusion, not one table |

### 3. Schedule / attendance

| | |
|--|--|
| **SSOT** | **`TrainingAttendance`** → `TrainingSession` |
| **Write** | Training session attendance endpoints; CRM detail may use legacy bulk in some branches |
| **Read** | Session detail, parent schedule, analytics |
| **Divergence** | **`Attendance`** → **`Training`** (legacy) still in parallel |

### 4. Player development / rankings / progress

| | |
|--|--|
| **SSOT** | **No single JSON** — layered: `PlayerSessionStructuredMetrics`, `PlayerSessionEvaluation`, foundation `GameEvent`/`BehaviorLog`/`SkillProgress`/`OFPResult`/`PlayerIndex`/`PlayerStatsSnapshot`, plus AI `AiAnalysis`, voice-derived suggestions |
| **Write** | Session eval APIs, structured-metrics PATCH, live signal confirmation, manual CRM stats entry, AI routes |
| **Read** | CRM player detail blocks, parent player screens (subset), Arena gap computation reads **signals** |
| **Divergence** | **High** — many pipelines; “one player dashboard number” is not guaranteed consistent without explicit product spec |

### 5. Messaging / channels / read state

| | |
|--|--|
| **SSOT** | **`ChatConversation`** + **`ChatMessage`**; `readAt` on messages for parent-sent unread |
| **Write** | POST messages on conversation; peer blocks; conversation ensure (`getOrCreate*` + dedupe keys) |
| **Read** | `/api/chat/conversations`, coach `/api/coach/messages`, thread GET |
| **Divergence** | **`Message`** model and **`/api/messages`** legacy; coach vs CRM URL families |

### 6. Arena / AI flows

| | |
|--|--|
| **Coach “Арена” (live)** | **`LiveTrainingSession`** pipeline: events → drafts → signals → report draft → publish |
| **Parent “Арена” (external)** | **`runExternalTrainingAgent`**: (1) **rules** on `computeDevelopmentGapFromPlayerSignals` OR (2) **fallback** mock gap; **coach/slot** from **in-code mock list**; persist **`ExternalTrainingRequest`** / **`ExternalTrainingReport`** on success path |
| **Autonomous match MVP** | **In-memory** `arena-external-training-match-store` — not DB SSOT |
| **Other AI** | Voice drafts, `AiAnalysis`, video analysis, coach `ai-signals` on conversations — **separate micro-products** |

**Verdict on “one agent”:** **No.** Multiple orchestrators, real DB only on parts of external contour, explicit mocks, and separate live-training intelligence.

---

## C. DUPLICATES / LEGACY / CONFLICTS

| Type | Instances |
|------|-----------|
| **Duplicate models (conceptual)** | `TrainingSession` vs `Training`; `TrainingAttendance` vs `Attendance`; `TrainingSessionCoachJournal` vs `TrainingJournal`; `ChatMessage` vs `Message`; `LiveTrainingSession` vs `CoachSession` |
| **Duplicate APIs** | `/api/trainings/*` vs `/api/legacy/trainings/*`; `/api/chat/*` vs `/api/messages` / `parent/messages`; two coach message URL bases |
| **Duplicate UI** | CRM **`/players/[id]`** vs **`/player/[id]`** (architecture freeze: do not expand both) |
| **Live parallel paths** | Coach-app **live training** (canonical) vs **coach sessions** (legacy parallel); CRM schedule detail **canonical + legacy** fetch |
| **RBAC duplication** | `User.role` + `src/lib/rbac` **vs** `Role`/`Permission` tables |
| **Legacy affecting active behavior** | Schedule detail fallbacks; coach profile training counts; optional `Player.parentId` precedence bugs in untested routes; external Arena **mock** coach/slot **always** from hardcoded list after gap pick |

---

## D. PRODUCT TRUTH CHECK

| Question | Answer |
|----------|--------|
| **Coach-first?** | **Partially.** The **strongest implemented loops** are **school staff + coach field + parent mobile**. CRM is admin-heavy; coach-app is coach-centric; parent-app is consumer-centric. It is **not** “coach-only product.” |
| **Arena = unified agent?** | **No.** “Арена” names **live training** (coach) and **external training** (parent) **differently** in code. External agent is **rules + mock**; live path is **event/signal/report** pipeline. |
| **Parent value vs internal CRM data?** | **Mixed.** Parents get schedule, messages, marketplace, player passport slices, Arena external flow — **high surface area**; some screens are **demos or thin** vs CRM depth. |
| **Marketplace / external trainer in core scope?** | **Should be tier-2** until school session + messaging + one development story are **boringly stable**. Large UI + `CoachAvailability`/`MarketplaceSlotBooking` — **real** but **distracting** for core coherence. |
| **What feels fragmented?** | Two trainings concepts, two live-session stacks, many report/journal names, Arena naming collision, parent marketplace vs school team in one app, RBAC dualism |

---

## E. BUG MAP (representative — not exhaustive ticket list)

### P1 — blockers / integrity / core broken

| Title | Surfaces | Likely cause | Pointers |
|-------|----------|--------------|----------|
| **Parent–player link desync** | Parent access, invites | `Player.parentId` vs `ParentPlayer` precedence inconsistent on some routes | `assert-parent-or-staff-player-access`, parent APIs |
| **Legacy + canonical attendance mismatch** | CRM schedule detail | Dual write/read paths if both touched | `ScheduleDetailPage`, legacy bulk attendance |
| **External Arena promises real booking** | Parent Arena | UI may imply booking while agent uses **mock** slots/coaches | `external-training-agent.ts`, parent Arena screens |

### P2 — major confusion / important UX

| Title | Surfaces | Likely cause | Pointers |
|-------|----------|--------------|----------|
| **Coach training count vs tab** | CRM coach detail | Header uses legacy `_count.trainings` | `coaches/[id]/page.tsx` |
| **Schedule detail “which API ran?”** | CRM `/schedule/[id]` | Explicit dual fetch | `scheduleDetailTrainingFetch.ts` |
| **Two live session entrypoints** | Coach app | `LiveTrainingSession` vs `CoachSession` | `liveTrainingService` vs `coachSessionLiveService` |
| **Journal save errors** (if any env) | CRM | Permissions / kill-switch | training-session-journal routes |

### P3 — debt / tails

| Title | Surfaces | Pointers |
|-------|----------|----------|
| Duplicate CRM player routes | CRM | `(dashboard)/player` vs `players` |
| `Role` table unused in hot path | CRM settings | `Role`, `Permission`, `rbac.ts` |
| `Message` model tail | API | `/api/messages` vs chat |
| hockey-server drift | If deployed | `hockey-server/server.js` |

---

## F. FIX ORDER (strict)

1. **First — data integrity & SSOT enforcement**  
   Finish **journal write sunset** in prod; eliminate **accidental** legacy writes; document **schedule detail** single-path goal; audit **parent access** guards for `ParentPlayer` SSOT.

2. **Freeze (do not expand)**  
   **`CoachSession` / `/api/coach/sessions/*`**; **new** marketplace features; **new** duplicate CRM player routes; **new** `Message`-based features.

3. **Remove from active scope (product priority)**  
   Treat **marketplace** and **external Arena booking narrative** as **secondary** until core school loop passes manual smoke (Phase 8B) twice.

4. **Postpone until after core cleanup**  
   Full **model drops** (`Training`, `TrainingJournal`); **merging** all report types; **unifying** foundation stats UI; **deleting** `hockey-server` if still used — needs inventory.

5. **Clean last**  
   DB **`Message`** removal; **`Role`/`Permission`** consolidation or deletion; **route deletion** for legacy namespaces after retention window.

---

## G. EXECUTIVE VERDICT

| | |
|--|--|
| **Fundamentally strong** | Clear **canonical training session** model and APIs; **live training** stack is real and deep; **chat** SSOT path exists and was stabilized (dedupe); **Prisma domain** is rich enough for a serious product; **documentation** (freeze, journal phases) shows intentional engineering. |
| **Fundamentally wrong** | **Same nouns, multiple implementations** (training, session, journal, message, arena); **parent-facing** flows mix **production DB**, **mocks**, and **heavy UI** without a single “hero loop”; **Arena is not one agent**. |
| **Coherent or fragmented?** | **Fragmented but mapped.** Coherence is **local** (per subsystem), not **global**. |
| **Next single best move** | **Complete core school loop hardening:** one schedule-detail strategy (canonical-only or explicit legacy gate), finish **legacy journal** prod cutover per 7C, run **Phase 8B manual smoke**, then **choose** either merge **CoachSession → Live** or **formally deprecate** CoachSession in UI. |

---

*Document generated as a diagnostic snapshot; re-run after major merges or schema changes.*
