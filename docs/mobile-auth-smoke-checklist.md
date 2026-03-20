# Mobile Auth Smoke Checklist

Ручная проверка mobile auth flow (request-code + verify) перед пилотом.

## Preconditions

- Backend запущен (Next.js API).
- Prisma/БД доступны (для verify: Parent, ParentPlayer, ParentInvite).
- Parent mobile app настроен на актуальный backend URL.
- В dev: код из request-code смотрим в server console.

## Test Cases

### 1. Request code — valid phone

- **Шаги:** POST `/api/parent/mobile/auth/request-code` с body `{ "phone": "79001234567" }` (или любой валидный номер).
- **Ожидаемый результат:** 200, body `{ "ok": true }`. В dev в логах — код для этого номера.

### 2. Request code — empty phone

- **Шаги:** POST с `{ "phone": "" }` или без phone / невалидный номер.
- **Ожидаемый результат:** 400, body `{ "error": "Введите номер телефона" }`.

### 3. Request code — rate limit

- **Шаги:** 4 запроса подряд на тот же номер с того же IP (после 3-го лимит исчерпан).
- **Ожидаемый результат:** 4-й запрос — 429, body `{ "error": "Слишком много запросов. Попробуйте позже" }`, header `Retry-After: <seconds>`.

### 4. Verify — empty phone

- **Шаги:** POST `/api/parent/mobile/auth/verify` с `{ "phone": "", "code": "123456" }`.
- **Ожидаемый результат:** 400, body `{ "error": "Введите номер телефона" }`.

### 5. Verify — empty code

- **Шаги:** POST с валидным phone и пустым/отсутствующим code.
- **Ожидаемый результат:** 400, body `{ "error": "Введите код подтверждения" }`.

### 6. Verify — invalid code

- **Шаги:** Сначала request-code для номера, затем verify с неверным кодом (например `000000`).
- **Ожидаемый результат:** 401, body `{ "error": "Неверный код" }`.

### 7. Verify — expired code

- **Шаги:** request-code для номера, подождать истечения TTL (5 минут), затем verify с тем же кодом.
- **Ожидаемый результат:** 410, body `{ "error": "Срок действия кода истёк" }`.

### 8. Verify — successful login

- **Шаги:** request-code, взять код из логов (dev), POST verify с этим phone и code.
- **Ожидаемый результат:** 200, body `{ "user": { "id", "phone", "name", "role": "PARENT", "parentId" } }`.

### 9. Verify — code reuse after success

- **Шаги:** После успешного verify (кейс 8) отправить тот же phone + code ещё раз.
- **Ожидаемый результат:** 401, body `{ "error": "Неверный код" }` (код уже consume-нут).

### 10. Verify — rate limit

- **Шаги:** Несколько неверных попыток verify для одного ip+phone (5 попыток за 10 минут).
- **Ожидаемый результат:** После исчерпания лимита — 429, body `{ "error": "Слишком много попыток. Попробуйте позже" }`, header `Retry-After: <seconds>`.

## Log Expectations

В server console ожидаются строки вида:

- `[auth][request-code] invalid phone` — пустой/невалидный phone.
- `[auth][request-code] rate limited` — превышен лимит запросов кода.
- `[auth][request-code] phone: ... code: ...` (только dev) или `[auth][request-code] code issued` — успешная выдача кода.
- `[auth][verify] missing phone` / `[auth][verify] missing code` — пустые поля.
- `[auth][verify] rate limited` — превышен лимит попыток verify.
- `[auth][verify] code expired` — код истёк по TTL.
- `[auth][verify] invalid code` — неверный или уже использованный код.
- `[auth][verify] success` — успешный вход (с parentId/phone/ip в логе).

## Notes

- **In-memory store:** коды и rate-limit счётчики живут только в памяти процесса; после рестарта сервера сбрасываются.
- **Без SMS provider:** в проде код не отправляется; для проверки в dev код берётся из server logs.
- Все ответы auth endpoints отдаются с `Cache-Control: no-store` (не кэшируются).
