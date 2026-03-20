# Hockey ID Parent App

Мобильное приложение для родителей хоккеистов. React Native + Expo.

## Запуск

**Важно:** запускайте команды из папки `parent-app`:

```bash
cd parent-app
npm install
npx expo start --web
```

Для iOS: `npx expo start --ios`  
Для Android: `npx expo start --android`

Далее откройте в симуляторе (i для iOS, a для Android) или отсканируйте QR-код в приложении Expo Go.

## Production build (EAS)

Для сборки через EAS Build:

1. Установите EAS CLI: `npm i -g eas-cli`
2. Войдите: `eas login`
3. Создайте проект: `eas build:configure` (если ещё не создан)
4. **Обязательно** задайте `EXPO_PUBLIC_API_URL` в EAS Secrets или в профиле build env — URL вашего production backend (например `https://api.hockey-id.ru`)
5. Соберите:
   - `eas build --profile preview` — для внутреннего теста (APK / internal)
   - `eas build --profile production` — для релиза (store)

Без `EXPO_PUBLIC_API_URL` приложение использует fallback: `https://hockey-server-api.onrender.com`.

## Структура

- **Login** — вход по email/паролю
- **Главная** — ребёнок, команда, тренер, ближайшая тренировка, статус оплаты
- **Ребёнок** — профиль игрока: фото, навыки, статистика, достижения, рекомендации
- **Расписание** — список тренировок
- **Оплаты** — список платежей и статусы
- **Чат** — сообщения с тренером

## Mock данные

- Игрок: Марк Голыш
- Команда: Хоккейная школа Казань
- Тренер: Сергей Мозякин

Для теста логина измените `isLoggedIn` в `app/index.tsx` на `false`.
