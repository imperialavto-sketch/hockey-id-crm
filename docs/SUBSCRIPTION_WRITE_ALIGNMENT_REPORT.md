# Subscription Write Alignment — Report

## DONE

1. **Проверка routes**:
   - POST /api/subscription и POST /api/subscription/cancel уже используют getAuthFromRequest, требуют PARENT, берут parentId только из user.parentId.
   - parentId из body не используется.

2. **POST /api/subscription** — обновлён для совместимости с parent-app:
   - parent-app передаёт `planCode`, не `planId`.
   - Добавлена поддержка `planCode` (или `planId`) в body.
   - parentId из body игнорируется (явный комментарий).

3. **POST /api/subscription/cancel** — без изменений:
   - Уже совместим: auth, parentId из auth, body игнорируется.
   - Response shape подходит для parent-app mapSubscription.

4. **Безопасность**:
   - parentId только из auth.
   - parentId из body игнорируется.
   - Роль PARENT обязательна.
   - Bearer/cookie auth обязателен.

## CHANGED FILES

| File | Change |
|------|--------|
| `src/app/api/subscription/route.ts` | Добавлена поддержка planCode, комментарий про parentId |
| `src/lib/subscriptionStub.ts` | Добавлен план development_plus для parent-app MEMBERSHIP_PLANS |

**Без изменений:** `src/app/api/subscription/cancel/route.ts` — уже подходит.

## REQUEST SHAPE

### POST /api/subscription

```ts
{
  planId?: string;   // optional — lookup by id
  planCode?: string; // optional — lookup by code (parent-app sends this)
  // parentId в body игнорируется
  // status, billingInterval, currentPeriodStart, currentPeriodEnd, cancelAtPeriodEnd — игнорируются (сервер пересчитывает)
}
```

Обязателен `planId` или `planCode`.

### POST /api/subscription/cancel

```ts
{}  // body не используется; parentId из auth
```

## RESPONSE SHAPE

### POST /api/subscription

```ts
{
  id: string;
  planCode: string;
  status: string;
  billingInterval: string;
  currentPeriodStart: string;  // YYYY-MM-DD
  currentPeriodEnd: string;
  cancelAtPeriodEnd: boolean;
}
```

### POST /api/subscription/cancel

```ts
{
  id: string;
  planCode: string;
  status: string;
  billingInterval: string;
  currentPeriodStart: string;
  currentPeriodEnd: string;
  cancelAtPeriodEnd: boolean;  // true после отмены
}
```

parent-app mapSubscription принимает также `{ subscription: {...} }` — Next.js возвращает объект напрямую.

## RISKS

- Нет критичных. development_plus добавлен в stub.

## NEXT RECOMMENDED STEP

Полный перевод parent-app на Next.js CRM — проверить все оставшиеся endpoints (bookings, feed, chat, teamService и т.д.) и определить приоритеты миграции.
