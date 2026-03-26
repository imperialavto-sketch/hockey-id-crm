# Global QA + Cleanup Pass — Phase 1 Report

## DONE

1. **Logs & debug**
   - Убраны verbose `console.log` из `progress-history/route.ts` (4 вызова)
   - Упрощены логи в `authService.ts`: request-code, verify — один лаконичный `[auth]` лог
   - Убран dump `PLAYERS API RESULT` в `playerService.ts`
   - Сокращены логи в `lib/api.ts`: request/response — одна строка `[api] method url` и `[api] status url time`
   - Удалён неиспользуемый импорт `ApiRequestError` в authService

2. **Error handling**
   - Убран `details` из 500 ответов Phase 1: progress-history, ai-analysis/[id], players/[id]/stats
   - `console.error` сохранён на сервере для диагностики
   - Клиент получает только `{ error: "..." }` без внутренних сообщений

3. **Auth consistency**
   - Все Phase 1 routes используют `getAuthFromRequest` (Bearer/cookie)
   - Нет зависимости от `x-parent-id` для auth в Next.js CRM

4. **Минимальный cleanup**
   - Удалена мёртвая переменная `requestBody` в `lib/api.ts`
   - Исправлен комментарий auth в progress-history (X-Parent-Id → Bearer)

---

## CHANGED FILES

| File | Change |
|------|--------|
| `src/app/api/player/[id]/progress-history/route.ts` | Убраны verbose logs, убран `details` из 500 |
| `src/app/api/ai-analysis/[id]/route.ts` | Убран `details` из 500 |
| `src/app/api/players/[id]/stats/route.ts` | Убран `details` из 500 (GET, POST) |
| `parent-app/services/authService.ts` | Упрощены логи, удалён `ApiRequestError` import |
| `parent-app/services/playerService.ts` | Убран dump `PLAYERS API RESULT` |
| `parent-app/lib/api.ts` | Упрощены request/response logs, удалена `requestBody` |
| `docs/GLOBAL_QA_CLEANUP_REPORT.md` | NEW — отчёт |

---

## IMPROVEMENTS

- **Логи:** меньше шума в dev, сохраняется базовый трейс для отладки API
- **Безопасность:** 500-ответы Phase 1 не раскрывают внутренние сообщения об ошибках
- **Код:** удалён мёртвый код, единообразный стиль ошибок в Phase 1

---

## RISKS

- **Другие endpoints:** многие routes всё ещё возвращают `details` в 500 — не трогали (не Phase 1)
- **team, bookings, marketplace, chat:** не менялись по условию задачи

---

## NEXT RECOMMENDED STEP

Прогнать smoke-test или ручной E2E для Phase 1 (auth, me, schedule, players, subscription, notifications, stats, ai-analysis) и убедиться, что поведение не изменилось.
