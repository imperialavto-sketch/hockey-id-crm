/**
 * Production-safe QA baseline for first deploy.
 *
 * Run:
 *   QA_TEST_BASE_URL=https://<host> \
 *   QA_TEST_EMAIL=<qa-user-email> \
 *   QA_TEST_PASSWORD=<qa-user-password> \
 *   npx tsx scripts/prod-check.ts
 *
 * Guarantees:
 * - no demo auth usage
 * - no fixture creation
 * - no write/destructive API calls
 */

type StepResult = {
  name: string;
  ok: boolean;
  status?: number;
  note?: string;
};

type ApiResult = {
  ok: boolean;
  status: number;
  json: unknown;
  headers: Headers;
};

function getRequiredEnv(name: string): string {
  const value = process.env[name]?.trim();
  if (!value) {
    throw new Error(
      `[prod-check] Missing required env: ${name}. ` +
        "Expected: QA_TEST_BASE_URL, QA_TEST_EMAIL, QA_TEST_PASSWORD"
    );
  }
  return value;
}

function isObject(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

async function api(
  baseUrl: string,
  path: string,
  init: { method?: string; token?: string; body?: unknown } = {}
): Promise<ApiResult> {
  const headers: Record<string, string> = { "Content-Type": "application/json" };
  if (init.token) headers.authorization = `Bearer ${init.token}`;

  const response = await fetch(`${baseUrl}${path}`, {
    method: init.method || "GET",
    headers,
    body: init.body !== undefined ? JSON.stringify(init.body) : undefined,
  });
  const json = await response.json().catch(() => null);

  return {
    ok: response.ok,
    status: response.status,
    json,
    headers: response.headers,
  };
}

async function main() {
  const baseUrl = getRequiredEnv("QA_TEST_BASE_URL").replace(/\/+$/, "");
  const email = getRequiredEnv("QA_TEST_EMAIL");
  const password = getRequiredEnv("QA_TEST_PASSWORD");
  const checks: StepResult[] = [];

  console.log(`[prod-check] Running against ${baseUrl}`);

  // A. Public baseline
  const health = await api(baseUrl, "/api/health");
  const healthJson = isObject(health.json) ? health.json : {};
  const healthOk = health.ok && healthJson.ok === true && healthJson.db === "up";
  checks.push({
    name: "PUBLIC /api/health (200 + db up)",
    ok: healthOk,
    status: health.status,
    note: healthOk ? undefined : "Expected { ok: true, db: 'up' }",
  });

  // B1. Invalid credentials should fail
  const invalidLogin = await api(baseUrl, "/api/auth/login", {
    method: "POST",
    body: { email, password: `${password}__invalid` },
  });
  const invalidOk = invalidLogin.status === 401;
  checks.push({
    name: "AUTH invalid credentials rejected",
    ok: invalidOk,
    status: invalidLogin.status,
    note: invalidOk ? undefined : "Expected 401",
  });

  // B2. Valid login should succeed and issue token/cookie
  const login = await api(baseUrl, "/api/auth/login", {
    method: "POST",
    body: { email, password },
  });

  const loginJson = isObject(login.json) ? login.json : {};
  const mobileToken = typeof loginJson.mobileToken === "string" ? loginJson.mobileToken : "";
  const setCookie = login.headers.get("set-cookie") || "";
  const hasSessionCookie = setCookie.includes("hockey-crm-session=");
  const loginOk = login.ok && !!mobileToken && hasSessionCookie;
  checks.push({
    name: "AUTH valid login + session issued",
    ok: loginOk,
    status: login.status,
    note: loginOk
      ? undefined
      : "Expected 200 + mobileToken + hockey-crm-session cookie",
  });

  // Stop early if auth failed: downstream checks are meaningless.
  if (!loginOk) {
    printReport(checks);
    process.exit(1);
  }

  // C. Authenticated read-only baseline (parent-safe routes)
  const me = await api(baseUrl, "/api/me", { token: mobileToken });
  const meJson = isObject(me.json) ? me.json : {};
  checks.push({
    name: "AUTH READ /api/me",
    ok: me.ok && typeof meJson.id === "string",
    status: me.status,
    note: "Requires QA user with PARENT role",
  });

  const mePlayers = await api(baseUrl, "/api/me/players", { token: mobileToken });
  checks.push({
    name: "AUTH READ /api/me/players",
    ok: mePlayers.ok && Array.isArray(mePlayers.json),
    status: mePlayers.status,
  });

  const meSchedule = await api(baseUrl, "/api/me/schedule", { token: mobileToken });
  checks.push({
    name: "AUTH READ /api/me/schedule",
    ok: meSchedule.ok && Array.isArray(meSchedule.json),
    status: meSchedule.status,
  });

  printReport(checks);
  const failed = checks.filter((c) => !c.ok);
  if (failed.length > 0) process.exit(1);
}

function printReport(checks: StepResult[]) {
  const passed = checks.filter((c) => c.ok);
  const failed = checks.filter((c) => !c.ok);

  console.log("\n[prod-check] PASS:");
  if (passed.length === 0) console.log("- none");
  for (const item of passed) {
    console.log(`- ${item.name} (${item.status ?? "-"})`);
  }

  console.log("\n[prod-check] FAIL:");
  if (failed.length === 0) {
    console.log("- none");
  } else {
    for (const item of failed) {
      console.log(`- ${item.name} (${item.status ?? "-"}) ${item.note ?? ""}`.trim());
    }
  }
}

main().catch((error) => {
  console.error("[prod-check] Fatal error:", error);
  process.exit(1);
});

export {};
