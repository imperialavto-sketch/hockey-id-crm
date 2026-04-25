/**
 * Static regression guards for recent production-contract repairs (auth, video SSOT, team posts, external coach nav, mock-submit).
 * Run: npx tsx src/lib/contract/production-contract-repair-guards.selftest.ts
 * npm: test:production-contract-guards
 */

import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
/** This file: src/lib/contract/ → three levels up = repo root. */
const REPO_ROOT = path.join(__dirname, "..", "..", "..");

function assert(cond: boolean, msg: string) {
  if (!cond) throw new Error(`[production-contract-guards] ${msg}`);
}

function read(relFromRoot: string): string {
  const p = path.join(REPO_ROOT, relFromRoot);
  assert(fs.existsSync(p), `missing file: ${relFromRoot}`);
  return fs.readFileSync(p, "utf-8");
}

function assertIncludes(haystack: string, needle: string, msg: string) {
  assert(haystack.includes(needle), `${msg} (expected substring not found)`);
}

function assertNotIncludes(haystack: string, needle: string, msg: string) {
  assert(!haystack.includes(needle), `${msg} (forbidden substring present)`);
}

console.log("production-contract-repair-guards.selftest…");

// --- 1. AUTH ---
const loginSrc = read("src/app/api/auth/login/route.ts");
assertIncludes(loginSrc, "tryDatabaseCredentialLogin", "login: must retain DB-backed credential path");
assertIncludes(loginSrc, "bcrypt.compare", "login: must use bcrypt for DB users");
assertNotIncludes(
  loginSrc,
  "Demo auth disabled",
  "login: removed hard 403 'Demo auth disabled' outside demo success path"
);
assertIncludes(
  loginSrc,
  "isDemoAuthEnabledForRequest",
  "login: demo branch must remain explicit (DEMO_AUTH_ENABLED + non-production)"
);

const registerSrc = read("src/app/api/auth/register/route.ts");
assertIncludes(registerSrc, "token,", "register: response must include token (NextResponse body)");
assertIncludes(registerSrc, "mobileToken: token", "register: response must include mobileToken alias");
assertIncludes(registerSrc, "parent: { id: parent.id, email }", "register: response must include parent object");
assertIncludes(registerSrc, "setSessionCookie", "register: must issue session cookie payload");

// --- 2. VIDEO SSOT (parent-app + server gates) ---
const videoService = read("parent-app/services/videoAnalysisService.ts");
assertIncludes(
  videoService,
  "`/api/parent/mobile/player/${encodeURIComponent(params.playerId)}/video-analysis`",
  "video: createAndUpload must POST canonical mobile multipart route"
);
assertIncludes(
  videoService,
  "`/api/parent/mobile/player/${encodeURIComponent(playerId)}/video-analysis`",
  "video: list must GET canonical mobile route"
);
assertIncludes(
  videoService,
  "`/api/parent/mobile/player/${encodeURIComponent(playerId)}/video-analysis/${encodeURIComponent(id)}`",
  "video: detail must GET canonical mobile route with playerId"
);
assertIncludes(
  videoService,
  "`/api/parent/mobile/player/${encodeURIComponent(playerId)}/video-analysis/${encodeURIComponent(analysisId)}/retry`",
  "video: retry must hit canonical mobile retry route"
);

const videoUpload = read("src/app/api/video/upload/route.ts");
assertIncludes(videoUpload, 'process.env.NODE_ENV === "production"', "video upload: prod gate");
assertIncludes(videoUpload, "status: 410", "video upload: must return 410 in production branch");
assertIncludes(videoUpload, "VIDEO_UPLOAD_USE_PARENT_MOBILE_API", "video upload: stable error code");

const videoAnalysisPost = read("src/app/api/video-analysis/route.ts");
assertIncludes(videoAnalysisPost, 'process.env.NODE_ENV === "production"', "video-analysis POST: prod gate");
assertIncludes(videoAnalysisPost, "VIDEO_ANALYSIS_USE_PARENT_MOBILE_API", "video-analysis POST: stable code");

const videoAnalysisGet = read("src/app/api/video-analysis/[id]/route.ts");
assertIncludes(videoAnalysisGet, 'process.env.NODE_ENV === "production"', "video-analysis GET [id]: prod gate");

const videoAnalysisRetry = read("src/app/api/video-analysis/[id]/retry/route.ts");
assertIncludes(videoAnalysisRetry, 'process.env.NODE_ENV === "production"', "video-analysis retry: prod gate");

// --- 3. TEAM POSTS ---
const teamPostIdRoute = path.join(REPO_ROOT, "src/app/api/team/posts/[id]/route.ts");
assert(fs.existsSync(teamPostIdRoute), "team posts: GET /api/team/posts/[id] route file must exist");

const teamService = read("parent-app/services/teamService.ts");
assertIncludes(teamService, "`/api/team/posts/${id}`", "teamService.getTeamPostById must call /api/team/posts/:id");

// --- 4. EXTERNAL COACH NAV ---
const rbacSrc = read("src/lib/rbac.ts");
assertIncludes(
  rbacSrc,
  'EXTERNAL_COACH: [{ href: "/external-coach/requests" }]',
  "rbac: EXTERNAL_COACH nav must target /external-coach/requests"
);

const extCoachPage = read("src/app/external-coach/page.tsx");
assertIncludes(extCoachPage, 'redirect("/external-coach/requests")', "external-coach root must redirect to requests");

// --- 5. MOCK-SUBMIT (gate before auth) ---
const mockSubmit = read("src/app/api/arena/external-training/report/mock-submit/route.ts");
assertIncludes(mockSubmit, "MOCK_SUBMIT_DISABLED_IN_PRODUCTION", "mock-submit: stable disable code");
const gateIdx = mockSubmit.indexOf('if (process.env.NODE_ENV === "production")');
const authIdx = mockSubmit.indexOf("const user = await getAuthFromRequest(request)");
assert(gateIdx !== -1 && authIdx !== -1 && gateIdx < authIdx, "mock-submit: production gate must precede getAuthFromRequest");

console.log("production-contract-repair-guards.selftest: OK");
