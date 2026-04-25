# Резервное копирование Hockey ID

## Код (CRM и сервер)

Код сохраняется в Git. После инициализации репозитория:

```bash
git add .
git commit -m "Состояние репозитория (CRM / Next)"
git remote add origin <URL вашего репозитория>
git push -u origin main
```

Рекомендуется регулярно пушить в удалённый репозиторий (GitHub, GitLab и т.д.).

## База данных (PostgreSQL)

Каноническая схема БД — **корневой Prisma** (`prisma/schema.prisma`) для CRM Next.js. Ранее в репозитории существовал отдельный пакет `hockey-server/` с собственной Prisma; он **удалён** — не ожидайте второй схемы в этом дереве.

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
