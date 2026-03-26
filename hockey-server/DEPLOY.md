# hockey-server deploy

Deploy на VPS / Render / Railway / Fly.io. OpenAI API работает из поддерживаемых регионов.

## Render — подробные шаги

### 1. Создать Web Service

1. [Render Dashboard](https://dashboard.render.com) → **New** → **Web Service**
2. Подключить репозиторий (GitHub/GitLab)
3. Выбрать `hockey-server` (или путь к папке backend)

### 2. Build & Start команды

| Field | Value |
|-------|-------|
| **Root Directory** | (пусто, если backend в корне) или `hockey-server` |
| **Runtime** | Node |
| **Build Command** | `npm ci && npx prisma generate` |
| **Start Command** | `npx prisma migrate deploy && npm start` |

### 3. Environment Variables

В **Environment** добавить:

| Key | Value | Secret |
|-----|-------|--------|
| `NODE_ENV` | `production` | no |
| `DATABASE_URL` | *(см. п.4)* | yes |
| `ALLOWED_ORIGINS` | `https://your-frontend.onrender.com` | no |
| `OPENAI_API_KEY` | `sk-...` | yes |
| `SMSC_LOGIN` | *(если нужна SMS)* | yes |
| `SMSC_PASSWORD` | *(если нужна SMS)* | yes |

**Не задавать** `DEV_AUTH` в production — иначе включатся dev fallbacks (x-coach-id, dev-token).

### 4. PostgreSQL на Render

1. **New** → **PostgreSQL**
2. Создать БД, скопировать **Internal Database URL**
3. Вставить в `DATABASE_URL` Web Service

### 5. Health Check

Render по умолчанию проверяет `/`. Рекомендуется:

- **Health Check Path:** `/api/health`
- Ожидаемый ответ: `{ "status": "ok" }`

### 6. Deploy

Нажать **Deploy**. После успешного старта:

```bash
curl https://YOUR-SERVICE.onrender.com/api/health
# {"status":"ok"}

curl https://YOUR-SERVICE.onrender.com/api/db/health
# {"ok":true,"record":{...}}
```

---

## Railway — кратко

1. **New Project** → Deploy from repo
2. Добавить **PostgreSQL** plugin (автоматически создаст `DATABASE_URL`)
3. **Variables:** `NODE_ENV=production`, `ALLOWED_ORIGINS=...`
4. **Deploy** — Railway сам запустит `npm start`
5. Добавить в `package.json` или **Nixpacks** build: `prisma generate` + `prisma migrate deploy`

---

## Env vars (reference)

| Variable | Required | Description |
|----------|----------|-------------|
| `NODE_ENV` | production | `production` для CORS и strict mode |
| `PORT` | no | Render/Railway задают сами |
| `DATABASE_URL` | yes | PostgreSQL connection string |
| `ALLOWED_ORIGINS` | production | CORS origins через запятую |
| `OPENAI_API_KEY` | for AI | OpenAI API key (Coach Mark) |
| `DEV_AUTH` | no | **Не ставить в production.** `true` = dev fallbacks |
| `SMSC_LOGIN` | for SMS | smsc.ru login |
| `SMSC_PASSWORD` | for SMS | smsc.ru password |
| `SMSC_SENDER` | no | smsc.ru sender |

## Install & Migrate (локально / CI)

```bash
npm ci
npx prisma generate
npx prisma migrate deploy
npm start
```

## Healthcheck

- **Liveness:** `GET /api/health` → `{ "status": "ok" }`
- **DB:** `GET /api/db/health` → `{ "ok": true, "record": {...} }`

## CORS

В production обязательно задать `ALLOWED_ORIGINS` с origin frontend (Expo web, мобильное приложение).
