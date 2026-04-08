# Architecture Data Audit — Phase 1

**Scope:** Inventory of **actual code usage** (grep + file reads). No migrations, no runtime changes.  
**Companion:** `docs/ARCHITECTURE_FREEZE_PHASE_0.md`.

---

## PARENT PLAYER RELATION INVENTORY

### A. `ParentPlayer` table / `prisma.parentPlayer` — where used

| Area | Files / routes |
|------|----------------|
| **Seed / scripts** | `prisma/seed.ts` (deleteMany, upsert); `scripts/crm-e2e-sanity.ts` (upsert) |
| **Core parent listing & detail** | `src/lib/parent-players.ts` (`getParentPlayers` OR branch, `createParentPlayer`, stats); `src/app/api/me/players/route.ts`, `src/app/api/me/players/[id]/route.ts`; `src/app/api/parent/mobile/players/route.ts` |
| **Access checks** | `src/lib/parent-access.ts` (`canParentAccessPlayer` checks `parentPlayers` slice); `src/lib/arena/assert-parent-or-staff-player-access.ts` (uses `getParentPlayerById`) |
| **Arena parent APIs** | All routes that call `getParentPlayerById`: `src/app/api/arena/summary-surface/route.ts`, `development-overview/route.ts`, `external-training/route.ts`, `request/route.ts`, `report/route.ts`, `narrative/route.ts`, `follow-up/route.ts`, `follow-up-create/route.ts`, `confirm-match/route.ts`, `autonomous-match/route.ts` |
| **External training lib** | `getLatestExternalTrainingRequestForParentPlayer` in `src/lib/arena/external-training-requests.ts` (query `where: { parentId, playerId }` on `externalTrainingRequest` — logical join, not FK to `ParentPlayer` row) |
| **Schedule / teams** | `src/app/api/me/schedule/route.ts`; `src/lib/parent-schedule.ts`; `src/app/api/parent/mobile/schedule/route.ts`; `src/lib/parent-team-ids.ts` |
| **Notifications** | `src/lib/notifications/getParentsForTeam.ts` (`getParentPlayerAnchorsForTeam`); `notifyTeamParentChannelMessage.ts`, `notifyParentTrainingReportPublished.ts` |
| **Team / messenger** | `src/app/api/parent/teams/[teamId]/parents/route.ts`; `src/lib/messenger/coachTeamParentChannelSenderLabel.ts`; `src/lib/parent-team-announcements.ts` (`loadParentPlayersWithTeamsFixed`); `src/lib/messenger-parent-peer-subtitle.ts` |
| **Auth** | `src/lib/auth/phoneAuthFlow.ts` (upsert ParentPlayer); `src/app/api/parent/link-by-invite/route.ts` (findUnique, create) |
| **CRM player API shape** | `src/app/api/player/[id]/route.ts` (include `parentPlayers`) |
| **CRM UI** | `src/app/(dashboard)/players/[id]/page.tsx` (displays `parentPlayers` in UI) |
| **Dev** | `src/lib/devParentAuthFixture.ts` |

### B. `Player.parentId` — where used (field on `Player`)

| Pattern | Files / notes |
|---------|----------------|
| **OR-list with ParentPlayer (canonical “who sees player”)** | `src/lib/parent-players.ts` line 47: `OR: [{ parentId: pid }, { parentPlayers: { some: { parentId: pid } } }]` |
| **Team access** | `src/lib/parent-access.ts` `canParentAccessTeam` — same OR |
| **Parent schedule / teams** | `src/lib/parent-schedule.ts`; `src/lib/parent-team-ids.ts`; `src/lib/parent-team-announcements.ts` |
| **Single-parent check in access** | `src/lib/parent-access.ts` `canParentAccessPlayer`: `if (player.parentId === parentId) return true` then `parentPlayers.length` |
| **Notifications for new TrainingSession** | `src/app/api/trainings/route.ts` → `notifyParentsAboutCreatedSchedule`: loads `player.findMany({ include: { parent: true } })`, **only notifies if `p.parentId`** (lines 40–48) — **does not iterate ParentPlayer** |
| **Seed** | `prisma/seed.ts` sets `parentId` on player + ParentPlayer upsert |
| **Chat list DTOs** | Various `parentId` on conversation payloads (ChatConversation.parentId — different field name, same word) |

### C. Mixed usage / divergence risk (documented)

| Risk | Detail |
|------|--------|
| **MIXED** | Listing uses **OR** (`parentId` **or** `ParentPlayer`). Access boolean uses **either** match. |
| **INTEGRITY** | Child linked **only** via `ParentPlayer` with **null** `Player.parentId` appears in lists but **`notifyParentsAboutCreatedSchedule` skips** them (no `parentId` on `Player`). |
| **CANON (for “linked children” list)** | **`getParentPlayers` OR** is the **implemented** rule; **`getParentPlayerById`** delegates to **`canParentAccessPlayer`**. |

---

## TRAINING DOMAIN INVENTORY

### A. Legacy: `Training`, `Attendance`, `TrainingJournal`

| Model / API | Usage |
|-------------|--------|
| **`prisma.training`** | `src/app/api/legacy/trainings/[id]/route.ts` (GET/PATCH/DELETE); `src/app/api/legacy/player/[id]/trainings/route.ts`; `src/app/api/legacy/coach/trainings/route.ts`; `src/app/api/legacy/coaches/[id]/trainings/route.ts`; `src/app/api/legacy/trainings/[id]/attendance/route.ts`; `src/app/api/legacy/trainings/[id]/attendance/bulk/route.ts`; `prisma/seed.ts`; `scripts/crm-e2e-sanity.ts` |
| **`prisma.attendance`** | `src/app/api/attendance/route.ts` (global list + summary); legacy attendance routes above; `prisma/seed.ts` |
| **`prisma.trainingJournal`** | `src/app/api/training-journal/route.ts`, `src/app/api/training-journal/[id]/route.ts`; `prisma/seed.ts` |

**CRM UI on legacy:** `src/features/schedule/ScheduleDetailPage.tsx` fetches `/api/legacy/trainings/${id}` and legacy attendance paths (see file).  
**Other CRM:** `src/app/(dashboard)/players/[id]/edit/page.tsx`, `src/app/(dashboard)/coaches/[id]/page.tsx` reference legacy trainings (from Phase 0 grep).

### B. Canonical: `TrainingSession`, `TrainingAttendance`, session report & evaluations

| Model / API | Usage |
|-------------|--------|
| **`prisma.trainingSession`** | `src/app/api/trainings/route.ts` (GET list/create, week + filters); `src/app/api/trainings/[id]/route.ts` (and siblings); `src/app/api/coach/schedule/route.ts`; `build-external-follow-up-recommendation.ts` (count); many `src/lib/live-training/*`, `messenger/*` helpers |
| **`prisma.trainingAttendance`** | `src/app/api/trainings/[id]/attendance/route.ts`, `.../attendance/bulk/route.ts`; `src/lib/player-attendance-summary.ts`; `src/lib/parent-schedule.ts`; `src/lib/parent-players.ts` (parent attendance summary); **`src/app/api/dashboard/summary/route.ts`** (full-table scan for avg %) |
| **`prisma.trainingSessionReport`** | `src/app/api/trainings/[id]/report/route.ts`; `src/lib/live-training/service.ts`; `src/lib/training-session-published-report-history.ts`; `prisma/seed.ts`. **STEP 16D:** одна строка на `trainingId` = единый канонический отчёт; два production writer без merge — `POST /api/trainings/:id/report` (coach schedule) и `POST /api/live-training/sessions/:id/report-draft/publish`; **last write wins** by design. |
| **`prisma.playerSessionEvaluation`** | `src/app/api/trainings/[id]/evaluations/route.ts`; `src/lib/parent-players.ts` (latest eval for parent); `prisma/seed.ts` |
| **`prisma.playerSessionStructuredMetrics`** | `src/app/api/trainings/[id]/structured-metrics/route.ts`; `src/lib/coach-session-metrics/repository.ts` |

**Coach-app:** `coach-app/services/coachScheduleService.ts` → `/api/coach/schedule`, `/api/trainings/:id`, evaluations, report, structured-metrics, attendance.  
**Parent-app:** `parent-app/services/scheduleService.ts` → `/api/me/schedule` (TrainingSession-backed per Phase 0).

### C. Cross-domain / “two facts” risk

| Issue | Location |
|-------|----------|
| **Same word “training”, different tables** | CRM **ScheduleDetailPage** = legacy `Training` detail; coach/parent schedule = `TrainingSession`. No automatic link between rows. |
| **Dashboard** | `trainingsThisMonth` = **`trainingSession.count`** in month; `avgAttendance` = **all** `trainingAttendance` rows globally — **not scoped to same month** (metric mixing). |

---

## LIVE DOMAIN INVENTORY

### A. `LiveTrainingSession` + `/api/live-training/*`

**Server:** `src/lib/live-training/service.ts` and related libs; **18 route files** under `src/app/api/live-training/` including `sessions/route.ts`, `sessions/[id]/*`, `start-planning/route.ts`.  
**Coach-app:** `coach-app/services/liveTrainingService.ts` → `BASE = /api/live-training/sessions`; screens `coach-app/app/live-training/**`, `app/(tabs)/arena.tsx`, `home.tsx`, `schedule/[id].tsx`, `QuickEditTrainingSheet`, etc.  
**Post-session narrative (coach):** persisted in **`LiveTrainingSessionReportDraft.summaryJson`** via **`/api/live-training/sessions/:id/report-draft`**; optional local UX experiment under **`/dev/arena-review-prototype`** (no dedicated arena-review HTTP surface in current tree).

### B. `CoachSession` + `/api/coach/sessions/*` + related coach APIs

**Routes:** `src/app/api/coach/sessions/start/route.ts`, `active/route.ts`, `sync/route.ts`, `[sessionId]/review/route.ts`, `[sessionId]/observations/route.ts`; **`src/app/api/coach/observations/route.ts`**; **`src/app/api/coach/sessions/sync/route.ts`** (creates `coachSession`).  
**Also `CoachSession*`:**
- `src/app/api/coach/parent-drafts/route.ts`
- `src/app/api/coach/reports/weekly/route.ts`
- `src/app/api/coach/reports/player/[id]/route.ts`
- `src/app/api/coach/players/[id]/share-report/route.ts`
- `src/app/api/coach/actions/route.ts` (reads `coachSessionObservation`)

**Coach-app:** `coach-app/services/coachSessionLiveService.ts`, `coachSessionSyncService.ts`; **`coach-app/lib/resumeSessionHelpers.ts`**, **`sessionReviewCenterHelpers.ts`**; **`coach-app/app/dev/coach-input.tsx`**.

### C. Depth of duplication

**Different Prisma models:** `LiveTrainingSession` vs `CoachSession` — **not** two views of one row.  
**Operational path (product-heavy):** **`live-training`** + `liveTrainingService`.  
**Parallel path:** **`CoachSession`** + coach session sync / weekly reports / dev coach-input.

### D. Bridges / shared concepts

- **`TrainingSession`** appears in **live start planning** (coach-app `live-training/start.tsx` uses coach training session types for context).  
- **Report publication** from live training touches **`trainingSessionReport`** (`live-training/service.ts`).

---

## MESSAGING DATA MODEL INVENTORY

### Active core (current code paths)

| Model | Role |
|-------|------|
| **`ChatConversation`** | List + detail: `src/app/api/chat/conversations/route.ts`, `[id]/route.ts`, `[id]/messages/route.ts`, `[id]/read/route.ts`; coach `src/app/api/coach/messages/route.ts`, `[id]/route.ts`, `[id]/send/route.ts`; `src/lib/chat.ts`, `messenger-service.ts`, `messenger-parent-conversations-list.ts`, `chat-conversation-access.ts`, `api/coach-conversation-access.ts` |
| **`ChatMessage`** | Same routes; `team-parent-channel-post-guard.ts`, `messenger-feed-announcement-bridge.ts`, push badge `pushAppBadgeCount.ts` |
| **`ChatMessageReport`** | `src/app/api/parent/messages/report/route.ts` |
| **`TeamFeedPost`** | `src/app/api/feed/route.ts`, `feed/[id]/route.ts`, `teams/[id]/announcements/*` |
| **`ParentTeamAnnouncementRead`** | `parent/mobile/team/announcements/route.ts`, `read/route.ts`, `parent-team-announcements.ts` |
| **`ParentPeerBlock`** | `src/lib/messenger-peer-block.ts`, `src/app/api/parent/messaging/peer-block/route.ts` |
| **`Notification`** | `src/app/api/notifications/route.ts`, `[id]/read/route.ts`, `unread-count/route.ts`, `src/lib/notifications.ts`, `parent-inapp-notifications.ts`, `notifyParentTrainingReportPublished.ts`, etc. |

### Legacy / narrow parallel

| Model | Usage |
|-------|--------|
| **`Message`** | **Only** `src/app/api/messages/route.ts` — `prisma.message.findMany` (CRM `messages` module). **Not** used in chat conversation routes above. |

### Overlapping meaning

- **`Notification`** vs in-app chat: different channels; both used.  
- **Team feed posts** vs **chat messages**: bridge in `messenger-feed-announcement-bridge.ts` (creates `ChatMessage`).

---

## EXTERNAL TRAINING DATA INTEGRITY

### Models

- **`ExternalTrainingRequest`**, **`ExternalTrainingReport`**: **no Prisma `@relation` to `Player` or `Parent`** — integrity by **string IDs** in application code.

### Join keys (as implemented)

| Key | Usage |
|-----|--------|
| `(parentId, playerId)` | `getLatestExternalTrainingRequestForParentPlayer`, create, arena routes |
| `requestId` | Report create/update; `getExternalTrainingReportByRequestId` in `external-training-reports.ts` |
| `playerId` alone | `getLatestActiveExternalTrainingRequestForPlayer` when `parentId` omitted (staff / school summary builders) |

### Writers / readers

| Path | Files |
|------|--------|
| **Create/update requests** | `src/lib/arena/external-training-requests.ts`; `confirm-match/route.ts`, `follow-up-create/route.ts`, `request/route.ts`; `external-coach/requests/*` |
| **Reports** | `src/lib/arena/external-training-reports.ts`; `arena-external-training-match-store.ts` → `createExternalTrainingReport`; `mock-submit/route.ts`; `external-coach/requests/[id]/complete-quick/route.ts`, `report/route.ts` |
| **Parent-app** | `parent-app/services/arenaExternalTrainingService.ts`; **`parent-app/app/player/[id]/index.tsx`** still calls `getLatestArenaExternalTrainingRequest` (client fetch) alongside other arena calls |

### Fragile assumptions

- **Orphan rows** if `playerId`/`parentId` desync from deleted users (no FK cascade).  
- **In-memory match store** keyed by `playerId::parentId` — separate from Prisma lifecycle.  
- **`getLatestActiveExternalTrainingRequestForPlayer`** without `parentId` can match **any** parent’s active request for that player — **by design for staff**; misuse from parent-scoped code would be a bug (audit: parent routes use `getParentPlayerById` + parent-scoped helpers).

---

## RBAC / ROLE MODEL INVENTORY

### Canonical for **API route authorization** (CRM)

- **`User.role`** (`UserRole` enum on `User` in Prisma) + **`src/lib/rbac.ts`** `PERMISSIONS` matrix.  
- **`src/lib/api-rbac.ts`**: `requirePermission` → `requireCrmRole` → `PERMISSIONS[user.role][module]`.

### Parallel DB layer

- **`Role`**, **`Permission`** Prisma models — **`src/app/api/roles/route.ts`**, `src/app/api/roles/[id]/route.ts` — CRUD for role definitions in DB.  
- **UNCERTAIN (Phase 2):** Whether runtime `requirePermission` ever reads `prisma.permission`; **current `requirePermission` does not** — it uses in-code `PERMISSIONS` only.

### Parent / coach / external

- **Parent:** Bearer session with `parentId` on token; `requireParentRole` for `/api/parent/*` patterns.  
- **Coach mobile:** Bearer + `requireCrmRole` on many coach routes.  
- **External coach:** Dedicated routes `src/app/api/external-coach/*` (separate from parent).

---

## ORPHAN / HALF-USED MODELS (usage-based only)

| Model | Observation |
|-------|-------------|
| **`Message`** | **Single route** `/api/messages` — legacy CRM list; chat stack uses `ChatMessage`. **Cleanup candidate later** (do not remove in Phase 1). |
| **`TrainingJournal`** | **Only** training-journal API + seed — narrow. |
| **`ActivityLog`** | `src/lib/activity-log.ts` + `src/app/api/dashboard/recent-activity/route.ts` — narrow. |
| **`CoachSession*`** | **Not orphan** — multiple coach routes + seed; **parallel** to LiveTrainingSession. |
| **`Report` / `ActionItem`** (voice/manual) | `src/app/api/reports/*`, `actions/*`, parent mobile materials, live-training materialize — **active** side path for coach materials. |

**UNCERTAIN without full model-by-model grep:** every schema model not listed here.

---

## DATA RISKS (summary table)

| ID | Risk | Files / models |
|----|------|----------------|
| R1 | Parent notified only via `Player.parentId` for new sessions | `src/app/api/trainings/route.ts` `notifyParentsAboutCreatedSchedule` |
| R2 | Dashboard attendance % not aligned with “trainings this month” scope | `src/app/api/dashboard/summary/route.ts` |
| R3 | Two training universes (legacy vs session) on different CRM vs mobile paths | Legacy routes + `ScheduleDetailPage` vs `/api/trainings` |
| R4 | Live training two persistence models | `LiveTrainingSession` vs `CoachSession` |
| R5 | External training no FK to Player/Parent | `ExternalTrainingRequest`, `ExternalTrainingReport` |
| R6 | Dual RBAC matrix (code vs DB tables) drift | `rbac.ts` vs `Role`/`Permission` tables |
| R7 | `Message` vs `ChatMessage` duplicate messaging concept | `api/messages` vs `api/chat/*` |

---

## CLEANUP TARGETS FOR LATER (no action now)

1. Align **parent notifications** for `TrainingSession` create with **ParentPlayer** graph (or document product rule).  
2. Scope or redefine **dashboard avg attendance** query.  
3. Consolidate **CRM schedule** off `legacy/trainings` or formally deprecate UI path.  
4. Consolidate **CoachSession** vs **LiveTrainingSession** usage in coach-app helpers + reports.  
5. Add Prisma **relations** on external training (Phase N migration).  
6. Reconcile **`Message`** with **`ChatMessage`** or retire `/api/messages`.  
7. Clarify **DB Role/Permission** vs **`rbac.ts`** — single source or sync mechanism.

---

## OPEN QUESTIONS FOR PHASE 2

1. Does any CRM **settings** UI change `prisma.permission` in a way that affects **`requirePermission`**? (Trace `usePermissions` / hooks.)  
2. Full grep of **`Player.parentId` assignments** (`update`, `create`) — not done exhaustively in Phase 1.  
3. Production traffic ratio **live-training** vs **coach/sessions** (telemetry).  
4. Whether **`/api/attendance`** (legacy `Attendance`) is still linked from any parent/coach UI.

---

## Marker convention in code

Search: `ARCHITECTURE AUDIT PHASE 1:`
