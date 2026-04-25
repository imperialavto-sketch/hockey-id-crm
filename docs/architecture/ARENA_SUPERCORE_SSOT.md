# Arena Supercore — SSOT & read-path map (v1)

Инженерный контракт: что считается **источником фактов** для школьной Арены (live pipeline) и как существующие маршруты/билдеры к нему подключены.  
**Не** описывает маркетинг; **не** добавляет новую сущность в БД.

## 1. TRUE CORE (school live pipeline)

Канонический контур продукта:

`LiveTrainingSession` → `LiveTrainingEvent` / `LiveTrainingObservationDraft` / `LiveTrainingPlayerSignal` → `sessionMeaningJson` (кэш read-model) → публикация черновика → `TrainingSessionReport` (привязка к `TrainingSession.id`).

HTTP-якорь: `CANONICAL_LIVE_TRAINING_API` = `/api/live-training/*` (`src/lib/architecture/apiContours.ts`).

## 2. Canonical facts (persisted, authoritative)

| Fact | Storage | Typical loader / reader |
|------|---------|-------------------------|
| Live session identity & state | `LiveTrainingSession` row | Prisma `findUnique`; `src/lib/live-training/service.ts` |
| Live events | `LiveTrainingEvent` | Prisma count/list by `sessionId`; ingest: `ingest-event.ts` |
| Observation drafts | `LiveTrainingObservationDraft` | `fetchActiveObservationDraftsForSession` (internal to service); enriched: `loadEnrichedLiveTrainingDraftsForSession` |
| Player signals | `LiveTrainingPlayerSignal` | `getLiveTrainingSessionAnalyticsSummary`, `listLiveTrainingPlayerSignalsForPlayer` |
| Session meaning snapshot | `LiveTrainingSession.sessionMeaningJson` | `parsePersistedSessionMeaning` (`session-meaning.ts`) |
| Planning / slot linkage | `planningSnapshotJson`, `trainingSessionId` | `parsePlanningSnapshotFromDb`, `getCanonicalTrainingSessionIdFromLiveRow` |
| Published school report | `TrainingSessionReport` on `TrainingSession` | `listParentFacingPublishedSessionReports` (parent-facing list), canonical write: `training-session-report-canonical-write.ts` |
| Report draft (pre-publish) | `LiveTrainingSessionReportDraft` | `live-training-session-report-draft.ts` / service |

## 3. Derived facts (deterministic transforms of canonical JSON/rows)

| Derived | Source | Builder / function |
|---------|--------|-------------------|
| Parsed `SessionMeaning` | `sessionMeaningJson` | `parsePersistedSessionMeaning` |
| Planning DTO | `planningSnapshotJson` | `parsePlanningSnapshotFromDb` |
| Analytics summary counts | DB aggregates | `getLiveTrainingSessionAnalyticsSummary` |
| Canonical slot id | column + snapshot | `getCanonicalTrainingSessionIdFromLiveRow` |
| Parent-facing mixed summary | reports + live fallbacks | `buildParentLatestTrainingSummaryFromSources` (`parent-latest-training-summary.assemble.ts`) + билдеры в `parent-latest-live-training-summary.ts` — **mixed read model**; supercore см. §12 |

## 4. Heuristic / secondary layers

- Сопоставление live-сессии со слотом по времени (fallback window) в `parent-latest-live-training-summary.ts`.
- CRM / parent **surface** тексты: `build-arena-summary-surface.ts`, `build-player-development-overview.ts`, `buildArenaParentSummary` / `Guidance` — продуктовые read-models поверх core.
- External contour: `NON_CORE_EXTERNAL_API` = `/api/arena/external-training/*` — **не** входит в v1 `ArenaCoreFacts`.

## 5. Parent / external / AI относительно core

- **Parent published truth** для «отчёта после тренировки»: строки **`TrainingSessionReport`** (см. guardrail в `parent-latest-live-training-summary.ts`). Parent API может **композить** live + отчёт; SSOT публикации — отчёт.
- **External arena**: вторичная подсистема; может питать surface, но не переопределяет факты live-сессии.
- **AI companion** (`/api/chat/ai/*`): интерфейс; не источник истины о тренировке.

## 6. Source priority rules

1. **Canonical** — то, что записано в Prisma как результат официального потока (сессия, события, сигналы, JSON-снимки, опубликованный `TrainingSessionReport`).
2. **Derived** — детерминированный разбор canonical JSON / агрегатов (SessionMeaning, planning DTO, counts).
3. **Heuristic** — эвристики сопоставления и UX-тексты; при конфликте с canonical **не** считаются источником истины.

## 7. Routes / builders → sources (карта чтения)

| Consumer | Reads |
|----------|--------|
| `/api/live-training/sessions/*` | `LiveTrainingSession`, drafts, events, signals, drafts publish |
| `getParentLatestLiveTrainingSummaryForPlayer` / `buildParentLatestTrainingSummaryFromSources` | Сборка: см. `parent-latest-training-summary.assemble.ts`; источники — `TrainingSessionReport`, live session + drafts + session meaning, arena parent builders, затем supercore |
| `GET .../live-training/sessions/[id]/action-candidates` | Legacy outcome + meaning MVP → **supercore** focus decisions (§13) → sort 7 → materialization enrich |
| `/api/arena/summary-surface`, `development-overview` | Player scope, overview + external follow-up (external — вне v1 core facts) |
| `buildArenaCrmSnapshot` + `loadArenaCrmSnapshot*` | Черновики / интерпретации для CRM-среза; **+** `supercoreOperationalFocus` по последней сессии (§15) |
| `/api/chat/ai/message` | Auth parent + LLM; должен опираться на уже собранные факты (отдельный pass) |

## 8. `ArenaCoreFacts` v1 (агрегатор)

Реализация: `src/lib/arena/supercore/load-arena-core-facts.ts` — **read-only**, без записи, без смены существующих API.  
В v1 **не** подтягивается внешний contour и **не** вызывается `loadEnrichedLiveTrainingDraftsForSession` (тяжёлый enrich); используются счётчики и `getLiveTrainingSessionAnalyticsSummary` для согласованности с существующей аналитикой.

## 9. Core vs secondary (вывод)

- **Core SSOT** для «что было на льду в этой live-сессии»: строка `LiveTrainingSession` + связанные события/черновики/сигналы + `sessionMeaningJson` + связь со слотом + опубликованный отчёт по слоту.
- **Secondary**: external training API, AI чат, клиентские weekly insights.
- **ArenaCoreFacts v1**: тонкий read-only срез **только** true core для последующей унификации потребителей.

## 10. Decision / explainability binding (v1)

**Цель:** явно связать факты (`ArenaCoreFacts`) с записями интерпретации / решения / объяснения без новой таблицы БД и без второго action-runtime.

**Реализация:**

- Типы: `src/lib/arena/supercore/bindings.ts`
- Билдер: `buildArenaCoreBindings(facts)` в `src/lib/arena/supercore/build-arena-core-bindings.ts`

### 10.1 Правила provenance

1. **Canonical** факты из `ArenaCoreFacts.canonical` могут напрямую поддерживать **canonical**-tier записи (колонка `arenaNextFocusLine`, `TrainingSessionReport`, `LiveTrainingSessionReportDraft`).
2. **Derived** факты (`parsed_session_meaning`, `analytics_summary`) поддерживают только **derived**-tier записи; их нельзя маркировать как canonical.
3. Интерпретации из полей `SessionMeaning` (themes, focus, team lines) — всегда **derived** (опора на `parsed_session_meaning` + якорь `live_training_session`).
4. Эвристики без опоры на факты supercore (parent mixed read, external contour, LLM) **не** попадают в v1 bindings.
5. Если честная привязка невозможна (например, `buildArenaParentSummary` без enriched drafts), запись **опускается**; в `ArenaCoreBindings.notes` фиксируется причина.

### 10.2 Существующие продуктовые слои (справочно)

| Слой | Вход | Тип | Bindings v1 |
|------|------|-----|-------------|
| `SessionMeaning.nextActions` / `actionTriggers` | `sessionMeaningJson` | decision-shaped (read) | да → `ArenaDecisionRecord` |
| `arenaNextFocusLine` (колонка) | `LiveTrainingSession` | canonical | да |
| `apply-arena-next-training-focus` | мутация | — | нет (не read) |
| `materialize-live-training-action-candidate` | мутация | — | нет |
| `deriveArenaCoachReviewState` | черновики + interpretation | decision/review | нет (нет enriched drafts в facts v1) |
| `buildArenaParentExplanation` | interpretation per draft | explanation | нет (нет draft interpretations в facts v1) |
| `buildArenaParentSummary` / `Guidance` | агрегат по draft inputs | explanation/summary | нет |
| `buildArenaCrmSnapshot` | CRM draft slices | deterministic CRM | отдельный pass |

## 11. `ArenaCoreBindings` v1 (ограничения)

- Частичный охват: только то, что выводится из `ArenaCoreFacts` без новых загрузчиков.
- Лимиты на длину списков (themes/focus/lines/actions) — см. константы в `build-arena-core-bindings.ts`.

## 12. Parent-output pilot: `latest-training-summary`

**Маршрут:** `GET /api/parent/players/[id]/latest-training-summary` → `getParentLatestLiveTrainingSummaryForPlayer` (`src/lib/live-training/parent-latest-training-summary.assemble.ts`).

**Сборка (pass 6):** `buildParentLatestTrainingSummaryFromSources` — явный порядок: (1) `buildPublishedParentLatestTrainingSummaryPayload` **или** `buildLiveSessionFallbackParentLatestTrainingSummaryPayload` в `parent-latest-live-training-summary.ts`; (2) `applySupercoreLayerToParentLatestTrainingSummary` в `parent-latest-summary-arena-supercore.normalize.ts` (один `loadArenaCoreFacts` + один `buildArenaCoreBindings` на запрос).

**Нормализация supercore:** `src/lib/live-training/parent-latest-summary-arena-supercore.normalize.ts`

Общее: вызываются `loadArenaCoreFacts({ liveTrainingSessionId })` и `buildArenaCoreBindings(facts)` для той же live-сессии, что уже используется в родительском read path (после дедупликации `resolveLiveTrainingSessionIdForParentReport` на ветке опубликованного отчёта).

### 12.1 Структурный слой (third pass)

- **`trainingSessionId` (CRM-слот):** если legacy его **опустил**, подставляется `canonical.linkedTrainingSessionId` (колонка + снимок через `getCanonicalTrainingSessionIdFromLiveRow`). Если `trainingSessionId` уже задан непустой строкой — **не перезаписывается** (в т.ч. при расхождении со supercore).

### 12.2 Семантический слой (fourth pass), только `source === "live_session_fallback"`

**Не затрагивается** ветка **`published`**: фокусы/строки из `TrainingSessionReport` остаются каноническими и не смешиваются с supercore.

**Из `ArenaCoreBindings.decisions` в DTO (без сериализации самих binding rows):**

| DTO поле | Источник в bindings | Примечание |
|----------|---------------------|------------|
| `developmentFocus` | `ArenaDecisionRecord` с `kind` = `arena_next_focus_column`, затем `session_meaning_next_training_focus` | Дополнение к legacy-массиву: порядок сначала уже собранные строки, затем уникальные из bindings, лимит как в legacy (`MAX_FOCUS`). |
| `shortSummary` | Только замена **stock** placeholder fallback на `facts.canonical.arenaNextFocusLine` или первый элемент `developmentFocus` **после** merge | Не трогает кастомные короткие сводки и не подменяет текст опубликованного отчёта. |

**По-прежнему legacy / mixed (четвёртый pass):** `highlights`, база `supportNotes` из continuity, `counters`, `sessionMeta`, `arenaSummary`, `arenaGuidance`, `parentActions`, `progressHeadlineRu`, рекомендации/suggested actions, external coach, ветка `published`, записи `ArenaCoreBindings.explanations` с audience `internal` / `coach` в DTO не маппятся.

### 12.3 Explanation-слой (fifth pass), только `live_session_fallback`

**Ветка `published` не меняется** — родительские тексты отчёта и смешанный read опубликованного слоя остаются без supercore explanation merge.

**Билдер:** в `buildArenaCoreBindings` добавлены записи `ArenaExplanationRecord` с `audience: "parent"` (те же `kind`, что и у internal/coach: `published_report_presence`, `session_meaning_confidence_profile` | `analytics_counts_profile`, `report_draft_state`). Тексты только шаблонные, из полей `ArenaCoreFacts` / уже распарсенного `SessionMeaning` (без LLM).

**DTO:** к `supportNotes` **дописываются** (после legacy-строк) фрагменты из parent-explanations в порядке id: `expl_parent_published_slot` → `expl_parent_meaning_inputs` **или** `expl_parent_analytics_only` → `expl_parent_report_draft` (если есть черновик). Общий лимит массива как у fallback-сборщика (`MAX_FOCUS + 2`), дедуп по нормализованному тексту. Реализация: `mergeSupportNotesWithParentExplanations` в `parent-latest-summary-arena-supercore.normalize.ts`.

**Остаётся legacy / mixed:** `highlights`, `arenaSummary`, `arenaGuidance`, narrative отчёта, internal/coach explanations как отдельные записи в JSON не отдаются.

**Проверка:** `npm run test:parent-summary-supercore-pilot`, `npm run test:arena-core-bindings`.

## 13. Coach/CRM action pilot (seventh pass): session action-candidates

**Маршрут (read):** `GET /api/live-training/sessions/[id]/action-candidates` — после legacy списка (`listLiveTrainingSessionActionCandidatesWithMeaningMvp`) вызывается `augmentLiveTrainingSessionActionCandidatesWithSupercore` (`merge-supercore-focus-decisions-into-action-candidates.ts`): один `loadArenaCoreFacts` + `buildArenaCoreBindings`, затем цепочка **pass 8** — `ArenaDecisionRecord` → `ArenaActionEnvelope` (`actions.ts`) → `LiveTrainingActionCandidateDto` для kinds ∈ { `arena_next_focus_column`, `session_meaning_next_training_focus` }. `actionType` = `focus_next_training`, `id` = `ltac:s:{sessionId}:supercore:{bindingDecisionId}` (совместимо с проверкой префикса в `materializeSessionLiveTrainingActionCandidate`).

**Мутация:** `POST .../action-candidates/materialize` — тот же augment к полному списку `listLiveTrainingSessionActionCandidatesForMaterialize`, чтобы supercore-кандидаты находились по id.

**Остаётся legacy:** сигналы + SessionMeaning MVP (`follow_up_check` и др.), сортировка/лимит 7 на GET, enrich materialization flags, `deriveArenaCoachReviewState` / enriched drafts вне этого pass. Не подключены: `session_meaning_team_next_action`, `player_next_action`, `action_trigger`, external contour.

**Проверка:** `npm run test:supercore-action-candidates-merge`, `npm run test:arena-supercore-actions`.

## 14. Unified `ArenaActionEnvelope` (eighth pass)

**Зачем:** единый server-internal контракт для action-like строк из supercore, чтобы новые поверхности (coach/CRM/parent) не плодили ad-hoc типы; HTTP DTO не заменяется на этом pass.

**Файл:** `src/lib/arena/supercore/actions.ts` — `ArenaActionAudience`, `ArenaActionSource`, `ArenaActionKind` (pass 8: только `next_session_focus`), `ArenaActionRef` (binding decision id/kind/tier + `factRefs`), `ArenaActionEnvelope`, функции `arenaBindingDecisionToArenaActionEnvelope`, `arenaFocusBindingDecisionsToActionEnvelopes`, `arenaActionEnvelopeToLiveTrainingActionCandidateDto`.

**Сейчас покрыто:** только focus-decisions, уже используемые в §13; адаптер на `LiveTrainingActionCandidateDto` для coach route.

**Вне envelope (пока):** parent `suggestedParentActions` / mixed fields без envelope; агрегаты CRM `player`/`team`/`group` без envelope; team/player next_action и triggers из bindings; materialization persistence; external contour.

**Первый внутренний потребитель (coach):** merge в `merge-supercore-focus-decisions-into-action-candidates.ts`.

## 15. CRM operational focus (supercore pass 9; frozen local pattern)

**Поле снимка:** `ArenaCrmSnapshot.supercoreOperationalFocus` — строки из последней **подтверждённой** live-сессии команды (тот же `latest` что и первый id в lookback `loadArenaCrmSnapshotData`).

**Цепочка:** `loadArenaCoreFacts` → `buildArenaCoreBindings` → `arenaFocusBindingDecisionsToActionEnvelopes(..., "crm")` → `arenaActionEnvelopesToCrmSupercoreOperationalFocusLines` → merge в снимок (`loadArenaCrmSnapshotForCrmPlayer` / `ForCrmTeam` / `SnapshotsForTeamGroups`).

**Данные vs UI (граница):** merge в снимок есть и для **group rows** (`loadArenaCrmSnapshotsForTeamGroups`), но **утверждённый CRM UI/HTTP pattern** — только две страницы и два route ниже. Остальные потребители данных не обещаны.

**Legacy UI:** `player` / `team` / `group` блоки по черновикам и сигналам без изменений. Секция operational focus: `CrmArenaSupercoreOperationalFocusSection` в `CrmArenaSnapshotSections.tsx`.

**Файлы:** `arena-crm-supercore-operational-focus.ts`, `loadArenaCrmSnapshotData.ts`, `arenaCrmTypes.ts`.

**Проверка:** `npm run test:arena-crm-supercore-operational-focus`.

### 15.1 Frozen CRM HTTP + client pattern (player + team detail only)

**Wire:** `GET /api/players/[id]/arena-crm-snapshot` и `GET /api/teams/[id]/arena-crm-snapshot` → только `{ supercoreOperationalFocus }` (`ArenaCrmOperationalFocusWireJson`, `toArenaCrmOperationalFocusWireJson` в `arenaCrmOperationalFocusWire.ts`). Контракт не расширять без отдельного решения.

**Клиент:** `useArenaCrmSupercoreOperationalFocus(snapshotUrl, reloadKey)` в `src/hooks/useArenaCrmSupercoreOperationalFocus.ts` — abort, seq-guard, сброс state; парсинг `parseArenaCrmOperationalFocusWireResponse`.

**Вне scope (не part of this pattern):** CRM groups/assignments/dashboard, communications, analytics, schedule detail, parent/coach rollouts; объединение с основным fetch карточки; другие поля snapshot на этом HTTP пути.
