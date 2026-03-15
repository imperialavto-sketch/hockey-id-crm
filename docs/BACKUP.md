# Резервное копирование Hockey ID

## Код (CRM и сервер)

Код сохраняется в Git. После инициализации репозитория:

```bash
git add .
git commit -m "Состояние CRM и hockey-server"
git remote add origin <URL вашего репозитория>
git push -u origin main
```

Рекомендуется регулярно пушить в удалённый репозиторий (GitHub, GitLab и т.д.).

## База данных (PostgreSQL)

У проекта две схемы БД:
- **Корневой Prisma** (`prisma/schema.prisma`) — CRM Next.js
- **hockey-server** (`hockey-server/prisma/schema.prisma`) — отдельный сервер (если используется)

### Быстрый бэкап (одна БД из .env)

```bash
chmod +x scripts/backup-database.sh
./scripts/backup-database.sh
```

Файл сохранится в `backups/hockey_crm_YYYYMMDD_HHMMSS.sql`.

### Ручной бэкап через pg_dump

```bash
pg_dump "$DATABASE_URL" --no-owner --no-acl -F p -f backup.sql
```

### Восстановление

```bash
psql "$DATABASE_URL" -f backup.sql
```

Или через Prisma (миграции + сиды при необходимости):

```bash
npx prisma migrate deploy
```
