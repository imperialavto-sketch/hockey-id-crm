# PHASE 1 — Data architecture lock (SSOT)

Short engineering contract. **No migrations in Phase 1.** Do not invent parallel tables.

## Canonical (SSOT)

| Area | Entities | Notes |
|------|-----------|--------|
| School training slot | `TrainingSession` | Calendar / scheduled school session. Not `Training`. |
| School attendance | `TrainingAttendance` | FK to `TrainingSession` only. |
| Live training runtime | `LiveTrainingSession` | Coach-app live / эфир. `coachId` = CRM `User.id`. |
| Messaging | `ChatConversation`, `ChatMessage` | All active chat. Not `Message`. |
| Parent ↔ player | `ParentPlayer` | Access / ownership checks. |
| Slot voice draft | `VoiceTrainingDraftSession`, `VoiceTrainingDraftObservation` | Voice tied to `TrainingSession` slot. Not `VoiceNote`. |

## Legacy / parallel (frozen)

| Area | Entities / surface | Rule |
|------|-------------------|------|
| CRM training | `Training` | **DO NOT EXPAND.** Legacy API `/api/legacy/*`, seed, scripts. |
| Legacy attendance | `Attendance` (→ `Training`) | **DO NOT EXPAND.** Use `TrainingAttendance` for school. |
| Parallel capture | `CoachSession`, `/api/coach/sessions/*` | **DO NOT EXPAND.** Not SSOT vs `LiveTrainingSession`. |
| Legacy messages | `Message` | **DO NOT USE** for new chat. `GET /api/messages` → 410. |
| Denorm field | `Player.parentId` | **NOT SSOT.** Convenience only; verify `ParentPlayer`. |

## Utility vs slot voice

- **`VoiceNote`**: utility / personal notes, generic voice APIs — **not** slot SSOT.
- **`VoiceTrainingDraftSession`**: canonical slot voice for `TrainingSession`.

## Non-core contours

- **`ExternalTrainingRequest` / `ExternalTrainingReport`** + arena external-training APIs: external parent contour, not school SSOT.
- **Marketplace** models + `/api/marketplace/*`: separate product contour.

## In-memory / demo

- Arena external **match** store and similar **Map**-backed state: **demo / stub only**, not SSOT.

## Rules (Phase 2+)

1. **Do not** create new parallel models for the same concept (second session table, second message table, etc.).
2. **Do not** add **new writes** to legacy tables (`Training`, `Attendance`, `Message`, `CoachSession`) except explicit compatibility fixes approved in a later phase.
3. **Do not** read legacy entities for **new** product flows; old flows may remain until routed to canonical APIs.
4. Constants / doc cross-ref: `src/lib/architecture/dataContours.ts`.
