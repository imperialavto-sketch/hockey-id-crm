# Preview Build Execution Checklist

Практический чеклист для первого preview build parent-app. Код не меняется.

---

## REQUIRED FRONTEND ENV

| Env | Обязательность | Описание |
|-----|-----------------|----------|
| `EXPO_PUBLIC_API_URL` | **Обязательно** | URL backend (например `https://api.hockey-id.ru`). Задать после deploy backend. localhost/127.0.0.1 не работают на устройстве. |
| `EXPO_PUBLIC_DEMO_MODE` | Опционально | В preview уже `false` в eas.json. Переопределить можно через EAS Secrets. |
| `EXPO_PUBLIC_EXPO_PROJECT_ID` | Опционально | Для push-уведомлений. Без него — build пройдёт, push не заработает. |

**Минимум для preview:** `EXPO_PUBLIC_API_URL` — задать в EAS Secrets или в профиле build env.

**Chat / Coach Mark AI:** hockey-server имеет `POST /api/chat/ai/message`. Требуется `OPENAI_API_KEY` в `.env` hockey-server (см. `hockey-server/.env.example`). Без ключа — 503 и сообщение «AI-ассистент временно недоступен».

---

## PRE-BUILD CHECK

1. **Assets:** В `parent-app/assets/` есть:
   - `icon.png` (1024×1024 px)
   - `splash.png` (1284×2778 px или 1242×2688 px)
   - Без них build упадёт.

2. **EXPO_PUBLIC_API_URL:** Задан и указывает на доступный backend (HTTPS для production).

3. **Backend:** hockey-server (или другой backend) задеплоен и отвечает на `/api/parent/mobile/auth/request-code`, `/verify`, `/players` и т.д.

4. **EAS CLI:** `eas build` доступен (`npm i -g eas-cli` или `npx eas-cli`).

5. **Expo account:** Залогинен (`eas login`).

6. **Config:** `npx expo config --type public` выполняется без ошибок (из `parent-app/`).

---

## BUILD COMMANDS

```bash
# 1. Перейти в parent-app
cd parent-app

# 2. Проверить config (опционально)
npx expo config --type public

# 3. Android preview (APK)
eas build --profile preview --platform android

# 4. iOS preview (требует Apple Developer)
eas build --profile preview --platform ios

# 5. Оба платформы
eas build --profile preview --platform all
```

После build ссылка на артефакт появится в терминале и в expo.dev.

---

## POST-INSTALL SMOKE CHECK

1. **Установка:** Скачать APK/IPA и установить на устройство.

2. **Запуск:** Приложение открывается, показывается splash, затем экран логина (или главный экран, если уже залогинен).

3. **Логин:** Ввести номер телефона → request-code → получить код (из логов backend в dev или по SMS в проде) → verify → успешный вход.

4. **Список игроков:** После входа отображается список игроков (или пустой список, если нет данных).

5. **Навигация:** Переход по табам (игроки, расписание и т.д.) без краша.

6. **API reachability:** Если backend недоступен — ожидаемо ошибка/пустые данные, не белый экран и не silent fail.

7. **Deep link (опционально):** `hockeyid://` открывает приложение (если настроено).

8. **Выход:** Logout работает, возврат на экран логина.

---

## GO/NO-GO

**GO** — build осмыслен, если:

- [ ] `EXPO_PUBLIC_API_URL` задан и backend доступен
- [ ] `icon.png` и `splash.png` лежат в `parent-app/assets/`
- [ ] Backend задеплоен и отвечает на auth/players
- [ ] EAS project создан, `eas build` выполняется без ошибок

**NO-GO** — отложить build, если:

- Backend не задеплоен (приложение будет показывать ошибки сети)
- Assets отсутствуют (build упадёт)
- `EXPO_PUBLIC_API_URL` не задан (приложение будет стучаться на localhost и не заработает на устройстве)
