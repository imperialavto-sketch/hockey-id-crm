# QA Check + Build Fix Report

## BUILD STATUS

**✓ Сборка проходит успешно.**

**Исправления:**

1. **@paralleldrive/cuid2** — установлена зависимость `npm install @paralleldrive/cuid2` (используется в `coach/sessions/start`).

2. **tsconfig exclude** — добавлен `coach-app` в exclude (Next.js не должен type-check Expo app).

3. **TypeScript null-safety** — добавлены проверки `!== null` для `getAccessiblePlayerIds` / `getAccessibleTeamIds` в:
   - `coach/players/[id]/route.ts`
   - `coach/players/route.ts`
   - `coach/teams/[id]/route.ts`
   - `coach/teams/route.ts`

4. **JsonValue → string** — приведение типов в `coach/reports/weekly/route.ts` (shortSummary, keyPoints).

5. **Set/Map iteration** — замены `[...new Set()]` на `Array.from(new Set())` в:
   - `coach/sessions/[sessionId]/review/route.ts`
   - `parent-schedule.ts`

6. **tsconfig target/downlevelIteration** — добавлены `target: "ES2017"` и `downlevelIteration: true` для совместимости итераторов.

7. **subscriptionStub** — убран импорт из `@/parent-app/types/subscription` (parent-app в exclude), интерфейс `SubscriptionPlan` объявлен локально.

8. **notifications/[id]/read** — исправлен параметр `_req` → `req` для `getAuthFromRequest`.

9. **players/[id]/stats security** — добавлена явная проверка `canParentAccessPlayer` перед возвратом stats; при отсутствии доступа — 403.

---

## QA CHECK RESULTS

| Endpoint | No Auth | With Auth | Notes |
|----------|---------|-----------|-------|
| GET /api/me | 401 ✓ | 200 ✓ | |
| GET /api/me/schedule | 401 ✓ | 200 ✓ | |
| GET /api/me/players | 401 ✓ | 200 ✓ | |
| GET /api/me/players/:id | 401 ✓ | 200 ✓ | |
| POST /api/me/players | 401 ✓ | 201 ✓ | |
| GET /api/me/subscription/status | 401 ✓ | 500 | env: Stripe/DB |
| GET /api/me/subscription/history | 401 ✓ | 500 | env: Stripe/DB |
| GET /api/notifications | 401 ✓ | 200 ✓ | |
| GET /api/players/:id/stats | 401 ✓ | 200 ✓ | |
| GET /api/ai-analysis/:id | 401 ✓ | 500 | env: AI/OpenAI |
| GET /api/players/:otherId/stats (OTHER) | - | 403 ✓ | чужой игрок |
| GET /api/ai-analysis/:otherId (OTHER) | - | 403 ✓ | чужой игрок |

**Не проверялись в QA-check:** POST /api/subscription, POST /api/subscription/cancel, POST /api/notifications/:id/read (нужны доп. данные).

---

## SECURITY CHECKS

- **401 без auth** — все защищённые endpoints возвращают 401 при отсутствии Bearer token.
- **Доступ к своему игроку** — me/players/:id, players/:id/stats, ai-analysis/:id возвращают 200.
- **Нет доступа к чужому игроку** — GET players/:otherId/stats и ai-analysis/:otherId возвращают 403 для чужого parent.
- **Legacy headers** — x-parent-id не используется для auth, только Bearer/cookie.

---

## CHANGED FILES

| File | Change |
|------|--------|
| package.json | + @paralleldrive/cuid2 |
| tsconfig.json | exclude coach-app, target ES2017, downlevelIteration |
| src/app/api/coach/players/[id]/route.ts | null check for accessibleIds |
| src/app/api/coach/players/route.ts | null check for accessibleIds |
| src/app/api/coach/teams/[id]/route.ts | null check for teamIds |
| src/app/api/coach/teams/route.ts | null check for teamIds |
| src/app/api/coach/reports/weekly/route.ts | JsonValue → string casts |
| src/app/api/coach/sessions/[sessionId]/review/route.ts | Array.from for Set |
| src/app/api/notifications/[id]/read/route.ts | _req → req |
| src/lib/parent-schedule.ts | Array.from for Set |
| src/lib/subscriptionStub.ts | local SubscriptionPlan, no parent-app import |
| src/app/api/players/[id]/stats/route.ts | + canParentAccessPlayer, 403 on no access |
| scripts/demo-check.ts | NEW — QA check script |
| docs/DEMO_QA_BUILD_FIX_REPORT.md | NEW — этот отчёт |

---

## RISKS

- **subscription 500** — GET /api/me/subscription/status и history возвращают 500; возможные причины: Stripe, отсутствие таблиц подписок, env.
- **ai-analysis 500** — GET /api/ai-analysis/:id возвращает 500 при генерации анализа; возможные причины: OpenAI API key, ошибки в generatePlayerAnalysis.
- **target ES2017** — может повлиять на поддержку старых браузеров; для Next.js обычно допустимо.

---

## NEXT RECOMMENDED STEP

Настроить окружение для subscription и ai-analysis (Stripe, OpenAI, переменные) и повторно прогнать QA-check для этих endpoints.
