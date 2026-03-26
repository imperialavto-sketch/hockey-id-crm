# Safe First Step — Report

## DONE

1. **Shared helper** `getParentScheduleTrainings(parentId)` в `src/lib/parent-schedule.ts` — единая логика получения расписания для parent: players → teamIds → trainings.

2. **GET /api/me/schedule** — alias endpoint в `src/app/api/me/schedule/route.ts`:
   - авторизация через `getAuthFromRequest` (Bearer/cookie);
   - проверка PARENT + parentId;
   - вызов `getParentScheduleTrainings`;
   - ответ в формате `MeScheduleItem[]`.

3. **Рефакторинг** `/api/parent/mobile/schedule` — переход на `getParentScheduleTrainings`, логика вынесена в shared helper, формат ответа не менялся.

## CHANGED FILES

| File | Change |
|------|--------|
| `src/lib/parent-schedule.ts` | **NEW** — shared helper `getParentScheduleTrainings` |
| `src/app/api/me/schedule/route.ts` | **NEW** — alias GET /api/me/schedule |
| `src/app/api/parent/mobile/schedule/route.ts` | **REFACTORED** — использует `getParentScheduleTrainings`, удалён импорт prisma и дублирование логики |

## RESPONSE SHAPE

**GET /api/me/schedule** возвращает:

```ts
Array<{
  id: string;
  title: string;
  startTime: string;  // ISO 8601
  location: string | null;
  teamId: string;
}>
```

Соответствие `MeScheduleItem` в parent-app:
- `id` ✅
- `title` ✅
- `startTime` ✅ (для `mapMeScheduleToItem` и `mapMeScheduleToTeamEvent`)
- `location` ✅
- `teamId` ✅

## RISKS

- **Training vs TrainingSession**: `/api/me/schedule` читает из **Training**. После перехода на TrainingSession потребуется обновить `getParentScheduleTrainings`.
- **Воскресенье**: `/api/parent/mobile/schedule` не включает день 0 (воскресенье) в grid; `/api/me/schedule` отдаёт все trainings, включая воскресенье — для parent-app это ожидаемо.
- **Пустой schedule**: если у parent нет детей или команд — возвращается `[]`; parent-app обрабатывает это.

## NEXT RECOMMENDED STEP

Добавить alias **GET /api/me/players** и **GET /api/me/players/:id** (proxy к `/api/parent/mobile/players`) — parent-app `playerService` сейчас обращается к `/api/me/players`, которого нет в Next.js CRM.
