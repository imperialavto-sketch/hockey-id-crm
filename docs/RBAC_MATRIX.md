# RBAC Matrix — Hockey ID CRM

**Роли и права доступа**

---

## 1. Роли

| Роль | Описание |
|------|----------|
| SCHOOL_ADMIN | Администратор школы — полный доступ ко всей CRM |
| SCHOOL_MANAGER | Менеджер школы — управление, без супер-админ функций |
| MAIN_COACH | Главный тренер — команды, тренеры, расписание, ограниченные финансы |
| COACH | Тренер — свои команды, тренировки, оценки; без финансов и настроек |
| PARENT | Родитель — только `/parent` (приложение для родителей) |

---

## 2. Доступ по модулям

| Модуль | SCHOOL_ADMIN | SCHOOL_MANAGER | MAIN_COACH | COACH | PARENT |
|--------|:------------:|:--------------:|:----------:|:-----:|:------:|
| **dashboard** | view, create, edit, delete | view | view | view | — |
| **school** | ✓ все | view, edit | view | — | — |
| **teams** | ✓ все | view, create, edit | view, create, edit | view | — |
| **players** | ✓ все | view, create, edit, delete | view, create, edit | view, edit | — |
| **coaches** | ✓ все | view | view, create, edit | view | — |
| **schedule** | ✓ все | view, create, edit, delete | view, create, edit, delete | view, create, edit | — |
| **finance** | ✓ все | view, create, edit | view | — | — |
| **analytics** | ✓ все | view | view | view | — |
| **communications** | ✓ все | view, create, edit | view, create, edit | view, create | — |
| **settings** | ✓ все | view, edit (ограниченно) | — | — | — |

---

## 3. Навигация по ролям

### SCHOOL_ADMIN
- Главная, Школа, Команды, Игроки, Тренеры, Расписание, Финансы, Аналитика, Коммуникации, Настройки

### SCHOOL_MANAGER
- То же, что SCHOOL_ADMIN

### MAIN_COACH
- Главная, Команды, Игроки, Тренеры, Расписание, Финансы, Аналитика, Коммуникации  
- Без: Школа, Настройки

### COACH
- Главная, Команды, Игроки, Тренеры, Расписание, Аналитика, Коммуникации  
- Без: Школа, Финансы, Настройки

### PARENT
- Только: Мои дети (`/parent`)

---

## 4. Ограничения

### Финансы
- **COACH** — не имеет доступа к финансам
- **MAIN_COACH** — только просмотр (view)
- **SCHOOL_ADMIN**, **SCHOOL_MANAGER** — полный доступ

### Коммуникации
- **COACH** / **MAIN_COACH** — могут видеть и создавать обращения по своим игрокам/командам (логика скоупа — в реализации)
- **SCHOOL_ADMIN**, **SCHOOL_MANAGER** — все обращения

### Настройки
- **SCHOOL_ADMIN** — полный доступ (школа, пользователи, роли, система)
- **SCHOOL_MANAGER** — ограниченный (просмотр и редактирование без ролей и критичных настроек)
- **COACH**, **MAIN_COACH**, **PARENT** — доступа нет

### PARENT
- Редирект со всех CRM-страниц на `/parent`
- Доступен только API `/api/parent/players`

---

## 5. API Protection

| Endpoint | Проверка |
|----------|----------|
| `/api/auth/login` | — |
| `/api/auth/logout` | — |
| `/api/parent/players` | `requireParentRole` (только PARENT) |
| `/api/players` | `requirePermission(players, view/create)` |
| `/api/players/[id]` | `requirePermission(players, view/edit/delete)` |
| `/api/player/[id]` | `requirePermission(players, view)` |
| `/api/teams` | `requirePermission(teams, view/create)` |
| `/api/teams/[id]` | `requirePermission(teams, view/edit/delete)` |
| `/api/coaches` | `requirePermission(coaches, view/create)` |
| `/api/trainings` | `requirePermission(trainings, view/create)` |
| `/api/coach/trainings` | `requirePermission(trainings, view/create)` |
| `/api/schedule` | `requirePermission(trainings, view)` |
| `/api/payments` | `requirePermission(payments, view/create)` |
| `/api/payments/[id]` | `requirePermission(payments, view/edit/delete)` |
| `/api/payments/bulk-create` | `requirePermission(payments, create)` |
| `/api/finance/summary` | `requirePermission(payments, view)` |
| `/api/finance/debtors` | `requirePermission(payments, view)` |
| `/api/analytics` | `requirePermission(analytics, view)` |
| `/api/analytics/*` | `requirePermission(analytics, view)` |
| `/api/dashboard/*` | `requirePermission(dashboard, view)` |
| `/api/messages` | `requirePermission(messages, view)` |
| `/api/settings` | `requirePermission(settings, view/edit)` |
| `/api/schools` | `requirePermission(schools, view/create)` |
| `/api/payments/stripe/webhook` | Без проверки (внешний вызов) |
| `/api/payments/stripe/checkout` | Любой авторизованный (для оплаты родителем) |

### Формат ответа при отказе
- **401 Unauthorized**: `{ error: "Необходима авторизация", code: "UNAUTHORIZED" }`
- **403 Forbidden**: `{ error: "Недостаточно прав", code: "FORBIDDEN" }`

---

## 6. Вспомогательные функции

| Функция | Описание |
|---------|----------|
| `getCurrentUserRole(role)` | Возвращает валидную роль или null |
| `requireRole(role, allowed)` | Проверяет, входит ли роль в список разрешённых |
| `canViewModule(role, module)` | Есть ли право на просмотр модуля |
| `canEditModule(role, module)` | Есть ли право на редактирование |
| `canDeleteModule(role, module)` | Есть ли право на удаление |
| `getNavForRole(role)` | Список пунктов меню для роли |
| `isParentForbiddenPath(path)` | Запрещён ли путь для PARENT |
| `getModuleFromPath(pathname)` | Определение модуля по пути |

---

## 7. Аутентификация

- **Сессия** хранится в httpOnly cookie `hockey-crm-session`
- При успешном логине API устанавливает cookie
- При logout — cookie удаляется
- Все защищённые API читают сессию из cookie и проверяют роль

---

## 8. Demo-пользователи

| Email | Пароль | Роль |
|-------|--------|------|
| admin@hockey.edu | admin123 | SCHOOL_ADMIN |
| manager@hockey.edu | admin123 | SCHOOL_MANAGER |
| maincoach@hockey.edu | admin123 | MAIN_COACH |
| coach@hockey.edu | admin123 | COACH |
| parent@example.com | admin123 | PARENT |
