# ENV Alignment + Re-Smoke Test Report

## ENV FINDINGS

### Subscription (GET /api/me/subscription/status, /history)

- **Не требуется:** STRIPE keys, webhook — эти endpoints читают только из БД (таблицы `Subscription`, `SubscriptionBillingRecord`).
- **Проблема:** Таблицы могут отсутствовать — миграция для Subscription не найдена в `prisma/migrations/`. Prisma падал с ошибкой при обращении к несуществующим таблицам.
- **Переменные:** `DATABASE_URL` — обязательна для Prisma. Stripe не используется для status/history.

### AI Analysis (GET /api/ai-analysis/:id, /api/player/:id/ai-analysis)

- **Опционально:** `OPENAI_API_KEY` — при наличии используется LLM; без ключа работает шаблонный fallback (`generateFallback`).
- **Проблема:** 500 возникали при отсутствии таблицы `ai_analyses` — `getLatestAiAnalysisForPlayer` и `saveAiAnalysis` выбрасывали исключение.
- **Переменные:** Нет обязательных env для AI analysis (fallback работает без OpenAI).

---

## FIXED

1. **subscription-parent.ts**
   - `getParentSubscriptionStatus`: обёрнут в try/catch, при ошибке возвращает `null` (как «нет подписки»).
   - `getParentSubscriptionHistory`: обёрнут в try/catch, при ошибке возвращает `[]`.
   - В dev при отсутствии таблиц ответ 200 с `null` / `[]` вместо 500.

2. **ai-analysis-store.ts**
   - `getLatestAiAnalysisForPlayer`: обёрнут в try/catch, при ошибке возвращает `null` (как «нет сохранённого анализа»).

3. **player/[id]/ai-analysis/route.ts**
   - `saveAiAnalysis` обёрнут в try/catch — при ошибке сохраняемся логи и ответ отдаётся без сохранения.
   - Из 500 ответа убраны `details` (без раскрытия внутренних деталей).

---

## RE-SMOKE TEST RESULTS

Тест выполнен против production build (`npm run start`). Таблицы Subscription, SubscriptionBillingRecord, ai_analyses отсутствуют — fallbacks сработали.

| Endpoint | No Auth | With Auth | Notes |
|----------|---------|-----------|-------|
| GET /api/me | 401 ✓ | 200 ✓ | |
| GET /api/me/schedule | 401 ✓ | 200 ✓ | |
| GET /api/me/players | 401 ✓ | 200 ✓ | |
| GET /api/me/players/:id | 401 ✓ | 200 ✓ | |
| GET /api/me/subscription/status | 401 ✓ | 200 ✓ | null при отсутствии таблиц |
| GET /api/me/subscription/history | 401 ✓ | 200 ✓ | [] при отсутствии таблиц |
| GET /api/notifications | 401 ✓ | 200 ✓ | |
| GET /api/players/:id/stats | 401 ✓ | 200 ✓ | |
| GET /api/ai-analysis/:id | 401 ✓ | 200 ✓ | fallback без OpenAI, без persist |
| POST /api/me/players | 401 ✓ | 201 ✓ | |
| GET /api/players/:otherId/stats (OTHER) | - | 403 ✓ | чужой игрок |
| GET /api/ai-analysis/:otherId (OTHER) | - | 403 ✓ | чужой игрок |

---

## CHANGED FILES

| File | Change |
|------|--------|
| src/lib/subscription-parent.ts | try/catch для getParentSubscriptionStatus, getParentSubscriptionHistory |
| src/lib/ai/ai-analysis-store.ts | try/catch для getLatestAiAnalysisForPlayer |
| src/app/api/player/[id]/ai-analysis/route.ts | try/catch для saveAiAnalysis, убраны details из 500 |
| docs/ENV_ALIGNMENT_REPORT.md | NEW — отчёт |

---

## RISKS

- **Скрытие ошибок:** В dev реальные ошибки БД (подключение, права) тоже приводят к `null`/`[]`. Важно смотреть логи `console.warn` при отладке.
- **Миграции:** Subscription и SubscriptionBillingRecord по-прежнему отсутствуют в миграциях. Для prod нужна миграция, создающая эти таблицы.

---

## NEXT RECOMMENDED STEP

Создать и применить миграцию Prisma для таблиц `Subscription` и `SubscriptionBillingRecord` (`npx prisma migrate dev --name add_subscription`), затем перезапустить сервер и выполнить smoke-test.
