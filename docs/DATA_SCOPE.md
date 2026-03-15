# Data Scope — ограничение доступа к данным

**Второй уровень защиты:** RBAC проверяет роль, Data Scope — принадлежность данных.

---

## 1. Уровни защиты

| Уровень   | Проверка           | Когда применяется      |
|-----------|--------------------|------------------------|
| **RBAC**  | Роль (permission)  | Доступ к модулю/действию |
| **Data Scope** | Принадлежность данных | Доступ к конкретной записи |

---

## 2. Data Scope по ролям

### Игроки (players)

| Роль          | Данные                    | Фильтр                               |
|---------------|---------------------------|--------------------------------------|
| SCHOOL_ADMIN  | Все игроки                | Нет ограничений                      |
| SCHOOL_MANAGER| Игроки школы              | `team.schoolId === user.schoolId`    |
| MAIN_COACH    | Игроки своей команды      | `player.teamId === user.teamId`      |
| COACH         | Игроки своей команды      | `player.teamId === user.teamId`      |
| PARENT        | Только свои дети          | `player.parentId === user.parentId`  |

### Команды (teams)

| Роль          | Данные                    | Фильтр                               |
|---------------|---------------------------|--------------------------------------|
| SCHOOL_ADMIN  | Все команды               | —                                    |
| SCHOOL_MANAGER| Команды школы             | `team.schoolId === user.schoolId`    |
| MAIN_COACH    | Своя команда              | `team.id === user.teamId`            |
| COACH         | Своя команда              | `team.id === user.teamId`            |
| PARENT        | Нет доступа               | —                                    |

### Тренировки (trainings)

| Роль          | Данные                    | Фильтр                               |
|---------------|---------------------------|--------------------------------------|
| SCHOOL_ADMIN  | Все тренировки            | —                                    |
| SCHOOL_MANAGER| Все тренировки школы      | —                                    |
| MAIN_COACH    | Тренировки своей команды  | `training.teamId === user.teamId`    |
| COACH         | Тренировки своей команды  | `training.teamId === user.teamId`    |
| PARENT        | Нет доступа               | —                                    |

### Финансы (payments, finance)

| Роль          | Данные                    | Фильтр                               |
|---------------|---------------------------|--------------------------------------|
| SCHOOL_ADMIN  | Все платежи               | —                                    |
| SCHOOL_MANAGER| Все платежи школы         | —                                    |
| MAIN_COACH    | Платежи своей команды     | `player.teamId === user.teamId`      |
| COACH         | Нет доступа               | RBAC блокирует (finance.view = false)|
| PARENT        | Нет доступа               | —                                    |

---

## 3. Родители (PARENT)

- **API:** только `/api/parent/players`
- **Нет доступа** к `/api/player/[id]`, `/api/players` и т.д. (RBAC возвращает 403)
- **Фильтр в `/api/parent/players`:** только игроки с `parentId === user.parentId`
- `parentId` задаётся в сессии при логине (связь User → Parent по email)

---

## 4. Утилиты (`src/lib/data-scope.ts`)

| Функция                    | Описание                              |
|----------------------------|----------------------------------------|
| `canAccessPlayer(user, player)` | Проверка доступа к игроку          |
| `canAccessTeam(user, team)`     | Проверка доступа к команде         |
| `canAccessTraining(user, training)` | Проверка доступа к тренировке |
| `getAccessiblePlayerIds(user, prisma)` | ID игроков, доступных пользователю |
| `getAccessibleTeamIds(user, prisma)`   | ID команд, доступных пользователю |
| `checkPlayerAccess(user, player)`      | Возвращает 403 при отсутствии доступа |

---

## 5. Применение в API

### Игроки

- **GET /api/players** — фильтр по `getAccessiblePlayerIds`
- **GET/PUT/DELETE /api/players/[id]** — `checkPlayerAccess` после загрузки игрока
- **GET /api/player/[id]** — `checkPlayerAccess`
- **POST /api/player/[id]/skills, rating, medical, passport, achievement, video** — `checkPlayerAccess`
- **GET /api/player/[id]/trainings, payments** — `checkPlayerAccess`
- **POST /api/player/[id]/payments**, **PUT /api/player/[id]/payments/[pid]** — `checkPlayerAccess`
- **GET /api/players/[id]/profile, notes, stats** — `checkPlayerAccess`

### Финансы

- **GET /api/payments** — для MAIN_COACH: `player.teamId === user.teamId`
- **GET /api/finance/summary** — то же
- **GET /api/finance/debtors** — то же

### Родители

- **GET /api/parent/players** — обязательный `parentId` из сессии, фильтр `parentId` (игнорируется query)

---

## 6. Требования к данным сессии

| Роль          | Поле       | Источник                                      |
|---------------|------------|-----------------------------------------------|
| SCHOOL_MANAGER| schoolId   | User.schoolId                                 |
| MAIN_COACH    | teamId     | User.teamId или Team по школе при логине      |
| COACH         | teamId     | User.teamId или Team по школе при логине      |
| PARENT        | parentId   | Parent по email при логине                    |
