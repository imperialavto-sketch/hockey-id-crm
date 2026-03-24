# Release Audit — Live Coach MVP

**Date:** 2025-03-23  
**Scope:** coach-app + hockey-id-crm

## 1. DONE

- Fixed conversation detail `fetchConversation` — added `.catch()` so promise rejection doesn't leave user stuck on loading
- Added 401 handling + retry to player detail (main load + notes)
- Added 401 handling + retry to team detail
- Added 401 handling to session-review catch
- Added 401 handling to conversation send-message catch
- All flows now use `isAuthRequiredError` for consistent "Требуется авторизация" where applicable

## 2. PARTIAL

- `/unavailable` remains for non-MVP features (Settings, Notifications, Support, write-parent, progress, roster, write-team) — intentional
- Coach input retry sync has no disabled state during retry — low risk

## 3. NOT DONE

- Unread logic, realtime, push
- Schema changes, large redesign
- Double-submit guard on retry sync (handleRetrySyncForSession)

## 4. CHANGED FILES

| File | Change |
|------|--------|
| `coach-app/app/conversation/[id].tsx` | .catch() on fetchConversation; isAuthRequiredError in send catch |
| `coach-app/app/player/[id]/index.tsx` | isAuthRequiredError for player + notes; retry button in error state |
| `coach-app/app/team/[id].tsx` | isAuthRequiredError; retry button in error state |
| `coach-app/app/session-review.tsx` | isAuthRequiredError in loadSessionReviewSummary catch |
| `docs/RELEASE_AUDIT_LIVE_COACH_MVP.md` | New |

## 5. EXACT FLOWS VERIFIED

| Flow | Loading | Empty | Error | Retry | 401 | Back |
|------|---------|-------|-------|-------|-----|------|
| Home | ✓ | ✓ | ✓ | ✓ | ✓ | — |
| Teams list | ✓ | ✓ | ✓ | ✓ | ✓ | — |
| Team detail | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ |
| Players list | ✓ | ✓ | ✓ | ✓ | ✓ | — |
| Player detail | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ |
| Coach input | — | — | ✓ | ✓ | ✓ | ✓ |
| Session review | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ |
| Reports | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ |
| Player report | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ |
| Share report | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ |
| Parent drafts | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ |
| Actions | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ |
| Messages list | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ |
| Conversation detail | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ |
| Send message | ✓ | — | ✓ | — | ✓ | — |

## 6. EXACT FIXES APPLIED

1. **conversation/[id]**: `.catch()` on `getCoachConversation` — prevents infinite loading on rejection
2. **conversation/[id]**: `isAuthRequiredError` in send catch — consistent 401 message
3. **player/[id]**: `isAuthRequiredError` in player load + notes; retry button in error state
4. **team/[id]**: `isAuthRequiredError` in team load; retry button in error state
5. **session-review**: `isAuthRequiredError` in loadSessionReviewSummary catch

## 7. EXACT CLEANUP APPLIED

- None beyond the stabilization fixes above

## 8. TOP REMAINING LIMITATIONS

| Limitation | Severity | Notes |
|------------|----------|-------|
| Coach input retry sync — no disabled state | Low | User can spam retry; no crash |
| Endpoint unavailable — in-memory only | Low | App restart clears; no persistence |
| demo-mock-token in isDemoMode | Low | Token invalid for backend; API 401 |
| More tab → Settings/Notifications/Support → /unavailable | Info | Intentional MVP scope |
| Team/player CTAs (roster, write-parent, progress) → /unavailable | Info | Intentional |

## 9. RELEASE AUDIT SUMMARY

### Ready for MVP release

- **Auth**: Bearer login, 401 → logout, consistent handling across flows
- **Data**: Teams, players, observations, session review, reports, parent drafts, actions, messages
- **Flows**: Home → Teams/Players/Messages; Coach input → Session review → Reports → Share; Conversations → Send
- **Error handling**: Loading, empty, error, retry, 401, back navigation on all main screens
- **Data safety**: Null guards, `?? []`, `?? "—"`, fallbacks for playerName/title/summary
- **Forms**: Double-submit protection on send message, add note, login; disabled/loading states

### MVP limitations

- No unread/realtime/push
- Endpoint unavailable cached in-memory (restart to clear)
- demo-mock-token in isDemoMode
- /unavailable for Settings, Notifications, Support, roster, write-parent, progress, write-team

### Next 3 logical steps

1. **Refresh / clear unavailable**: Add manual "Повторить" or pull-to-refresh to reset endpoint-unavailable state without app restart
2. **Real demo login**: Replace demo-mock-token with actual `/api/auth/login` call in isDemoMode
3. **Retry sync guard**: Add `syncing` state to coach input retry to prevent double-tap during sync
