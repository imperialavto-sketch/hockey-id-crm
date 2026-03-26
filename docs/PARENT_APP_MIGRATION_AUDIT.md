# Parent-App Migration Audit

## CURRENT PARENT-APP API MAP

| Feature | Service/Screen | Endpoint | Current Backend | Status | Notes |
|---------|----------------|----------|-----------------|--------|-------|
| Auth OTP | authService | POST /api/parent/mobile/auth/request-code | Next.js | works | |
| Auth verify | authService | POST /api/parent/mobile/auth/verify | Next.js | works | |
| Auth logout | authService | POST /api/parent/mobile/auth/logout | Next.js | works | |
| Me profile | subscriptionService | GET /api/me | Next.js | works | Alias added |
| Schedule | scheduleService | GET /api/me/schedule | Next.js | works | Alias added |
| Players list | playerService | GET /api/me/players | Next.js | works | Alias added |
| Player detail | playerService | GET /api/me/players/:id | Next.js | works | Alias added |
| Create player | playerService | POST /api/me/players | Next.js | works | Alias added |
| Player stats | playerService | GET /api/players/:id/stats | Next.js | incompatible | CRM route requires coach; parent uses different path |
| Player recommendations | playerService | GET /api/parent/mobile/player/:id/recommendations | Next.js | works | |
| Player full-profile | playerService | (composite) | Next.js | works | Uses me/players, schedule, stats, recommendations |
| Player AI analysis | playerService | GET /api/ai-analysis/:playerId | hockey-server / Next.js | path mismatch | Next.js: /api/player/:id/ai-analysis |
| Subscription status | subscriptionService | GET /api/me/subscription/status | Next.js | works | Alias added |
| Subscription history | subscriptionService | GET /api/me/subscription/history | Next.js | works | Alias added |
| Subscription plans | subscriptionService | GET /api/subscription/plans | Next.js | works | |
| Create subscription | subscriptionService | POST /api/subscription | Next.js | works | |
| Cancel subscription | subscriptionService | POST /api/subscription/cancel | Next.js | works | |
| Feed list | feedService | GET /api/feed | Next.js | works | Bearer auth, x-parent-id ignored |
| Feed post | feedService | GET /api/feed/:id | Next.js | works | |
| Chat list | chatService | GET /api/chat/conversations | Next.js | works | Bearer auth |
| Create conversation | chatService | POST /api/chat/conversations | Next.js | works | |
| Chat messages | chatService | GET /api/chat/conversations/:id/messages | Next.js | works | |
| Send message | chatService | POST /api/chat/conversations/:id/messages | Next.js | works | |
| Coach Mark conversation | chatService | GET /api/chat/ai/conversation | hockey-server | absent | Next.js has /api/chat/ai/message only |
| Coach Mark message | chatService | POST /api/chat/ai/message | Next.js | works | |
| Notifications | notificationService | GET /api/notifications?parentId= | Next.js | security risk | parentId from query, no auth |
| Mark read | notificationService | POST /api/notifications/:id/read | Next.js | check | |
| Push register | usePushNotifications | POST /api/parent/push/register | Next.js | works | Bearer used |
| Marketplace coaches | marketplaceService | GET /api/marketplace/coaches | Next.js | works | Public |
| Marketplace coach | marketplaceService | GET /api/marketplace/coaches/:id | Next.js | works | |
| Coach slots | marketplaceService | GET /api/marketplace/coaches/:id/slots | hockey-server | absent | Next.js has no slots route |
| Booking request | marketplaceService | POST /api/marketplace/booking-request | Next.js | works | |
| Team posts | teamService | GET /api/team/posts | absent | 404 | Next.js has /api/feed, not team/posts |
| Team post | teamService | GET /api/team/posts/:id | absent | 404 | |
| Team members | teamService | GET /api/team/members | absent | 404 | |
| Team messages | teamService | GET /api/team/messages | absent | 404 | |
| Bookings list | bookingService | GET /api/bookings | absent | 404 | Next.js has marketplace/booking-request |
| Create booking | bookingService | POST /api/bookings | absent | 404 | |
| Payment intent | bookingService | POST /api/bookings/create-payment-intent | absent | 404 | |
| Confirm booking | bookingService | POST /api/bookings/confirm | absent | 404 | |
| My bookings | bookingService | GET /api/bookings/my | absent | 404 | |
| Video upload | videoAnalysisService | POST /api/video/upload | Next.js | works | |
| Video analysis | videoAnalysisService | GET /api/parent/mobile/player/:id/video-analysis | Next.js | works | |
| Video analysis by id | videoAnalysisService | GET /api/video-analysis/:id | Next.js | works | |
| Retry analysis | videoAnalysisService | POST /api/video-analysis/:id/retry | Next.js | works | |

---

## ALREADY ALIGNED

- GET /api/me
- GET /api/me/schedule
- GET /api/me/players
- GET /api/me/players/:id
- POST /api/me/players
- GET /api/me/subscription/status
- GET /api/me/subscription/history
- POST /api/subscription
- POST /api/subscription/cancel
- GET /api/subscription/plans
- POST /api/parent/mobile/auth/*
- GET /api/feed
- GET /api/feed/:id
- GET/POST /api/chat/conversations
- GET/POST /api/chat/conversations/:id/messages
- POST /api/chat/ai/message
- POST /api/parent/push/register
- GET /api/marketplace/coaches
- GET /api/marketplace/coaches/:id
- POST /api/marketplace/booking-request
- GET /api/parent/mobile/player/:id/recommendations
- Video analysis routes (parent/mobile, video/upload, retry)

---

## NEEDS ALIAS

| Endpoint | Parent-app uses | Next.js has | Action |
|----------|-----------------|-------------|--------|
| GET /api/players/:id/stats | playerService.getPlayerStats | /api/parent/mobile/player/:id/stats (different path) | Alias or support PARENT in players/stats |
| GET /api/ai-analysis/:playerId | playerService.getAIAnalysis | /api/player/:id/ai-analysis | Alias /api/ai-analysis/:playerId → proxy |

---

## NEEDS REAL IMPLEMENTATION

| Endpoint | Used by | Notes |
|----------|---------|-------|
| GET /api/notifications | notificationService | Exists but uses parentId from query — needs auth, parentId from token |
| POST /api/notifications/:id/read | notificationService | No auth — anyone can mark any notification read |
| GET /api/team/posts | teamService | 404 — Next.js has feed; team posts may map to feed or need new route |
| GET /api/team/posts/:id | teamService | 404 |
| GET /api/team/members | teamService | 404 |
| GET /api/team/messages | teamService | 404 |
| GET /api/bookings | bookingService | 404 |
| POST /api/bookings | bookingService | 404 |
| POST /api/bookings/create-payment-intent | bookingService | 404 |
| POST /api/bookings/confirm | bookingService | 404 |
| GET /api/bookings/my | bookingService | 404 |
| GET /api/marketplace/coaches/:id/slots | marketplaceService | absent in Next.js |

---

## LEGACY / UNUSED

- x-parent-id: ещё используется в feedService, bookingService, marketplaceService, teamService, videoAnalysisService, usePushNotifications, chatService. При Bearer auth Next.js его игнорирует. После полной миграции можно удалить.
- POST /api/auth/login, POST /api/auth/register — parent-app использует OTP flow, не email/password. Можно оставить для совместимости.
- teamService — использует /api/team/*, которых нет. Fallback на mock в __DEV__. Экраны с team posts/members/messages не работают в live.

---

## PRIORITY ORDER

### PRIORITY 1 — Core parent flow

1. **GET /api/notifications** — перевести на Bearer, parentId из auth (сейчас security risk).
2. **GET /api/players/:id/stats** — поддержать PARENT (alias или branch в route).
3. **GET /api/ai-analysis/:playerId** — alias на /api/player/:id/ai-analysis.

### PRIORITY 2 — Coach Mark, marketplace

4. **GET /api/chat/ai/conversation** — реализовать (Coach Mark history).
5. **GET /api/marketplace/coaches/:id/slots** — реализовать (booking flow).

### PRIORITY 3 — Team, bookings

6. **teamService** — /api/team/posts, members, messages: решить — маппинг на feed или новые routes.
7. **bookings** — /api/bookings/*: полная реализация или переключение на marketplace/booking-request.

---

## SAFE NEXT STEP

**Fix GET /api/notifications** — брать parentId из auth вместо query:

1. Добавить getAuthFromRequest.
2. Проверять PARENT и user.parentId.
3. Использовать user.parentId в запросе к БД.
4. Удалить parentId из query или игнорировать.

Минимальный, изолированный шаг, устраняет security risk.

---

## CHANGED FILES IF IMPLEMENTED NOW

No code changes, analysis only.
