# Notifications Security Fix — Report

## DONE

1. **GET /api/notifications**:
   - Добавлена авторизация через `getAuthFromRequest`
   - Требуется роль PARENT и `user.parentId`
   - parentId берётся только из auth
   - parentId из query игнорируется
   - Возвращаются только уведомления текущего родителя

2. **POST /api/notifications/[id]/read**:
   - Добавлена авторизация через `getAuthFromRequest`
   - Требуется роль PARENT
   - Перед update проверяется, что уведомление принадлежит текущему родителю
   - Если не принадлежит — 404 (чужое уведомление не раскрывается)

## CHANGED FILES

| File | Change |
|------|--------|
| `src/app/api/notifications/route.ts` | Auth, parentId из auth, query parentId игнорируется |
| `src/app/api/notifications/[id]/read/route.ts` | Auth, проверка ownership, 404 при чужом уведомлении |

## REQUEST / QUERY RULES

### GET /api/notifications

- **parentId из query** — игнорируется
- **parentId** — берётся из auth (user.parentId)
- **unread** — query param сохраняется (фильтр по read: false)

### POST /api/notifications/[id]/read

- **parentId** — не передаётся в запросе; берётся из auth
- Ownership: update выполняется только если notification.parentId === user.parentId

## RESPONSE / BEHAVIOR

### GET /api/notifications

- **401** — не авторизован или не PARENT
- **200** — массив уведомлений текущего родителя
- Query `?parentId=xxx` больше не влияет на результат

### POST /api/notifications/[id]/read

- **401** — не авторизован или не PARENT
- **404** — уведомление не найдено или принадлежит другому родителю (единый ответ для обоих случаев)
- **200** — уведомление помечено как прочитанное

## RISKS

- parent-app по‑прежнему передаёт `?parentId=xxx` в GET — это безопасно, значение игнорируется
- Уведомления с `parentId: null` не будут возвращаться родителю — ожидаемое поведение

## NEXT RECOMMENDED STEP

**P1: Player stats** — добавить поддержку PARENT в GET /api/players/:id/stats или alias, чтобы parent-app getPlayerStats работал с Next.js CRM.
