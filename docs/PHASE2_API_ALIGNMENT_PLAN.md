# Phase 2: API Alignment + Schedule Unification Plan

## CURRENT STATE

### Backends
| Backend | Purpose | DB Schema | Auth |
|--------|---------|-----------|------|
| **Next.js CRM** | School/coach management, parent mobile API (Phase 1 fix) | `prisma/schema.prisma` — User, Parent (cuid), Team, Training, TrainingSession, TeamGroup, PlayerGroupAssignment | Bearer JWT, `getAuthFromRequest`, `requireCrmRole` |
| **hockey-server** | Legacy parent app backend (Express) | `hockey-server/prisma/schema.prisma` — Parent (Int id), Player (Int), Team (Int), Schedule | Bearer (parentAuth), phone OTP |

### Clients
| App | Default Backend | Config |
|-----|-----------------|--------|
| **parent-app** | **Next.js CRM** (целевой) через `EXPO_PUBLIC_API_URL` | `parent-app/config/api.ts` — prod без URL → error; dev → `localhost:3000` или `EXPO_PUBLIC_DEVICE_API_URL` |
| **coach-app** | Next.js CRM | `coach-app/lib/config.ts` → `EXPO_PUBLIC_API_URL` or localhost:3000 |

### Schedule Models (3 разные сущности)
| Model | Backend | Description |
|-------|---------|-------------|
| **Training** | Next.js CRM | Legacy: title, startTime, endTime, teamId, attendances, journal |
| **TrainingSession** | Next.js CRM | MVP: teamId, groupId, coachId, type, startAt, endAt, group/weekly planning |
| **Schedule** | hockey-server | Legacy: title, date, location, teamId (Int) |

---

## BACKEND MAP

| Feature | Client | Current endpoint | Backend source | Status |
|---------|--------|------------------|----------------|--------|
| **Auth login (coach)** | coach-app | `POST /api/auth/login` | Next.js CRM | ✅ |
| **Auth parent OTP** | parent-app | `POST /api/parent/mobile/auth/request-code`, `verify`, `logout` | Next.js + hockey-server | Next.js has it (Phase 1); hockey-server has separate impl |
| **Parents list** | parent-app | `GET /api/me/players` | hockey-server | ❌ Next.js: `/api/parent/mobile/players` |
| **Parent schedule** | parent-app | `GET /api/me/schedule` | **MISSING** | ❌ Нет ни в Next.js, ни в hockey-server (hockey-server имеет `/api/schedule` без auth) |
| **Player schedule** | parent-app | `GET /api/parent/mobile/player/:id/schedule` | Next.js CRM | ✅ (Training) |
| **Player full profile** | parent-app | `GET /api/parent/mobile/player/:id/full-profile` | Next.js CRM | ✅ (Training) |
| **Player recommendations** | parent-app | `GET /api/parent/mobile/player/:id/recommendations` | Next.js CRM | ✅ |
| **Player video-analysis** | parent-app | `GET /api/parent/mobile/player/:id/video-analysis` | Next.js CRM | ✅ |
| **Player stats** | parent-app | `GET /api/players/:id/stats` | hockey-server | Next.js: `/api/players/[id]/stats` (другой формат) |
| **Player AI analysis** | parent-app | `GET /api/ai-analysis/:playerId` | hockey-server | Next.js: `/api/player/[id]/ai-analysis` |
| **Subscription** | parent-app | `GET /api/me`, `/api/me/subscription/status`, `history`, `plans`, `cancel` | hockey-server | Next.js: `/api/subscription/*` (без `/me` префикса) |
| **Bookings** | parent-app | `GET /api/bookings`, `POST /api/bookings`, `create-payment-intent`, `confirm`, `my` | **MISSING** | ❌ Нет в обоих. Next.js: `marketplace/booking-request` |
| **Feed** | parent-app | `GET /api/feed`, `/api/feed/:id` | Next.js CRM | ✅ |
| **Chat** | parent-app | `GET /api/chat/conversations`, `/:id/messages`, `ai/message` | hockey-server + Next.js | hockey-server: `/api/chat/*`; Next.js: `/api/chat/*` |
| **Notifications** | parent-app | `GET /api/notifications`, `/:id/read` | Next.js CRM | ✅ |
| **Marketplace** | parent-app | `GET /api/marketplace/coaches`, `/:id`, `slots`, `booking-request` | hockey-server + Next.js | Частично в обоих |
| **Coach schedule** | coach-app | `GET /api/schedule`, `POST /api/coach/schedule` | Next.js CRM | ✅ TrainingSession |
| **Coach groups** | coach-app | `GET /api/groups` | Next.js CRM | ✅ |
| **Coach teams** | coach-app | `GET /api/coach/teams`, `/:id` | Next.js CRM | ✅ |
| **Coach players** | coach-app | `GET /api/coach/players`, `/:id` | Next.js CRM | ✅ |
| **Coach notes** | coach-app | `GET/POST /api/players/:id/notes` | Next.js CRM | ✅ |
| **Coach sessions** | coach-app | `POST /api/coach/sessions/start`, `active`, `sync`, `review`, `observations` | Next.js CRM | ✅ |
| **Coach messages** | coach-app | `GET /api/coach/messages`, `/:id`, `send` | Next.js CRM | ✅ |
| **Coach reports** | coach-app | `GET /api/coach/reports/weekly`, `player/:id` | Next.js CRM | ✅ |
| **Coach actions** | coach-app | `GET /api/coach/actions` | Next.js CRM | ✅ |
| **Coach parent-drafts** | coach-app | `GET /api/coach/parent-drafts` | Next.js CRM | ✅ |
| **Attendance** | coach-app | — | **MOCK** | ❌ `constants/attendanceData.ts` — нет API |
| **hockey-server schedule** | — | `GET/POST /api/schedule` | hockey-server | Schedule model, no auth, global |

---

## TRAINING LEGACY USAGE

### Prisma
- `prisma/schema.prisma`: `Training`, `Attendance`, `TrainingJournal` (relation)

### Next.js API routes (Training)
| Route | File | Usage |
|-------|------|-------|
| `GET /api/parent/mobile/schedule` | `parent/mobile/schedule/route.ts` | Parent weekly schedule by team trainings |
| `GET /api/parent/mobile/player/[id]/schedule` | `parent/mobile/player/[id]/schedule/route.ts` | Player trainings by teamId |
| `GET /api/parent/mobile/player/[id]/full-profile` | `parent/mobile/player/[id]/full-profile/route.ts` | Trainings in full profile |
| `GET /api/trainings` | `trainings/route.ts` | List/create (CRM) |
| `GET/PUT/DELETE /api/trainings/[id]` | `trainings/[id]/route.ts` | CRUD |
| `POST /api/trainings/[id]/attendance` | `trainings/[id]/attendance/route.ts` | Mark attendance |
| `POST /api/trainings/[id]/attendance/bulk` | `trainings/[id]/attendance/bulk/route.ts` | Bulk attendance |
| `POST /api/trainings/batch` | `trainings/batch/route.ts` | Batch create |
| `GET /api/dashboard/upcoming-trainings` | `dashboard/upcoming-trainings/route.ts` | Dashboard widget |
| `GET /api/player/[id]/trainings` | `player/[id]/trainings/route.ts` | Player trainings |
| `GET /api/coach/trainings` | `coach/trainings/route.ts` | Coach trainings |
| `GET /api/coaches/[id]/trainings` | `coaches/[id]/trainings/route.ts` | Coach's trainings |
| `GET /api/attendance` | `attendance/route.ts` | Attendance list |
| `POST /api/training-journal` | `training-journal/route.ts` | Journal per training |
| `PUT /api/training-journal/[id]` | `training-journal/[id]/route.ts` | Update journal |
| `GET /api/parent/players` | `parent/players/route.ts` | Upcoming trainings |
| `GET /api/teams/[id]` | `teams/[id]/route.ts` | Team with trainings |
| `GET /api/coach/teams` | `coach/teams/route.ts` | Next training |
| `GET /api/coach/teams/[id]` | `coach/teams/[id]/route.ts` | Team trainings |
| `GET /api/analytics/*` | `analytics/*` | Training counts |
| `GET /api/feed`, `feed/[id]` | `feed/route.ts`, `feed/[id]/route.ts` | Permissions |
| `GET /api/dashboard/summary` | `dashboard/summary/route.ts` | `trainingsThisMonth` |

### Services (parent-app / coach-app)
- **parent-app**: `scheduleService.getMeSchedule()` → `/api/me/schedule` (не существует; demo fallback)
- **parent-app**: `playerService` uses schedule via `parent/mobile/player/:id/full-profile` / schedule endpoint
- **coach-app**: attendance — mock only (`attendanceData.ts`)

### UI
- parent-app: `app/(tabs)/schedule.tsx` — `getMeSchedule()`
- coach-app: `app/attendance/[teamId].tsx` — mock `getAttendanceSession(teamId)`

### Mock/Demo
- `parent-app/mocks/schedule.ts` — `mockPlayerSchedule`, `mockWeeklySchedule`
- `parent-app/demo/demoSchedule.ts` — `getDemoWeeklySchedule`, `getDemoScheduleForPlayer`
- `coach-app/constants/attendanceData.ts` — `getAttendanceSession`, mock roster

---

## TRAININGSESSION USAGE

### Prisma
- `prisma/schema.prisma`: `TrainingSession`, `TeamGroup`, `PlayerGroupAssignment`

### Next.js API routes (TrainingSession)
| Route | File | Usage |
|-------|------|-------|
| `GET /api/schedule` | `schedule/route.ts` | CRM schedule (date/weekStartDate, teamId) |
| `POST /api/coach/schedule` | `coach/schedule/route.ts` | Create session |
| `GET /api/player/[id]/schedule` | `player/[id]/schedule/route.ts` | Player sessions by group assignment |

### Services
- **coach-app**: `coachScheduleService.ts` — `getSchedule`, `getScheduleForWeek`, `getGroups`, `createTraining` → `/api/schedule`, `/api/groups`, `/api/coach/schedule`

### UI
- coach-app: `app/(tabs)/team.tsx`, schedule views — `coachScheduleService`

---

## DECISION

### Primary backend: Next.js CRM
**Аргументы:**
- Phase 1 security fix уже внедрён (Bearer, canParentAccessTeam, parent/mobile/schedule без teamId)
- Coach-app полностью на Next.js CRM
- Parent mobile API частично есть (`parent/mobile/*`)
- Единая схема: User, Parent (cuid), Team (cuid), Player (cuid)
- Расширяемость, RBAC, data-scope

### Единая модель расписания: TrainingSession
**Аргументы:**
- Группы (TeamGroup) и weekly planning — подходящая модель для MVP
- PlayerGroupAssignment даёт гибкость (игрок в группе на неделю)
- Coach-app schedule уже на TrainingSession
- type: hockey | ofp | game | individual — покрывает сценарии

### Training: compatibility layer → deprecate
**Рекомендация:**
1. **Не удалять** — parent mobile schedule и dashboard ещё используют
2. **Adapter/facade**: `/api/parent/mobile/schedule` и `/api/parent/mobile/player/[id]/schedule` могут читать из TrainingSession через маппинг (team → group → sessions)
3. **Миграция данных**: если в Training есть важные данные — скрипт миграции Training → TrainingSession (нужна группа по умолчанию)
4. **Поэтапно**: сначала adapter, потом миграция, потом deprecate Training

### hockey-server Schedule
- Отдельная модель в hockey-server (Int id, Team Int)
- parent-app вызывает `/api/me/schedule`, которого нет; hockey-server имеет `/api/schedule` без auth
- **Решение**: не использовать; parent-app перевести на Next.js `/api/parent/mobile/schedule`

---

## MIGRATION PLAN

### PHASE A — Safe first steps (low risk)

1. **Parent-app: alias /api/me/schedule → /api/parent/mobile/schedule**
   - Добавить в Next.js: `src/app/api/me/schedule/route.ts` — proxy/redirect к `parent/mobile/schedule` с Bearer
   - Либо изменить `parent-app/services/scheduleService.ts`: вызывать `/api/parent/mobile/schedule` вместо `/api/me/schedule`
   - **Формат**: Next.js parent/mobile/schedule возвращает `{ id, day, title, time }[]` — `scheduleService` ожидает `MeScheduleItem[]` с `startTime`/`date`. Нужен маппинг в сервисе или адаптер на бэкенде.

2. **Parent-app: alias /api/me/players → /api/parent/mobile/players**
   - Добавить `src/app/api/me/players/route.ts` и `[id]/route.ts` — proxy к `parent/mobile/players` с тем же response shape, что ожидает `playerService` (hockey-server format)
   - Либо изменить `playerService` на `/api/parent/mobile/players` и обновить маппер

3. **Parent-app: subscription paths**
   - Добавить alias `GET /api/me` → возвращает `{ id: parentId }` для совместимости
   - `GET /api/me/subscription/status` → proxy к `GET /api/subscription/status` (формат может отличаться)

4. **Point parent-app to Next.js**
   - `EXPO_PUBLIC_API_URL` = Next.js CRM URL (localhost / production)
   - Проверить все parent endpoints на Next.js

### PHASE B — Deeper alignment

1. **Parent schedule format**
   - Привести `parent/mobile/schedule` response к `MeScheduleItem[]` (`id`, `title`, `startTime`/`date`, `location`, `teamId`) если нужна совместимость
   - Или обновить `scheduleService` под текущий формат Next.js

2. **Training → TrainingSession adapter**
   - В `parent/mobile/schedule` и `parent/mobile/player/[id]/schedule`: опция чтения из TrainingSession (если team имеет groups и assignments)
   - Флаг/конфиг: useTrainingSession = true

3. **Coach-app attendance API**
   - Добавить `GET /api/coach/attendance/session?teamId=&date=` — список игроков + статусы
   - `POST /api/coach/attendance/session` — сохранить посещаемость
   - Привязать к TrainingSession или Training (пока Training)

4. **Bookings**
   - Реализовать в Next.js: `GET/POST /api/bookings`, `create-payment-intent`, `confirm`, `my` — или переключить parent-app на `marketplace/booking-request` и адаптировать UI

### PHASE C — Cleanup after migration

1. **Удалить hockey-server** (или оставить read-only для legacy)
2. **Deprecate Training**
   - Мигрировать оставшиеся использования на TrainingSession
   - Удалить Training, Attendance (или заменить на SessionAttendance для TrainingSession)
3. **Удалить alias routes** `/api/me/*` если parent-app переведён на прямые пути
4. **Удалить mock attendanceData** в coach-app после появления API

---

## SAFE FIRST STEP

**Рекомендуемый первый шаг (Phase A.1):**

1. В Next.js добавить **alias** `GET /api/me/schedule`:
   - Файл: `src/app/api/me/schedule/route.ts`
   - Логика: тот же код, что в `parent/mobile/schedule` (Bearer, parent's teams, Training)
   - Response: преобразовать к формату `MeScheduleItem[]` (`id`, `title`, `startTime` как ISO или `date`+time, `location`, `teamId`)

2. В `parent-app/services/scheduleService.ts`:
   - Поменять URL с `/api/me/schedule` на `/api/parent/mobile/schedule` **ИЛИ** оставить `/api/me/schedule` если alias добавлен
   - При добавлении alias — изменений в parent-app не требуется

3. Настроить parent-app `EXPO_PUBLIC_API_URL` на Next.js CRM и проверить:
   - Login (parent mobile auth)
   - Schedule (getMeSchedule)
   - Players (getPlayers) — пока 404, т.к. `/api/me/players` нет в Next.js

**Альтернатива (без alias):** изменить только `scheduleService.ts` — вызывать `/api/parent/mobile/schedule` и адаптировать `mapMeScheduleToItem` под формат `{ id, day, title, time }` (day уже есть, time есть, title есть — маппинг простой).

---

## PARENT-APP ALIGNMENT

### Несовместимости с Next.js CRM

| Service | Endpoint | Проблема | Решение |
|---------|----------|----------|---------|
| scheduleService | `/api/me/schedule` | Endpoint отсутствует | Alias или переключить на `/api/parent/mobile/schedule` + адаптер |
| playerService | `/api/me/players`, `/api/me/players/:id` | Next.js: `/api/parent/mobile/players` | Alias или обновить playerService |
| subscriptionService | `/api/me`, `/api/me/subscription/*` | Next.js: `/api/subscription/*` | Alias под `/api/me/subscription/*` |
| bookingService | `/api/bookings`, `create-payment-intent`, `confirm`, `my` | Next.js: `marketplace/booking-request` | Реализовать bookings API или переписать под booking-request |
| teamService | `/api/team/posts`, `members`, `messages` | Разные пути | Проверить наличие в Next.js |

### Старые assumptions
- `x-parent-id` — Phase 1 убрана; везде Bearer
- `user.id` в parent-app — может быть parentId (string) от Next.js; hockey-server использовал Int

### Минимальный набор изменений
1. Добавить `/api/me/schedule` (alias) ИЛИ обновить scheduleService на `/api/parent/mobile/schedule` + маппер
2. Добавить `/api/me/players` и `/api/me/players/:id` (alias) ИЛИ обновить playerService
3. Добавить `/api/me` и `/api/me/subscription/*` (alias) ИЛИ обновить subscriptionService
4. Установить `EXPO_PUBLIC_API_URL` на Next.js CRM

---

## COACH-APP ALIGNMENT

### API (уже на Next.js CRM)
- auth, coach/teams, coach/players, coach/schedule, coach/sessions/*, coach/messages, coach/reports, coach/actions, coach/parent-drafts, players/notes
- schedule: `getSchedule`, `getScheduleForWeek`, `createTraining` → TrainingSession

### Mock fallback
- `constants/attendanceData.ts` — `getAttendanceSession(teamId)` — полностью mock
- `constants/teamDetailData.ts`, `playerDetailData.ts` — primary source API, но могут быть fallback

### Влияние перевода schedule на TrainingSession
- Coach-app schedule **уже** на TrainingSession
- Attendance пока mock — при добавлении API можно привязать к TrainingSession (или к Training для обратной совместимости)
- `dashboard/upcoming-trainings` и `coach/teams` пока используют Training — при миграции parent schedule на TrainingSession эти места можно оставить на Training до Phase C

---

## CHANGED FILES IF IMPLEMENTED NOW

**No code changes, analysis only.**

Если выполнить Safe First Step (alias /api/me/schedule):
- **Добавить**: `src/app/api/me/schedule/route.ts`
- **Изменить**: `parent-app/services/scheduleService.ts` (опционально, если оставляем /api/me/schedule)
- **Изменить**: `parent-app/config/api.ts` или `.env` — `EXPO_PUBLIC_API_URL` на Next.js
