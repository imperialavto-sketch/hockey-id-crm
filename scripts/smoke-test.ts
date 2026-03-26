/**
 * Smoke test for P1 parent-app compatible endpoints.
 * Run: npx tsx scripts/smoke-test.ts
 * Requires: Next.js dev server on localhost:3000, seeded DB
 */

const BASE = process.env.BASE_URL || "http://localhost:3000";

function createParentToken(parentId: string): string {
  const payload = JSON.stringify({
    id: parentId,
    role: "PARENT",
    schoolId: null,
    parentId,
  });
  return Buffer.from(payload, "utf-8").toString("base64url");
}

async function fetchApi(
  path: string,
  options: { method?: string; body?: string; token?: string } = {}
): Promise<{ status: number; ok: boolean; json?: unknown }> {
  const headers: Record<string, string> = { "Content-Type": "application/json" };
  if (options.token) headers["Authorization"] = `Bearer ${options.token}`;
  try {
    const res = await fetch(`${BASE}${path}`, {
      method: options.method || "GET",
      body: options.body,
      headers,
    });
    let json: unknown;
    try {
      json = await res.json();
    } catch {
      json = undefined;
    }
    return { status: res.status, ok: res.ok, json };
  } catch (err) {
    return { status: 0, ok: false, json: { error: String(err) } };
  }
}

interface Result {
  endpoint: string;
  noAuth: string;
  withAuth?: string;
  notes?: string;
}

const results: Result[] = [];

async function main() {
  console.log("Smoke test for P1 endpoints @", BASE);
  console.log("");

  // Get parent + player from DB
  const { PrismaClient } = await import("@prisma/client");
  const prisma = new PrismaClient();
  const parent = await prisma.parent.findFirst();
  const player = await prisma.player.findFirst({ where: { parentId: parent?.id } });
  const otherPlayer = await prisma.player.findFirst({
    where: parent ? { NOT: { parentId: parent.id } } : undefined,
  });
  await prisma.$disconnect();

  if (!parent) {
    console.log("No Parent in DB — run db:seed. Skipping auth tests.");
  }

  const token = parent ? createParentToken(parent.id) : "";
  const myPlayerId = player?.id ?? "no-player";
  const otherPlayerId = otherPlayer?.id ?? "other-no-id";

  const endpoints: { path: string; method?: string; needsPlayer?: boolean }[] = [
    { path: "/api/me" },
    { path: "/api/me/schedule" },
    { path: "/api/me/players" },
    { path: "/api/me/players/" + myPlayerId },
    { path: "/api/me/subscription/status" },
    { path: "/api/me/subscription/history" },
    { path: "/api/notifications" },
    { path: "/api/players/" + myPlayerId + "/stats" },
    { path: "/api/ai-analysis/" + myPlayerId },
  ];

  for (const ep of endpoints) {
    if (ep.needsPlayer && !player) continue;
    const noAuth = await fetchApi(ep.path, { method: ep.method });
    const withAuth = token
      ? await fetchApi(ep.path, { method: ep.method, token })
      : null;

    const r: Result = {
      endpoint: ep.method ? `${ep.method} ${ep.path}` : `GET ${ep.path}`,
      noAuth:
        noAuth.status === 401
          ? "401 ✓"
          : noAuth.status === 0
            ? "ERR"
            : String(noAuth.status),
    };
    if (withAuth) {
      r.withAuth =
        withAuth.ok || withAuth.status === 200 || withAuth.status === 201
          ? `${withAuth.status} ✓`
          : withAuth.status === 404
            ? "404"
            : String(withAuth.status);
    }
    results.push(r);
  }

  // POST endpoints
  const postNoAuth = await fetchApi("/api/me/players", {
    method: "POST",
    body: JSON.stringify({
      firstName: "Test",
      lastName: "Smoke",
      birthYear: 2015,
    }),
  });
  results.push({
    endpoint: "POST /api/me/players",
    noAuth: postNoAuth.status === 401 ? "401 ✓" : String(postNoAuth.status),
  });

  const postWithAuth = token
    ? await fetchApi("/api/me/players", {
        method: "POST",
        body: JSON.stringify({
          firstName: "Test",
          lastName: "Smoke",
          birthYear: 2015,
        }),
        token,
      })
    : null;
  if (postWithAuth)
    results[results.length - 1].withAuth =
      postWithAuth.status === 201
        ? "201 ✓"
        : postWithAuth.status === 400
          ? "400"
          : String(postWithAuth.status);

  // Security: other player's stats
  if (token && otherPlayerId !== "other-no-id") {
    const otherStats = await fetchApi(
      "/api/players/" + otherPlayerId + "/stats",
      { token }
    );
    results.push({
      endpoint: `GET /api/players/${otherPlayerId}/stats (OTHER)`,
      noAuth: "-",
      withAuth:
        otherStats.status === 403 || otherStats.status === 404
          ? `${otherStats.status} ✓`
          : otherStats.status === 200
            ? "200 ⚠ (should restrict)"
            : String(otherStats.status),
      notes: "access to other parent's player",
    });
  }

  // Security: other player's AI analysis
  if (token && otherPlayerId !== "other-no-id") {
    const otherAi = await fetchApi("/api/ai-analysis/" + otherPlayerId, {
      token,
    });
    results.push({
      endpoint: `GET /api/ai-analysis/${otherPlayerId} (OTHER)`,
      noAuth: "-",
      withAuth:
        otherAi.status === 403 || otherAi.status === 404
          ? `${otherAi.status} ✓`
          : otherAi.status === 200
            ? "200 ⚠ (should restrict)"
            : String(otherAi.status),
      notes: "access to other parent's AI analysis",
    });
  }

  // Print table
  console.log("| Endpoint | No Auth | With Auth | Notes |");
  console.log("|----------|---------|-----------|-------|");
  for (const r of results) {
    console.log(
      `| ${r.endpoint} | ${r.noAuth} | ${r.withAuth ?? "-"} | ${r.notes ?? ""} |`
    );
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
