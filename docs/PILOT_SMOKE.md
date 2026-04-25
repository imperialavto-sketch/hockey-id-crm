# Pilot smoke kit (Hockey ID)

Документ описывает **доказанный** smoke-путь: серверный value chain от тренера до родителя без ручного кликанья по UI.

## 1. Что проверяет smoke

- **Не** претендует на полную проверку приложения, всех API и всех сценариев.
- **Не** заменяет E2E по coach-app / parent-app (Expo).
- **Проверяет главный value chain Hockey ID** в одной связке:
  **coach → расписание → live training → finish/confirm → черновик отчёта → публикация → родительская сводка «последняя тренировка».**

Технически задействованы: сборка TypeScript/Next (отдельно), Prisma/БД, HTTP API Next.js.

## 2. Требования

| Требование | Описание |
|------------|----------|
| **Next server** | Запущенное приложение на **`ORIGIN`** (по умолчанию `http://localhost:3000`). Скрипт `smoke:pilot:live` ходит в API по HTTP. |
| **Prisma migrations** | Схема БД должна соответствовать `prisma/schema.prisma`. Иначе возможны **P2022** (отсутствующие колонки) и 500 на live/publish. |
| **DATABASE_URL** | Доступная PostgreSQL для `prisma` и для того же инстанса, куда стучится Next. |
| **Pilot seed** | Один раз (или после сброса данных): `npm run db:seed:pilot` — детерминированные сущности и слот расписания. |
| **OPENAI_API_KEY** | **Не обязателен** для этого smoke: цепочка login → live → draft → publish → parent summary не вызывает OpenAI в этом контуре. |

## 3. Команды

Рекомендуемый порядок на чистой или обновлённой ветке:

```bash
# 1) Привести схему БД в соответствие с репозиторием
npx prisma migrate deploy

# 2) Загрузить pilot-фикстуры (идемпотентно)
npm run db:seed:pilot

# 3) Запустить Next (в другом терминале), затем smoke
npm run build
npm run start
# затем:
npm run smoke:pilot:live
```

Переменные окружения для скрипта (опционально):

- **`ORIGIN`** — базовый URL API (default: `http://localhost:3000`)
- **`PILOT_COACH_EMAIL`**, **`PILOT_PARENT_EMAIL`**, **`PILOT_PASSWORD`**
- **`WEEK_START`** — понедельник недели UTC для слота (default: `2026-04-20`)
- **`SLOT_NOTES`** — маркер слота в `TrainingSession.notes` (default: `PILOT_SMOKE_CANONICAL_SLOT`)

Скрипт: `scripts/pilot-smoke-live-publish.ts`, npm-скрипт: **`npm run smoke:pilot:live`**.

## 4. Пользователи (логины smoke)

| Роль | Email | Пароль |
|------|-------|--------|
| Coach | `pilot-coach@smoke.hockey-id.local` | `SmokePilot1!` |
| Parent | `pilot-parent@smoke.hockey-id.local` | `SmokePilot1!` |

Создаются сидом `prisma/seed-pilot-smoke.ts`; пароль хранится в БД как bcrypt.

## 5. Данные seed (ориентиры)

После `npm run db:seed:pilot` в БД ожидаются (стабильные имена / маркеры):

- **School:** `Pilot Smoke School (Stage 1)`
- **Team:** `Pilot Smoke Team U12`
- **TeamGroup:** `Pilot Smoke Main` (нужна для `GET /api/coach/schedule` — DTO с `group`)
- **Player:** имя **`PilotSmoke`**, фамилия **`Player`**; связь с родителем через `parentId` и `ParentPlayer`
- **TrainingSession:** привязка к пилотной команде и группе; **`notes === PILOT_SMOKE_CANONICAL_SLOT`**; слот в календарной неделе с **`weekStartDate`** **`2026-04-20`** (UTC, границы недели как в `weekRangeFromParam` — понедельник 00:00 UTC + 7 дней)

Точные `id` (cuid) на каждой машине свои; смоук находит слот по **`notes`** и **`weekStartDate`**.

## 6. Что делает скрипт (`smoke:pilot:live`)

Пошагово (HTTP):

1. **`POST /api/auth/login`** — coach, сохраняется `mobileToken` (Bearer).
2. **`GET /api/coach/schedule?weekStartDate=…`** — при необходимости повтор с `teamId` из payload пользователя.
3. **Поиск слота** в массиве ответа: `notes === SLOT_NOTES` → `trainingSessionId`, `teamId`.
4. **`POST /api/live-training/sessions`** — `teamId`, `mode: "ice"`, `trainingSessionId`, `scheduleSlotContext.trainingSlotId` (дублирование слота, как в coach-app). При **409** «активная сессия» — выход с сообщением и `sessionId` из ответа (reuse не делается).
5. **`POST .../live-training/sessions/{id}/finish`** — тело `{}`.
6. Если в ответе `status` не **`confirmed`** — **`POST .../confirm`** с `clientMutationId: pilot-smoke-<timestamp>`.
7. **`GET .../report-draft`** — ожидается 200.
8. **`PATCH .../report-draft`** — фиксированный **`coachPreviewNarrative`** (сводка / фокусы / highlight по игроку) для гарантированной публикуемости.
9. **`POST .../report-draft/publish`** — тело `{}`; проверяется наличие **`finalReport.trainingId`**.
10. **`POST /api/auth/login`** — parent, токен из `token` или `mobileToken`.
11. **`GET /api/parent/players`** — поиск игрока **`PilotSmoke` / `Player`**.
12. **`GET /api/parent/players/{id}/latest-training-summary`** — проверка `hasData`, непустого `source`, и непустого **`shortSummary`** или **`isPublished`**.

При ошибке HTTP скрипт печатает метод, путь, статус, тело и краткие подсказки для известных кодов.

## 7. Успешный результат

- Процесс **`npm run smoke:pilot:live`** завершается с **exit code 0**.
- В логе есть шаги вроде: coach login OK → schedule slot found → live session created → finish OK → confirm OK (или пропуск при auto-confirmed) → draft patched → **publish OK** → parent login OK → parent player found → **latest summary OK**.
- После publish родительская сводка может отдавать **`source: "live_session_fallback"`** — это допустимо для smoke: важно, что **`hasData: true`** и есть осмысленный текст.
- **`shortSummary`** должен быть **непустым**, либо ответ явно помечен как опубликованный сценарий (**`isPublished: true`**) — см. проверки в скрипте.

## 8. Типовые ошибки

| Симптом | Что делать |
|---------|------------|
| **Prisma P2022 / missing column** (в логах сервера при 500 на create live) | Выполнить **`npx prisma migrate deploy`**, перезапустить Next, повторить seed/smoke. |
| **401** | Проверить email/пароль, что `ORIGIN` указывает на тот же инстанс, Bearer = токен из login. |
| **403** | Доступ к команде у coach; у parent — связь игрока (`ParentPlayer` / `player.parentId`), профиль родителя для email-login. |
| **409 — активная live-сессия** | Завершить или отменить старую live-сессию того же тренера вручную (или через продуктовый UI/API), затем повторить smoke. |
| **`LIVE_TRAINING_NO_LINKED_TRAINING_SESSION` (409)** | Не передан `trainingSessionId` / слот не той команды / рассинхрон с `scheduleSlotContext.trainingSlotId`. |
| **`REPORT_DRAFT_NOT_PUBLISHABLE_CONTENT` (400)** | Проверить тело **`PATCH`** `coachPreviewNarrative` на соответствие серверной нормализации. |

## 9. Чего smoke **не** доказывает

- Весь UI coach-app и parent-app (Expo).
- Production-сборки мобильных клиентов и сторы.
- Push-уведомления.
- Чат и inbox.
- Полноту Arena / supercore / всех инсайтов.
- Нагрузочное и свойство-безопасное покрытие всех маршрутов API.
- Корректность всех остальных ролей (admin, marketplace, external coach и т.д.).

Smoke — **узкий регрессионный контроль** канонического пути live → отчёт → родитель.

## 10. Проверка после изменения документации

Рекомендуется локально:

```bash
npx tsc --noEmit
npm run build
```

Документ не влияет на компиляцию; команды подтверждают, что репозиторий в рабочем состоянии рядом с smoke-скриптом.

---

**Связанные файлы:** `prisma/seed-pilot-smoke.ts`, `scripts/pilot-smoke-live-publish.ts`, `package.json` (`db:seed:pilot`, `smoke:pilot:live`).
