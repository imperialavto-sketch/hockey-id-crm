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
4. **Обязательно** задайте `EXPO_PUBLIC_API_URL` в EAS Secrets — URL Next.js CRM (например `https://crm.hockey-id.ru`)
5. Соберите:
   - `eas build --profile preview` — для внутреннего теста (APK / internal)
   - `eas build --profile production` — для релиза (store)

Без `EXPO_PUBLIC_API_URL`: в **production** сборка падает при старте (требуется явный URL Next CRM). В **dev** по умолчанию используется `http://localhost:3000` (см. `config/api.ts`), либо `EXPO_PUBLIC_DEVICE_API_URL` на устройстве.

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
