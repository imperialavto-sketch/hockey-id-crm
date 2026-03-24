# Live Coach MVP — Global QA + Cleanup Pass Report

## 1. DONE

## 2. PARTIAL

- **Home RECENT_MESSAGES:** Still mock data (expected MVP)
- **Share report / Player report:** Null from API vs "no data" (need 3 obs) not distinguishable — retry helps both cases

## 3. NOT DONE

- Replacing mock RECENT_MESSAGES with real API data
- Mark-as-read, unreadCount
- Full compose flow for new conversation

## 4. CHANGED FILES

- `coach-app/app/(tabs)/index.tsx` — teams error: retry button, 401 message
- `coach-app/app/(tabs)/team.tsx` — teams error: retry button, 401 message
- `coach-app/app/(tabs)/players.tsx` — players error: retry button, 401 message
- `coach-app/app/reports.tsx` — 401 message consistency
- `coach-app/app/actions.tsx` — 401 message consistency
- `coach-app/app/parent-drafts.tsx` — 401 message consistency
- `coach-app/app/session-review.tsx` — error state + retry + back, catch for loadSessionReviewSummary
- `coach-app/app/player/[id]/report.tsx` — retry button on empty/error
- `coach-app/app/player/[id]/share-report.tsx` — fetchMessage callback, retry button

## 5. EXACT FLOWS CHECKED

| Flow | Loading | Empty | Error | Retry | 401 | Back |
|------|---------|-------|-------|-------|-----|------|
| Home | ✓ | ✓ | ✓ | ✓ (teams) | ✓ | — |
| Teams tab | ✓ | ✓ | ✓ | ✓ | ✓ | — |
| Players tab | ✓ | ✓ | ✓ | ✓ | ✓ | — |
| Coach input | ✓ | ✓ | ✓ (local) | — | — | ✓ guard |
| Session review | ✓ | ✓ | ✓ | ✓ | — | ✓ |
| Reports | ✓ | ✓ | ✓ | ✓ | ✓ | — |
| Parent drafts | ✓ | ✓ | ✓ | ✓ | ✓ | — |
| Share report | ✓ | ✓ | ✓ | ✓ | — | ✓ |
| Player report | ✓ | ✓ | ✓ | ✓ | — | ✓ |
| Actions | ✓ | ✓ | ✓ | ✓ | ✓ | — |
| Messages list | ✓ | ✓ | ✓ | ✓ | ✓ | — |
| Conversation detail | ✓ | ✓ | ✓ | ✓ | — | ✓ |
| Send message | — | — | ✓ | — | — | — |

## 6. EXACT FIXES APPLIED

1. **Home teams section:** Retry button when teamsError; 401 → "Требуется авторизация"
2. **Team tab:** Retry button on error; 401 message
3. **Players tab:** Retry button on error; 401 message
4. **Reports, Actions, Parent-drafts:** 401 → "Требуется авторизация" in catch
5. **Session review:** `.catch` on `loadSessionReviewSummary`; error state with retry + back
6. **Share report:** `fetchMessage` callback; retry button when `!message`
7. **Player report:** `fetchReport` callback; retry button when `!reportData`

## 7. EXACT CLEANUP APPLIED

- Unified 401 message: "Требуется авторизация" across list screens
- Retry pattern: PrimaryButton "Повторить" variant="outline" where missing
- No structural refactors; no removal of working code

## 8. TOP REMAINING RISKS

1. **Dev without token:** 401 on all API calls; user sees "Требуется авторизация" + retry (no crash)
2. **x-coach-id:** Backend does not accept it; coach-app dev-token or login required
3. **Share/Report null:** Cannot tell API error from "need 3 observations" — retry covers transient errors
4. **endpointAvailability:** Once marked unavailable (404), stays until app restart
5. **RECENT_MESSAGES:** Mock data on home; not wired to real chat

## 9. PRODUCTION-READINESS SUMMARY

**Stable enough for MVP:**
- Coach input (observation pipeline)
- Session review
- Reports, Actions, Parent drafts
- Messages list, conversation detail, send
- Teams, Players tabs
- Share report, Player report
- Error handling (loading, empty, error, retry)
- 401 handling (no crash, clear message)

**MVP-only / not production-ready:**
- Home RECENT_MESSAGES (mock)
- Dev auth (x-coach-id, dev-token) — needs proper auth flow
- Mark-as-read, unreadCount (always 0)
- New conversation compose (parent-initiated only)

**Before auth tightening / realtime:**
1. Implement real auth (dev-token or remove x-coach-id reliance)
2. Replace RECENT_MESSAGES with real data or remove block
3. Add mark-as-read if unread UX is required
4. Decide how to distinguish API error vs "no data" for share/report
