# Phase 1 — Coach-App Backend Migration Report

**Date:** 2025-03-23  
**Canonical backend:** Next.js CRM (fixed direction)

---

## 1. DONE

- Canonical base URL/config: `EXPO_PUBLIC_API_URL` → Next.js CRM; fallback `http://localhost:3000`
- Coach-scoped endpoints: `GET /api/coach/teams`, `GET /api/coach/teams/:id`, `GET /api/coach/players`, `GET /api/coach/players/:id`
- Coach-app services: `coachTeamsService`, `coachPlayersService`
- Team tab: fetches real teams from API; loading/empty/error states
- Players tab: fetches real players from API; populates Session Capture cache
- Team detail (`/team/[id]`): fetches real team + roster from API
- Player detail (`/player/[id]`): fetches real player from API; notes integration unchanged
- Dashboard: fetches teams for hero and "Мои команды"; loading/empty states
- Add Note screen: fetches player from API
- Notes integration: unchanged (`/api/players/[id]/notes`)
- Mock constants: documented as temporary fallbacks
- Session Capture cache: Players tab populates cache; `getCoachSessionPlayers` uses cache when available

---

## 2. PARTIAL

- **Players filter (U12/U14):** Hardcoded `teamId === 'u12'` / `'u14'` — with real cuid team ids these filters return 0. "Все" works. Phase 2 could add dynamic team filters.
- **Attendance screen:** Still uses `attendanceData.ts` and `TEAM_DETAIL_MOCK` for roster. Out of Phase 1 scope.
- **Confirmed/expected counts:** Backend returns 0 for now (no attendance confirmation flow). UI shows placeholders.

---

## 3. NOT DONE

- Phase 2: messages, reports, actions, parent drafts
- Messages, reports, actions, parent-drafts screens: still show unavailable placeholders
- Dynamic team filter in Players tab
- Attendance roster from API

---

## 4. CHANGED FILES

### Next.js CRM (backend)
- `src/app/api/coach/teams/route.ts` — new
- `src/app/api/coach/teams/[id]/route.ts` — new
- `src/app/api/coach/players/route.ts` — new
- `src/app/api/coach/players/[id]/route.ts` — new

### Coach-app
- `lib/config.ts` — fallback URL, comment
- `lib/getCoachSessionPlayers.ts` — use cache first
- `lib/coachPlayersCache.ts` — new
- `services/coachTeamsService.ts` — new
- `services/coachPlayersService.ts` — new
- `app/(tabs)/index.tsx` — fetch teams, real data
- `app/(tabs)/team.tsx` — fetch teams, real data
- `app/(tabs)/players.tsx` — fetch players, real data, cache
- `app/team/[id].tsx` — fetch team detail, real data
- `app/player/[id]/index.tsx` — fetch player detail, real data
- `app/notes/[playerId].tsx` — fetch player from API
- `constants/playerDetailData.ts` — doc comment
- `constants/teamDetailData.ts` — doc comment
- `data/mockCoachPlayers.ts` — doc comment
- `.env.example` — updated

---

## 5. BACKEND RELATION / SCOPING MODEL USED

- **Auth:** `requireCrmRole` (COACH, MAIN_COACH, SCHOOL_ADMIN, SCHOOL_MANAGER)
- **Scoping:** `getAccessibleTeamIds` and `getAccessiblePlayerIds` from `@/lib/data-scope`
- **COACH / MAIN_COACH:** `user.teamId` → one team and its players
- **SCHOOL_MANAGER:** `user.schoolId` → all teams and players in that school
- **SCHOOL_ADMIN:** all teams and players
- **Schema:** `User` (teamId, schoolId, role), `Team`, `Player` (teamId), `Training`, `PlayerProfile` (jerseyNumber), `PlayerNote`

---

## 6. EXACT ENDPOINTS ADDED OR CHANGED

| Endpoint | Method | Auth | Description |
|----------|--------|------|-------------|
| `/api/coach/teams` | GET | Bearer, requireCrmRole | Coach-scoped teams list |
| `/api/coach/teams/:id` | GET | Bearer, requireCrmRole | Team detail + roster |
| `/api/coach/players` | GET | Bearer, requireCrmRole | Coach-scoped players (optional ?teamId=) |
| `/api/coach/players/:id` | GET | Bearer, requireCrmRole | Player detail |

---

## 7. EXACT COACH-APP SCREENS NOW USING REAL DATA

- **Dashboard** (`app/(tabs)/index.tsx`) — teams for hero, "Мои команды", practice/attendance placeholders
- **Team tab** (`app/(tabs)/team.tsx`) — teams list
- **Team detail** (`app/team/[id].tsx`) — team + roster
- **Players tab** (`app/(tabs)/players.tsx`) — players list
- **Player detail** (`app/player/[id]/index.tsx`) — player profile
- **Add Note** (`app/notes/[playerId].tsx`) — player for note context

---

## 8. WHAT STILL REMAINS MOCK OR TEMPORARY

- **getCoachSessionPlayers:** Falls back to `PLAYER_DETAIL_MOCK` then `MOCK_COACH_PLAYERS` when cache empty (e.g. Session Capture before visiting Players)
- **Attendance** (`app/attendance/[teamId].tsx`): Uses `attendanceData.ts` and `TEAM_DETAIL_MOCK` for roster
- **Dashboard messages:** `RECENT_MESSAGES` hardcoded
- **Dashboard practice/attendance blocks:** Use API data when available; confirmed/expected are 0 from backend

---

## 9. RISKS

1. **Coach `teamId` null:** Demo or incomplete users may have no `teamId` → empty teams/players. Ensure coach login sets `teamId` (e.g. from first team in school).
2. **Local dev URL:** Fallback `http://localhost:3000` fails on physical devices; use machine IP or tunnel.
3. **Players filter:** U12/U14 filters show 0 with real cuid team ids.
4. **Position type:** Prisma `position` is string; coach-app expects `F` | `D` | `G`. Non-standard values display but types are cast.

---

## 10. EXACT MANUAL TEST CHECKLIST

1. **Config**
   - [ ] Set `EXPO_PUBLIC_API_URL` to Next.js CRM (e.g. `http://localhost:3000` or deploy URL)
   - [ ] Start Next.js CRM and coach-app

2. **Auth**
   - [ ] Login as coach (e.g. `coach@hockey.edu` / `admin123`) — must have `teamId` in session
   - [ ] Confirm Bearer token is sent (network tab)

3. **Teams**
   - [ ] Dashboard: hero shows "N команд · M игроков" (or "—" if loading)
   - [ ] Team tab: list loads; empty state if no teams
   - [ ] Team tab: tap team → detail with roster
   - [ ] Team detail: roster links to player detail

4. **Players**
   - [ ] Players tab: list loads; empty state if no players
   - [ ] Filter "Все" works
   - [ ] Tap player → detail with notes section
   - [ ] Notes: add note flow works; uses `/api/players/[id]/notes`

5. **Notes**
   - [ ] From player detail → Add note: player loads from API
   - [ ] Save note: succeeds; returns to detail

6. **Session Capture (dev)**
   - [ ] Visit Players tab first → Session Capture (`/coach-input`) uses cached players
   - [ ] Without visiting Players → falls back to mock players

7. **Error states**
   - [ ] Invalid/404 team id → "Команда не найдена"
   - [ ] Invalid/404 player id → "Игрок не найден"
   - [ ] API down → loading then error or empty
