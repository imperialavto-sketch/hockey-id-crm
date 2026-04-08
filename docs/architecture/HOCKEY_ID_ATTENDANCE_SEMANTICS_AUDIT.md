# Hockey ID Attendance Semantics Audit

**Phase:** 2A.1 — canonical attendance capability audit (documentation only).  
**Scope:** In-repo static review; no runtime, schema, route, or UI changes.  
**Context:** CRM player edit now uses `GET /api/player/[id]/trainings` and `POST /api/trainings/[sessionId]/attendance` (`TrainingAttendance`).

**Phase 2B (CRM UX):** `ScheduleDetailPage.tsx` and `players/[id]/edit/page.tsx` attendance surfaces now match **canonical 2-state** storage (`present` / `absent`): no four-state attendance controls, no attendance comment sent or implied as persisted. The schedule table “comment” column is **coach rating recommendation** only (copy in `crmTrainingDetailCopy.ts`); `POST /api/trainings/[id]/attendance` body is `{ playerId, status }` from these screens.

---

## Current canonical storage

| Item | Fact (from `prisma/schema.prisma` + routes) |
|------|---------------------------------------------|
| **Model** | `TrainingAttendance`: `id`, `trainingId` → `TrainingSession`, `playerId`, `status` (`String`), `createdAt`. **No `comment` field.** |
| **Allowed stored values** | Code enforces **`present`** \| **`absent`** (lowercase) on POST in `src/app/api/trainings/[id]/attendance/route.ts` and bulk route. |
| **GET** | `GET /api/trainings/[id]/attendance` returns per-player `status` as read from DB (typically `present` / `absent` in responses consumed by coach-app). |
| **POST** | Upserts one row per `(trainingId, playerId)`. Accepts optional `comment` in JSON; **not persisted** (`void _comment` + comment in file header). |
| **Bulk POST** | `POST /api/trainings/[id]/attendance/bulk` — only `present` / `absent`. |

---

## Current UI/product semantics

| Area | Semantics observed |
|------|-------------------|
| **Coach operational schedule** | **2-state** end-to-end: `coach-app` schedule session UI + `coachScheduleService` + canonical APIs (`present` / `absent`). |
| **CRM schedule detail** | **2-state UI** (`PRESENT` / `ABSENT`); legacy strings from API (`late` / `excused`) **normalize** to present/absent for display. **Phase 2B:** POST body omits `comment`; text field is for **rating recommendation** only (see copy). |
| **CRM player edit** | **2-state UI** (“Был” / “Не был”); POST `{ playerId, status }` only. **Phase 2B** aligned with storage; inline copy notes attendance comments are not stored. |
| **CRM player detail (`/players/[id]`)** | Loads `GET /api/player/[id]/trainings`; counts **only** `PRESENT` and `ABSENT` for headline stats; list UI can show icons for LATE/EXCUSED **if** those strings ever appeared — with canonical data they generally **will not**. |
| **Parent schedule** | **2-state** labels (“Был” / “Не был”) from `attendanceStatus` `present` \| `absent` (`scheduleService`, `parent-schedule`, mobile schedule route). |
| **Legacy HTTP + legacy `Attendance`** | **4-state** `PERSIST` \| `ABSENT` \| `LATE` \| `EXCUSED` + **comment** on `POST /api/legacy/trainings/[id]/attendance` (+ bulk). |
| **Legacy aggregate** | `GET /api/attendance` counts four legacy statuses on **`Attendance`** (not `TrainingAttendance`). |
| **Demo / constants** | `coach-app/constants/attendanceData.ts` defines **4-state** `AttendanceStatus` for demo-style attendance UI (`coach-app/app/attendance/[teamId].tsx` uses `present`/`absent` counts from roster — verify against wired API separately). |
| **Analytics** | `src/app/api/analytics/route.ts` attendance blocks use **`player.attendances`** with **`PRESENT` / `ABSENT` / `LATE`** — tied to **legacy** `Attendance` on `Player` include (not `TrainingAttendance`). |

---

## Status usage inventory

| File path | Layer | Statuses referenced | 2-state or 4-state assumption | Notes |
|-----------|-------|-------------------|------------------------------|--------|
| `prisma/schema.prisma` (`TrainingAttendance`) | schema | stored `String` (app: present/absent) | **2-state** | No enum; comment N/A |
| `src/app/api/trainings/[id]/attendance/route.ts` | API | `present`, `absent` | **2-state** | POST validates; comment dropped |
| `src/app/api/trainings/[id]/attendance/bulk/route.ts` | API | `present`, `absent` | **2-state** | |
| `src/app/api/player/[id]/trainings/route.ts` | API | maps DB → `.toUpperCase()` → `PRESENT`/`ABSENT` | **2-state output** | `comment: null` always |
| `src/lib/player-attendance-summary.ts` | lib | `present`, `absent` | **2-state** | Canonical `TrainingAttendance` counts |
| `src/app/api/dashboard/summary/route.ts` | API | `present` | **2-state** | `TrainingAttendance` |
| `src/app/api/analytics/attendance/route.ts` | API | `present`, `absent` | **2-state** | `TrainingAttendance` |
| `src/lib/parent-schedule.ts` | lib | `present`, `absent` | **2-state** | |
| `parent-app/services/scheduleService.ts` | service | `present`, `absent` | **2-state** | Parent UI copy |
| `src/app/api/parent/mobile/schedule/route.ts` | API | `present`, `absent` | **2-state** | |
| `coach-app/services/coachScheduleService.ts` | service | `present`, `absent` | **2-state** | |
| `coach-app/app/schedule/[id].tsx` | UI | `present`, `absent` | **2-state** | |
| `coach-app/components/schedule/ScheduleSessionAttendanceSection.tsx` | UI | `present`, `absent` | **2-state** | |
| `src/features/schedule/ScheduleDetailPage.tsx` | UI + fetch | `PRESENT` / `ABSENT` (+ normalize LATE/EXCUSED from API) | **2-state** | **Phase 2B:** no attendance comment in POST; comment column = rating rec. |
| `src/app/(dashboard)/players/[id]/edit/page.tsx` | UI | two attendance actions | **2-state** | **Phase 2B** aligned |
| `src/app/(dashboard)/players/[id]/page.tsx` | UI | filters `PRESENT`/`ABSENT`; list icons for LATE/EXCUSED | **Display assumes 4** possible strings; **data often 2** | Source: canonical trainings API |
| `src/app/api/legacy/trainings/[id]/attendance/route.ts` | API | `LEGACY_STATUSES` 4 | **4-state** | Legacy `Attendance` |
| `src/app/api/legacy/trainings/[id]/attendance/bulk/route.ts` | API | 4 | **4-state** | |
| `src/app/api/attendance/route.ts` | API | `PRESENT`, `ABSENT`, `LATE`, `EXCUSED` | **4-state** | Legacy aggregate |
| `src/app/api/analytics/route.ts` | API | `PRESENT`, `ABSENT`, `LATE` on `p.attendances` | **4-state (legacy data path)** | Not `TrainingAttendance` |
| `src/app/(dashboard)/teams/[id]/page.tsx` | UI | `PRESENT` on `t.attendances` | **2-state data** (uppercased) | `GET /api/teams/[id]` maps `TrainingAttendance` → `attendances[].status` uppercase (`PRESENT`/`ABSENT` only) |
| `src/lib/ai/player-analysis.ts` | lib | `PRESENT` | **Legacy attendance include** | Present count only |
| `src/app/api/player/[id]/achievements/route.ts` | API | `PRESENT` | **Legacy** | |
| `src/lib/player-ai.ts` | lib | `PRESENT` | **Legacy** | |
| `coach-app/constants/attendanceData.ts` | constants | `present`, `late`, `absent`, `excused` | **4-state type** | Demo/mock roster |
| `coach-app/components/attendance/PlayerAttendanceRow.tsx` | UI | four options in UI | **4-state UI** | Used in attendance flow; storage path depends on parent screen wiring |

---

## Comment usage inventory

| File path | Sent / read / displayed | Persisted? | Notes |
|-----------|-------------------------|------------|--------|
| `src/app/api/trainings/[id]/attendance/route.ts` | Accepts `comment` in POST body | **No** | Explicit discard; `TrainingAttendance` has no column |
| `src/features/schedule/ScheduleDetailPage.tsx` | **Phase 2B:** does not send `comment` on attendance POST; text input saves via **`POST /api/player/[id]/rating`** (`recommendation`) | N/A for attendance | Column labeled as note to **оценке**, not посещаемости |
| `src/app/(dashboard)/players/[id]/edit/page.tsx` | **Phase 2B:** no attendance comment field or payload | N/A | Player **profile** `comment` field elsewhere on form is unrelated to `TrainingAttendance` |
| `src/app/api/player/[id]/trainings/route.ts` | Returns `comment: null` in `attendance` object | N/A | Hard-coded null |
| `src/app/api/legacy/trainings/[id]/attendance/route.ts` | Reads/writes `comment` on `Attendance` | **Yes** (legacy) | |
| `src/app/api/legacy/trainings/[id]/attendance/bulk/route.ts` | May include comment in legacy bulk | **Yes** (legacy) | Per implementation |

---

## Where semantics are lost

1. **LATE vs PRESENT / EXCUSED vs ABSENT:** After canonical persist, only `present` or `absent` exists. CRM player edit maps LATE→present and EXCUSED→absent; **reload collapses** fine-grained choice to **PRESENT** or **ABSENT** in list (`GET /api/player/[id]/trainings`).
2. **Comments:** `TrainingAttendance` has no comment column. **Phase 2B CRM** no longer presents an attendance comment field on player edit or schedule detail; schedule row text is **coach rating recommendation** (persisted on `CoachRating`), not attendance.
3. **CRM player detail / analytics split:** Player detail training list uses **canonical** sessions (2-state). School-wide **`/api/analytics`** attendance summary still uses **legacy** `Attendance` shapes (4-state + different model) — **two truths** if both systems are populated.
4. **Team detail page:** Uses `GET /api/teams/[id]` → `trainingSessions` / `TrainingAttendance` mapped to uppercase; **still only two stored values**, displayed as `PRESENT` / `ABSENT`.

---

## Risks

- **Product expectation drift:** Users choose “Опоздал” / “Уваж. причина” on CRM screens but **cannot retrieve** that distinction after save from canonical storage.
- **Reporting inconsistency:** Dashboard / `analytics/attendance` (canonical) vs main `analytics` player block (legacy `Attendance`) may **disagree** on counts and late/excused breakdowns.
- **Silent comment loss:** Reduced on **CRM schedule detail + player edit** after Phase 2B; other surfaces or legacy flows may still imply comment persistence where the API discards it.
- **Future schema work:** Any addition of states/comments requires migration + API contract + UI alignment; current code **hides** the gap via mapping and discarded fields.

---

## Recommendation matrix

### Option A: Keep canonical 2-state; simplify UI semantics

| | |
|--|--|
| **Pros** | Matches storage; coach-app and parent already 2-state; fewer surprises after save. |
| **Risks** | CRM users lose explicit LATE/EXCUSED unless expressed elsewhere (e.g. evaluation note). |
| **Migration cost** | **Low** — mostly CRM copy + remove or relabel buttons; no DB change. |
| **Product impact** | Less expressive attendance on CRM; clearer honesty about what is stored. |

### Option B: Expand canonical attendance later (richer states and/or comments)

| | |
|--|--|
| **Pros** | Restores fidelity; one SSOT for all semantics; comments audit trail. |
| **Risks** | Requires **schema** + backfill + API versioning; must reconcile legacy `Attendance` history. |
| **Migration cost** | **High** — Prisma migration, data migration, all consumers, analytics unification. |
| **Product impact** | Best long-term if product **requires** late/excused analytics. |

### Option C: Keep transitional mapping; document explicitly in UI/docs

| | |
|--|--|
| **Pros** | No immediate schema or CRM redesign; aligns with current Phase 2A behavior. |
| **Risks** | Continued **hidden** collapse (LATE→present); comments still lost unless documented next to fields. |
| **Migration cost** | **Very low** — copy, tooltips, internal docs. |
| **Product impact** | Users may still misunderstand until they see reload behavior; reduces support risk if messaging is clear. |

---

## Final recommendation

**Short term (no schema):** Prefer **Option C** immediately — make the 2-state storage and comment non-persistence **visible** in CRM (inline help / labels) so Phase 2A mapping is not mistaken for full fidelity.

**Medium term:** Choose between **Option A** (if product accepts binary attendance everywhere) and **Option B** (if late/excused/comments are **must-have** for compliance or analytics). Until then, treat **`TrainingAttendance` as the SSOT for scheduled-session attendance** and plan to **retire or reconcile** legacy `Attendance`-based analytics (`/api/analytics` player section, team pages) in a later phase to avoid **dual semantics** in reporting.

---

## DONE / PARTIAL / NOT DONE

**PARTIAL** — Inventory covers grep-visible **TypeScript/TSX** in this repo; **Phase 2B** closed the CRM **player edit + schedule detail** attendance UX vs canonical 2-state gap. **NOT DONE** for: runtime verification of every API response in production, non-TS packages, dynamic imports, **CRM player detail** list icons for LATE/EXCUSED if exotic strings appear, legacy vs canonical analytics reconciliation. Legacy vs canonical on **team detail** `trainings` shape should be verified against `GET /api/teams/[id]` implementation in a follow-up if needed.
