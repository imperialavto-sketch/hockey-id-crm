/**
 * Маршруты голоса и тренировок в coach-app (ориентир для разработчиков).
 *
 * PHASE 1 DATA LOCK — см. `docs/PHASE_1_DATA_ARCHITECTURE_LOCK.md`, константы `src/lib/architecture/dataContours.ts`.
 * PHASE 2 API LOCK — см. `docs/PHASE_2_API_ROUTE_LOCK.md`, `src/lib/architecture/apiContours.ts` (канон. live = `/api/live-training/*`, слот = `/api/trainings/*` + `/api/coach/schedule`, не `/api/coach/sessions/*`).
 * PHASE 3 APP FLOW — см. `docs/PHASE_3_APP_FLOW_LOCK.md`, `src/lib/architecture/appFlowContours.ts`.
 * PHASE 4 ISOLATION — см. `docs/PHASE_4_DEAD_PATH_ISOLATION.md`, `isolationContours.ts` (frozen: `coachSessionLiveService` / `/api/coach/sessions/*`).
 *
 * - **CORE Live Training**: `app/live-training/*` — основной поток (события → review → confirm).
 * - **Legacy coach session (sunset)**: `/coach-input` (session capture UI) — no CoachSession API in coach-app.
 * - **Voice MVP (❗ UTILITY ONLY — NOT TRAINING SSOT)**: `voice-note(s)`, `voice-starter/*` — личные заметки
 *   и черновики отчёта/задачи/родителю; не истина по сессии.
 *
 * PHASE 6 — ARENA TRUTH (не смешивать контуры):
 * - **Coach live Arena (canonical для эфира школы)**: `app/live-training/*`, `/api/live-training/*`, вкладка `(tabs)/arena` — только этот runtime.
 * - **External / parent «Arena» (внешняя тренировка)**: `parent-app` + `/api/arena/*`, `ExternalTrainingRequest` — ❗ NOT CORE SCHOOL SSOT; часть UX — ⚠ MOCK MATCHING / in-memory stub.
 * - **Marketplace (частные тренеры)**: `/api/marketplace/*`, вкладки маркетплейса — ❗ NOT CORE SCHOOL SSOT; заморожен как отдельный продуктовый контур.
 */

export const COACH_FLOW_LIVE_TRAINING_PREFIX = "/live-training" as const;
