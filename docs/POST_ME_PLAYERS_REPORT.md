# POST /api/me/players — Report

## DONE

1. **Shared helper** `createParentPlayer(parentId, input)` в `src/lib/parent-players.ts`:
   - parentId только из аргумента (берётся из auth)
   - input: firstName, lastName, birthYear, position?
   - grip по умолчанию "Правый", position по умолчанию "Нападающий"

2. **POST /api/me/players** в `src/app/api/me/players/route.ts`:
   - Auth через `getAuthFromRequest`
   - Проверка PARENT + parentId
   - parentId берётся только из user.parentId
   - Валидация: firstName, lastName, birthYear обязательны
   - Явный отказ при передаче parentId в body (400)
   - Диапазон birthYear: 1990–текущий год
   - Ответ в формате BackendPlayer, status 201

## CHANGED FILES

| File | Change |
|------|--------|
| `src/lib/parent-players.ts` | Добавлены `CreateParentPlayerInput`, `createParentPlayer` |
| `src/app/api/me/players/route.ts` | Добавлен POST handler |

## REQUEST SHAPE

```ts
POST /api/me/players
Content-Type: application/json

{
  firstName: string;   // required
  lastName: string;    // required
  birthYear: number;   // required, 1990..currentYear
  position?: string;   // optional, default "Нападающий"
}
```

**Запрещено:** передавать `parentId` в body — 400.

## RESPONSE SHAPE

```ts
// 201 Created
{
  id: string;
  firstName: string;
  lastName: string;
  name: string;
  birthYear: number;
  age: number;
  position: string | null;
  parentId: string | null;
  teamId: string | null;
  team: string | null;
  avatarUrl: string | null;
  avatar: string | null;
  games: null;
  goals: null;
  assists: null;
  points: null;
  pim: null;
  stats: null;
}
```

## RISKS

- **teamId**: parent-app не передаёт teamId при создании. Новый игрок без команды. Добавление в команду — отдельный flow (invite / assign).
- **grip**: задаётся по умолчанию "Правый" — parent-app не передаёт, изменение позже через другой экран.

## NEXT RECOMMENDED STEP

Добавить alias **GET /api/me** (возвращает `{ id: parentId }`) — parent-app `subscriptionService` вызывает `/api/me` для получения профиля родителя.
