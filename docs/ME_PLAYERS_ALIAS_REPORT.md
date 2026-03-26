# Me Players Alias — Report

## DONE

1. **Shared helper** `src/lib/parent-players.ts`:
   - `getParentPlayers(parentId)` — список игроков родителя
   - `getParentPlayerById(parentId, playerId)` — один игрок с проверкой доступа через `canParentAccessPlayer`

2. **GET /api/me/players** — alias в `src/app/api/me/players/route.ts`:
   - Auth через `getAuthFromRequest` (Bearer/cookie)
   - Проверка PARENT + parentId
   - Вызов `getParentPlayers`
   - Формат ответа: BackendPlayer[]

3. **GET /api/me/players/[id]** — alias в `src/app/api/me/players/[id]/route.ts`:
   - Auth через `getAuthFromRequest`
   - Проверка PARENT + parentId
   - Вызов `getParentPlayerById` (включает проверку доступа)
   - 404 при отсутствии игрока или отсутствии доступа
   - Формат ответа: BackendPlayer (включая stats для fallback)

4. **Рефакторинг** `/api/parent/mobile/players` — переход на `getParentPlayers`, формат ответа без изменений.

## CHANGED FILES

| File | Change |
|------|--------|
| `src/lib/parent-players.ts` | **NEW** — shared helpers |
| `src/app/api/me/players/route.ts` | **NEW** — alias GET /api/me/players |
| `src/app/api/me/players/[id]/route.ts` | **NEW** — alias GET /api/me/players/:id |
| `src/app/api/parent/mobile/players/route.ts` | **REFACTORED** — использует `getParentPlayers` |

**Без изменений:** `/api/parent/mobile/player/[id]`, `/api/parent/mobile/player/[id]/full-profile`

## RESPONSE SHAPE

### GET /api/me/players

```ts
Array<{
  id: string;
  firstName: string;
  lastName: string;
  name: string;
  birthYear: number;
  age: number;
  position: string | null;
  parentId: string | null;
  teamId: string | null;
  team: string | null;          // или { name: string }
  avatarUrl: string | null;
  avatar: string | null;
  games: null;
  goals: null;
  assists: null;
  points: null;
  pim: null;
  stats: null;
}>
```

### GET /api/me/players/:id

```ts
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
  team: { name: string } | null;
  avatarUrl: string | null;
  avatar: string | null;
  games: number | null;
  goals: number | null;
  assists: number | null;
  points: number | null;
  pim: number | null;
  stats: { games, goals, assists, points, pim } | null;  // если есть статистика
}
```

## RISKS

- **POST /api/me/players**: parent-app `createPlayerForParent` вызывает `POST /api/me/players` — endpoint пока не добавлен.
- **team shape**: для списка отдаётся `team: string | null`, для одного игрока — `team: { name: string } | null`. parent-app `mapBackendPlayerToApiPlayer` поддерживает оба варианта.

## NEXT RECOMMENDED STEP

Добавить **POST /api/me/players** — создание игрока для текущего родителя (parentId берётся из auth). Логика должна соответствовать hockey-server `mePlayers.js` POST и проверять parentId из токена.
