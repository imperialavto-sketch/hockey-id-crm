# PHASE 3 — App flow / service binding lock

Binds **Screen → service → API family → data SSOT**. Cross-refs: `docs/PHASE_1_DATA_ARCHITECTURE_LOCK.md`, `docs/PHASE_2_API_ROUTE_LOCK.md`, `src/lib/architecture/appFlowContours.ts`, `dataContours.ts`, `apiContours.ts`.

## 1. Coach canonical flows

| Flow | Screen area | Service | API | Data SSOT |
|------|-------------|---------|-----|-----------|
| Live | `(tabs)/arena`, `live-training/*` | `liveTrainingService` | `/api/live-training/*` | `LiveTrainingSession` |
| School schedule | `schedule/*` | `coachScheduleService` | `/api/coach/schedule`, `/api/trainings/*` | `TrainingSession`, `TrainingAttendance` |
| Messaging | `(tabs)/messages`, `conversation/*` | `coachMessagesService` | `/api/coach/messages/*` (+ read via chat API) | `ChatConversation`, `ChatMessage` |
| Coach roster / player passport | `player/[id]`, tabs players | `coachPlayersService` | `/api/coach/players*` | Coach-scoped player DTOs (school CRM) |
| Slot voice | `training/[id]/voice/*` | `trainingVoiceDraftService` | `/api/trainings/[id]/voice-draft/*` | `VoiceTrainingDraft*` |

## 2. Parent canonical flows

| Flow | Screen area | Service | API | Notes |
|------|-------------|---------|-----|--------|
| School schedule | `(tabs)/schedule` | `scheduleService` | `/api/me/schedule` | Canonical parent week; parallel `/api/parent/mobile/schedule` exists on server only |
| Canonical chat | `(tabs)/chat`, `chat/[id]` | `chatService` | `/api/chat/conversations/*` | **Not** stub `/api/chat/messages` |
| School player core | Home, player profile base | `playerService` (subset) | `/api/me/players*` | Primary SSOT-facing surface for parent |
| Coach Mark (AI) | Inbox virtual thread | `chatService` + local/async storage | Mixed / local | **Auxiliary** — not team DM SSOT |

## 3. Slot voice flow

- **Screens:** `coach-app/app/training/[id]/voice/*`
- **Service:** `trainingVoiceDraftService`
- **API:** `CANONICAL_SLOT_VOICE_DRAFT_API` — not utility `VoiceNote`, not live training.

## 4. Messaging flow

- **Coach:** `coachMessagesService` → `/api/coach/messages/*` (projection over chat SSOT).
- **Parent:** `chatService` → `/api/chat/conversations/*` (list, thread, read).
- **Forbidden for product messaging:** `/api/messages`, `/api/chat/messages`, `/api/team/messages` (stubs or disabled).

## 5. Non-core isolated flows

| Flow | Service / screen | API |
|------|------------------|-----|
| External training / Arena external | `arenaExternalTrainingService`, player profile blocks | `/api/arena/external-training/*` |
| Marketplace | `marketplaceService`, `(tabs)/marketplace` | `/api/marketplace/*` |

Must **not** be used as shortcuts for school `TrainingSession` or parent core schedule.

## 6. Mixed-binding danger zones

| Zone | Risk | Mitigation (Phase 3) |
|------|------|----------------------|
| `playerService.ts` | `/api/me/*`, `/api/parent/*`, `/api/players/*`, materials, stats | Section markers + file header; Phase 4 may split |
| `parent-app/(tabs)/index.tsx` | Pulls chat, schedule, players, Coach Mark, analytics | Document per-import contour in screen header |
| `parent-app/app/player/[id]/index.tsx` | Core profile + external training + arena blocks | Screen header: core vs auxiliary |
| `teamService.ts` | `/api/team/messages` = **stub** (empty); posts/members may be stubby | Header + function comments; do not confuse with `chatService` |
| `coachSessionLiveService.ts` | `/api/coach/sessions/*` parallel contour | **Not** linked from arena/live product path; dev-only legacy |

## 7. Rules

1. **Screens** should call **approved services**; avoid new raw `apiFetch` in screens for school/live/chat core.
2. **Services** target **canonical APIs** unless explicitly tagged non-core or legacy.
3. **Do not** add active product paths to: `/api/coach/sessions/*`, `/api/legacy/*`, `/api/messages`, `/api/chat/messages`, `/api/team/messages`, legacy `/api/attendance`.
4. **Non-core** responses must not overwrite or impersonate school SSOT state.
5. **Parent school** new work: default to **`/api/me/*`**.

## 8. Active vs auxiliary (summary)

See report section **H** in Phase 3 output; duplicated here for grep:

- **Active product:** coach live, coach schedule, coach messaging, parent chat (human), parent school schedule, slot voice, parent/me player core, coach players list/detail.
- **Auxiliary / non-core / support:** external training API surface, marketplace, Coach Mark AI thread, team feed/posts/members (community — not chat SSOT), `playerService` CRM-shaped endpoints, optional dev legacy session services.
