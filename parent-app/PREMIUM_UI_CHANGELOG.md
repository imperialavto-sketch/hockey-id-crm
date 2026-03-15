# Premium Dark UI — Changelog

## Дизайн-система

### constants/theme.ts
- **Цвета:** `#06122A`, `#081A35`, `#0A1F44` (фон); `#0E2347`, `#122B57` (поверхности); `#F5F7FB`, `#9FB0CC`, `#7283A2` (текст); `#2EA7FF`, `#19D1FF` (акценты)
- **Градиенты:** `gradients.bg`, `gradients.card`, `gradients.accentGlow`
- **Spacing:** 4, 8, 12, 16, 20, 24, 32
- **Radii:** 12, 16, 20, 24
- **Typography:** hero, h1, h2, section, body, bodySmall, caption, tab
- **Tab bar:** тёмный `#081A35`, акцент `#2EA7FF`
- **Карточки:** radius 20, padding 20, glass-стиль

---

## UI-компоненты (components/ui/)

| Компонент | Описание |
|-----------|----------|
| **Screen** | Экран с градиентом, StatusBar, SafeArea, ScrollView |
| **ScreenContainer** | Альтернатива Screen с тем же градиентом |
| **AppHeader** | Заголовок с кнопкой «назад» |
| **SectionHeader** | Заголовок секции + subtitle |
| **SectionTitle** | Алиас SectionHeader |
| **PremiumCard** | Карточка в glass-стиле |
| **Card** | Карточка (тёмная) |
| **StatCard** | Карточка статистики (value + label) |
| **PrimaryButton** | Высота 52, radius 16, акцент |
| **SecondaryButton** | Outline/glass-кнопка |
| **EmptyState** | Пустое состояние с иконкой, заголовком, кнопкой |
| **Pill** | Фильтр/pill в premium-стиле |

---

## Экраны

### Главная (app/(tabs)/index.tsx)
- Hero с фото игрока, именем, мета
- 3 StatCard (Голы, Передачи, Очки)
- PremiumCard «Команда»
- Секция «Развитие игрока» с прогрессом
- PrimaryButton «Открыть паспорт игрока»

### Лента (app/(tabs)/feed.tsx)
- Screen + заголовок
- EmptyState при отсутствии постов
- Карточки постов в dark premium
- Pull-to-refresh

### Расписание (app/(tabs)/schedule.tsx)
- Screen + SectionHeader
- EmptyState
- PremiumCard для событий
- Секции «Ближайшие», «На неделе»

### Чат (app/(tabs)/chat.tsx)
- Screen + заголовок
- EmptyState
- Список диалогов в dark premium

### Профиль (app/(tabs)/profile.tsx)
- Screen + PremiumCard профиля
- PremiumBlock (Hockey ID Premium)
- Меню (Уведомления, Подписка и т.д.)
- SecondaryButton «Выйти»

### Вход (app/(auth)/login.tsx)
- Dark gradient фон
- SafeArea
- PrimaryButton

### Tab bar
- Тёмный фон
- Подписи: Главная, Лента, Тренеры, Игрок, План, Профиль, Чат
- Короткие метки

---

## Изменённые файлы

- `constants/theme.ts` — новая premium dark палитра
- `components/ui/*` — Screen, AppHeader, SectionHeader, PremiumCard, StatCard, PrimaryButton, SecondaryButton, EmptyState, Pill, Card, SectionTitle
- `app/(tabs)/_layout.tsx` — tab bar
- `app/_layout.tsx` — фон, StatusBar
- `app/(tabs)/index.tsx` — главная
- `app/(tabs)/feed.tsx` — лента
- `app/(tabs)/schedule.tsx` — расписание
- `app/(tabs)/chat.tsx` — чат
- `app/(tabs)/profile.tsx` — профиль
- `app/(tabs)/marketplace.tsx` — градиент, Safe Area
- `app/(auth)/login.tsx` — dark theme
- `components/subscription/PremiumBlock.tsx` — dark theme
- `components/team/TeamHeader.tsx` — colors из theme
- `components/team/CoachAnnouncementCard.tsx` — акцент, русский

---

## Унификация

- **Фон:** один градиент `gradients.bg` на всех экранах
- **Карточки:** единый glass/card-стиль
- **Кнопки:** PrimaryButton / SecondaryButton
- **Заголовки:** SectionHeader / typography.section
- **Пустые состояния:** EmptyState
- **Safe Area:** edges ["top", "bottom"] везде
- **StatusBar:** light-content
- **Русский интерфейс** везде
