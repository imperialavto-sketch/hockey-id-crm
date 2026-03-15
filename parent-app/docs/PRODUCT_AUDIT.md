# Hockey ID Parent App — Product Audit

Полный аудит текущего состояния продукта parent-app.

---

## 1. App Structure

### Routes & Screens

| Route | File | Description |
|-------|------|-------------|
| `/` | app/index.tsx | Redirect: auth → tabs, unauth → login |
| `/(auth)/login` | app/(auth)/login.tsx | Логин по коду из SMS |
| `/(tabs)` | app/(tabs)/_layout.tsx | Tab navigator |
| `/(tabs)` (default) | app/(tabs)/index.tsx | Главная |
| `/(tabs)/feed` | app/(tabs)/feed.tsx | Лента (список постов) |
| `/(tabs)/marketplace` | app/(tabs)/marketplace.tsx | Тренеры (таб) |
| `/(tabs)/player` | app/(tabs)/player/index.tsx | Карточка игрока |
| `/(tabs)/player/recommendations` | app/(tabs)/player/recommendations.tsx | Рекомендации |
| `/(tabs)/schedule` | app/(tabs)/schedule.tsx | Расписание |
| `/(tabs)/profile` | app/(tabs)/profile.tsx | Профиль |
| `/(tabs)/chat` | app/(tabs)/chat.tsx | Список чатов |
| `/(tabs)/payments` | app/(tabs)/payments.tsx | Платежи (href: null — скрыт из таб-бара) |
| `/(tabs)/player` | app/(tabs)/player/_layout.tsx | Layout для player tab |
| `/chat` | app/chat/index.tsx | Список чатов (stack) |
| `/chat/[id]` | app/chat/[id].tsx | Диалог |
| `/feed/[id]` | app/feed/[id].tsx | Публикация |
| `/player/[id]` | app/player/[id]/index.tsx | Профиль игрока |
| `/player/[id]/passport` | app/player/[id]/passport.tsx | Паспорт игрока |
| `/player/[id]/development` | app/player/[id]/development.tsx | Развитие |
| `/player/[id]/development-plan` | app/player/[id]/development-plan.tsx | План развития |
| `/player/[id]/ai-report` | app/player/[id]/ai-report.tsx | AI отчёт |
| `/player/[id]/video-analysis` | app/player/[id]/video-analysis/index.tsx | Видео-анализ (список) |
| `/player/[id]/video-analysis/upload` | app/player/[id]/video-analysis/upload.tsx | Загрузка видео |
| `/player/[id]/video-analysis/success` | app/player/[id]/video-analysis/success.tsx | Успешная загрузка |
| `/player/[id]/video-analysis/[analysisId]` | app/player/[id]/video-analysis/[analysisId].tsx | Результат анализа |
| `/marketplace` | app/marketplace/index.tsx | Redirect → coaches |
| `/marketplace/coaches` | app/marketplace/coaches.tsx | Список тренеров |
| `/marketplace/packages` | app/marketplace/packages.tsx | Пакеты тренировок |
| `/marketplace/coach/[id]` | app/marketplace/coach/[id]/index.tsx | Карточка тренера |
| `/marketplace/coach/[id]/booking` | app/marketplace/coach/[id]/booking.tsx | Бронирование |
| `/marketplace/coach/[id]/checkout` | app/marketplace/coach/[id]/checkout.tsx | Оформление |
| `/marketplace/booking-success` | app/marketplace/booking-success.tsx | Успешная бронь |
| `/marketplace/[id]` | app/marketplace/[id].tsx | Альтернативная карточка тренера (API) |
| `/bookings` | app/bookings/index.tsx | Мои бронирования |
| `/profile` | app/profile/_layout.tsx | Profile stack |
| `/profile/billing` | app/profile/billing.tsx | Подписка и оплаты |
| `/subscription` | app/subscription/index.tsx | Выбор подписки |
| `/subscription/success` | app/subscription/success.tsx | Подписка активирована |
| `/subscription/membership` | app/subscription/membership.tsx | Membership план |
| `/team/feed` | app/team/feed.tsx | Командная лента |
| `/team/chat` | app/team/chat.tsx | Командный чат |
| `/team/members` | app/team/members.tsx | Участники |
| `/team/create-post` | app/team/create-post.tsx | Создать пост |
| `/team/announcement/[id]` | app/team/announcement/[id].tsx | Объявление |

### Tab Screens (7 видимых + 1 скрытый)

| Tab | Route | Label |
|-----|-------|-------|
| index | (tabs)/index | Главная |
| feed | (tabs)/feed | Лента |
| marketplace | (tabs)/marketplace | Тренеры |
| player | (tabs)/player | Игрок |
| schedule | (tabs)/schedule | План |
| profile | (tabs)/profile | Профиль |
| chat | (tabs)/chat | Чат |
| payments | (tabs)/payments | (href: null, скрыт) |

### Layout Files

- `app/_layout.tsx` — Root, AuthProvider, SubscriptionProvider
- `app/(auth)/_layout.tsx` — Auth stack
- `app/(tabs)/_layout.tsx` — Tabs
- `app/(tabs)/player/_layout.tsx` — Player tab
- `app/chat/_layout.tsx` — Chat stack
- `app/feed/_layout.tsx` — Feed stack
- `app/player/_layout.tsx` — Player stack
- `app/player/[id]/_layout.tsx` — Player detail
- `app/player/[id]/video-analysis/_layout.tsx` — Video analysis
- `app/marketplace/_layout.tsx` — Marketplace stack
- `app/marketplace/coach/[id]/_layout.tsx` — Coach detail
- `app/profile/_layout.tsx` — Profile stack
- `app/subscription/_layout.tsx` — Subscription stack
- `app/bookings/_layout.tsx` — Bookings stack
- `app/team/_layout.tsx` — Team stack

---

## 2. Modules

### Player
- **Экраны**: (tabs)/player, player/[id], passport, development, development-plan, ai-report, video-analysis (list, upload, success, [analysisId])
- **Компоненты**: HeroPlayerCard, PremiumStatGrid, SectionCard, AchievementBadge, ProgressTimelineCard, SharePlayerSheet
- **Сервисы**: playerService, videoAnalysisService

### Marketplace
- **Экраны**: (tabs)/marketplace, marketplace/coaches, coach/[id], booking, checkout, packages, booking-success, [id]
- **Компоненты**: CoachCard, CoachHero, CoachFilters, CoachTrustSection, BookingDatePicker, TimeSlotPicker
- **Сервисы**: bookingService, bookingService.mock (checkout использует mock)

### Feed
- **Экраны**: (tabs)/feed, feed/[id]
- **Компоненты**: FeedPostCard, EmptyState
- **Сервисы**: feedService

### Team
- **Экраны**: team/feed, team/chat, team/members, team/create-post, team/announcement/[id]
- **Компоненты**: TeamHeader, CoachAnnouncementCard, TeamChatMessage, MessageInput
- **Сервисы**: нет (всё mock)

### Chat
- **Экраны**: (tabs)/chat, chat/index, chat/[id]
- **Компоненты**: нет специфичных
- **Сервисы**: chatService

### Profile
- **Экраны**: (tabs)/profile, profile/billing
- **Компоненты**: PremiumCard, PremiumBlock, SecondaryButton
- **Сервисы**: SubscriptionContext (mock)

### Subscription
- **Экраны**: subscription, subscription/success, subscription/membership
- **Компоненты**: PlanCard, SubscriptionHero, PricingToggle, CurrentPlanCard, BillingHistoryCard
- **Сервисы**: SubscriptionContext (mock)

### Booking
- **Экраны**: bookings/index, marketplace/coach/[id]/booking, marketplace/coach/[id]/checkout, marketplace/booking-success
- **Компоненты**: BookingStatusBadge, EmptyBookingsState, BookingSummaryCard
- **Сервисы**: bookingService, bookingService.mock

### Video Analysis
- **Экраны**: player/[id]/video-analysis/* (index, upload, success, [analysisId])
- **Компоненты**: VideoAnalysisHeader, AnalysisEmptyState
- **Сервисы**: videoAnalysisService, video-analysis-processor

### Schedule
- **Экраны**: (tabs)/schedule
- **Сервисы**: scheduleService

---

## 3. User Flows

### Auth
```
Index → (auth)/login → (tabs)
```

### Player
```
(tabs) → player → player/[id]
  → passport
  → development
  → development-plan
  → ai-report
  → video-analysis → upload → success → [analysisId]
  → Chat with coach → chat/[id]
```

### Marketplace (mock flow)
```
(tabs)/marketplace → marketplace/coaches → coach/[id]
  → booking → checkout → booking-success
  → bookings
```

### Feed
```
(tabs)/feed → feed/[id]
  → team/feed (empty state CTA)
```

### Team
```
team/feed
  → team/chat
  → team/members
  → team/create-post
  → team/announcement/[id]
```

### Chat
```
(tabs)/chat → chat/[id]
player/[id] → Chat with coach → chat/[id]
team/feed → team/chat
```

### Profile
```
(tabs)/profile
  → profile/billing
  → subscription → success → profile/billing
  → bookings
  → logout → login
```

---

## 4. Working vs Mock

| Модуль | Статус | Примечания |
|--------|--------|------------|
| Player profile | API + mock fallback | playerService, fallback только в DEV |
| Player passport | API + mock fallback | getFullPlayerProfile |
| Player development | Mock | MOCK_DEVELOPMENT_TIMELINE |
| Player development-plan | Mock | MOCK_DEVELOPMENT_PLAN |
| Player ai-report | Mock | MOCK_AI_REPORT |
| Player video-analysis | API + local/mock | Offline-first, AsyncStorage + MOCK_VIDEO_ANALYSIS |
| Marketplace coaches | **Mock only** | MOCK_COACHES |
| Marketplace coach/[id] | **Mock only** | MOCK_COACHES, MOCK_COACH_REVIEWS |
| Marketplace [id] | API | marketplaceService — альтернативный маршрут |
| Booking flow | **Mock** | mockCreateBooking, mockConfirmBooking в checkout |
| Bookings list | API + mock fallback | getMyBookings, mock fallback в DEV |
| Feed | API | feedService, throws на ошибке |
| Feed post | API | feedService |
| Chat list | API | chatService, error + retry |
| Chat detail | API | sendMessage, error feedback |
| Team feed | **Mock only** | MOCK_TEAM_POSTS, MOCK_TEAM_EVENTS |
| Team chat | **Mock only** | MOCK_TEAM_MESSAGES |
| Team members | **Mock only** | MOCK_TEAM_MEMBERS |
| Team create-post | UI only | mock submit + success + redirect |
| Subscription | **Mock only** | SubscriptionContext, MOCK_BILLING_HISTORY |
| Schedule | API + mock fallback | scheduleService |
| Profile / Billing | Mock | SubscriptionContext |
| Payments tab | **Mock only** | mockPayments |
| Auth | API | authService |

---

## 5. API Usage

| Endpoint | Service | Screens | Fallback |
|----------|---------|---------|----------|
| POST /api/parent/mobile/auth/request-code | authService | login | — |
| POST /api/parent/mobile/auth/verify | authService | login | — |
| POST /api/parent/mobile/auth/logout | authService | profile | — |
| GET /api/parent/mobile/players | playerService | profile | mockPlayers (DEV) |
| GET /api/parent/mobile/player/:id | playerService | — | mock |
| GET /api/parent/mobile/player/:id/full-profile | playerService | player/[id], passport | MOCK_FULL_PROFILE (DEV) |
| GET /api/parent/mobile/player/:id/stats | playerService | — | mock |
| GET /api/parent/mobile/player/:id/recommendations | playerService | — | mock |
| GET /api/player/:id/ai-analysis | playerService | ai-report | null |
| GET /api/parent/mobile/player/:id/schedule | scheduleService | player (full-profile) | mock |
| GET /api/parent/mobile/schedule | scheduleService | schedule | mockWeeklySchedule |
| GET /api/feed | feedService | (tabs)/feed | throws |
| GET /api/feed/:id | feedService | feed/[id] | throws |
| GET /api/chat/conversations | chatService | chat list | throws |
| POST /api/chat/conversations | chatService | player openChat | null |
| GET /api/chat/conversations/:id/messages | chatService | chat/[id] | throws |
| POST /api/chat/conversations/:id/messages | chatService | chat/[id] | null |
| POST /api/bookings | bookingService | checkout (API path) | — |
| POST /api/bookings/create-payment-intent | bookingService | checkout | — |
| POST /api/bookings/confirm | bookingService | checkout | — |
| GET /api/bookings/my | bookingService | bookings | [] |
| POST /api/video-analysis/create-upload | videoAnalysisService | upload | local fallback |
| POST /api/video-analysis/mark-uploaded | videoAnalysisService | upload | local |
| POST /api/video-analysis/start-processing | videoAnalysisService | upload | local |
| GET /api/video-analysis/player/:id | videoAnalysisService | video-analysis | local |
| GET /api/video-analysis/:id | videoAnalysisService | [analysisId] | local |
| POST /api/video-analysis/:id/retry | videoAnalysisService | — | local |
| GET /api/marketplace/coaches | marketplaceService | marketplace/[id] flow | — |
| GET /api/marketplace/coaches/:id | marketplaceService | marketplace/[id] | — |
| POST /api/marketplace/booking-request | marketplaceService | marketplace/[id] | — |
| POST /api/parent/push/register | hooks/usePushNotifications | DeferredPushSetup | — |

**Примечание**: checkout в marketplace/coach/[id] использует `mockCreateBooking`, `mockCreatePaymentIntent`, `mockConfirmBooking` — не вызывает bookingService API.

---

## 6. Mock Data

| Mock Source | File | Used In |
|-------------|------|---------|
| MOCK_COACHES | constants/mockCoaches.ts | marketplace, coach/[id], booking, checkout, bookingService.mock |
| MOCK_COACH_REVIEWS | constants/mockCoachReviews.ts | coach/[id] |
| MOCK_TIME_SLOTS, DURATION_OPTIONS, FORMAT_LABELS | constants/mockTimeSlots.ts | coach/[id]/booking |
| MOCK_TEAM_POSTS, MOCK_TEAM_NAME | constants/mockTeamPosts.ts | team/feed, team/announcement, team/chat, team/members |
| MOCK_TEAM_EVENTS | constants/mockTeamEvents.ts | team/feed |
| MOCK_TEAM_MEMBERS | constants/mockTeamMembers.ts | team/members |
| MOCK_TEAM_MESSAGES | constants/mockTeamMessages.ts | team/chat |
| MOCK_VIDEO_ANALYSIS_REQUESTS/RESULTS | data/mockVideoAnalyses.ts | videoAnalysisService, video-analysis-processor |
| mockPlayers | mocks/players.ts | playerService (fallback) |
| mockPlayerStats | mocks/stats.ts | playerService (fallback) |
| mockRecommendations | mocks/recommendations.ts | playerService (fallback) |
| mockPlayerSchedule, mockWeeklySchedule | mocks/schedule.ts | scheduleService, playerService |
| mockGetMyBookings, mockCreateBooking, mockCreatePaymentIntent, mockConfirmBooking | services/bookingService.mock.ts | bookings, coach/[id]/checkout |
| MOCK_FULL_PROFILE | playerService.ts | getFullPlayerProfile (fallback) |
| MOCK_BILLING_HISTORY | constants/mockBillingHistory.ts | SubscriptionContext |
| SUBSCRIPTION_PLANS | constants/mockPlans.ts | subscription |
| MEMBERSHIP_PLANS | constants/mockPlans.ts | subscription/membership |
| MOCK_DEVELOPMENT_PLAN | constants/mockDevelopmentPlan.ts | development-plan |
| MOCK_AI_REPORT | constants/mockAiReport.ts | ai-report |
| MOCK_DEVELOPMENT_TIMELINE | constants/mockDevelopmentTimeline.ts | development |
| MOCK_PLAYER_*, ATTRIBUTE_LABELS | constants/mockPlayer.ts | playercard components |
| MOCK_DYNAMIC_CARD, ATTRIBUTE_LABELS | constants/mockDynamicCard.ts | DynamicPlayerCard |
| PLAYER_MARK_GOLYSH, PLAYER_AGE | constants/mockPlayerMarkGolysh.ts | множество экранов игрока |
| mockPayments | constants/mockData.ts | (tabs)/payments |
| mockRecommendations | constants/mockData.ts | (tabs)/player/recommendations |
| PLAYER_CARD | constants/mockPlayer.ts | (tabs)/player |
| TRAINING_PACKAGES | constants/mockPackages.ts | marketplace/packages |
| mockPlayerProfile, mockUpcomingTraining, mockAIInsight | constants/playerMock.ts | demoPlayer |
| MOCK_PLAYER_CONTEXT | lib/coach-matching.ts | matchCoachesToPlayer |

---

## 7. Feature Status

| Feature | Status | Notes |
|---------|--------|-------|
| Login / Auth | Ready | API |
| Player profile | Ready | API + fallback |
| Player passport | Ready | API + fallback |
| Player development | Mock | MOCK_DEVELOPMENT_TIMELINE |
| Player development-plan | Mock | MOCK_DEVELOPMENT_PLAN |
| AI report | Mock | MOCK_AI_REPORT |
| Video analysis | Mock + local | API fallback → local, mock results |
| Marketplace coaches | Mock | MOCK_COACHES |
| Coach detail | Mock | MOCK_COACHES |
| Booking flow | Mock | mockCreateBooking etc. в checkout |
| Booking success | Working | UI + redirect |
| My bookings | API + fallback | getMyBookings |
| Feed | Ready | API |
| Feed post | Ready | API |
| Chat list | Ready | API + error/retry |
| Direct chat | Ready | API + send failure feedback |
| Team feed | Mock | MOCK_TEAM_POSTS |
| Team chat | Mock | MOCK_TEAM_MESSAGES |
| Team members | Mock | MOCK_TEAM_MEMBERS |
| Team create-post | UI | Mock submit + success |
| Schedule | Ready | API + mock fallback |
| Subscription | Mock | SubscriptionContext |
| Billing | Mock | MOCK_BILLING_HISTORY |
| Profile | Ready | Working |
| Share player | Working | SharePlayerSheet |
| Push notifications | Working | API register |

---

## 8. Unused / Dead Code

### Возможно неиспользуемые сервисы
- **achievementService** — нигде не импортируется (achievements приходят в full-profile)
- **progressService** — нигде не импортируется (progressHistory в full-profile)

### Скрытые / альтернативные маршруты
- **marketplace/[id]** — использует marketplaceService (API), но навигация идёт в coach/[id] (mock). Возможный вход через deep link или старый flow.
- **payments** — tab с `href: null`, скрыт из таб-бара.

### TODO в коде
- subscriptionService — все методы закомментированы (TODO)

---

## 9. Dev Only

| Элемент | Где | Описание |
|---------|-----|----------|
| setMockMode | profile/billing | Панель [DEV] Mock state (none, pro, elite, membership, package) |
| __DEV__ guards | lib/api, config/api, AuthContext | Логирование, предупреждения |
| console.time/timeEnd | _layout, tabs | Измерение времени старта |
| isDev | config/api | Условный mock fallback в playerService, bookings |

---

## 10. Product Summary

### A. Что работает хорошо
- Auth (login, logout)
- Player profile, passport (API + fallback)
- Feed (лента, пост)
- Chat (список, диалог, error/retry)
- Schedule (API + fallback)
- Profile, Billing UI
- Bookings list (API)
- Push notifications
- Share player

### B. Что работает на mock
- Marketplace (тренеры, карточка, бронирование, checkout)
- Team (лента, чат, участники, create-post)
- Subscription, Billing
- Player development, development-plan, AI report
- Video analysis (local simulation + mock results)
- Payments tab
- (tabs)/player recommendations

### C. Что требует real API
- Marketplace coaches + booking flow
- Team module
- Subscription + payments
- Video analysis (production pipeline)
- Доработка player development / AI report

### D. Что можно удалить или скрыть
- **payments** tab — скрыт, дублирует billing
- **achievementService**, **progressService** — не используются
- **marketplace/[id]** — при желании унифицировать с coach/[id]
- **(tabs)/player/recommendations** — отдельный экран на mockData

### E. Core Features продукта
1. Профиль игрока (статистика, паспорт)
2. Лента новостей
3. Чат с тренером
4. Расписание
5. Видео-анализ (в разработке)
6. Маркетплейс тренеров + бронирование (mock)
7. Команда (лента, чат, участники) (mock)
8. Подписка (mock)
