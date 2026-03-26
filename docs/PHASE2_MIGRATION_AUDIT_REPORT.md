# Phase 2 Migration Audit Report

## PHASE 2 STATUS: COMPATIBILITY COMPLETE

All required exact Phase 2 compatibility endpoints are present in CRM (real or stub), so 404 gaps for the migration layer are closed.

## READY TO SWITCH

- `GET /api/feed` — real route, auth + Prisma.
- `GET /api/feed/[id]` — real route, auth + Prisma.
- `GET /api/parent/mobile/player/[id]/recommendations` — real route, auth + Prisma.
- `GET /api/marketplace/coaches` — real route, Prisma.
- `GET /api/marketplace/coaches/[id]` — real route, Prisma.
- `POST /api/marketplace/booking-request` — real route, optional auth + Prisma.
- `GET /api/chat/conversations` — real route, auth + Prisma.
- `POST /api/chat/ai/message` — real route, auth + external AI dependency.

## STUBBED FOR COMPATIBILITY

- `GET /api/chat/ai/conversation` — returns `{ conversation: null, messages: [] }`.
- `GET /api/chat/messages` — returns `{ messages: [] }`.
- `GET /api/marketplace/coaches/[id]/slots` — returns `{ coachId, slots: [] }`.
- `GET /api/bookings` — returns `{ bookings: [] }`.
- `GET /api/bookings/my` — returns `{ bookings: [] }`.
- `POST /api/bookings` — returns `{ id, status, message, booking }`.
- `POST /api/bookings/payment-intent` — returns `{ clientSecret, paymentIntentId, status, amount, currency }`.
- `POST /api/bookings/confirm` — returns `{ success, status, bookingId, message }`.
- `GET /api/team/posts` — returns `{ posts: [] }`.
- `GET /api/team/members` — returns `{ members: [] }`.
- `GET /api/team/messages` — returns `{ messages: [] }`.

## POST-SWITCH BACKLOG

- Real bookings backend (CRUD + ownership + persistence).
- Real payment flow integration (Stripe/other PSP lifecycle + webhook handling).
- Real marketplace slots data and availability logic.
- Real team backend/persistence (posts/messages/members write and single-post read).
- Coach Mark conversation persistence in DB (if required by product scope).
- External dependency hardening for AI route (`POST /api/chat/ai/message`).
- Empty-state UX handling for stubbed endpoints during rollout.

## LOW PRIORITY

- Optional analytics/observability around compatibility stubs usage.
- Progressive replacement order for stubs with feature flags when real implementations are ready.

## CHANGED FILES IF ANY

- Updated `docs/PHASE2_MIGRATION_AUDIT_REPORT.md` to final closure state.
