# GET /api/me — Report

## DONE

1. **GET /api/me** в `src/app/api/me/route.ts`:
   - Auth через `getAuthFromRequest` (Bearer/cookie)
   - Проверка PARENT + parentId
   - Возвращает `{ id: user.parentId }`

2. **Совместимость** с parent-app:
   - subscriptionService.getCurrentParentId() вызывает GET /api/me и использует только `me.id`
   - Response shape совпадает с hockey-server и MeProfileResponse

## CHANGED FILES

| File | Change |
|------|--------|
| `src/app/api/me/route.ts` | **NEW** — GET /api/me |

## RESPONSE SHAPE

```ts
// 200 OK
{
  id: string;  // parentId (Parent record cuid)
}
```

## RISKS

- **Дополнительные поля**: hockey-server возвращает только id. Если parent-app позже начнёт ожидать name, firstName, phone и т.п., нужно будет расширить ответ и брать данные из Parent в БД. Сейчас этого не требуется.

## NEXT RECOMMENDED STEP

Добавить alias **GET /api/me/subscription/status** и **GET /api/me/subscription/history** — subscriptionService вызывает эти endpoints. Next.js CRM имеет `/api/subscription/status` и `/api/subscription/history`; нужны proxy/alias под путём `/api/me/subscription/*` с Bearer auth для PARENT.
