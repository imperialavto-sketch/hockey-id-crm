# Hockey ID Platform — Complete System Audit

**Audit date:** 2026-03-15  
**Scope:** CRM, parent mobile app, backend server(s), database, auth, API, AI/video readiness, security, technical debt.

---

# 1. Executive Summary

| Metric | Score | Notes |
|--------|-------|--------|
| **Overall health** | 4/10 | Two disconnected backends; mobile points at the minimal one; critical authz gaps. |
| **MVP readiness** | 3/10 | Auth + players + schedule work against hockey-server; feed, chat, bookings, etc. 404 or mock. |
| **Production readiness** | 2/10 | No parent-scoped access on hockey-server; no rate limiting; schema split. |

**Biggest strengths**
- Root Next.js CRM has a rich Prisma schema (School, User, Team, Parent, Player, Feed, Chat, Notifications, Marketplace, AiAnalysis, etc.) and many API routes with RBAC and parent-access checks.
- Parent app has a polished UI (FlagshipScreen, ErrorStateView, EmptyStateView), JWT auth with SecureStore, and clear service layer.
- hockey-server has simple, working JWT auth (register/login), bcrypt, and dotenv.

**Biggest risks**
- **Mobile app is configured to use hockey-server (Express)** at `config/api.ts` → `API_BASE_URL = "http://192.168.1.45:3000"`. That server implements only auth, players, teams, schedule, video-analysis, ai-analysis. All other calls (feed, team posts, chat, notifications, bookings, marketplace, subscription) hit the same host and **return 404** or fail → app falls back to mocks in DEV or empty/error in prod.
- **hockey-server returns all players to any authenticated parent** (`getPlayers` has no `where: { parentId: req.user.id }`). Any logged-in parent can list and open every other parent’s players. **CRITICAL authorization flaw.**
- **Two separate backends and two separate Prisma schemas** (root vs hockey-server). Different IDs (cuid vs int), different models; no single source of truth. CRM and mobile are not aligned on one backend.

**Conclusion**  
The system is a **prototype with two backends**. The “full” product lives in the Next.js API + root Prisma; the mobile app was wired to a new, minimal Express server (hockey-server) that has no feed, chat, notifications, marketplace, or subscription, and has a critical missing filter so parents can see each other’s players. Until the app either points to the Next.js API (and it’s adapted for JWT) or hockey-server is extended with parent-scoping and all missing endpoints, the platform is not MVP-ready for real users.

---

# 2. Current System Map

| Component | Location | Role |
|-----------|----------|------|
| **CRM (Next.js)** | Root `hockey-id-crm/` (Next.js 14, `src/app/`) | Admin/coach UI; dashboard, players, teams, feed, marketplace, finance, etc. Uses **root Prisma** + PostgreSQL. |
| **Next.js API** | `src/app/api/` | Many routes: auth (login/logout, request-code, verify), parent/mobile/*, feed, chat, notifications, marketplace, player ai-analysis, video-analysis, etc. Uses `getAuthFromRequest` (cookie or **x-parent-id** header). |
| **Parent mobile app** | `parent-app/` (Expo, React Native) | Parent-facing app. **Configured to call hockey-server** (`config/api.ts` → `http://192.168.1.45:3000`). |
| **hockey-server** | `hockey-server/` (Express) | Separate Node/Express app. Own **Prisma schema** (int IDs). Exposes: `/api/auth`, `/api/players`, `/api/teams`, `/api/schedule`, `/api/video-analysis`, `/api/ai-analysis`. |
| **Root Prisma** | `prisma/schema.prisma` (root) | CUIDs; User, School, Team, Parent, Player, TeamFeedPost, ChatConversation, Notification, CoachProfile, AiAnalysis, etc. |
| **hockey-server Prisma** | `hockey-server/prisma/schema.prisma` | Int IDs; Parent, Coach, Team, Player, PlayerStats, Schedule, VideoAnalysis, AIAnalysis. No School, no TeamFeedPost, no Chat, no Notification, no CoachProfile. |

**Connections**
- **Mobile → hockey-server:** Yes (config base URL). Used for: auth, players, schedule, team events (from schedule). Everything else (feed, team posts, chat, notifications, bookings, marketplace, subscription, stats, recommendations, AI path `/api/player/:id/ai-analysis`) either 404s or is not implemented on hockey-server.
- **Mobile → Next.js API:** No. Base URL is not the Next.js origin.
- **CRM → Root Prisma:** Yes. All server-side and API routes use root Prisma.
- **hockey-server → DB:** Its own Prisma → PostgreSQL (same DB name possible but **different schema**).

**Missing / fake connections**
- No single API gateway; two backends with different shapes and auth.
- Parent app’s feed, chat, notifications, bookings, marketplace, subscription calls go to hockey-server and get 404 (or fail then mock in DEV).
- Root Next.js `src/app/api/parent/mobile/players/route.ts` returns **hardcoded JSON** (one mock player), not Prisma — so even if mobile pointed at Next.js, that route would still be fake.

---

# 3. What Is Real vs Mock vs Missing

| Area | Status | Evidence | Risk |
|------|--------|----------|------|
| **Parent auth (register/login)** | Real | hockey-server: POST /api/auth/register, /login; bcrypt, JWT, SecureStore in app | Low if JWT_SECRET is strong |
| **Parent auth (phone/code)** | Partial | authService + Next.js request-code/verify; app uses email/password + JWT; phone flow still in context | Legacy code path; possible confusion |
| **Players list** | Partial | hockey-server GET /api/players returns **all** players; app filters by parentId client-side. Backend does not enforce ownership | **Critical:** any parent can see all players |
| **Player by ID** | Partial | hockey-server GET /api/players/:id returns any player; no parentId check | **Critical:** IDOR |
| **Create player** | Partial | hockey-server POST /api/players accepts any parentId; no check req.user.id === parentId | **High:** can assign player to another parent |
| **Schedule** | Real | hockey-server GET/POST /api/schedule; app getSchedule(), getPlayerSchedule() filter by teamId | Schedule routes **unprotected** (no auth) |
| **Teams** | Real | hockey-server GET /api/teams, GET /api/teams/:id, POST; no auth | Unprotected |
| **Video analysis** | Partial | hockey-server GET/POST /api/video-analysis; no auth; no ownership check. Mobile also calls /api/video/upload, /api/video-analysis/:id (retry) — hockey-server has no upload route | Unprotected; upload 404 on hockey-server |
| **AI analysis** | Partial | hockey-server GET/POST /api/ai-analysis by playerId; no auth. Mobile calls /api/player/:id/ai-analysis (different path) → 404 on hockey-server | Path mismatch; unprotected |
| **Feed** | Mock/Missing | Mobile calls GET /api/feed → 404 on hockey-server. Next.js has real feed (TeamFeedPost) | Feed broken when using hockey-server |
| **Team posts** | Mock/Missing | Mobile calls /api/team/posts, /api/team/members, /api/team/messages → 404 on hockey-server | Team features broken |
| **Chat** | Mock/Missing | Mobile calls /api/chat/conversations, messages → 404 on hockey-server | Chat broken |
| **Notifications** | Mock/Missing | Mobile calls /api/notifications → 404 on hockey-server | Notifications broken |
| **Bookings** | Mock/Missing | Mobile calls /api/bookings, create-payment-intent, confirm → 404 on hockey-server | Bookings broken |
| **Marketplace** | Mock/Missing | Mobile calls /api/marketplace/coaches, slots, booking-request → 404 on hockey-server | Marketplace broken |
| **Subscription** | Mock/Missing | Mobile calls /api/subscription/* → 404 on hockey-server | Subscription broken |
| **Player stats** | Mock | Mobile calls /api/parent/mobile/player/:id/stats → 404 on hockey-server; useMockFallback in DEV | Stats mock in DEV |
| **Recommendations** | Mock | Same as stats; /recommendations 404 | Mock in DEV |
| **AI analysis (app)** | Mock/Broken | getAIAnalysis calls /api/player/:id/ai-analysis; hockey-server has /api/ai-analysis/:playerId; different path/contract | 404 or wrong shape |
| **CRM dashboard** | Real | Next.js pages under src/app/(dashboard)/; uses root Prisma and API | Works for admin/coach |
| **CRM auth** | Real | Next.js login, session cookie, getAuthFromRequest | Separate from mobile JWT |
| **Next.js parent/mobile/players** | Mock | Returns hardcoded array of one player; no DB | Not production-ready even if mobile pointed here |

---

# 4. Database Audit

## 4.1 Root Prisma (CRM / full product)

**Strengths**
- Rich domain: User (with role), School, Team, Parent, Player, ParentPlayer (invites), TeamFeedPost, ChatConversation, ChatMessage, Training, Attendance, Notification, CoachProfile, CoachService, CoachBookingRequest, PlayerVideoAnalysis, AiAnalysis, Passport, PlayerStat, etc.
- CUIDs; relations and cascades defined; canAccessTeam, canParentAccessPlayer used in API.
- Supports feed, chat, notifications, marketplace, multi-school.

**Weaknesses**
- No explicit indexes on hot paths (e.g. Notification.parentId+read, TeamFeedPost.teamId+createdAt) documented in schema.
- Some Json fields (e.g. TeamFeedPost body vs separate columns) — flexibility vs queryability.

**Missing for full product**
- Subscription/plan table if payments are recurring.
- Audit fields (createdBy, updatedBy) not everywhere.

## 4.2 hockey-server Prisma

**Strengths**
- Simple and consistent; int IDs; relations clear (Parent→Player, Team→Schedule, Player→VideoAnalysis, AIAnalysis).

**Weaknesses**
- **No School.** No multi-tenancy.
- **No TeamFeedPost, Chat, Notification, CoachProfile, CoachBookingRequest** — so feed, chat, notifications, marketplace cannot be implemented on this schema alone.
- **No ParentPlayer / invite model** — only direct parentId on Player.
- **No indexes** — e.g. Player.parentId, Schedule.teamId, VideoAnalysis.playerId.
- **No unique constraint** on (playerId, createdAt) or similar for AIAnalysis if you want “latest per player” at DB level.
- **AIAnalysis.report** is a single string; root schema has summary + strengths/weaknesses/recommendations (Json). Inconsistent.

**Dangerous design**
- Two schemas in one ecosystem with different identity (cuid vs int) and different models. Migrating or syncing data between them is non-trivial.

**Exact missing models (for parity with product vision)**
- School, User (CRM users), TeamFeedPost, ChatConversation, ChatMessage, Notification, CoachProfile, CoachService, CoachBookingRequest, ParentPlayer, Subscription/Plan if needed.

**Recommended next schema (hockey-server)**
- Add `where: { parentId: req.user.id }` (or equivalent) in code immediately; no schema change for that.
- Add indexes: `Player(parentId)`, `Schedule(teamId, date)`, `VideoAnalysis(playerId)`, `AIAnalysis(playerId, createdAt)`.
- If hockey-server should own “full” product: add models for feed, chat, notifications, marketplace (or adopt root schema and one DB). If hockey-server is only a minimal “parent API,” document that and add only what’s needed for that slice (and still fix parent scoping).

---

# 5. Backend Audit

## 5.1 hockey-server (Express)

**Architecture**
- Flat: routes → controllers → prisma. No service layer; no shared validation or error format.
- **Auth:** Only `/api/players` uses `auth` middleware. `/api/teams`, `/api/schedule`, `/api/video-analysis`, `/api/ai-analysis` have **no auth** — any client can read/write.

**Route review**

| Route group | Exists | Works | Missing | Insecure |
|-------------|--------|-------|---------|----------|
| POST/GET /api/auth | Yes | Yes | Refresh, password reset, email verify | JWT_SECRET in .env — ensure strong in prod |
| GET/POST /api/players | Yes | Yes | **Filter by req.user.id**; validate parentId on create | **Returns all players; createPlayer doesn’t check req.user.id** |
| GET/POST /api/teams | Yes | Yes | Auth | No auth |
| GET/POST /api/schedule | Yes | Yes | Auth; optional filter by teamId | No auth |
| GET/POST /api/video-analysis | Yes | Yes | Auth; **ownership** (player belongs to parent); file upload route | No auth; no ownership |
| GET/POST /api/ai-analysis | Yes | Yes | Auth; ownership | No auth |

**Controller quality**
- Minimal validation (e.g. required fields); no sanitization; no rate limiting.
- Errors returned as `{ error: e.message }` — risk of leaking stack or internal details in prod if `e.message` is not sanitized.
- **playersController.getPlayers** does not use `req.user`; **getPlayerById** does not check parent; **createPlayer** does not enforce `req.user.id === parentId`.

**Auth review**
- JWT in Authorization header; verify with JWT_SECRET. No refresh; 7d expiry.
- **No role** in token — only id and email. Fine for “parent only” but no coach/admin path.
- **Route protection inconsistent:** only players protected; schedule/teams/video/ai unprotected.

**Security**
- No helmet, no CORS config, no rate limiting.
- No input validation library (e.g. joi/zod); body used as-is after basic presence checks.
- **Authorization:** Fatal: parents can read/update other parents’ data where backend is used.

**Performance**
- No pagination on getPlayers, getSchedule, getTeams — can become heavy with growth.
- Prisma used correctly (no raw SQL in reviewed code); N+1 possible on includes if lists grow.

**Exact broken/weak points**
1. **playersController.getPlayers** — remove global findMany; use `where: { parentId: req.user.id }` (or equivalent).
2. **playersController.getPlayerById** — after findUnique, ensure `player.parentId === req.user.id` (or 403).
3. **playersController.createPlayer** — require `req.body.parentId === String(req.user.id)` (or 403).
4. **schedule, teams, video-analysis, ai-analysis** — add auth middleware; for parent-facing routes, add ownership checks where applicable (e.g. player belongs to parent).
5. **video-analysis** — implement POST /api/video/upload or document that upload is handled elsewhere; mobile expects it.
6. **JWT_SECRET** — must be strong and not default in production; server fails if missing (verify() throws).

## 5.2 Next.js API (root)

- **Auth:** getAuthFromRequest: cookie or **x-parent-id** header. If header is trusted as-is, **sending x-parent-id: <other_parent_id>** grants access as that parent — **critical** unless header is only set by a trusted gateway after validating a token.
- **Parent access:** canParentAccessPlayer, getParentTeamIds, etc. used in feed and elsewhere — good.
- **parent/mobile/players:** Returns static JSON; not reading from Prisma — mock.

---

# 6. Mobile App Audit

**Architecture**
- Expo Router (file-based); AuthProvider at root; services call apiFetch (base URL from config). Token stored in SecureStore and set on apiFetch via setAuthToken (module-level). Clear separation of screens, components, services, mappers.

**Screen-by-screen (summary)**
- **Auth (login/register):** Real; email/password; loginRequest/registerRequest → hockey-server; token + parent stored; Redirect to (tabs). Works.
- **Home, Player hub, Profile:** Depend on getPlayers(user.id). Backend returns all; app filters by parentId — so list is correct in UI but **data was already visible to client** (privacy/security issue).
- **Player profile, Passport:** getFullPlayerProfile → getPlayerById + getPlayerSchedule. Works against hockey-server. Stats/recommendations/videoAnalyses come from other endpoints (404) or mock.
- **Schedule:** getPlayers + getPlayerSchedule. Works; schedule from hockey-server.
- **Feed:** getFeed(user.id) → GET /api/feed → 404 on hockey-server → empty or error.
- **Team feed, Team chat, Members:** getTeamPosts, getTeamEvents, getTeamMembers, getTeamMessages → 404 → empty or mock/fallback.
- **Notifications, Bookings, Marketplace, Subscription:** Same — endpoints missing on hockey-server → 404 or mock.
- **Video analysis:** uploadVideo → POST /api/video/upload (404 on hockey-server); createVideoAnalysis, getVideoAnalysisById, retry → partial (hockey-server has some but not upload). In DEV, mocks fill in.
- **AI report:** getAIAnalysis → /api/player/:id/ai-analysis (404 on hockey-server; path differs from hockey-server’s /api/ai-analysis/:playerId).

**API integration status**
- **Real (against hockey-server):** auth, players (list filtered client-side), player by id, create player, schedule, team events (from schedule).
- **404 / wrong path:** feed, team posts/members/messages, chat, notifications, bookings, marketplace, subscription, stats, recommendations, AI path, video upload.

**Mock remnants**
- playerService: mockPlayers, mockPlayerStats, mockRecommendations, mockPlayerSchedule, MOCK_FULL_PROFILE; useMockFallback when API fails (isDev).
- teamService: MOCK_TEAM_POSTS, MOCK_TEAM_MEMBERS, MOCK_TEAM_MESSAGES in fallback.
- Team feed: MOCK_TEAM_NAME still used for header.
- marketplace/coach/[id]: MOCK_COACHES, MOCK_COACH_REVIEWS when API fails (isDev).
- Constants: mockPlayerMarkGolysh, mockDevelopmentTimeline, mockAiReport, etc., used for fallbacks or default content.

**UX/UI**
- FlagshipScreen, ErrorStateView, EmptyStateView used on main screens; skeletons; safe area and theme tokens. Consistent.
- When endpoints 404, user sees empty lists or error; in DEV often mock data — can hide that many features are unimplemented on current backend.

**Performance / stability**
- mountedRef used in several screens to avoid setState after unmount. Good.
- No global pagination; lists can grow (e.g. schedule, players). Acceptable for MVP.

---

# 7. CRM Audit

**What exists**
- Next.js app under `src/app/(dashboard)/`: dashboard, players, teams, trainings, schedule, feed, communications (chat), marketplace (coaches, requests), finance, analytics, ratings, settings, schools, coaches, payments. Many pages and API routes.
- Root Prisma with full schema; getAuthFromRequest, RBAC (requirePermission), canAccessTeam, canParentAccessPlayer.
- Feed, chat, notifications, marketplace (CoachProfile, CoachBookingRequest), player stats, passport, AI analysis (AiAnalysis), video (PlayerVideoAnalysis) in schema and/or API.

**What is missing**
- **Unified auth with mobile:** CRM uses session cookie; mobile uses JWT on hockey-server. No shared “parent login” that works for both.
- **Mobile points at hockey-server:** So CRM and mobile do not share the same API for parent flows. Data created in CRM (e.g. feed, players) is in root DB; mobile reads from hockey-server DB (different schema/IDs).

**Consistency with backend and mobile**
- **Backend:** Two backends (Next.js vs hockey-server). CRM is consistent with root Prisma and Next.js API.
- **Mobile:** Not consistent — mobile uses hockey-server; CRM and mobile are not on the same “backend” for parent features.

**Product readiness**
- CRM can be used by school staff for management, feed, finance, etc., against root DB.
- Parent app cannot get feed, chat, notifications, bookings, marketplace, subscription from hockey-server; and if pointed at Next.js, parent/mobile/players is still mock and x-parent-id trust must be fixed. So “parent experience” is not production-ready.

---

# 8. End-to-End Flow Audit

| Flow | Status | Evidence | Blocker | Next fix |
|------|--------|----------|---------|----------|
| Parent register → login → token → app | REAL | AuthContext + SecureStore; hockey-server register/login; setAuthToken | None | Harden JWT (e.g. refresh, secret) |
| Parent opens player list | PARTIAL | getPlayers → backend returns all; app filters by parentId | Backend must filter by parentId | Add where: { parentId: req.user.id } |
| Parent opens player profile | PARTIAL | getPlayerById + getPlayerSchedule; no backend check that player is theirs | IDOR on playerId | Enforce parentId on getPlayerById |
| Parent opens schedule | REAL | getPlayerSchedule → hockey-server schedule filtered by teamId | Schedule routes not protected | Add auth; keep current logic |
| Team feed / events | PARTIAL | getTeamEvents from schedule (real); getTeamPosts 404 | No team posts on hockey-server | Implement or point to Next.js |
| Feed (main) | BROKEN | GET /api/feed 404 on hockey-server | No feed on hockey-server | Implement feed or use Next.js API |
| AI analysis | BROKEN | Path /api/player/:id/ai-analysis vs hockey-server /api/ai-analysis/:playerId; no auth | Path + auth | Align path and add auth/ownership |
| Video analysis | PARTIAL | createVideoAnalysis, get by id, retry exist; upload 404 | No upload route on hockey-server | Add POST /api/video/upload and auth |
| Notifications | MISSING | GET /api/notifications 404 | Not implemented on hockey-server | Implement or use Next.js |
| Bookings | MISSING | 404 | Not implemented | Same |
| Marketplace | MISSING | 404 | Not implemented | Same |
| Subscription | MISSING | 404 | Not implemented | Same |
| CRM creates data → mobile reads | BROKEN | CRM writes to root Prisma; mobile reads from hockey-server Prisma | Different backends and DBs | One backend or sync strategy |

---

# 9. Security Findings

**Critical**
1. **hockey-server playersController.getPlayers** returns all players; no filter by parent. Any authenticated parent can list every player. **Where:** `hockey-server/controllers/playersController.js`. **Fix:** `where: { parentId: req.user.id }`.
2. **hockey-server playersController.getPlayerById** returns any player by id; no parent check. **Where:** same file. **Fix:** After findUnique, if `player.parentId !== req.user.id` return 403.
3. **hockey-server playersController.createPlayer** accepts any parentId; parent can create player for another parent. **Where:** same file. **Fix:** Require `req.body.parentId === String(req.user.id)` (or reject).

**High**
4. **Next.js getAuthFromRequest** treats **x-parent-id** as full parent identity when no cookie. If client can set header, they can impersonate any parent. **Where:** `src/lib/api-auth.ts`. **Fix:** Do not trust x-parent-id alone; require valid session or JWT and set parentId from that.
5. **hockey-server schedule, teams, video-analysis, ai-analysis** have no auth. Anyone can read/write. **Where:** routes/*.js. **Fix:** Add auth middleware; add ownership where relevant (e.g. video/ai by player → parent).
6. **JWT_SECRET** in .env; if weak or committed, tokens are forgeable. **Where:** hockey-server/.env. **Fix:** Strong secret; not in repo; rotate if leaked.

**Medium**
7. No rate limiting on login/register — brute force possible. **Fix:** rate-limit by IP/email.
8. No CORS configuration on hockey-server — default may be permissive. **Fix:** Restrict origin.
9. Error responses use `e.message` — could leak internals. **Fix:** Generic messages in prod.
10. Mobile token in SecureStore — good; ensure no logging of token.

**Low**
11. No refresh token; 7d access only. **Fix:** Optional refresh flow.
12. No explicit logout revocation on server (JWT is stateless). **Fix:** Optional blocklist or short-lived token + refresh.

---

# 10. Technical Debt Findings

**hockey-server**
- No validation layer (e.g. joi/zod) for request bodies.
- No shared error formatter or logging.
- No request ID or structured logs.
- Controllers do direct Prisma; no service layer (acceptable for size but will duplicate if second consumer appears).
- **Dead/duplicate:** None major; code is minimal.

**parent-app**
- **Duplicate auth concepts:** Phone/code (requestCode, verifyCode) and email/password (login with token). Both in AuthContext; only one path used in UI.
- **Mock constants and fallbacks** across many services (playerService, teamService, marketplace, etc.); isDev branches.
- **Two backends in mind:** Services call paths that exist on Next.js (e.g. /api/parent/mobile/player/:id/stats) and others that exist on hockey-server (/api/players). Comment or constant to document “which backend” would help.
- **playerService** large file; getFullPlayerProfile, getPlayers, getPlayerById, createPlayer, getPlayerStats, getCoachRecommendations, getAIAnalysis — could split by domain (profile vs roster vs analysis).
- **MOCK_TEAM_NAME** and similar in UI (team/feed, team/chat) — should come from API or config.

**Root (Next.js)**
- **parent/mobile/players** returns hardcoded array — technical debt and misleading (looks like API).
- Many API routes; some may be unused by current CRM UI — not verified.

**Schema**
- Two Prisma schemas (root vs hockey-server); divergent models and IDs — major long-term debt.

---

# 11. Top 30 Concrete Problems

1. **Backend returns all players to any parent** — hockey-server/controllers/playersController.js getPlayers. **Impact:** Privacy/data breach. **Severity:** Critical. **Fix:** Filter by req.user.id.
2. **getPlayerById has no parent check** — same file. **Impact:** IDOR. **Severity:** Critical. **Fix:** Enforce player.parentId === req.user.id.
3. **createPlayer accepts any parentId** — same file. **Impact:** Parent can assign player to another. **Severity:** Critical. **Fix:** Require parentId === req.user.id.
4. **Mobile base URL points to hockey-server** — parent-app/config/api.ts. **Impact:** Feed, chat, notifications, bookings, marketplace, subscription 404. **Severity:** Critical. **Fix:** Point to backend that implements these or implement them on hockey-server.
5. **x-parent-id trusted as full auth** — src/lib/api-auth.ts. **Impact:** Impersonation if client sets header. **Severity:** Critical. **Fix:** Validate parent via session/JWT only.
6. **Schedule/teams/video/ai routes unprotected** — hockey-server routes/*.js. **Impact:** Unauthorized read/write. **Severity:** High. **Fix:** Add auth middleware; add ownership checks.
7. **No POST /api/video/upload on hockey-server** — mobile videoAnalysisService expects it. **Impact:** Upload always fails (or mock in DEV). **Severity:** High. **Fix:** Implement upload route (and storage).
8. **AI path mismatch** — app calls /api/player/:id/ai-analysis; server has /api/ai-analysis/:playerId. **Impact:** 404 or wrong contract. **Severity:** High. **Fix:** Align path and response shape.
9. **Next.js parent/mobile/players is mock** — src/app/api/parent/mobile/players/route.ts. **Impact:** Even if mobile used Next.js, players would be fake. **Severity:** High. **Fix:** Use Prisma and parent scope.
10. **Two Prisma schemas** — root vs hockey-server. **Impact:** No single source of truth; migration/sync hard. **Severity:** High. **Fix:** Choose one schema/DB or define clear sync.
11. **No rate limiting on auth** — hockey-server. **Impact:** Brute force. **Severity:** Medium. **Fix:** Add rate limit middleware.
12. **No CORS configuration** — hockey-server. **Impact:** Unclear origin policy. **Severity:** Medium. **Fix:** Configure allowed origins.
13. **Error responses may leak e.message** — hockey-server controllers. **Impact:** Info disclosure. **Severity:** Medium. **Fix:** Generic messages in production.
14. **JWT_SECRET must be strong** — hockey-server. **Impact:** Token forgery if weak. **Severity:** Medium. **Fix:** Env check; strong value in prod.
15. **No pagination on players/schedule/teams** — hockey-server. **Impact:** Performance at scale. **Severity:** Medium. **Fix:** Add limit/offset or cursor.
16. **Video/ai analysis no ownership check** — hockey-server. **Impact:** Any user can read/write any player’s analyses. **Severity:** High. **Fix:** Verify player belongs to parent (or to requesting user).
17. **createPlayer doesn’t validate parentId type** — hockey-server. **Impact:** Bad input could cause 500 or bad DB state. **Severity:** Low. **Fix:** Validate and sanitize.
18. **MOCK_TEAM_NAME in team feed/chat** — parent-app. **Impact:** Wrong label in UI. **Severity:** Low. **Fix:** From API or config.
19. **Legacy phone/code auth still in context** — parent-app/context/AuthContext.tsx. **Impact:** Dead code; confusion. **Severity:** Low. **Fix:** Remove or document “legacy.”
20. **getPlayerStats/getCoachRecommendations 404** — mobile calls Next.js paths; hockey-server has neither. **Impact:** Stats/recommendations mock or empty. **Severity:** Medium. **Fix:** Implement on chosen backend or remove from UI.
21. **No indexes on hockey-server schema** — Prisma. **Impact:** Slow queries as data grows. **Severity:** Medium. **Fix:** Add indexes (parentId, teamId, playerId, etc.).
22. **AIAnalysis.report single string** — hockey-server; root has summary+arrays. **Impact:** Inconsistent contract for mobile. **Severity:** Medium. **Fix:** Align model and API shape.
23. **No refresh token** — hockey-server. **Impact:** Long-lived token only. **Severity:** Low. **Fix:** Optional refresh flow.
24. **Subscription/payments not on hockey-server** — mobile expects /api/subscription/*. **Impact:** Subscription flow broken. **Severity:** High. **Fix:** Implement or point to Next.js.
25. **Bookings not on hockey-server** — same. **Severity:** High. **Fix:** Same.
26. **Notifications not on hockey-server** — same. **Severity:** High. **Fix:** Same.
27. **Chat not on hockey-server** — same. **Severity:** High. **Fix:** Same.
28. **Marketplace/coaches not on hockey-server** — same. **Severity:** High. **Fix:** Same.
29. **Duplicate mock constants** — parent-app (mockPlayers, mockPlayerStats, MOCK_FULL_PROFILE, etc.). **Impact:** Maintenance and risk of wrong fallback. **Severity:** Low. **Fix:** Centralize or remove as backend fills in.
30. **Two backends not documented** — no single doc saying “mobile uses hockey-server; CRM uses Next.js; these are not the same.” **Impact:** Onboarding and wrong assumptions. **Severity:** Medium. **Fix:** Document architecture and which app talks to which API.

---

# 12. Top 30 Concrete Improvements

1. **Add parent filter to getPlayers** — hockey-server. **Impact:** Fix critical data leak. **Difficulty:** Low. **Priority:** P0.
2. **Add parent check to getPlayerById and createPlayer** — hockey-server. **Impact:** Fix IDOR and wrong assignment. **Difficulty:** Low. **Priority:** P0.
3. **Protect schedule, teams, video, ai routes with auth** — hockey-server. **Impact:** Secure all parent data. **Difficulty:** Low. **Priority:** P0.
4. **Add ownership checks for video/ai by player → parent** — hockey-server. **Impact:** No cross-parent access. **Difficulty:** Low. **Priority:** P0.
5. **Implement or proxy feed on hockey-server** — or point mobile to Next.js and fix auth. **Impact:** Feed works for parents. **Difficulty:** Medium/High. **Priority:** P1.
6. **Stop trusting x-parent-id without session/JWT** — Next.js api-auth. **Impact:** No impersonation. **Difficulty:** Medium. **Priority:** P0.
7. **Implement POST /api/video/upload** — hockey-server (or Next.js). **Impact:** Video upload works. **Difficulty:** Medium. **Priority:** P1.
8. **Unify AI path and contract** — app vs hockey-server. **Impact:** AI analysis works. **Difficulty:** Low. **Priority:** P1.
9. **Replace mock parent/mobile/players** — Next.js with Prisma + parent scope. **Impact:** Real player list if mobile uses Next.js. **Difficulty:** Low. **Priority:** P1.
10. **Choose single backend for parent app** — either hockey-server extended or Next.js with JWT. **Impact:** One source of truth; no 404s. **Difficulty:** High. **Priority:** P1.
11. **Add rate limiting (auth)** — hockey-server. **Impact:** Brute force mitigation. **Difficulty:** Low. **Priority:** P1.
12. **Add CORS** — hockey-server. **Impact:** Clear and secure origin policy. **Difficulty:** Low. **Priority:** P1.
13. **Add request validation (e.g. zod)** — hockey-server. **Impact:** Safer input; clearer errors. **Difficulty:** Medium. **Priority:** P2.
14. **Add pagination (players, schedule, teams)** — hockey-server. **Impact:** Scales. **Difficulty:** Low. **Priority:** P2.
15. **Document “which backend for which client”** — repo README or docs. **Impact:** Fewer mistakes. **Difficulty:** Low. **Priority:** P1.
16. **Remove or gate mock fallbacks in production** — parent-app (isDev). **Impact:** No silent mock in prod. **Difficulty:** Low. **Priority:** P2.
17. **Add DB indexes** — hockey-server Prisma. **Impact:** Performance. **Difficulty:** Low. **Priority:** P2.
18. **Align AI analysis schema** — report vs summary+arrays. **Impact:** Consistent API. **Difficulty:** Low. **Priority:** P2.
19. **Implement notifications endpoint** — hockey-server or Next.js. **Impact:** Notifications work. **Difficulty:** Medium. **Priority:** P1.
20. **Implement bookings endpoint** — same. **Impact:** Bookings work. **Difficulty:** Medium. **Priority:** P1.
21. **Implement marketplace/coaches** — same. **Impact:** Marketplace work. **Difficulty:** Medium. **Priority:** P1.
22. **Implement subscription endpoint** — same. **Impact:** Subscription flow. **Difficulty:** Medium. **Priority:** P1.
23. **Implement team posts/messages** — or proxy to Next.js. **Impact:** Team feed/chat. **Difficulty:** Medium. **Priority:** P1.
24. **Add structured logging** — hockey-server. **Impact:** Debugging and ops. **Difficulty:** Low. **Priority:** P2.
25. **Sanitize error messages in prod** — hockey-server. **Impact:** No info leak. **Difficulty:** Low. **Priority:** P1.
26. **Optional refresh token** — hockey-server + app. **Impact:** Shorter-lived access tokens. **Difficulty:** Medium. **Priority:** P2.
27. **Clean legacy phone/code auth** — parent-app or document. **Impact:** Less confusion. **Difficulty:** Low. **Priority:** P2.
28. **Single Prisma schema or sync strategy** — product-wide. **Impact:** One source of truth. **Difficulty:** High. **Priority:** P2 (post-MVP).
29. **E2E tests for auth and player scope** — backend. **Impact:** Regressions caught. **Difficulty:** Medium. **Priority:** P2.
30. **Helmet + security headers** — hockey-server. **Impact:** Hardening. **Difficulty:** Low. **Priority:** P2.

---

# 13. Smart Build Order

**Immediate (must do now)**
1. **hockey-server:** Filter getPlayers by `req.user.id`; in getPlayerById and createPlayer enforce parent ownership. (Same day.)
2. **hockey-server:** Add auth middleware to schedule, teams, video-analysis, ai-analysis; add ownership checks where applicable (e.g. player → parent for video/ai).
3. **Next.js:** Fix x-parent-id usage so it is not the sole source of parent identity (e.g. require valid session or JWT, then set parentId from that).
4. **Product decision:** Either (A) point parent-app at Next.js API and add JWT support there, or (B) keep hockey-server and implement feed, notifications, bookings, marketplace, subscription, chat, team posts there (or proxy). Document decision.

**Next phase**
5. Implement feed (or proxy) for parent app on chosen backend.
6. Implement POST /api/video/upload and align video flow.
7. Align AI analysis path and contract; ensure auth and ownership.
8. Replace Next.js parent/mobile/players mock with Prisma + parent scope (if mobile will use Next.js).
9. Add rate limiting and CORS on hockey-server; sanitize errors in prod.
10. Implement notifications, bookings, marketplace, subscription (or proxy) on chosen backend.
11. Add pagination and indexes where needed.
12. Remove or strictly gate mock fallbacks in production build of parent-app.

**Later scale phase**
13. Single schema/DB strategy or formal sync between root and hockey-server if both remain.
14. Refresh token and optional revocation.
15. Structured logging, monitoring, alerting.
16. E2E and integration tests for auth and scoping.
17. Audit fields and subscription/payment models if needed.

---

# 14. Final Verdict

**Is the current Hockey ID system a prototype, MVP, or production candidate?**  
**Prototype with one production-critical bug.** The mobile app and hockey-server together form a small, working slice (auth, players, schedule) but with a **critical authorization bug** (all players visible to every parent). The “full” product (feed, chat, notifications, marketplace, subscription, etc.) lives in the Next.js API and root Prisma; the mobile app does not use that API for those features because it points at hockey-server. So: **not an MVP** until (1) parent scoping is fixed on hockey-server, and (2) either the app is pointed at the backend that has the rest of the features, or those features are implemented on hockey-server.

**What can be demoed confidently right now?**  
- Parent registration and login (JWT + SecureStore).  
- List “my” players (with the caveat that the backend actually returns everyone; the app filters client-side).  
- View a player profile and schedule (again, no server-side guarantee that the player is the parent’s).  
- Schedule and “team events” from schedule API.  
Do **not** demo as if feed, chat, notifications, bookings, marketplace, or subscription are working end-to-end against the current backend.

**What must be fixed before real users?**  
1. **Enforce parent scope on hockey-server** for players (getPlayers, getPlayerById, createPlayer).  
2. **Protect** schedule, teams, video-analysis, ai-analysis with auth and ownership.  
3. **Either** point mobile at the backend that has feed/chat/notifications/bookings/marketplace/subscription **or** implement those on hockey-server (or proxy).  
4. **Fix x-parent-id** so it is not the sole source of parent identity.  
5. **Remove or strictly gate** mock data in production so the app does not silently show fake data.

**What is the single most dangerous hidden weakness right now?**  
**Any logged-in parent can list and open every other parent’s players** because hockey-server’s getPlayers returns all players and getPlayerById does not check parentId. The app only filters the list client-side; the data is already exposed over the API. This is a **data breach** as soon as more than one parent uses the system.
