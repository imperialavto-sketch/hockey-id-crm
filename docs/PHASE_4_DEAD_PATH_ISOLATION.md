# PHASE 4 — Dead path isolation / service cleanup

Surgical containment. **No path changes, no route deletion, no migrations.** Constants: `src/lib/architecture/isolationContours.ts`. Prior docs: Phase 1–3 + `dataContours` / `apiContours` / `appFlowContours`.

## 1. Stub / frozen / dormant / misleading surfaces

| Surface | Type | Rule |
|---------|------|------|
| `GET|POST /api/team/messages` | **Stub** | Empty-shaped JSON; **not** `ChatMessage` SSOT. **Do not** use for product messaging. |
| `GET /api/chat/messages` | **Stub** | Same — not product chat. |
| `GET /api/messages` | **Disabled** | 410 — legacy `Message`. |
| `/api/coach/sessions/*` + `CoachSession` | **Frozen parallel** | **Not** canonical live; do not expand. |
| `coach-app/services/coachSessionLiveService.ts` | **Frozen / no product importers** | Do not attach to navigation; use `liveTrainingService` only. |
| `teamService.getTeamMessages` / `sendTeamMessage` | **Dormant** (Phase 4 grep: **no** screen imports) | Candidate for later removal; kept for API compatibility / unknown externals. |
| `GET /api/attendance` | Legacy aggregate | Not `TrainingAttendance` SSOT. |
| `/api/legacy/*` | Compatibility writes | CRM-era `Training` / `Attendance`. |

## 2. Classification

| Label | Meaning |
|-------|---------|
| **Do not use** | Stubs and 410 routes for **new** product code. |
| **Frozen compatibility only** | Legacy + parallel coach session HTTP; maintain until retirement plan. |
| **Auxiliary only** | Team posts/members, marketplace, external training, AI analysis — not school slot SSOT. |
| **Candidate later removal** | Dormant client exports with zero in-repo importers (e.g. team stub message helpers). |

## 3. Allowed active product surfaces (recap)

Canonical: `/api/live-training/*`, `/api/trainings/*` + `/api/coach/schedule`, `/api/chat/conversations/*`, `/api/coach/messages/*`, `/api/me/*` (parent school), `/api/trainings/.../voice-draft/*`.  
Human chat: **`chatService`** + **`parentMessengerService`** for team channel resolution — **not** `teamService` message stub.

## 4. Rules

1. **Do not** attach new screens to `coachSessionLiveService` or `/api/coach/sessions/*`.
2. **Do not** add new calls to stub message routes (`/api/team/messages`, `/api/chat/messages`).
3. **Do not** treat `/api/team/messages` as chat SSOT — use `ChatConversation` / `ChatMessage` APIs.
4. **Do not** expand parallel coach-session contour.
5. **`playerService`** remains a **contained mixed module** — use section headers; split in a later phase only with a plan.
6. **Community** (`teamService` posts/members) ≠ **canonical DM/channel chat** (`chatService`).

## 5. Active vs dormant inventory (Phase 4 grep snapshot)

**ACTIVE / ALLOWED:** `liveTrainingService`, `coachScheduleService`, `coachMessagesService`, `trainingVoiceDraftService`, `coachPlayersService`, parent `scheduleService`, `chatService`, `playerService` functions on `/api/me/*`, `parentMessengerService`, `arenaExternalTrainingService` (non-core), `marketplaceService` (non-core).

**DORMANT / FROZEN / STUB:** `getTeamMessages` / `sendTeamMessage` (no in-repo importers), `coachSessionLiveService` (no importers), stub routes above, legacy attendance list route, legacy training API family.

*Re-grep before removal — externals or dynamic imports may exist outside this repo.*
