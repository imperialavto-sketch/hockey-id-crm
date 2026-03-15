# Changelog: Унификация дизайна и русификация

## 1. constants/theme.ts — единая тема

**Цвета:**
- primary: #0A2540
- accent: #1B6FFF
- background: #F6F8FC
- card: #FFFFFF
- text: #0F172A
- textSecondary: #64748B

**Стандарты:**
- spacing: 4, 8, 12, 16, 20, 24, 32 (+ xs, sm, md, lg, xl, xxl для совместимости)
- borderRadius: sm 12, md 14, lg 16
- shadows.card для карточек
- typography: title, subtitle, body, caption

---

## 2. components/ui — переиспользуемые компоненты

- **ScreenContainer** — обёртка экрана с SafeArea и ScrollView
- **AppHeader** — шапка с кнопкой назад и заголовком
- **PrimaryButton** — высота 52, borderRadius 14, цвет #1B6FFF
- **Card** — borderRadius 16, padding 16, тень
- **SectionTitle** — заголовок секции

---

## 3. Обновлённые экраны

### app/(tabs)/index.tsx (Главная)
- Русский: Голы, Передачи, Очки; Катание, Бросок, Сила; Развитие игрока
- Использует ScreenContainer, Card, SectionTitle
- Тема: светлый фон, акцент #1B6FFF

### app/(auth)/login.tsx (Вход)
- Уже на русском
- PrimaryButton вместо Pressable
- Тема из constants/theme

### app/team/feed.tsx
- ScreenContainer + AppHeader
- Тема: colors.accent
- Убран LinearGradient, StatusBar (в корне)

### app/_layout.tsx
- contentStyle backgroundColor: #F6F8FC
- StatusBar style: dark (светлая тема)

### app/(tabs)/_layout.tsx
- tabBar: белый фон, #1B6FFF активная вкладка

---

## 4. Компоненты team

- **TeamHeader** — цвета из theme (colors.text, colors.textSecondary)
- **CoachAnnouncementCard** — "Объявление тренера" вместо "Coach Announcement"
- Цвет акцента #1B6FFF

---

## 5. Обратная совместимость в theme.ts

- textPrimary, cyan, neonBlue → #1B6FFF
- radius (sm, md, lg, xl, xxl, full)
- spacing (xs, sm, md, lg, xl, xxl) для старых компонентов

---

## 6. Что осталось

- Остальные экраны (player, marketplace, subscription и др.) используют старые цвета
- Постепенная миграция: подключать ScreenContainer, AppHeader, theme
- Компоненты в components/player, components/marketplace — адаптировать под светлую тему при необходимости
