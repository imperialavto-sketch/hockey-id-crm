# GET /api/me/subscription/* — Report

## DONE

1. **Shared helper** `src/lib/subscription-parent.ts`:
   - `getParentSubscriptionStatus(parentId)` — статус подписки или null
   - `getParentSubscriptionHistory(parentId)` — массив записей биллинга

2. **GET /api/me/subscription/status** — alias в `src/app/api/me/subscription/status/route.ts`:
   - Auth через `getAuthFromRequest`
   - Проверка PARENT + parentId
   - Вызов `getParentSubscriptionStatus`
   - Формат ответа совместим с parent-app mapSubscription

3. **GET /api/me/subscription/history** — alias в `src/app/api/me/subscription/history/route.ts`:
   - Auth через `getAuthFromRequest`
   - Проверка PARENT + parentId
   - Вызов `getParentSubscriptionHistory`
   - Формат ответа совместим с parent-app mapBillingRecord

4. **Рефакторинг** `/api/subscription/status` и `/api/subscription/history` — переход на shared helper, поведение без изменений.

## CHANGED FILES

| File | Change |
|------|--------|
| `src/lib/subscription-parent.ts` | **NEW** — shared helpers |
| `src/app/api/me/subscription/status/route.ts` | **NEW** — alias |
| `src/app/api/me/subscription/history/route.ts` | **NEW** — alias |
| `src/app/api/subscription/status/route.ts` | **REFACTORED** — использует getParentSubscriptionStatus |
| `src/app/api/subscription/history/route.ts` | **REFACTORED** — использует getParentSubscriptionHistory |

## RESPONSE SHAPE

### GET /api/me/subscription/status

```ts
// 200 OK — при наличии подписки
{
  id: string;
  planCode: string;
  status: string;
  billingInterval: string;
  currentPeriodStart: string;  // YYYY-MM-DD
  currentPeriodEnd: string;    // YYYY-MM-DD
  cancelAtPeriodEnd: boolean;
}

// 200 OK — при отсутствии подписки
null
```

### GET /api/me/subscription/history

```ts
// 200 OK
Array<{
  id: string;
  date: string;        // ISO 8601
  productName: string;
  amount: number;
  currency: string;
  status: string;
  type: string;
}>
```

## RISKS

- **hockey-server auto-create**: hockey-server создаёт подписку при первом запросе status, если её нет. Next.js CRM возвращает null. parent-app обрабатывает null (getSubscriptionStatus возвращает null). Для перевода на auto-create — отдельная задача.
- **403 vs 401**: `/api/subscription/status` возвращает 403 "Доступно только родителям", alias — 401 "Необходима авторизация" (как в остальных /api/me/*). parent-app при ошибке получает исключение; текст сообщения не используется.

## NEXT RECOMMENDED STEP

Добавить alias **POST /api/me/subscription** (создание подписки) и **POST /api/me/subscription/cancel** — subscriptionService вызывает createSubscription и cancelSubscription с parentId из getCurrentParentId. Next.js CRM имеет `/api/subscription` и `/api/subscription/cancel`; нужны alias под путём `/api/me/subscription/*` с передачей parentId из auth.
