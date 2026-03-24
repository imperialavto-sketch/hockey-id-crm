# Auth Tightening Pass — Live Coach MVP

**Date:** 2025-03-23  
**Scope:** coach-app + hockey-id-crm (Next.js API)

## 1. DONE

- Removed `x-coach-id` and `dev-token` fallbacks from `coach-app/lib/coachAuth.ts` — backend never supported them; dev without login now gets 401 from backend (same UX)
- Added `isAuthRequiredError()` — unified check for 401 from API and `CoachAuthRequiredError` (production, no token)
- Updated screens to use `isAuthRequiredError` for consistent "Требуется авторизация" message: index, team, players, messages, actions, reports, parent-drafts

## 2. PARTIAL

- **chat/conversations** routes use `getAuthFromRequest` directly (not `requireCrmRole`) — behavior is correct (401 on no user), only implementation differs
- **players/[id]/notes** uses `requirePermission` (which uses `requireCrmRole`) — consistent

## 3. NOT DONE

- `/api/coach/reports/weekly`, `/api/coach/parent-drafts`, `/api/coach/actions` — endpoints not implemented; coach-app marks them unavailable on 404, falls back to `[]`
- Dev-token endpoint — never existed; removed from coach-app
- Refresh tokens, new login flow, role redesign — out of scope

## 4. CHANGED FILES

| File | Change |
|------|--------|
| `coach-app/lib/coachAuth.ts` | Removed x-coach-id, dev-token; added `isAuthRequiredError()` |
| `coach-app/lib/config.ts` | Updated isProduction comment |
| `coach-app/app/(tabs)/index.tsx` | `isApi401` → `isAuthRequiredError` |
| `coach-app/app/(tabs)/team.tsx` | `isApi401` → `isAuthRequiredError` |
| `coach-app/app/(tabs)/players.tsx` | `isApi401` → `isAuthRequiredError` |
| `coach-app/app/(tabs)/messages.tsx` | `isApi401` → `isAuthRequiredError` |
| `coach-app/app/actions.tsx` | `isApi401` → `isAuthRequiredError` |
| `coach-app/app/reports.tsx` | `isApi401` → `isAuthRequiredError` |
| `coach-app/app/parent-drafts.tsx` | `isApi401` → `isAuthRequiredError` |
| `coach-app/services/*.ts` | Updated auth comment (7 files) |

## 5. EXACT AUTH FLOWS CHECKED

### coach-app

- Token: SecureStore (`coach_auth_token`) + in-memory (`api.ts` authToken)
- Requests: `apiFetch` + `getCoachAuthHeaders`; all coach services use both
- 401: `unauthorizedHandler` → `clearAuthState` (logout or demo restore)
- Login: `/api/auth/login` → `mobileToken` (base64url session)

### hockey-id-crm (backend)

- `getAuthFromRequest`: `x-parent-id` → Bearer → cookie
- Coach endpoints: `requireCrmRole` → `requireAuth` → `getAuthFromRequest`
- Bearer: base64url JSON `{ id, role, ... }`

### Endpoints

| Endpoint | Auth | Notes |
|----------|------|-------|
| `/api/coach/teams` | requireCrmRole | ✓ |
| `/api/coach/teams/[id]` | requireCrmRole | ✓ |
| `/api/coach/players` | requireCrmRole | ✓ |
| `/api/coach/players/[id]` | requireCrmRole | ✓ |
| `/api/coach/sessions/*` | requireCrmRole | ✓ |
| `/api/coach/observations` | requireCrmRole | ✓ |
| `/api/coach/messages/*` | requireCrmRole | ✓ |
| `/api/chat/conversations` | getAuthFromRequest | ✓ 401 on !user |
| `/api/chat/conversations/[id]` | getAuthFromRequest | ✓ |
| `/api/chat/conversations/[id]/messages` | getAuthFromRequest | ✓ |
| `/api/players/[id]/notes` | requirePermission | ✓ |

## 6. EXACT INCONSISTENCIES FOUND

1. **x-coach-id / dev-token** — coach-app sent them, backend ignored; removed from coach-app
2. **chat routes** — use `getAuthFromRequest` inline vs `requireCrmRole`; both return 401 on no user
3. **demo-mock-token** — `isDemoMode` + demo creds return fake token; backend would 401 (documented as MVP-only)

## 7. EXACT FIXES APPLIED

1. `coachAuth.ts`: removed x-coach-id and dev-token; dev without token returns `{}` → backend 401
2. `coachAuth.ts`: added `isAuthRequiredError()` for unified auth error handling
3. Seven screens: `isApi401` → `isAuthRequiredError` for consistent "Требуется авторизация"

## 8. REMAINING RISKS

| Risk | Severity | Notes |
|------|----------|-------|
| `isDemoMode` + demo-mock-token | Low | Token invalid for backend; all API calls 401. Works only in fully offline/demo scenarios |
| team/[id], player/[id], notes, conversation, session-review | Low | Could use `isAuthRequiredError` for 401 message; not critical |
| reports/parent-drafts/actions endpoints | Info | Not implemented; app handles gracefully |

## 9. AUTH READINESS SUMMARY

### OK for MVP

- Bearer token flow with login
- 401 → logout / demo restore
- All coach services use `getCoachAuthHeaders` + `apiFetch`
- Backend: consistent 401 on missing/invalid auth via `requireCrmRole` / `getAuthFromRequest`
- No bypass of api client in coach services

### MVP-only

- `isDemoMode` with demo-mock-token (no real backend session)
- Dev without login: 401 on every request (no dev-token/x-coach-id)

### Next logical steps

1. Add `/api/coach/auth/dev-token` (optional) for dev without login
2. Or require login in dev; remove demo-mock-token in favor of real login
3. Implement reports/parent-drafts/actions endpoints with same auth pattern
