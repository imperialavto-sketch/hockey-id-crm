# Data Layer

Стратегия работы с API, mock-данными и fallback.

## API Config

- **config/api.ts** — единый источник `API_BASE_URL` и `isDev`
- `API_BASE_URL` читается из `EXPO_PUBLIC_API_URL` в `.env`
- `isDev` = `__DEV__` (true в режиме разработки)

## Mock Sources (источники mock-данных)

| Источник | Файл | Использование | API / Mock |
|----------|------|---------------|------------|
| MOCK_COACHES | constants/mockCoaches.ts | Маркетплейс, тренеры | Mock (нет API) |
| MOCK_TEAM_POSTS | constants/mockTeamPosts.ts | Team feed, объявления | Mock |
| MOCK_TEAM_EVENTS | constants/mockTeamEvents.ts | Ближайшие события | Mock |
| MOCK_TEAM_MEMBERS | constants/mockTeamMembers.ts | Участники команды | Mock |
| MOCK_TEAM_MESSAGES | constants/mockTeamMessages.ts | Team chat | Mock |
| MOCK_TIME_SLOTS | constants/mockTimeSlots.ts | Выбор слотов брони | Mock |
| MOCK_VIDEO_ANALYSIS_* | data/mockVideoAnalyses.ts | Видео-анализ (fallback) | API + fallback |
| mockPlayers | mocks/players.ts | Игроки (fallback) | API + fallback DEV |
| mockPlayerStats | mocks/stats.ts | Статистика (fallback) | API + fallback DEV |
| mockRecommendations | mocks/recommendations.ts | Рекомендации (fallback) | API + fallback DEV |
| mockPlayerSchedule | mocks/schedule.ts | Расписание (fallback) | API + fallback DEV |
| mockGetMyBookings | services/bookingService.mock.ts | Бронирования (fallback) | API + fallback DEV |
| MOCK_FULL_PROFILE | playerService.ts | Профиль игрока (fallback) | API + fallback DEV |
| MOCK_BILLING_HISTORY | constants/mockBillingHistory.ts | История платежей | Mock |
| MEMBERSHIP_PLANS, SUBSCRIPTION_PLANS | constants/mockPlans.ts | Подписки | Mock |
| MOCK_DEVELOPMENT_PLAN | constants/mockDevelopmentPlan.ts | План развития | Mock |
| MOCK_AI_REPORT | constants/mockAiReport.ts | AI отчёт | Mock |
| MOCK_PLAYER_* | constants/mockPlayer*.ts | Карточка игрока, атрибуты | Mock |
| MOCK_VIDEO_ANALYSIS_REQUESTS/RESULTS | data/mockVideoAnalyses.ts | Видео-анализ (local fallback) | API + local/mock fallback |
| MOCK_NOTIFICATIONS | constants/mockNotifications.ts | Уведомления (in-app list) | Mock (нет API) |

## DEV vs PROD

- **DEV** (`isDev` = true): допускается mock fallback при недоступности API
- **PROD**: только API, mock fallback не используется; ошибки не скрываются, UI показывает error state

## Error Handling

- **lib/apiErrors.ts** — `classifyApiError()`, `logApiError()`
- Ошибки логируются в `console` (в DEV)
- Сервисы: playerService, bookingService, videoAnalysisService — используют `logApiError` в catch

## Services

| Сервис | API | Fallback | Логирование |
|--------|-----|----------|-------------|
| feedService | Да | Нет (throws) | lib/api |
| playerService | Да | Mock только в DEV | logApiError |
| bookingService | Да | Нет (возвращает error в result) | logApiError |
| videoAnalysisService | Да | Local + mock (offline-first) | logApiError |
| notificationService | Нет | Mock (DEV) | — |
