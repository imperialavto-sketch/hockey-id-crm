# Phase 1.5 — Stabilization Report

**Date:** 2025-03-23  
**Scope:** Coach-app stabilization after real-data migration

---

## 1. DONE

- Players filter: dynamic age-group filters from `teamAgeGroup` (API)
- Filter segment: "Все" + per-ageGroup pills + "В наблюдении" when applicable
- Filter validation: invalid filter resets to "all"
- Empty states: "Нет команд" + "Попросите администратора назначить вас на команду"
- Error states: error message + "Проверьте подключение и настройки API"
- Dashboard: teamsError state; hero shows "Ошибка загрузки" when fetch fails
- Dashboard: practice block uses "—" when no teams (no hardcoded fake data)
- Config: `isLocalhostUrl` export; __DEV__ console warning for localhost on device
- .env.example: physical device IP note
- Logout: clears `coachPlayersCache`
- Production: `getCoachSessionPlayers` returns [] when cache empty (no mock)

---

## 2. PARTIAL

- **Watchlist filter:** Still shows 0 (API does not return onWatchlist). Filter option appears only when count > 0, so it stays hidden until Phase 2.
- **Dashboard practice block:** When teams load but have no `nextSession`, shows "—". Backend returns next training when available.

---

## 3. NOT DONE

- Phase 2 (messages, reports, actions, parent drafts)
- Attendance roster from API
- Retry button on error states

---

## 4. CHANGED FILES

### Backend
- `src/app/api/coach/players/route.ts` — add `teamAgeGroup` to response

### Coach-app
- `lib/config.ts` — `isLocalhostUrl`, __DEV__ localhost warning
- `lib/getCoachSessionPlayers.ts` — production returns [] when cache empty
- `context/AuthContext.tsx` — `clearCoachPlayersCache` on logout
- `services/coachPlayersService.ts` — `teamAgeGroup` in interface
- `components/players/PlayersFilterSegment.tsx` — dynamic options
- `components/players/PlayerCard.tsx` — `teamAgeGroup` in `PlayerCardData`
- `app/(tabs)/players.tsx` — dynamic filters, empty/error copy
- `app/(tabs)/team.tsx` — empty/error hints
- `app/(tabs)/index.tsx` — teamsError, honest practice block, empty hints
- `.env.example` — physical device note

---

## 5. EXACT STABILIZATION FIXES APPLIED

1. **Backend:** Include `team.ageGroup` in GET /api/coach/players as `teamAgeGroup`.
2. **Filter logic:** Replace hardcoded U12/U14 with dynamic options from `teamAgeGroup`; add "В наблюдении" when watchlistCount > 0.
3. **Filter validation:** If current filter not in options (e.g. after refresh), use "all".
4. **Empty copy:** Team/Players "Нет команд"/"Нет игроков" + "Попросите администратора назначить вас на команду" for empty.
5. **Error copy:** "Проверьте подключение и настройки API" under error text.
6. **Dashboard:** `teamsError` state; hero "Ошибка загрузки" when error; practice block "—" when no teams.
7. **Config:** `isLocalhostUrl`; __DEV__ console.warn when localhost used.
8. **Logout:** Call `clearCoachPlayersCache()`.
9. **Production mock:** `getCoachSessionPlayers` returns [] when cache empty in production.

---

## 6. FILTER LOGIC NOW USED

- **Options:** "Все" (always) + one pill per unique `teamAgeGroup` (sorted) + "В наблюдении" (if count > 0).
- **Filter by:** `teamAgeGroup` from API (`Team.ageGroup`).
- **Filter segment:** Shown only when `filterOptions.length > 1`.
- **Validation:** `validFilter` = current filter if it exists in options, else "all".

---

## 7. SCREENS VERIFIED STABLE

- Dashboard — teams load, error, empty; practice block honest
- Team tab — load, error, empty with hints
- Team detail — load, 404, 403
- Players tab — load, error, empty with hints; dynamic filters
- Player detail — load, 404, 403; notes unchanged
- Add Note — load, 404; uses real player

---

## 8. WHAT STILL REMAINS TEMPORARY

- **getCoachSessionPlayers:** Dev fallback to PLAYER_DETAIL_MOCK / MOCK_COACH_PLAYERS when cache empty.
- **Attendance:** `attendanceData.ts` + TEAM_DETAIL_MOCK.
- **Watchlist / statusChip:** API does not return; filter and overview show 0.
- **Dashboard messages:** RECENT_MESSAGES hardcoded.

---

## 9. RISKS

1. **ageGroup format:** Different schools may use different values (e.g. "U12" vs "12U"). Filters use exact match; inconsistent data may produce many groups.
2. **Console.warn:** Runs at config load; may appear before app UI.
3. **Production getCoachSessionPlayers:** Returns [] until Players tab is opened; Session Capture may show no players initially.

---

## 10. EXACT MANUAL TEST CHECKLIST

1. **Filters**
   - [ ] Players tab: teams with different ageGroups show separate filter pills
   - [ ] Select age group filter → list filters correctly
   - [ ] "Все" shows all players
   - [ ] Single team / single ageGroup → filter section hidden

2. **Empty states**
   - [ ] Coach with no teams: "Нет команд" + hint
   - [ ] Coach with no players: "Нет игроков" + hint
   - [ ] Filter with no matches: "Нет игроков по выбранному фильтру"

3. **Error states**
   - [ ] API down: error message + "Проверьте подключение"
   - [ ] Dashboard hero: "Ошибка загрузки" when teams fail
   - [ ] Dashboard teams section: error text when teams fail

4. **Config**
   - [ ] __DEV__ + localhost: console.warn appears
   - [ ] .env.example documents physical device IP

5. **Logout**
   - [ ] Logout → Session Capture (or getCoachSessionPlayers) uses fresh cache

6. **Production**
   - [ ] EXPO_PUBLIC_ENV=production: getCoachSessionPlayers returns [] when cache empty
