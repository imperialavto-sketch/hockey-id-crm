# Parent Identity Audit

## Current Identity Paths

- **Mobile auth (phone-based)**  
  - Endpoint: `src/app/api/parent/mobile/auth/verify/route.ts`.  
  - Идентификатор родителя: нормализованный `phone` (строка без спецсимволов).  
  - Логика:
    - По `ParentInvite.phone` ищет/создаёт `Parent` через `findUnique({ where: { phone } })` + `create`.
    - Если инвайтов нет — создаёт/находит `Parent` через `upsert({ where: { phone }, create: { firstName, lastName, phone }, update: {} })`.
    - Далее все связи с `Player` идут через `parent.id`.

- **Hockey-server auth (email/password-based)**  
  - Файл: `hockey-server/controllers/authController.js`.  
  - Идентификатор родителя: `email` + `password` (classic login).  
  - Логика:
    - `register`: `findUnique({ where: { email } })`, затем `create({ email, password })` — без `phone`.
    - `login`: `findUnique({ where: { email } })`, сравнение `password`, выдача JWT.
    - В этом потоке `Parent` может существовать без `phone`.

- **CRM demo login (email/password demo)**  
  - Файл: `src/app/api/auth/login/route.ts`.  
  - Основной пользователь — demo, но для роли `PARENT` дополнительно:
    - Ищет `Parent` через `findFirst({ where: { email } })` по `demo`-email.
    - Берёт `parent.id` как `parentId` для CRM-сессии.

- **Связанные сервисы**  
  - Notifications: `src/lib/notifications.ts` — ищет `Parent` по `id` (`findUnique({ where: { id: parentId } })`), использует `email` и `pushToken`.  
  - Push register: `src/app/api/parent/push/register/route.ts` — получает `parentId` из `x-parent-id`, валидирует через `findUnique({ where: { id } })`, не использует `phone`.
  - Seed-скрипты: `prisma/seed.ts`, `scripts/seed-full.js` — создают демо-родителей с заполненными `phone` и `email`.

## Places Where Parent Is Created

- `src/app/api/parent/mobile/auth/verify/route.ts`
  - В `processPendingInvites(phone)`:
    - Если нет существующего родителя по `phone`, создаётся:
      - `firstName: "Родитель"`,
      - `lastName`: фамилия игрока из инвайта или хвост `phone`,
      - `phone`.
  - В основной части verify:
    - Если `processPendingInvites` не создал родителя:
      - `upsert({ where: { phone }, create: { firstName: "Родитель", lastName: tail(phone), phone }, update: {} })`.
    - Всегда создаёт родителя с непустым `phone`.

- `hockey-server/controllers/authController.js`
  - `register`:
    - `create({ email, password: hashed })`.
    - `phone` и `name` не заданы → `Parent` без `phone` допустим и реально создаётся.

- `prisma/seed.ts`
  - Demo `Parent` для `parent@example.com`:
    - `create({ firstName, lastName, email, phone })`.
  - Demo `Parent` “Юрий Голыш”:
    - `create({ firstName, lastName, phone, email })`.

- `scripts/seed-full.js`
  - Demo родитель в Казани:
    - `create({ firstName, lastName, email, phone })`.

## Places Where Parent Is Queried

- **По `phone`**
  - `src/app/api/parent/mobile/auth/verify/route.ts`:
    - `findUnique({ where: { phone } })` в `processPendingInvites`.
    - `upsert({ where: { phone } ... })` в основной verify-логике.
  - `prisma/seed.ts`:
    - `findFirst({ where: { phone: { contains: "9001234567" } } })` для поиска demo-родителя Юрия.

- **По `email`**
  - `hockey-server/controllers/authController.js`:
    - `findUnique({ where: { email } })` для `register` и `login`.
  - `src/app/api/auth/login/route.ts`:
    - `findFirst({ where: { email } })` при логине CRM demo-родителя, чтобы получить `parentId`.
  - `prisma/seed.ts`, `scripts/seed-full.js`:
    - `findFirst({ where: { email } })` для демо-родителя (в seed-full — через имя/фамилию, но создаётся с email).

- **По `id`**
  - `src/app/api/parent/push/register/route.ts`:
    - `findUnique({ where: { id: parentId } })` из `x-parent-id` заголовка.
  - `src/lib/notifications.ts`:
    - В `sendNotificationDelivery`: `findUnique({ where: { id: notif.parentId } })`, берёт `email` и `pushToken`.
  - `hockey-server/server.js`:
    - `prisma.parent.count()` — просто счётчик, без фильтров.

## Risks / Inconsistencies

- **Две независимые identity-модели**
  - Mobile auth:
    - Считает `phone` каноническим идентификатором родителя.
    - Требует валидный `phone` и всегда создаёт `Parent` с заполненным `phone`.
  - Hockey-server auth:
    - Использует `email` + `password` как identity.
    - Создаёт `Parent` без `phone`, а `phone` остаётся опциональным.

- **`Parent.phone` уникален, но не обязателен**
  - В `schema.prisma`: `phone String? @unique`.
  - Это означает:
    - Mobile auth полагается на уникальный `phone` как на identity.
    - Hockey-server и seed-скрипты допускают `Parent` без `phone`.

- **Несогласованность полей в разных потоках**
  - Mobile auth не знает об `email`/`password` и опирается только на `phone`.
  - Hockey-server не знает о mobile phone auth и создаёт родителей только по `email/password`.
  - Потенциально один и тот же реальный родитель может получить:
    - одну запись Parent по телефону (через mobile auth),
    - другую запись Parent по email/password (через hockey-server), если данные не синхронизированы.

- **Связанные сервисы завязаны на `id`, но не на общую identity-политику**
  - Notifications и push-registration используют только `parentId`.  
  - Кто именно создаёт `Parent` и по каким полям он найден — зависит от пути (mobile vs hockey-server), что усложняет консистентность профиля.

## Recommended Next Refactor Order

1. **Явно зафиксировать canonical identity поля Parent**
   - Решить, должны ли `phone` и/или `email` быть обязательными и уникальными для всех потоков.
2. **Унифицировать правила создания Parent**
   - Привести `hockey-server/controllers/authController.js` к политике, совместимой с mobile auth (например, требовать/сохранять `phone`, если он есть, или ввести понятную стратегию связывания email-only родителей с phone-based родителями).
3. **Развести или согласовать роли email-based и phone-based auth**
   - Чётко описать, когда используется login по email/password, а когда по телефону, и как они могут ссылаться на один и тот же Parent.
4. **Только после этого решать required/nullability в Prisma**
   - Когда все потоки создания Parent будут совместимы, можно безопасно переводить `phone` (и/или `email`) в `required` и ужесточать схему.
5. **Добавить точечные миграции/cleanup для выравнивания данных**
   - Проверить `Parent` с `phone IS NULL` и потенциальные дубликаты по `phone`/`email`, ручным скриптом вычистить их, затем применить миграции.

