# PHASE 2 — API route lock

Engineering contract for HTTP surfaces. **No path renames in Phase 2.** Constants: `src/lib/architecture/apiContours.ts`. Data SSOT: `docs/PHASE_1_DATA_ARCHITECTURE_LOCK.md`.

## 1. Canonical API families

| Family | Paths | Role |
|--------|--------|------|
| Live training | `/api/live-training/*` | Coach live runtime (`LiveTrainingSession`). |
| School training / session | `/api/trainings/*`, `/api/coach/schedule` | `TrainingSession` CRUD, coach week grid, attendance on session. |
| Messaging | `/api/chat/conversations/*`, `/api/coach/messages/*` | `ChatConversation` / `ChatMessage`; coach routes are coach-facing projection. |
| Parent school surface | `/api/me/*` | Parent Bearer school data (schedule, players, subscription stubs as exposed). |
| Slot voice draft | `/api/trainings/[id]/voice-draft/*` | `VoiceTrainingDraftSession` for scheduled slot. |

## 2. Parent-facing (within canonical)

Primary: **`/api/me/*`** for schedule and players in parent-app services.  
Other `/api/parent/*` routes exist for mobile/materials/live-summary — **separate family**; do not assume they replace `/api/me/*` without an explicit migration plan.

## 3. Coach-facing canonical

- `/api/coach/schedule` + `/api/trainings/*` — schedule + session operations.
- `/api/coach/messages/*` — inbox/detail/send over chat SSOT.
- `/api/live-training/*` — live arena runtime.

## 4. Legacy API families

| Family | Rule |
|--------|------|
| `/api/legacy/*` | **Compatibility only. DO NOT EXPAND.** Uses `Training` / legacy attendance. |
| `/api/messages` | **Disabled** for product chat (410). Legacy `Message` store. |
| `/api/attendance` | Reads **legacy** `Attendance` (→ `Training`). Not `TrainingAttendance` SSOT. **DO NOT EXPAND** for new school flows. |

## 5. Parallel API families

| Family | Rule |
|--------|------|
| `/api/coach/sessions/*` | **Parallel / legacy-like** (`CoachSession`). **DO NOT EXPAND.** Not canonical vs `/api/live-training/sessions/*`. |

## 6. Stub / placeholder API families

| Path | Behavior |
|------|-----------|
| `/api/chat/messages` | Empty list stub — **not** product chat. |
| `/api/team/messages` | Empty list stub — **not** messaging SSOT. |

Other empty-shape routes (`/api/team/members`, `/api/team/posts`, `/api/bookings/*`, `/api/chat/ai/conversation`, etc.) are **stubs or thin layers** — **DO NOT EXPAND** as canonical without a Phase 3 decision.

## 7. Non-core API families

| Family | Rule |
|--------|------|
| `/api/arena/external-training/*` | External parent contour; demo in-memory match where noted. **Not** school core. |
| `/api/marketplace/*` | Marketplace bookings/coaches. **Not** school `TrainingSession` SSOT. |

## 8. Rules (Phase 3+)

1. **New product flows** — only canonical families above for school + chat + live + slot voice.
2. **Do not** wire new UI to `/api/legacy/*`, `/api/coach/sessions/*`, `/api/messages`, stub message routes, or legacy `/api/attendance`.
3. **Do not** expand parallel coach-session routes.
4. **Do not** build new **school** workflows on non-core arena external or marketplace routes.
5. Prefer **`/api/me/*`** for parent school reads; document any exception.

## 9. Inventory — risky / duplicated surfaces (no change in Phase 2)

| Finding | Notes | Phase 3? |
|---------|--------|----------|
| `/api/parent/mobile/schedule` vs `/api/me/schedule` | Parallel parent schedule API; parent-app `scheduleService` uses `/api/me/schedule` only. | yes — consolidate docs/clients |
| `/api/schedule` (if present) vs `/api/trainings` / coach schedule | CRM may use overlapping list routes; names confuse “schedule” vs “trainings”. | yes — inventory callers |
| `/api/coach/sessions/*` writes `CoachSession` | Still used for sync/start; conflicts in naming with “sessions”. | yes — reduce new usage |
| `/api/legacy/*` writes `Training` / `Attendance` | Needed for old CRM paths until retired. | yes — deprecate callers |
| `playerService` mixes `/api/me/*`, `/api/parent/*`, `/api/players/*` | Multiple families in one service; easy to pick wrong path for new code. | yes — section comments / split later |
| Stub JSON `messages: []` routes | Look “healthy” in network tab but are not SSOT. | yes — lint or client guardrails |
