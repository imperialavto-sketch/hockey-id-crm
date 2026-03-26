# Player Stats Alignment — Report

## DONE

1. **Shared helper** `getParentPlayerStats(parentId, playerId)` в `src/lib/parent-players.ts`:
   - Проверка доступа через `canParentAccessPlayer`
   - Возврат агрегированной последней записи или null

2. **GET /api/players/[id]/stats** — добавлена поддержка PARENT:
   - Проверка auth через `getAuthFromRequest`
   - Для PARENT: вызов `getParentPlayerStats`, возврат `{ games, goals, assists, points, pim }` или null
   - Для CRM: без изменений (requirePermission, checkPlayerAccess, массив stats)

3. **GET /api/parent/mobile/player/[id]/stats** — переход на `getParentPlayerStats`

## CHANGED FILES

| File | Change |
|------|--------|
| `src/lib/parent-players.ts` | Добавлен `getParentPlayerStats` |
| `src/app/api/players/[id]/stats/route.ts` | Добавлена ветка PARENT |
| `src/app/api/parent/mobile/player/[id]/stats/route.ts` | Рефакторинг на `getParentPlayerStats` |

## RESPONSE SHAPE

### GET /api/players/:id/stats (для PARENT)

```ts
// 200 OK — есть статистика
{
  games: number;
  goals: number;
  assists: number;
  points: number;
  pim: number;
}

// 200 OK — нет статистики или нет доступа
null
```

parent-app `getPlayerStats` обрабатывает оба варианта (объект и null).

## SECURITY BEHAVIOR

- **PARENT**: `getParentPlayerStats` вызывает `canParentAccessPlayer(parentId, playerId)` — проверяется parentId из auth и доступ через ParentPlayer
- **Чужие игроки**: при отсутствии доступа возвращается null (данные не раскрываются)
- **CRM**: сохраняется проверка через requirePermission и checkPlayerAccess

## RISKS

- При отсутствии доступа PARENT получает `null` вместо 403 — явный forbidden не возвращается, но данные не раскрываются

## NEXT RECOMMENDED STEP

**P1: AI analysis alias** — добавить GET /api/ai-analysis/:playerId как alias на /api/player/:id/ai-analysis для parent-app getAIAnalysis.
