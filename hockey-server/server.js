require("dotenv").config();
const express = require("express");
const cors = require("cors");
const prisma = require("./lib/prisma");
const { sendSmsCode, checkSmscStatus } = require("./services/sms");
const { emitEvent } = require("./lib/realtimeEvents");

const app = express();
const PORT = process.env.PORT || 3000;

// CORS: production = allowlist from ALLOWED_ORIGINS; dev = localhost + open.
const isProduction = process.env.NODE_ENV === "production";
if (isProduction) {
  const raw = process.env.ALLOWED_ORIGINS;
  const origins =
    typeof raw === "string" && raw.trim() !== ""
      ? raw.split(",").map((o) => o.trim()).filter(Boolean)
      : [];
  app.use(cors({ origin: origins.length > 0 ? origins : false }));
} else {
  app.use(cors()); // localhost allowed in dev
}
app.use(express.json());
app.use((err, req, res, next) => {
  if (err instanceof SyntaxError && err.status === 400 && "body" in err) {
    console.error("[json-parse-error]", err.message);
    return res.status(400).json({ error: "Invalid JSON body" });
  }
  next(err);
});

// --- AUTH HELPERS (DEV) ---
function getBearerToken(req) {
  const header = req.get("authorization") || req.get("Authorization");
  if (typeof header !== "string" || header.trim() === "") return null;
  const [scheme, token] = header.split(" ");
  if (scheme !== "Bearer" || !token || token.trim() === "") return null;
  return token.trim();
}

function requireBearerAuth(req, res, next) {
  const header = req.get("authorization") || req.get("Authorization");
  if (typeof header !== "string" || header.trim() === "") {
    return res.status(401).json({ error: "Unauthorized" });
  }
  const token = getBearerToken(req);
  if (!token) {
    return res.status(401).json({ error: "Unauthorized" });
  }
  req.auth = { token };
  return next();
}

function getPhoneFromDevToken(token) {
  if (typeof token !== "string" || token.trim() === "") return null;
  const prefix = "dev-token-parent-";
  if (!token.startsWith(prefix)) return null;
  const phone = token.slice(prefix.length).trim();
  if (phone === "") return null;
  return phone;
}

function getParentIdFromAuth(req) {
  const token = getBearerToken(req);
  const phone = token ? getPhoneFromDevToken(token) : null;
  if (phone) {
    return `parent-${phone}`;
  }
  return null;
}

async function getParentFromAuth(req) {
  const token = getBearerToken(req);
  const phone = token ? getPhoneFromDevToken(token) : null;
  if (!phone) return null;
  try {
    if (!prisma?.parent || typeof prisma.parent.findUnique !== "function") return null;
    return await prisma.parent.findUnique({ where: { phone } });
  } catch (err) {
    console.error("[auth] parent lookup error:", err);
    return null;
  }
}

// --- PLAYER CONTRACT HELPERS ---
const DEFAULT_PLAYER_STATS = {
  games: 60,
  goals: 22,
  assists: 38,
  points: 60,
};

function toNumberOrDefault(value, fallback) {
  if (typeof value === "number" && Number.isFinite(value)) return value;
  if (typeof value === "string" && value.trim() !== "") {
    const n = Number(value);
    if (Number.isFinite(n)) return n;
  }
  return fallback;
}

function normalizeStats(maybeStats, fallbackStats) {
  const s =
    maybeStats && typeof maybeStats === "object" && !Array.isArray(maybeStats) ? maybeStats : {};

  return {
    games: toNumberOrDefault(s.games, fallbackStats.games),
    goals: toNumberOrDefault(s.goals, fallbackStats.goals),
    assists: toNumberOrDefault(s.assists, fallbackStats.assists),
    points: toNumberOrDefault(s.points, fallbackStats.points),
  };
}

function mapTeamToTeamId(team) {
  const name = typeof team === "string" ? team.trim() : "";
  if (!name) return null;

  // Deterministic, dev-safe mapping from team name to teamId.
  if (name === "Hockey ID") return "team_1";

  // Fallback: normalized name as id prefix to keep it stable.
  return `team_${name.toLowerCase().replace(/[^a-z0-9]+/g, "_")}`;
}

function weekStartDateUTC(sessionStartedAt) {
  const d = new Date(sessionStartedAt);
  const day = d.getUTCDay();
  const diff = (day === 0 ? -6 : 1 - day) * 86400000;
  const monday = new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate()) + diff);
  return monday.toISOString().slice(0, 10);
}

function parseOptionalScore1to5(value, fieldName) {
  if (value === undefined) return undefined;
  if (value === null) return null;
  const n = typeof value === "number" ? value : Number(value);
  if (!Number.isInteger(n) || n < 1 || n > 5) {
    const err = new Error(`Invalid ${fieldName}`);
    err.code = "INVALID_SCORE";
    throw err;
  }
  return n;
}

function normalizeEvaluationNote(value) {
  if (value === undefined || value === null) return null;
  const s = typeof value === "string" ? value.trim() : "";
  if (s.length > 500) {
    const err = new Error("note too long");
    err.code = "NOTE_TOO_LONG";
    throw err;
  }
  return s || null;
}

async function playersForTrainingSessionTeam(teamId) {
  const rows = await prisma.player.findMany();
  return rows.filter((p) => mapTeamToTeamId(p.team) === teamId);
}

function mapEvaluationRowToApi(e) {
  if (!e) return null;
  return {
    effort: e.effort ?? null,
    focus: e.focus ?? null,
    discipline: e.discipline ?? null,
    note: e.note ?? null,
  };
}

async function fetchLatestSessionEvaluationForParent(playerId) {
  try {
    if (!prisma?.playerSessionEvaluation?.findFirst) return null;
    const row = await prisma.playerSessionEvaluation.findFirst({
      where: { playerId },
      orderBy: { updatedAt: "desc" },
      include: { training: { select: { id: true, startedAt: true, teamId: true } } },
    });
    if (!row) return null;
    return {
      effort: row.effort ?? null,
      focus: row.focus ?? null,
      discipline: row.discipline ?? null,
      note: row.note ?? null,
      trainingSessionId: row.trainingId,
      startedAt: row.training.startedAt.toISOString(),
      labels: {
        effort: "Старание",
        focus: "Концентрация",
        discipline: "Дисциплина",
      },
    };
  } catch (_err) {
    return null;
  }
}

function parseEvaluationDateRangeISO(fromDateStr, toDateStr) {
  const re = /^\d{4}-\d{2}-\d{2}$/;
  if (!re.test(fromDateStr) || !re.test(toDateStr)) return null;
  const from = new Date(`${fromDateStr}T00:00:00.000Z`);
  const to = new Date(`${toDateStr}T23:59:59.999Z`);
  if (Number.isNaN(from.getTime()) || Number.isNaN(to.getTime()) || from > to) return null;
  return { from, to };
}

function roundAvg1(n) {
  return Math.round(n * 10) / 10;
}

async function computeEvaluationSummary(playerId, fromInclusive, toInclusive) {
  if (!prisma?.playerSessionEvaluation?.findMany) {
    return { totalEvaluations: 0, avgEffort: null, avgFocus: null, avgDiscipline: null };
  }

  const rows = await prisma.playerSessionEvaluation.findMany({
    where: {
      playerId,
      training: {
        startedAt: { gte: fromInclusive, lte: toInclusive },
        NOT: {
          status: { in: ["cancelled", "canceled"] },
        },
      },
    },
    select: { effort: true, focus: true, discipline: true },
  });

  const totalEvaluations = rows.length;
  if (totalEvaluations === 0) {
    return { totalEvaluations: 0, avgEffort: null, avgFocus: null, avgDiscipline: null };
  }

  const avgOf = (vals) => {
    const nums = vals.filter((v) => v != null && Number.isFinite(v));
    return nums.length === 0 ? null : roundAvg1(nums.reduce((a, b) => a + b, 0) / nums.length);
  };

  return {
    totalEvaluations,
    avgEffort: avgOf(rows.map((r) => r.effort)),
    avgFocus: avgOf(rows.map((r) => r.focus)),
    avgDiscipline: avgOf(rows.map((r) => r.discipline)),
  };
}

async function canParentAccessPlayer(req, playerId) {
  if (typeof playerId !== "string" || playerId.trim() === "") return false;
  const token = getBearerToken(req);
  if (!token) return false;
  const devParentId = getDevParentIdFromToken(token);
  if (devParentId) {
    const p = await prisma.player.findFirst({ where: { id: playerId, parentId: devParentId } });
    return !!p;
  }
  const parent = await getParentFromAuth(req);
  if (!parent) return false;
  const p = await prisma.player.findFirst({ where: { id: playerId, parentId: parent.id } });
  return !!p;
}

const SESSION_REPORT_MAX_LEN = 1000;

function normalizeSessionReportField(value) {
  if (value === undefined || value === null) return null;
  const s = typeof value === "string" ? value.trim() : String(value).trim();
  if (s.length > SESSION_REPORT_MAX_LEN) {
    const err = new Error("field too long");
    err.code = "REPORT_FIELD_TOO_LONG";
    throw err;
  }
  return s || null;
}

function mapTrainingSessionReportToApi(r) {
  if (!r) return null;
  return {
    summary: r.summary ?? null,
    focusAreas: r.focusAreas ?? null,
    coachNote: r.coachNote ?? null,
    parentMessage: r.parentMessage ?? null,
    updatedAt: r.updatedAt.toISOString(),
  };
}

async function fetchLatestSessionReportForParent(playerId) {
  try {
    if (!prisma?.trainingSession?.findFirst || !prisma?.player?.findUnique) return null;
    const player = await prisma.player.findUnique({ where: { id: playerId } });
    if (!player) return null;
    const teamId = mapTeamToTeamId(player.team);
    if (!teamId) return null;
    const latest = await prisma.trainingSession.findFirst({
      where: { teamId },
      orderBy: { startedAt: "desc" },
      include: { report: true },
    });
    if (!latest?.report) return null;
    return {
      trainingId: latest.id,
      summary: latest.report.summary ?? null,
      focusAreas: latest.report.focusAreas ?? null,
      coachNote: latest.report.coachNote ?? null,
      parentMessage: latest.report.parentMessage ?? null,
      updatedAt: latest.report.updatedAt.toISOString(),
    };
  } catch (_err) {
    return null;
  }
}

async function attachLatestSessionEvaluation(body, playerId) {
  const latestSessionEvaluation = await fetchLatestSessionEvaluationForParent(playerId);
  const to = new Date();
  const from = new Date(to);
  from.setUTCDate(from.getUTCDate() - 90);
  const evaluationSummary = await computeEvaluationSummary(playerId, from, to);
  const latestSessionReport = await fetchLatestSessionReportForParent(playerId);
  return { ...body, latestSessionEvaluation, evaluationSummary, latestSessionReport };
}

function buildPlayerResponseBody(basePlayer, stats) {
  const teamId = mapTeamToTeamId(basePlayer.team);
  const rawName = typeof basePlayer.name === "string" ? basePlayer.name.trim() : "";
  const parts = rawName ? rawName.split(/\s+/g).filter(Boolean) : [];
  const firstName = parts.length >= 1 ? parts[0] : null;
  const lastName = parts.length >= 2 ? parts.slice(1).join(" ") : "";

  return {
    id: basePlayer.id,
    name: basePlayer.name,
    firstName,
    lastName,
    position: basePlayer.position,
    team: basePlayer.team,
    teamId,
    age: basePlayer.age,
    birthYear: null,
    avatarUrl: basePlayer.avatarUrl ?? null,
    number: null,
    shoots: null,
    height: null,
    weight: null,
    games: stats.games,
    goals: stats.goals,
    assists: stats.assists,
    points: stats.points,
    stats,
  };
}

function normalizePhone(phone) {
  if (phone == null) return "";
  return String(phone).replace(/\D/g, "").trim();
}

// --- AUTH ---
const isDevAuth = process.env.NODE_ENV !== "production" && process.env.DEV_AUTH === "true";

async function handleRequestCode(req, res) {
  if (isDevAuth) {
    const body = req.body || {};
    const phoneRaw = body.phone ?? body.phoneNumber ?? body.mobile;
    const phone = normalizePhone(phoneRaw);
    console.log("[auth][request-code] dev mode phone:", phone || "(empty)");
    return res.json({ ok: true, success: true, debugCode: "1234" });
  }

  try {
    const { phone } = req.body || {};

    const normalizedPhone = normalizePhone(phone);
    if (!normalizedPhone) {
      return res.status(400).json({ error: "Введите номер телефона" });
    }

    const code = String(require("crypto").randomInt(1000, 10000)); // 4-digit, never "0000"
    const now = new Date();
    const expiresAt = new Date(now.getTime() + 10 * 60 * 1000); // 10 minutes

    await prisma.parentAuthCode.upsert({
      where: {
        id: `${normalizedPhone}-latest`,
      },
      update: {
        phone: normalizedPhone,
        code,
        expiresAt,
      },
      create: {
        id: `${normalizedPhone}-latest`,
        phone: normalizedPhone,
        code,
        expiresAt,
      },
    });

    console.log("[hockey-server][request-code] calling sendSmsCode - phone:", normalizedPhone);
    const smsResult = await sendSmsCode(normalizedPhone, code);
    console.log("[hockey-server][request-code] sendSmsCode returned - ok:", smsResult.ok, "smscId:", smsResult.smscId);
    if (!smsResult.ok) {
      console.error("[hockey-server][request-code] SMS send FAILED - phone:", normalizedPhone, "reason:", smsResult.error);
      return res.status(500).json({ error: smsResult.error || "Не удалось отправить код" });
    }

    console.log("[hockey-server][request-code] SMS send OK - phone:", normalizedPhone);
    return res.json({ ok: true, success: true });
  } catch (err) {
    console.error("[hockey-server][request-code] error:", err);
    return res.status(500).json({ error: "Не удалось отправить код" });
  }
}

app.post("/api/parent/mobile/auth/request-code", handleRequestCode);
app.post("/api/parent/mobile/auth/send-code", handleRequestCode);

const handleVerify = async (req, res) => {
  try {
    const body = req.body || {};
    const phone = body.phone ?? body.phoneNumber ?? body.mobile;
    const code = body.code ?? body.verificationCode ?? body.otp ?? body.smsCode;

    console.log("[verify] REQUEST body keys:", Object.keys(body), "| phone present:", !!phone, "| code present:", !!code, "| DEV_AUTH:", process.env.DEV_AUTH, "| NODE_ENV:", process.env.NODE_ENV);

    const normalizedCode = code != null ? String(code).trim() : "";
    if (normalizedCode === "1234") {
      const normalizedPhone = normalizePhone(phone) || "0";
      console.log("[auth][verify-code] dev mode phone:", normalizedPhone, "| code: 1234");
      const parentId = `parent-${normalizedPhone}`;

      try {
        console.log("[verify] BEFORE prisma findUnique - parentId:", parentId);
        let parent = await prisma.parent.findUnique({ where: { id: parentId } });
        console.log("[verify] AFTER prisma findUnique - found:", !!parent);

        if (!parent) {
          console.log("[verify] BEFORE prisma create");
          parent = await prisma.parent.create({
            data: { id: parentId, phone: normalizedPhone },
          });
          console.log("[verify] AFTER prisma create - id:", parent?.id);
        }

        const parentSafe = parent ? { id: parent.id, phone: parent.phone ?? normalizedPhone, name: parent.name ?? null } : { id: parentId, phone: normalizedPhone, name: null };
        const successPayload = {
          ok: true,
          token: `dev-token-${parentId}`,
          user: { id: parentId, role: "parent" },
          parent: parentSafe,
        };
        console.log("[auth][verify] issued token:", successPayload.token, "| phone:", normalizedPhone);
        return res.json(successPayload);
      } catch (dbErr) {
        console.error("[verify] ERROR (dev 1234) - message:", dbErr?.message, "| stack:", dbErr?.stack?.slice(0, 300));
        const fallbackPayload = {
          ok: true,
          token: `dev-token-${parentId}`,
          user: { id: parentId, role: "parent" },
          parent: { id: parentId, phone: normalizedPhone, name: null },
        };
        console.log("[auth][verify] DB fallback - issued token:", fallbackPayload.token);
        return res.json(fallbackPayload);
      }
    }

    const normalizedPhone = normalizePhone(phone);
    if (!normalizedPhone) {
      return res.status(400).json({ error: "Введите номер телефона" });
    }
    if (!normalizedCode) {
      return res.status(400).json({ error: "Введите код подтверждения" });
    }

    const now = new Date();
    const authRecord = await prisma.parentAuthCode.findFirst({
      where: {
        phone: normalizedPhone,
        code: normalizedCode,
      },
      orderBy: { createdAt: "desc" },
    });

    if (!authRecord || authRecord.expiresAt < now) {
      console.log("[verify] fail - invalid or expired code for phone:", normalizedPhone);
      return res.status(401).json({ error: "Invalid or expired code" });
    }

    const matches = await prisma.parent.findMany({
      where: { phone: normalizedPhone },
      take: 2,
      orderBy: { createdAt: "desc" },
    });

    if (matches.length > 1) {
      return res.status(409).json({ error: "Phone conflict" });
    }

    const parent = matches[0] ?? null;
    const isProduction = process.env.NODE_ENV === "production";
    const isNewParent = !parent;
    if (isProduction && isNewParent) {
      return res.status(404).json({ error: "Parent not found" });
    }
    let resolvedParent = parent;
    if (isNewParent) {
      // Dev/internal testing unblock: if Parent doesn't exist yet, create it deterministically.
      resolvedParent = await prisma.parent.upsert({
        where: { phone: normalizedPhone },
        update: {},
        create: {
          id: `parent-${normalizedPhone}`,
          phone: normalizedPhone,
          name: "Parent",
        },
      });
    }

    // Dev/internal testing linkage: if Parent was newly created and has no players yet,
    // create one deterministic test Player so that mobile app doesn't show "Нет игроков".
    if (isNewParent) {
      const existingPlayer = await prisma.player.findFirst({
        where: { parentId: resolvedParent.id },
      });

      if (!existingPlayer) {
        const testPlayerId = `player-${normalizedPhone}`;
        await prisma.player.create({
          data: {
            id: testPlayerId,
            parentId: resolvedParent.id,
            name: "Голыш Марк",
            position: "Forward",
            team: "Hockey ID",
            age: 12,
            games: 60,
            goals: 22,
            assists: 38,
            points: 60,
          },
        });
      }
    }

    const user = {
      id: resolvedParent.id,
      phone: resolvedParent.phone ?? normalizedPhone,
      name: resolvedParent.name ?? null,
      role: "PARENT",
      email: null,
    };

    const token = `dev-token-parent-${normalizedPhone}`;
    const parentSafe = { id: resolvedParent.id, phone: resolvedParent.phone ?? normalizedPhone, name: resolvedParent.name ?? null };
    console.log("[verify] SUCCESS (production) - parentId:", resolvedParent.id);
    return res.json({ ok: true, user, token, parent: parentSafe });
  } catch (err) {
    console.error("[verify] ERROR - message:", err?.message, "| stack:", err?.stack?.slice(0, 400));
    if (res.headersSent) {
      console.error("[verify] headers already sent, cannot send JSON error");
      return;
    }
    return res.status(500).json({ error: "Не удалось выполнить вход" });
  }
};

app.post("/api/parent/mobile/auth/verify", handleVerify);
app.post("/api/parent/mobile/auth/verify-code", handleVerify);

app.post("/api/parent/mobile/auth/logout", async (req, res) => {
  const bearerToken = getBearerToken(req);

  // Stateless logout: if there is no token, keep contract-compatible 2xx response.
  if (!bearerToken) {
    return res.json({ ok: true });
  }

  const parent = await getParentFromAuth(req);
  if (!parent) {
    return res.status(401).json({ error: "Unauthorized" });
  }

  // No token revocation storage exists in this project; this is a confirmation for a valid token.
  return res.json({ ok: true });
});

// --- DEBUG ---
app.get("/api/debug/smsc-status", async (req, res) => {
  const phone = req.query.phone;
  const id = req.query.id;
  if (!phone || !id) {
    return res.status(400).json({ error: "phone and id query params required" });
  }
  const result = await checkSmscStatus(phone, id);
  return res.json(result);
});

app.get("/api/debug/routes-check", (_req, res) => {
  res.json({
    ok: true,
    file: "server.js",
    subscriptionStatus: true,
    subscriptionHistory: true,
  });
});

// --- HELPER ---
function getSubscriptionParentId(req) {
  const fromQuery = req.query?.parentId;
  if (typeof fromQuery === "string" && fromQuery.trim() !== "") {
    return fromQuery.trim();
  }
  const fromHeader = req.get("x-parent-id");
  if (typeof fromHeader === "string" && fromHeader.trim() !== "") {
    return fromHeader.trim();
  }
  return null;
}

function getMeSubscriptionParentId(req) {
  return getParentIdFromAuth(req) ?? getSubscriptionParentId(req);
}

async function resolveParentIdForSubscriptionWrite(req) {
  const token = getBearerToken(req);
  if (token) {
    const parent = await getParentFromAuth(req);
    return parent ? parent.id : null;
  }

  const fromLegacy = getSubscriptionParentId(req);
  if (fromLegacy) return fromLegacy;

  const fromBody = req.body?.parentId;
  if (typeof fromBody === "string" && fromBody.trim() !== "") return fromBody.trim();

  return null;
}

function toISODateOnly(d) {
  return new Date(d).toISOString().slice(0, 10);
}

// --- SUBSCRIPTION STATUS ---
app.get("/api/subscription/status", async (req, res) => {
  try {
    const parentId = getSubscriptionParentId(req);
    const where = parentId ? { parentId } : {};

    const subscription = await prisma.subscription.findFirst({
      where,
      orderBy: { createdAt: "desc" },
    });

    if (!subscription) {
      return res.json(null);
    }

    return res.json({
      id: subscription.id,
      planCode: subscription.planCode,
      status: subscription.status,
      billingInterval: subscription.billingInterval,
      currentPeriodStart: subscription.currentPeriodStart ?? null,
      currentPeriodEnd: subscription.currentPeriodEnd ?? null,
      cancelAtPeriodEnd: Boolean(subscription.cancelAtPeriodEnd),
    });
  } catch (err) {
    console.error("[subscription/status] error:", err);
    return res.status(500).json({ error: "Failed to get subscription status" });
  }
});

// --- SUBSCRIPTION CREATE/UPSERT (WRITE) ---
app.post("/api/subscription", async (req, res) => {
  try {
    const parentId = await resolveParentIdForSubscriptionWrite(req);
    if (!parentId) {
      const bearerToken = getBearerToken(req);
      if (bearerToken) {
        return res.status(401).json({ error: "Unauthorized" });
      }
      return res.status(400).json({ error: "parentId is required" });
    }

    const token = getBearerToken(req);
    if (token) {
      const parent = await getParentFromAuth(req);
      if (!parent) {
        return res.status(404).json({ error: "Parent not found" });
      }
    }

    const body = req.body || {};
    const planCode = typeof body.planCode === "string" && body.planCode.trim() !== "" ? body.planCode.trim() : "basic";
    const billingInterval =
      typeof body.billingInterval === "string" && body.billingInterval.trim() !== ""
        ? body.billingInterval.trim()
        : "monthly";

    const now = new Date();
    const start = typeof body.currentPeriodStart === "string" && body.currentPeriodStart.trim() !== ""
      ? body.currentPeriodStart.trim()
      : toISODateOnly(now);
    const end = typeof body.currentPeriodEnd === "string" && body.currentPeriodEnd.trim() !== ""
      ? body.currentPeriodEnd.trim()
      : toISODateOnly(new Date(now.getFullYear(), now.getMonth() + 1, now.getDate()));

    const status = typeof body.status === "string" && body.status.trim() !== "" ? body.status.trim() : "active";
    const cancelAtPeriodEnd = Boolean(body.cancelAtPeriodEnd);

    const subscription = await prisma.subscription.upsert({
      where: { parentId },
      update: {
        planCode,
        status,
        billingInterval,
        currentPeriodStart: start,
        currentPeriodEnd: end,
        cancelAtPeriodEnd,
      },
      create: {
        parentId,
        planCode,
        status,
        billingInterval,
        currentPeriodStart: start,
        currentPeriodEnd: end,
        cancelAtPeriodEnd,
      },
    });

    const billedAt =
      typeof body.billedAt === "string" && body.billedAt.trim() !== "" ? body.billedAt.trim() : start;
    const amount = typeof body.amount === "string" && body.amount.trim() !== "" ? body.amount.trim() : "0";
    const currency = typeof body.currency === "string" && body.currency.trim() !== "" ? body.currency.trim() : "USD";
    const billingStatus =
      typeof body.billingStatus === "string" && body.billingStatus.trim() !== "" ? body.billingStatus.trim() : "paid";

    const existingBilling = await prisma.subscriptionBillingRecord.findFirst({
      where: { parentId, subscriptionId: subscription.id, billedAt },
      orderBy: { createdAt: "desc" },
    });

    if (!existingBilling) {
      await prisma.subscriptionBillingRecord.create({
        data: {
          parentId,
          subscriptionId: subscription.id,
          amount,
          currency,
          status: billingStatus,
          billedAt,
        },
      });
    }

    return res.json({
      id: subscription.id,
      planCode: subscription.planCode,
      status: subscription.status,
      billingInterval: subscription.billingInterval,
      currentPeriodStart: subscription.currentPeriodStart ?? null,
      currentPeriodEnd: subscription.currentPeriodEnd ?? null,
      cancelAtPeriodEnd: Boolean(subscription.cancelAtPeriodEnd),
    });
  } catch (err) {
    console.error("[subscription] error:", err);
    return res.status(500).json({ error: "Failed to create subscription" });
  }
});

// --- SUBSCRIPTION CANCEL (WRITE) ---
app.post("/api/subscription/cancel", async (req, res) => {
  try {
    const parentId = await resolveParentIdForSubscriptionWrite(req);
    if (!parentId) {
      const bearerToken = getBearerToken(req);
      if (bearerToken) {
        return res.status(401).json({ error: "Unauthorized" });
      }
      return res.status(400).json({ error: "parentId is required" });
    }

    const token = getBearerToken(req);
    if (token) {
      const parent = await getParentFromAuth(req);
      if (!parent) {
        return res.status(404).json({ error: "Parent not found" });
      }
    }

    const existing = await prisma.subscription.findUnique({ where: { parentId } });
    if (!existing) {
      return res.status(404).json({ error: "Subscription not found" });
    }

    const updated = await prisma.subscription.update({
      where: { parentId },
      data: { cancelAtPeriodEnd: true },
    });

    return res.json({
      id: updated.id,
      planCode: updated.planCode,
      status: updated.status,
      billingInterval: updated.billingInterval,
      currentPeriodStart: updated.currentPeriodStart ?? null,
      currentPeriodEnd: updated.currentPeriodEnd ?? null,
      cancelAtPeriodEnd: Boolean(updated.cancelAtPeriodEnd),
    });
  } catch (err) {
    console.error("[subscription/cancel] error:", err);
    return res.status(500).json({ error: "Failed to cancel subscription" });
  }
});

// --- ME SUBSCRIPTION STATUS (ALIAS + AUTH) ---
app.get("/api/me/subscription/status", requireBearerAuth, async (req, res) => {
  try {
    const parent = await getParentFromAuth(req);
    if (!parent) {
      return res.json(null);
    }
    const where = { parentId: parent.id };

    const subscription = await prisma.subscription.findFirst({
      where,
      orderBy: { createdAt: "desc" },
    });

    if (!subscription) {
      return res.json(null);
    }

    return res.json({
      id: subscription.id,
      planCode: subscription.planCode,
      status: subscription.status,
      billingInterval: subscription.billingInterval,
      currentPeriodStart: subscription.currentPeriodStart ?? null,
      currentPeriodEnd: subscription.currentPeriodEnd ?? null,
      cancelAtPeriodEnd: Boolean(subscription.cancelAtPeriodEnd),
    });
  } catch (err) {
    console.error("[me/subscription/status] error:", err);
    return res.status(500).json({ error: "Failed to get subscription status" });
  }
});

// --- SUBSCRIPTION HISTORY ---
app.get("/api/subscription/history", async (req, res) => {
  try {
    const parentId = getSubscriptionParentId(req);
    const where = parentId ? { parentId } : {};

    const records = await prisma.subscriptionBillingRecord.findMany({
      where,
      orderBy: { createdAt: "desc" },
    });

    return res.json(
      records.map((r) => ({
        id: r.id,
        parentId: r.parentId,
        subscriptionId: r.subscriptionId,
        amount: r.amount,
        currency: r.currency,
        status: r.status,
        billedAt: r.billedAt,
      }))
    );
  } catch (err) {
    console.error("[subscription/history] error:", err);
    return res.status(500).json({ error: "Failed to get subscription history" });
  }
});

// --- ME SUBSCRIPTION HISTORY (ALIAS + AUTH) ---
app.get("/api/me/subscription/history", requireBearerAuth, async (req, res) => {
  try {
    const parent = await getParentFromAuth(req);
    if (!parent) {
      return res.json([]);
    }
    const where = { parentId: parent.id };

    const records = await prisma.subscriptionBillingRecord.findMany({
      where,
      orderBy: { createdAt: "desc" },
    });

    return res.json(
      records.map((r) => ({
        id: r.id,
        parentId: r.parentId,
        subscriptionId: r.subscriptionId,
        amount: r.amount,
        currency: r.currency,
        status: r.status,
        billedAt: r.billedAt,
      }))
    );
  } catch (err) {
    console.error("[me/subscription/history] error:", err);
    return res.status(500).json({ error: "Failed to get subscription history" });
  }
});

// --- SUBSCRIPTION PLANS ---
app.get("/api/subscription/plans", async (_req, res) => {
  try {
    if (!prisma?.subscriptionPlan?.findMany) {
      return res.json([]);
    }

    const plans = await prisma.subscriptionPlan.findMany({
      orderBy: { createdAt: "asc" },
    });

    return res.json(
      plans.map((p) => ({
        id: p.id,
        code: p.code,
        name: p.name,
        priceMonthly: p.priceMonthly ?? 0,
        priceYearly: p.priceYearly ?? 0,
        features: Array.isArray(p.features) ? p.features : [],
        badge: p.badge,
        popular: Boolean(p.popular),
      }))
    );
  } catch (err) {
    console.error("[subscription/plans] error:", err);
    return res.json([]);
  }
});

// --- DB HEALTH ---
app.get("/api/db/health", async (_req, res) => {
  try {
    const now = Date.now().toString();

    const record = await prisma.healthcheckRecord.upsert({
      where: { key: "health" },
      update: { value: now },
      create: { key: "health", value: now },
    });

    return res.json({ ok: true, record });
  } catch (err) {
    console.error("[db/health] error:", err);
    return res.status(500).json({ ok: false });
  }
});

// --- ME PLAYERS ---
function getDevParentIdFromToken(token) {
  const phone = getPhoneFromDevToken(token);
  return phone ? `parent-${phone}` : null;
}

const DEV_PLAYER_FALLBACK = buildPlayerResponseBody(
  { id: "player_1", name: "Голыш Марк", position: "Нападающий", team: "Hockey ID", age: 10 },
  DEFAULT_PLAYER_STATS
);
const DEV_PLAYER_DETAIL_FALLBACK = buildPlayerResponseBody(
  { id: "player_1", name: "Голыш Марк", position: "Нападающий", team: "Hockey ID Team", age: 10 },
  DEFAULT_PLAYER_STATS
);

function mapDbPlayerToResponse(p) {
  const statsFromPlayer =
    p?.stats && typeof p.stats === "object" && !Array.isArray(p.stats)
      ? p.stats
      : { games: p?.games, goals: p?.goals, assists: p?.assists, points: p?.points };
  const stats = normalizeStats(statsFromPlayer, DEFAULT_PLAYER_STATS);
  return buildPlayerResponseBody(
    {
      id: p.id,
      name: p.name,
      position: p.position ?? null,
      team: p.team ?? "Hockey ID",
      age: p.age ?? null,
      avatarUrl: p.avatarUrl ?? null,
    },
    stats
  );
}

app.get("/api/me/players", requireBearerAuth, async (req, res) => {
  const token = getBearerToken(req);
  console.log("[/api/me/players] token:", token ? `${token.slice(0, 24)}...` : "(none)");

  const devParentId = getDevParentIdFromToken(token);
  if (devParentId) {
    try {
      const players = await prisma.player.findMany({
        where: { parentId: devParentId },
        orderBy: { createdAt: "desc" },
      });
      if (Array.isArray(players) && players.length > 0) {
        const body = players.map(mapDbPlayerToResponse);
        console.log("[/api/me/players] source: db | count:", body.length, "| parentId:", devParentId);
        return res.json(body);
      }
      console.log("[/api/me/players] source: fallback | parentId:", devParentId);
      return res.json([DEV_PLAYER_FALLBACK]);
    } catch (err) {
      console.error("[/api/me/players] db error:", err?.message);
      console.log("[/api/me/players] source: fallback (error) | parentId:", devParentId);
      return res.json([DEV_PLAYER_FALLBACK]);
    }
  }

  try {
    const parent = await getParentFromAuth(req);
    if (!parent) {
      return res.json([]);
    }

    const playerModel = prisma?.player;
    const canQuery = playerModel && typeof playerModel.findMany === "function";
    if (!canQuery) {
      return res.json([]);
    }

    const players = await playerModel.findMany({
      where: { parentId: parent.id },
      orderBy: { createdAt: "desc" },
    });

    if (!Array.isArray(players) || players.length === 0) {
      console.log("[/api/me/players] source: fallback | parentId:", parent.id);
      const devFallbackPlayer = buildPlayerResponseBody(
        {
          id: "player_dev_1",
          name: "Голыш Марк",
          position: "Нападающий",
          team: "Hockey ID",
          age: 10,
        },
        DEFAULT_PLAYER_STATS
      );
      return res.json([devFallbackPlayer]);
    }

    console.log("[/api/me/players] source: db | count:", players.length, "| parentId:", parent.id);
    return res.json(
      players.map((p) => {
        const basePlayer = {
          id: p.id,
          name: p.name,
          position: p.position ?? null,
          team: p.team ?? "Hockey ID",
          age: p.age ?? null,
          avatarUrl: p.avatarUrl ?? null,
        };

        const statsFromPlayer =
          p &&
          typeof p === "object" &&
          p.stats &&
          typeof p.stats === "object" &&
          !Array.isArray(p.stats)
            ? p.stats
            : {
                games: p?.games,
                goals: p?.goals,
                assists: p?.assists,
                points: p?.points,
              };

        const stats = normalizeStats(statsFromPlayer, DEFAULT_PLAYER_STATS);
        return buildPlayerResponseBody(basePlayer, stats);
      })
    );
  } catch (err) {
    console.error("[/api/me/players] error:", err);
    return res.json([]);
  }
});

app.get("/api/me/players/:id", requireBearerAuth, async (req, res) => {
  const token = getBearerToken(req);
  const playerId = req.params?.id;
  console.log("[/api/me/players/:id] token:", token ? `${String(token).slice(0, 24)}...` : "(none)", "playerId:", playerId);

  const devParentId = getDevParentIdFromToken(token);
  if (devParentId) {
    try {
      const player = await prisma.player.findFirst({
        where: { id: playerId, parentId: devParentId },
      });
      if (player) {
        const body = await attachLatestSessionEvaluation(mapDbPlayerToResponse(player), player.id);
        console.log("[/api/me/players/:id] source: db | playerId:", playerId, "| parentId:", devParentId);
        return res.json(body);
      }
      if (playerId === "player_1") {
        console.log("[/api/me/players/:id] source: fallback | playerId:", playerId, "| parentId:", devParentId);
        return res.json(await attachLatestSessionEvaluation(DEV_PLAYER_DETAIL_FALLBACK, "player_1"));
      }
      return res.status(404).json({ error: "Игрок не найден" });
    } catch (err) {
      console.error("[/api/me/players/:id] db error:", err?.message);
      if (playerId === "player_1") {
        console.log("[/api/me/players/:id] source: fallback (error) | playerId:", playerId);
        return res.json(await attachLatestSessionEvaluation(DEV_PLAYER_DETAIL_FALLBACK, "player_1"));
      }
      return res.status(404).json({ error: "Игрок не найден" });
    }
  }

  try {
    const parent = await getParentFromAuth(req);
    if (!parent) {
      return res.status(404).json({ error: "Parent not found" });
    }

    const playerModel = prisma?.player;
    if (!playerModel) {
      return res.status(500).json({ error: "Failed to get player" });
    }

    let player = null;
    if (typeof playerModel.findUnique === "function") {
      player = await playerModel.findUnique({ where: { id: playerId } });
    } else if (typeof playerModel.findFirst === "function") {
      player = await playerModel.findFirst({ where: { id: playerId, parentId: parent.id } });
    }

    if (player && player.parentId && player.parentId !== parent.id) {
      player = null;
    }

    if (!player) {
      if (playerId === "player_1") {
        console.log("[/api/me/players/:id] source: fallback | playerId:", playerId, "| parentId:", parent.id);
        return res.json(await attachLatestSessionEvaluation(DEV_PLAYER_DETAIL_FALLBACK, "player_1"));
      }
      return res.status(404).json({ error: "Игрок не найден" });
    }

    const statsFromPlayer =
      player &&
      typeof player === "object" &&
      player.stats &&
      typeof player.stats === "object" &&
      !Array.isArray(player.stats)
        ? player.stats
        : {
            games: player.games,
            goals: player.goals,
            assists: player.assists,
            points: player.points,
          };

    const stats = normalizeStats(statsFromPlayer, DEFAULT_PLAYER_STATS);

    const responseBody = buildPlayerResponseBody(
      {
        id: player.id,
        name: player.name,
        position: player.position ?? null,
        team: player.team ?? "Hockey ID",
        age: player.age ?? null,
        avatarUrl: player.avatarUrl ?? null,
      },
      stats
    );

    console.log("[/api/me/players/:id] source: db | playerId:", playerId, "| parentId:", parent.id);
    return res.json(await attachLatestSessionEvaluation(responseBody, player.id));
  } catch (err) {
    console.error("[/api/me/players/:id] error:", err);
    return res.status(500).json({ error: "Failed to get player" });
  }
});

// --- PLAYER STATS (PUBLIC) ---
app.get("/api/players/:id/stats", async (req, res) => {
  try {
    const playerId = req.params?.id;
    if (typeof playerId !== "string" || playerId.trim() === "") {
      return res.status(404).json({ error: "Player not found" });
    }

    const player = await prisma.player.findUnique({ where: { id: playerId } });
    if (!player) {
      return res.status(404).json({ error: "Player not found" });
    }

    const toNum = (v) => (typeof v === "number" && Number.isFinite(v) ? v : null);
    const games = toNum(player.games) ?? 0;
    const goals = toNum(player.goals) ?? 0;
    const assists = toNum(player.assists) ?? 0;
    const points = toNum(player.points) ?? goals + assists;

    return res.json({ games, goals, assists, points });
  } catch (err) {
    console.error("[/api/players/:id/stats] error:", err);
    return res.status(500).json({ error: "Failed to get player stats" });
  }
});

app.get("/api/players/:id/evaluation-summary", requireBearerAuth, async (req, res) => {
  try {
    const playerId = typeof req.params?.id === "string" ? req.params.id.trim() : "";
    if (!playerId) {
      return res.status(404).json({ error: "Player not found" });
    }

    const allowed = await canParentAccessPlayer(req, playerId);
    if (!allowed) {
      return res.status(403).json({ error: "Forbidden" });
    }

    const fromDate = req.query?.fromDate;
    const toDate = req.query?.toDate;
    if (typeof fromDate !== "string" || typeof toDate !== "string") {
      return res.status(400).json({ error: "fromDate and toDate required (YYYY-MM-DD)" });
    }

    const range = parseEvaluationDateRangeISO(fromDate.trim(), toDate.trim());
    if (!range) {
      return res.status(400).json({ error: "Invalid fromDate or toDate" });
    }

    const summary = await computeEvaluationSummary(playerId, range.from, range.to);
    return res.json(summary);
  } catch (err) {
    console.error("[/api/players/:id/evaluation-summary] error:", err?.message);
    return res.status(500).json({ error: "Failed to load evaluation summary" });
  }
});

// --- PLAYER RECOMMENDATIONS (PUBLIC, DETERMINISTIC) ---
app.get("/api/parent/mobile/player/:id/recommendations", async (req, res) => {
  try {
    const playerId = req.params?.id;
    if (typeof playerId !== "string" || playerId.trim() === "") {
      return res.status(404).json({ error: "Player not found" });
    }

    const player = await prisma.player.findUnique({ where: { id: playerId } });
    if (!player) {
      return res.status(404).json({ error: "Player not found" });
    }

    const position = typeof player.position === "string" ? player.position.toLowerCase() : "";
    const age = typeof player.age === "number" && Number.isFinite(player.age) ? player.age : null;
    const games = typeof player.games === "number" && Number.isFinite(player.games) ? player.games : 0;
    const goals = typeof player.goals === "number" && Number.isFinite(player.goals) ? player.goals : 0;
    const assists =
      typeof player.assists === "number" && Number.isFinite(player.assists) ? player.assists : 0;
    const points = typeof player.points === "number" && Number.isFinite(player.points) ? player.points : goals + assists;

    const pointsPerGame = games > 0 ? points / games : null;
    const isFinisher = goals >= assists;

    const recs = [];
    const id1 = `rec_1_${playerId}`;
    const id2 = `rec_2_${playerId}`;
    const id3 = `rec_3_${playerId}`;

    if (position === "forward" || position.includes("forward")) {
      recs.push({
        id: id1,
        title: isFinisher ? "Фокус на завершение атак" : "Фокус на передачи и открывания",
        description:
          isFinisher
            ? "Упражнения на бросок из разных позиций и добивание после неудачных отскоков."
            : "Тренируйте создание моментов: позиционное открывание и передача партнёру в движении.",
      });
    } else if (position === "defense" || position === "defender") {
      recs.push({
        id: id1,
        title: "Фокус на первом пас и позиционную оборону",
        description:
          "Практикуйте выход из зоны через первый пас и сохраняйте позицию в защите под давлением.",
      });
    } else {
      recs.push({
        id: id1,
        title: "Фокус на универсальные навыки",
        description: "Катание, техника работы клюшкой и игровое мышление на каждом занятии.",
      });
    }

    if (pointsPerGame !== null) {
      if (pointsPerGame >= 0.8) {
        recs.push({
          id: id2,
          title: "Усилить сильные стороны через повторяемость",
          description:
            "При высокой результативности улучшайте качество повторов: одинаково хорошие решения в каждой смене.",
        });
      } else if (pointsPerGame >= 0.4) {
        recs.push({
          id: id2,
          title: "Стабилизировать вклад в атаку",
          description:
            "Сделайте упор на регулярность: небольшие улучшения (1–2 привычки) заметно поднимут очки за игры.",
        });
      } else {
        recs.push({
          id: id2,
          title: "Наработать базу результативности",
          description:
            "Работайте над созданием моментов и броском по воротам: больше качественных попыток из правильной позиции.",
        });
      }
    } else {
      recs.push({
        id: id2,
        title: "Заполнить статистику и выбрать ближайший фокус",
        description:
          "Добавьте данные игр и очков: тогда рекомендации станут точнее. Начните с одного фокуса на 2 недели.",
      });
    }

    if (age !== null && age <= 12) {
      recs.push({
        id: id3,
        title: "Возрастной приоритет: техника и фундамент",
        description: "Лучше короткие занятия чаще: техника, баланс, координация и правильные движения клюшкой.",
      });
    } else {
      recs.push({
        id: id3,
        title: "Связать тренировку с игровой задачей",
        description:
          "Одна конкретная цель на занятие и закрепление в играх: контроль выполнения критериев в течение недели.",
      });
    }

    return res.json(recs);
  } catch (err) {
    console.error("[/api/parent/mobile/player/:id/recommendations] error:", err);
    return res.status(500).json({ error: "Failed to get recommendations" });
  }
});

// --- PLAYER AI ANALYSIS (DB-backed, deterministic) ---
function buildPlayerAiAnalysis(player) {
  const name = typeof player?.name === "string" && player.name.trim() !== "" ? player.name.trim() : "Игрок";
  const position =
    typeof player?.position === "string" && player.position.trim() !== "" ? player.position.trim() : "Unknown";
  const team = typeof player?.team === "string" && player.team.trim() !== "" ? player.team.trim() : null;
  const age = typeof player?.age === "number" && Number.isFinite(player.age) ? player.age : null;

  const games = typeof player?.games === "number" && Number.isFinite(player.games) ? player.games : null;
  const goals = typeof player?.goals === "number" && Number.isFinite(player.goals) ? player.goals : null;
  const assists = typeof player?.assists === "number" && Number.isFinite(player.assists) ? player.assists : null;
  const points = typeof player?.points === "number" && Number.isFinite(player.points) ? player.points : null;

  const hasStats = games !== null && games > 0 && (goals !== null || assists !== null || points !== null);
  const safeGoals = typeof goals === "number" ? goals : 0;
  const safeAssists = typeof assists === "number" ? assists : 0;
  const safePoints = typeof points === "number" ? points : safeGoals + safeAssists;
  const safeGames = typeof games === "number" && games > 0 ? games : null;

  const ppg = safeGames ? safePoints / safeGames : null;
  const gpg = safeGames ? safeGoals / safeGames : null;
  const apg = safeGames ? safeAssists / safeGames : null;

  const roleHint =
    position.toLowerCase() === "forward"
      ? "атакующий игрок"
      : position.toLowerCase() === "defense" || position.toLowerCase() === "defender"
        ? "игрок обороны"
        : "игрок";

  const strengths = [];
  const growthAreas = [];
  const recommendations = [];
  const coachFocus = [];

  if (!hasStats) {
    strengths.push("Есть базовые данные профиля — можно начать планировать развитие.");
    growthAreas.push("Недостаточно статистики для точного анализа (нужны игры и очки).");
    recommendations.push("Добавьте статистику: игры, голы, передачи, очки — чтобы анализ стал точнее.");
    coachFocus.push("Сбор базовой статистики и постановка измеримых целей на 2–4 недели.");
  } else {
    if (ppg !== null) {
      if (ppg >= 1.0) strengths.push("Высокая результативность: более 1.0 очка за игру.");
      else if (ppg >= 0.6) strengths.push("Стабильная результативность: около 0.6+ очка за игру.");
      else growthAreas.push("Результативность ниже среднего — можно усилить вклад в атаке.");
    }

    if (gpg !== null && apg !== null) {
      if (gpg > apg) strengths.push("Ярко выраженная роль завершителя атак (голы преобладают).");
      else if (apg > gpg) strengths.push("Сильная роль плеймейкера (передачи преобладают).");
      else strengths.push("Сбалансированная игра: голы и передачи распределены равномерно.");
    }

    if (safeGames !== null && safeGames >= 30) strengths.push("Хорошая игровая практика — большой объём матчей.");
    if (safeGames !== null && safeGames < 15) growthAreas.push("Мало матчей — статистика может быть нестабильной.");

    if (roleHint === "атакующий игрок") {
      recommendations.push("Фокус: скорость принятия решений в атаке и работа без шайбы.");
      coachFocus.push("1) Выход из-под опеки 2) Получение передачи в движении 3) Завершение с ходу.");
    } else if (roleHint === "игрок обороны") {
      recommendations.push("Фокус: первый пас и контроль синей линии.");
      coachFocus.push("1) Первый пас под давлением 2) Чтение игры 3) Позиционная оборона.");
    } else {
      recommendations.push("Фокус: универсальные навыки — катание, техника, игровое мышление.");
      coachFocus.push("1) Катание 2) Работа клюшкой 3) Принятие решений.");
    }

    if (age !== null && age <= 12) {
      recommendations.push("Возрастной приоритет: техника и фундаментальные навыки важнее объёма силовой работы.");
      growthAreas.push("Старайтесь избегать перегрузки: лучше короткие, но регулярные тренировки.");
    }
  }

  const identity = [name, roleHint, team ? `команда: ${team}` : null, age !== null ? `возраст: ${age}` : null]
    .filter(Boolean)
    .join(", ");

  const summaryParts = [];
  summaryParts.push(identity);
  if (hasStats) {
    summaryParts.push(`матчи: ${safeGames ?? 0}, очки: ${safePoints}, голы: ${safeGoals}, передачи: ${safeAssists}`);
    if (ppg !== null) summaryParts.push(`очки/игра: ${ppg.toFixed(2)}`);
  } else {
    summaryParts.push("статистика не заполнена");
  }

  const motivation = hasStats
    ? "Небольшие улучшения в 1–2 навыках дадут заметный рост статистики уже в ближайших играх."
    : "Заполните статистику и выберите один фокус на ближайшие 2 недели — так прогресс будет заметнее.";

  return {
    summary: summaryParts.join(" • "),
    strengths,
    growthAreas,
    recommendations,
    coachFocus,
    motivation,
    metrics: {
      games: safeGames ?? 0,
      goals: safeGoals,
      assists: safeAssists,
      points: safePoints,
      pointsPerGame: ppg !== null ? Number(ppg.toFixed(2)) : null,
      goalsPerGame: gpg !== null ? Number(gpg.toFixed(2)) : null,
      assistsPerGame: apg !== null ? Number(apg.toFixed(2)) : null,
    },
  };
}

app.get("/api/player/:id/ai-analysis", async (req, res) => {
  try {
    const playerId = req.params?.id;
    if (typeof playerId !== "string" || playerId.trim() === "") {
      return res.status(400).json({ error: "playerId is required" });
    }

    const player = await prisma.player.findUnique({ where: { id: playerId } });
    if (!player) {
      return res.status(404).json({ error: "Player not found" });
    }

    return res.json(buildPlayerAiAnalysis(player));
  } catch (err) {
    console.error("[/api/player/:id/ai-analysis] error:", err);
    return res.status(500).json({ error: "Failed to build ai analysis" });
  }
});

// --- FEED (Prisma-backed minimal first version) ---
function mapFeedPost(p) {
  return {
    id: p.id,
    teamId: p.teamId ?? null,
    teamName: p.teamName ?? null,
    authorId: p.authorId ?? null,
    authorName: p.authorName ?? null,
    authorRole: p.authorRole ?? null,
    type: p.type ?? null,
    title: p.title ?? null,
    body: p.body ?? null,
    imageUrl: p.imageUrl ?? null,
    isPinned: Boolean(p.isPinned),
    createdAt: p.createdAt,
    updatedAt: p.updatedAt,
    publishedAt: p.publishedAt ?? null,
  };
}

app.get("/api/feed", async (_req, res) => {
  try {
    const posts = await prisma.feedPost.findMany({
      orderBy: [{ isPinned: "desc" }, { createdAt: "desc" }],
    });
    return res.json(Array.isArray(posts) ? posts.map(mapFeedPost) : []);
  } catch (err) {
    console.error("[/api/feed] error:", err);
    return res.json([]);
  }
});

app.get("/api/feed/:postId", async (req, res) => {
  try {
    const postId = req.params?.postId;
    if (typeof postId !== "string" || postId.trim() === "") {
      return res.status(404).json({ error: "Post not found" });
    }

    const post = await prisma.feedPost.findUnique({ where: { id: postId } });
    if (!post) {
      return res.status(404).json({ error: "Post not found" });
    }

    return res.json(mapFeedPost(post));
  } catch (err) {
    console.error("[/api/feed/:postId] error:", err);
    return res.status(500).json({ error: "Failed to get post" });
  }
});

// --- CHAT (Prisma-backed minimal first version) ---
function mapChatConversation(c) {
  return {
    id: c.id,
    playerId: c.playerId,
    playerName: c.playerName,
    coachId: c.coachId,
    coachName: c.coachName,
    parentId: c.parentId,
    lastMessage: c.lastMessage ?? null,
    updatedAt: c.updatedAt,
  };
}

function mapChatMessage(m) {
  return {
    id: m.id,
    conversationId: m.conversationId,
    senderType: m.senderType,
    senderId: m.senderId,
    text: m.text,
    createdAt: m.createdAt,
    readAt: m.readAt ?? null,
  };
}

async function resolveChatParentOr401(req, res) {
  // Priority: Bearer token (existing behavior).
  const parentFromBearer = await getParentFromAuth(req);
  if (parentFromBearer) return parentFromBearer;

  // Fallback for internal testing/mobile: allow parent resolution by id.
  // Order: x-parent-id header -> ?parentId -> body.parentId
  const fromHeader = req.get("x-parent-id");
  const fromQuery = req.query?.parentId;
  const fromBody = req.body?.parentId;

  const fallbackParentId =
    (typeof fromHeader === "string" && fromHeader.trim() !== "" && fromHeader.trim()) ||
    (typeof fromQuery === "string" && fromQuery.trim() !== "" && fromQuery.trim()) ||
    (typeof fromBody === "string" && fromBody.trim() !== "" && fromBody.trim()) ||
    null;

  if (fallbackParentId) {
    try {
      const parent = await prisma.parent.findUnique({ where: { id: fallbackParentId } });
      if (parent) return parent;
    } catch (_err) {
      // Fall through to 401.
    }
  }

  res.status(401).json({ error: "Unauthorized" });
  return null;
}

app.get("/api/chat/conversations", async (req, res) => {
  try {
    const parent = await resolveChatParentOr401(req, res);
    if (!parent) return;

    const conversations = await prisma.chatConversation.findMany({
      where: { parentId: parent.id },
      orderBy: { updatedAt: "desc" },
    });

    return res.json(Array.isArray(conversations) ? conversations.map(mapChatConversation) : []);
  } catch (err) {
    console.error("[/api/chat/conversations] error:", err);
    return res.status(500).json({ error: "Failed to get conversations" });
  }
});

app.post("/api/chat/conversations", async (req, res) => {
  try {
    const parent = await resolveChatParentOr401(req, res);
    if (!parent) return;

    const body = req.body || {};
    const playerId = body.playerId;
    if (typeof playerId !== "string" || playerId.trim() === "") {
      return res.status(400).json({ error: "playerId is required" });
    }

    const player = await prisma.player.findFirst({
      where: { id: playerId, parentId: parent.id },
    });
    if (!player) {
      return res.status(404).json({ error: "Player not found" });
    }

    const existing = await prisma.chatConversation.findFirst({
      where: { parentId: parent.id, playerId: player.id },
    });

    if (existing) {
      return res.json(mapChatConversation(existing));
    }

    const DEFAULT_COACH_ID = "coach_default";
    const DEFAULT_COACH_NAME = "Тренер команды";

    const created = await prisma.chatConversation.create({
      data: {
        id: `conv_${Date.now()}_${parent.id}`,
        playerId: player.id,
        playerName: player.name,
        coachId: DEFAULT_COACH_ID,
        coachName: DEFAULT_COACH_NAME,
        parentId: parent.id,
        lastMessage: null,
      },
    });

    return res.json(mapChatConversation(created));
  } catch (err) {
    console.error("[/api/chat/conversations] error:", err);
    return res.status(500).json({ error: "Failed to create conversation" });
  }
});

app.get("/api/chat/conversations/:conversationId/messages", async (req, res) => {
  try {
    const parent = await resolveChatParentOr401(req, res);
    if (!parent) return;

    const conversationId = req.params?.conversationId;
    if (typeof conversationId !== "string" || conversationId.trim() === "") {
      return res.status(404).json({ error: "Conversation not found" });
    }

    const conversation = await prisma.chatConversation.findFirst({
      where: { id: conversationId, parentId: parent.id },
    });
    if (!conversation) {
      return res.status(404).json({ error: "Conversation not found" });
    }

    const messages = await prisma.chatMessage.findMany({
      where: { conversationId },
      orderBy: { createdAt: "asc" },
    });

    return res.json(Array.isArray(messages) ? messages.map(mapChatMessage) : []);
  } catch (err) {
    console.error("[/api/chat/conversations/:conversationId/messages] error:", err);
    return res.status(500).json({ error: "Failed to get messages" });
  }
});

app.post("/api/chat/conversations/:conversationId/messages", async (req, res) => {
  try {
    const parent = await resolveChatParentOr401(req, res);
    if (!parent) return;

    const conversationId = req.params?.conversationId;
    if (typeof conversationId !== "string" || conversationId.trim() === "") {
      return res.status(404).json({ error: "Conversation not found" });
    }

    const conversation = await prisma.chatConversation.findFirst({
      where: { id: conversationId, parentId: parent.id },
    });
    if (!conversation) {
      return res.status(404).json({ error: "Conversation not found" });
    }

    const body = req.body || {};
    const text = typeof body.text === "string" ? body.text.trim() : "";
    if (!text) {
      return res.status(400).json({ error: "text is required" });
    }

    const createdMessage = await prisma.chatMessage.create({
      data: {
        id: `msg_${Date.now()}_${parent.id}`,
        conversationId,
        senderType: "parent",
        senderId: parent.id,
        text,
      },
    });

    await prisma.chatConversation.update({
      where: { id: conversationId },
      data: { lastMessage: text },
    });

    return res.json(mapChatMessage(createdMessage));
  } catch (err) {
    console.error("[/api/chat/conversations/:conversationId/messages] error:", err);
    return res.status(500).json({ error: "Failed to send message" });
  }
});

// --- AI CHAT (Coach Mark) ---
const COACH_MARK_SYSTEM = `Ты Coach Mark — профессиональный хоккейный тренер, помогающий юным игрокам и их родителям. Отвечай на русском. Стиль: ясно, по делу, поддерживающе.

Ты даёшь практические советы по: развитию навыков, тренировкам, игровому мышлению, восстановлению, питанию, мотивации.

Правила:
- Ответы короткие: 2–4 предложения. Без воды.
- Не заменяй врача. При травмах, боли, здоровье — рекомендуй обратиться к специалисту.
- Не обещай карьерный результат ("станет звездой"). Говори о развитии в целом.
- Не используй "я гарантирую", "100%". Будь осторожен в прогнозах.
- При жёстком давлении на ребёнка — отвечай бережно.
- Используй только факты из контекста. Не придумывай данные о конкретном игроке.`;

const AI_FALLBACK_ON_ERROR = "Сейчас не удалось получить ответ. Попробуйте ещё раз через минуту.";
const AI_FALLBACK_NO_KEY = "Coach Mark временно недоступен. Добавьте OPENAI_API_KEY в .env (см. .env.example). Ключ: https://platform.openai.com/api-keys";

function traceId() {
  return Date.now().toString(36) + Math.random().toString(36).slice(2, 8);
}

function logCoachMark(traceIdOrNull, event, data) {
  const safe = { event, ...data };
  if (traceIdOrNull) safe.traceId = traceIdOrNull;
  console.log("[coachmark]", JSON.stringify(safe));
}

async function getOrCreateCoachMarkConversation(parentId) {
  let conv = await prisma.coachMarkConversation.findUnique({
    where: { parentId },
    include: { messages: { orderBy: { createdAt: "asc" } } },
  });
  const created = !conv;
  if (!conv) {
    conv = await prisma.coachMarkConversation.create({
      data: { id: `coachmark_${Date.now()}_${parentId}`, parentId },
      include: { messages: { orderBy: { createdAt: "asc" } } },
    });
  }
  return { conv, created };
}

function mapCoachMarkMessage(m) {
  return {
    id: m.id,
    conversationId: m.conversationId,
    senderType: m.senderType,
    senderId: m.senderId ?? null,
    text: m.text,
    createdAt: m.createdAt,
  };
}

app.get("/api/chat/ai/conversation", async (req, res) => {
  const token = getBearerToken(req);
  const parentId = req.get("x-parent-id") || req.query?.parentId || "";
  console.log("[coach-mark] token:", token ? `${String(token).slice(0, 24)}...` : "(none)", "parentId:", parentId);

  if (token && String(token).startsWith("dev-token-parent-")) {
    const response = {
      conversation: { id: "coach_mark_default" },
      messages: [],
    };
    console.log("[coach-mark] response:", JSON.stringify(response));
    return res.json(response);
  }

  const t = traceId();
  try {
    const parent = await resolveChatParentOr401(req, res);
    if (!parent) return;

    logCoachMark(t, "get_conversation_in", { parentId: parent.id });

    const { conv, created } = await getOrCreateCoachMarkConversation(parent.id);
    const msgCount = conv.messages.length;

    logCoachMark(t, "get_conversation_out", {
      parentId: parent.id,
      conversationId: conv.id,
      created,
      messagesCount: msgCount,
    });

    return res.json({
      conversation: {
        id: conv.id,
        parentId: conv.parentId,
        createdAt: conv.createdAt,
        updatedAt: conv.updatedAt,
      },
      messages: conv.messages.map(mapCoachMarkMessage),
    });
  } catch (err) {
    logCoachMark(t, "get_conversation_error", {});
    console.error("[/api/chat/ai/conversation] error:", err);
    return res.status(500).json({ error: "Failed to get Coach Mark conversation" });
  }
});

const COACH_MARK_SYSTEM_SHORT = "Ты Coach Mark — профессиональный хоккейный тренер. Ты помогаешь родителям и детям развиваться в хоккее. Отвечай понятно, поддерживающе и практично.";

app.post("/api/chat/ai/message", async (req, res) => {
  const token = getBearerToken(req);
  if (token && String(token).startsWith("dev-token-parent-")) {
    const body = req.body || {};
    const text = typeof body.text === "string" ? body.text.trim() : "";
    if (!text) {
      return res.json({ text: "Напишите ваш вопрос.", isAI: true });
    }

    const apiKey = process.env.OPENAI_API_KEY;
    let reply;
    if (!apiKey || typeof apiKey !== "string" || apiKey.trim() === "") {
      reply = `Dev reply (no API key): ${text.slice(0, 50)}`;
    } else {
      try {
        const OpenAI = require("openai");
        const openai = new OpenAI({ apiKey: apiKey.trim(), timeout: 15000 });
        const completion = await openai.chat.completions.create({
          model: "gpt-4o-mini",
          messages: [
            { role: "system", content: COACH_MARK_SYSTEM_SHORT },
            { role: "user", content: text.slice(0, 400) },
          ],
          max_tokens: 256,
          temperature: 0.6,
        });
        reply = completion?.choices?.[0]?.message?.content?.trim() || AI_FALLBACK_ON_ERROR;
      } catch (err) {
        console.error("[coach-mark] OpenAI error:", err?.message ?? err);
        reply = `Dev reply (API error): ${text.slice(0, 30)}...`;
      }
    }
    console.log("[coach-mark] AI response", reply?.slice(0, 80) ?? "(empty)");
    return res.json({ text: reply, isAI: true });
  }

  const t = traceId();
  try {
    const parent = await resolveChatParentOr401(req, res);
    if (!parent) return;

    const body = req.body || {};
    const text = typeof body.text === "string" ? body.text.trim() : "";
    if (!text) {
      return res.status(400).json({ error: "text is required" });
    }

    const rawHistory = Array.isArray(body.history) ? body.history : [];
    const history = rawHistory.slice(-10);
    const playerContext = body.playerContext && typeof body.playerContext === "object" ? body.playerContext : null;
    const rawMemories = Array.isArray(body.memories) ? body.memories : [];
    const memories = rawMemories.slice(0, 5).filter((m) => typeof m === "string" && m.trim());

    logCoachMark(t, "post_message_in", {
      parentId: parent.id,
      hasText: !!text,
      textLen: text.length,
      historyCount: history.length,
      hasPlayerContext: !!(playerContext && Object.keys(playerContext).length > 0),
      memoriesCount: memories.length,
    });

    const { conv, created } = await getOrCreateCoachMarkConversation(parent.id);

    logCoachMark(t, "post_message_conv", {
      parentId: parent.id,
      conversationId: conv.id,
      convCreated: created,
    });

    let reply;
    const apiKey = process.env.OPENAI_API_KEY;
    if (!apiKey || typeof apiKey !== "string" || apiKey.trim() === "") {
      reply = AI_FALLBACK_NO_KEY;
      logCoachMark(t, "post_message_path", { path: "no_key_fallback" });
    } else {
      let systemContent = COACH_MARK_SYSTEM;
      if (playerContext && Object.keys(playerContext).length > 0) {
        const ctxStr = JSON.stringify(playerContext).slice(0, 400);
        systemContent += "\n\nКонтекст по ребёнку (используй только указанное): " + ctxStr;
      }
      if (memories.length > 0) {
        systemContent += "\n\nНаблюдения/предпочтения (мягко учитывай): " + memories.join("; ");
      }
      systemContent = systemContent.slice(0, 2000);

      const messages = [{ role: "system", content: systemContent }];

      const MAX_MSG_LEN = 400;
      for (const h of history) {
        const role = h.role === "assistant" ? "assistant" : "user";
        const raw = typeof h.content === "string" ? h.content : (h.text || String(h));
        const content = typeof raw === "string" && raw.trim() ? raw.trim().slice(0, MAX_MSG_LEN) : "";
        if (content) messages.push({ role, content });
      }
      messages.push({ role: "user", content: text.slice(0, MAX_MSG_LEN) });

      try {
        const OpenAI = require("openai");
        const openai = new OpenAI({
          apiKey: apiKey.trim(),
          timeout: 15000,
        });
        const completion = await openai.chat.completions.create({
          model: "gpt-4o-mini",
          messages,
          max_tokens: 256,
          temperature: 0.6,
        });
        reply = completion?.choices?.[0]?.message?.content?.trim() || AI_FALLBACK_ON_ERROR;
        logCoachMark(t, "post_message_path", { path: "openai_success" });
      } catch (openaiErr) {
        logCoachMark(t, "post_message_path", { path: "openai_error_fallback" });
        console.error("[/api/chat/ai/message] OpenAI error:", openaiErr?.message ?? String(openaiErr));
        reply = AI_FALLBACK_ON_ERROR;
      }
    }

    await prisma.coachMarkMessage.createMany({
      data: [
        {
          conversationId: conv.id,
          senderType: "parent",
          senderId: parent.id,
          text: text.slice(0, 2000),
        },
        {
          conversationId: conv.id,
          senderType: "assistant",
          senderId: null,
          text: reply.slice(0, 2000),
        },
      ],
    });
    await prisma.coachMarkConversation.update({
      where: { id: conv.id },
      data: { updatedAt: new Date() },
    });

    logCoachMark(t, "post_message_persist", {
      parentId: parent.id,
      conversationId: conv.id,
      messagesSaved: 2,
      success: true,
    });

    return res.json({ text: reply, isAI: true });
  } catch (err) {
    logCoachMark(t, "post_message_error", {});
    console.error("[/api/chat/ai/message] error:", err);
    return res.json({ text: AI_FALLBACK_ON_ERROR, isAI: true });
  }
});

// --- SCHEDULE (SERVER-BACKED FIRST VERSION; NO DB MODELS YET) ---
app.get("/api/me/schedule", requireBearerAuth, async (req, res) => {
  try {
    const token = getBearerToken(req);
    let parentId = getDevParentIdFromToken(token);
    if (!parentId) {
      const parent = await getParentFromAuth(req);
      parentId = parent?.id ?? null;
    }
    if (!parentId) {
      return res.status(401).json({ error: "Unauthorized" });
    }

    const players = await prisma.player.findMany({
      where: { parentId },
      select: { team: true },
    });
    const teamIds = [...new Set(
      (players || [])
        .map((p) => mapTeamToTeamId(p.team))
        .filter((id) => id != null)
    )];

    if (teamIds.length === 0) {
      console.log("[/api/me/schedule] parentId:", parentId, "no teamIds from players → []");
      return res.json([]);
    }

    const rows = await prisma.scheduleEvent.findMany({
      where: { teamId: { in: teamIds } },
      orderBy: { startTime: "asc" },
    });
    console.log("[/api/me/schedule] parentId:", parentId, "teamIds:", teamIds.length, "events:", (rows || []).length);
    return res.json(
      (rows || []).map((r) => ({
        id: r.id,
        title: r.title ?? null,
        startTime: r.startTime.toISOString(),
        date: r.startTime.toISOString().slice(0, 10),
        location: r.location ?? null,
        teamId: r.teamId,
      }))
    );
  } catch (err) {
    console.error("[/api/me/schedule] error:", err?.message);
    return res.json([]);
  }
});

// --- COACH AUTH (Bearer primary, x-coach-id/body fallback in dev) ---
const isDevCoachFallback = !isProduction && process.env.DEV_AUTH === "true";

function decodeCoachToken(token) {
  if (typeof token !== "string" || token.trim() === "") return null;
  // Future: JWT decode — add here when production auth is ready
  // const payload = tryDecodeJWT(token);
  // if (payload?.role === "coach" && payload?.coachId) return payload.coachId;
  const prefix = "dev-token-coach-";
  if (!token.startsWith(prefix)) return null;
  const coachId = token.slice(prefix.length).trim();
  return coachId !== "" ? coachId : null;
}

function getCoachId(req) {
  const token = getBearerToken(req);
  if (token) {
    const fromToken = decodeCoachToken(token);
    if (fromToken) return fromToken;
  }
  if (isDevCoachFallback) {
    const fromHeader = req.get("x-coach-id");
    if (typeof fromHeader === "string" && fromHeader.trim() !== "") return fromHeader.trim();
    const fromBody = req.body?.coachId;
    if (typeof fromBody === "string" && fromBody.trim() !== "") return fromBody.trim();
  }
  return null;
}

function getCoachIdOr401(req, res) {
  const coachId = getCoachId(req);
  if (!coachId) {
    res.status(401).json({ error: "Unauthorized" });
    return null;
  }
  return coachId;
}

app.post("/api/coach/auth/dev-token", (req, res) => {
  if (!isDevCoachFallback) {
    return res.status(404).json({ error: "Not available" });
  }
  const body = req.body || {};
  const coachId = typeof body.coachId === "string" ? body.coachId.trim() : "";
  if (!coachId) {
    return res.status(400).json({ error: "coachId required" });
  }
  return res.json({ token: `dev-token-coach-${coachId}`, coachId });
});

app.post("/api/coach/sessions/start", async (req, res) => {
  try {
    const coachId = getCoachIdOr401(req, res);
    if (!coachId) return;
    const body = req.body || {};
    const teamId = typeof body.teamId === "string" ? body.teamId.trim() : "";
    if (!teamId) {
      return res.status(400).json({ error: "teamId required" });
    }

    const existing = await prisma.trainingSession.findFirst({
      where: { coachId, teamId, status: "active" },
      orderBy: { startedAt: "desc" },
    });
    if (existing) {
      emitEvent("session.started", { sessionId: existing.id, coachId, teamId, resumed: true });
      return res.json({
        id: existing.id,
        coachId: existing.coachId,
        teamId: existing.teamId,
        status: existing.status,
        startedAt: existing.startedAt.toISOString(),
        endedAt: existing.endedAt?.toISOString() ?? null,
        createdAt: existing.createdAt.toISOString(),
        resumed: true,
      });
    }

    const session = await prisma.trainingSession.create({
      data: { coachId, teamId, status: "active" },
    });
    emitEvent("session.started", { sessionId: session.id, coachId, teamId, resumed: false });
    return res.status(201).json({
      id: session.id,
      coachId: session.coachId,
      teamId: session.teamId,
      status: session.status,
      startedAt: session.startedAt.toISOString(),
      endedAt: session.endedAt?.toISOString() ?? null,
      createdAt: session.createdAt.toISOString(),
      resumed: false,
    });
  } catch (err) {
    console.error("[coach/sessions/start] error:", err?.message);
    return res.status(500).json({ error: "Failed to start session" });
  }
});

app.get("/api/coach/sessions/active", async (req, res) => {
  try {
    const coachId = getCoachIdOr401(req, res);
    if (!coachId) return;
    const teamId = typeof req.query?.teamId === "string" ? req.query.teamId.trim() : null;

    const where = { coachId, status: "active" };
    if (teamId) where.teamId = teamId;

    const session = await prisma.trainingSession.findFirst({
      where,
      orderBy: { startedAt: "desc" },
    });
    if (!session) {
      return res.json(null);
    }
    return res.json({
      id: session.id,
      coachId: session.coachId,
      teamId: session.teamId,
      status: session.status,
      startedAt: session.startedAt.toISOString(),
      endedAt: session.endedAt?.toISOString() ?? null,
      createdAt: session.createdAt.toISOString(),
    });
  } catch (err) {
    console.error("[coach/sessions/active] error:", err?.message);
    return res.status(500).json({ error: "Failed to get active session" });
  }
});

app.post("/api/coach/observations", async (req, res) => {
  try {
    const coachId = getCoachIdOr401(req, res);
    if (!coachId) return;
    const body = req.body || {};
    const sessionId = typeof body.sessionId === "string" ? body.sessionId.trim() : "";
    const teamId = typeof body.teamId === "string" ? body.teamId.trim() : "";
    const playerId = typeof body.playerId === "string" ? body.playerId.trim() : "";
    if (!sessionId || !teamId || !playerId) {
      return res.status(400).json({ error: "sessionId, teamId, playerId required" });
    }

    const session = await prisma.trainingSession.findFirst({
      where: { id: sessionId, coachId, status: "active" },
    });
    if (!session) {
      return res.status(404).json({ error: "Session not found or not active" });
    }

    const obs = await prisma.observation.create({
      data: {
        sessionId,
        coachId,
        teamId,
        playerId,
        skillKey: typeof body.skillKey === "string" ? body.skillKey.trim() || null : null,
        noteType: typeof body.noteType === "string" ? body.noteType.trim() || null : null,
        score: typeof body.score === "number" && Number.isFinite(body.score) ? body.score : null,
        noteText: typeof body.noteText === "string" ? body.noteText.trim() || null : null,
      },
    });
    emitEvent("observation.created", { id: obs.id, sessionId, coachId, playerId, skillKey: obs.skillKey, score: obs.score });
    return res.status(201).json({
      id: obs.id,
      sessionId: obs.sessionId,
      coachId: obs.coachId,
      teamId: obs.teamId,
      playerId: obs.playerId,
      skillKey: obs.skillKey,
      noteType: obs.noteType,
      score: obs.score,
      noteText: obs.noteText,
      createdAt: obs.createdAt.toISOString(),
    });
  } catch (err) {
    console.error("[coach/observations] error:", err?.message);
    return res.status(500).json({ error: "Failed to create observation" });
  }
});

app.get("/api/coach/sessions/:id/observations", async (req, res) => {
  try {
    const sessionId = req.params?.id;
    if (typeof sessionId !== "string" || sessionId.trim() === "") {
      return res.status(404).json({ error: "Session not found" });
    }

    const observations = await prisma.observation.findMany({
      where: { sessionId: sessionId.trim() },
      orderBy: { createdAt: "desc" },
    });
    return res.json(
      observations.map((o) => ({
        id: o.id,
        sessionId: o.sessionId,
        coachId: o.coachId,
        teamId: o.teamId,
        playerId: o.playerId,
        skillKey: o.skillKey,
        noteType: o.noteType,
        score: o.score,
        noteText: o.noteText,
        createdAt: o.createdAt.toISOString(),
      }))
    );
  } catch (err) {
    console.error("[coach/sessions/:id/observations] error:", err?.message);
    return res.status(500).json({ error: "Failed to get observations" });
  }
});

app.get("/api/coach/sessions/:id/review", async (req, res) => {
  try {
    const sessionId = req.params?.id;
    if (typeof sessionId !== "string" || sessionId.trim() === "") {
      return res.status(404).json({ error: "Session not found" });
    }

    const session = await prisma.trainingSession.findUnique({
      where: { id: sessionId.trim() },
      include: { observations: { orderBy: { createdAt: "desc" } } },
    });
    if (!session) {
      return res.status(404).json({ error: "Session not found" });
    }

    const observations = session.observations;
    const observationsCount = observations.length;
    const playerCounts = {};
    const skillCounts = {};
    for (const o of observations) {
      playerCounts[o.playerId] = (playerCounts[o.playerId] || 0) + 1;
      if (o.skillKey) skillCounts[o.skillKey] = (skillCounts[o.skillKey] || 0) + 1;
    }
    const playersCount = Object.keys(playerCounts).length;
    const playersInFocus = Object.entries(playerCounts)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5)
      .map(([id]) => id);
    const topSkillKeys = Object.entries(skillCounts)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5)
      .map(([k]) => k);
    const recentObservations = observations.slice(0, 10).map((o) => ({
      id: o.id,
      playerId: o.playerId,
      skillKey: o.skillKey,
      noteType: o.noteType,
      score: o.score,
      noteText: o.noteText,
      createdAt: o.createdAt.toISOString(),
    }));
    const isReadyForReport = observationsCount >= 3;

    return res.json({
      sessionId: session.id,
      coachId: session.coachId,
      teamId: session.teamId,
      status: session.status,
      observationsCount,
      playersCount,
      playersInFocus,
      topSkillKeys,
      recentObservations,
      isReadyForReport,
      startedAt: session.startedAt.toISOString(),
      endedAt: session.endedAt?.toISOString() ?? null,
    });
  } catch (err) {
    console.error("[coach/sessions/:id/review] error:", err?.message);
    return res.status(500).json({ error: "Failed to get session review" });
  }
});

// --- COACH ACTIONS (Requires Attention) ---
function isLowScore(score) {
  if (score == null || typeof score !== "number" || !Number.isFinite(score)) return false;
  return score <= 4;
}

function isVeryLowScore(score) {
  if (score == null || typeof score !== "number" || !Number.isFinite(score)) return false;
  return score <= 3;
}

function playerQualifiesForActions(obs) {
  if (!obs || obs.length === 0) return false;
  const lowCount = obs.filter((o) => isLowScore(o.score)).length;
  const veryLowCount = obs.filter((o) => isVeryLowScore(o.score)).length;

  // Rule 1: at least 2 observations with score <= 4
  if (lowCount >= 2) return true;
  // Rule 4 (extra): at least 1 observation with score <= 3
  if (veryLowCount >= 1) return true;

  const scoreCount = obs.filter((o) => typeof o.score === "number" && Number.isFinite(o.score)).length;
  const totalScore = obs.reduce((s, o) => (typeof o.score === "number" && Number.isFinite(o.score) ? s + o.score : s), 0);
  const avgScore = scoreCount > 0 ? totalScore / scoreCount : null;

  // Rule 2: avg score <= 5 when observationsCount >= 3
  if (obs.length >= 3 && avgScore != null && avgScore <= 5) return true;

  // Rule 3: same skillKey repeated 2+ times in observations with low score
  const skillKeyCounts = {};
  for (const o of obs) {
    const key = typeof o.skillKey === "string" && o.skillKey.trim() ? o.skillKey.trim() : null;
    if (key && isLowScore(o.score)) {
      skillKeyCounts[key] = (skillKeyCounts[key] || 0) + 1;
    }
  }
  if (Object.values(skillKeyCounts).some((c) => c >= 2)) return true;

  return false;
}

function buildActionItem(playerId, playerName, obs) {
  const topSkillKeys = (() => {
    const counts = {};
    for (const o of obs) {
      const k = typeof o.skillKey === "string" && o.skillKey.trim() ? o.skillKey.trim() : null;
      if (k) counts[k] = (counts[k] || 0) + 1;
    }
    return Object.entries(counts)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5)
      .map(([k]) => k);
  })();

  const lowCount = obs.filter((o) => isLowScore(o.score)).length;
  const veryLowCount = obs.filter((o) => isVeryLowScore(o.score)).length;
  const scoreCount = obs.filter((o) => typeof o.score === "number" && Number.isFinite(o.score)).length;
  const totalScore = obs.reduce((s, o) => (typeof o.score === "number" && Number.isFinite(o.score) ? s + o.score : s), 0);
  const avgScore = scoreCount > 0 ? totalScore / scoreCount : null;

  const skillKeyCounts = {};
  for (const o of obs) {
    const key = typeof o.skillKey === "string" && o.skillKey.trim() ? o.skillKey.trim() : null;
    if (key && isLowScore(o.score)) {
      skillKeyCounts[key] = (skillKeyCounts[key] || 0) + 1;
    }
  }
  const repeatedLowSkill = Object.entries(skillKeyCounts).find(([, c]) => c >= 2);

  let reason = "";
  let severity = "medium";

  if (veryLowCount >= 1 || lowCount >= 2) {
    severity = "high";
    if (veryLowCount >= 1) {
      reason = `Очень низкие оценки (${veryLowCount} наблюд. ≤3)`;
    } else {
      reason = `Несколько низких оценок (${lowCount} наблюд. ≤4)`;
    }
  } else if (repeatedLowSkill) {
    severity = "high";
    reason = `Повторяющийся навык "${repeatedLowSkill[0]}" с низким баллом`;
  } else if (obs.length >= 3 && avgScore != null && avgScore <= 5) {
    reason = `Средний балл ${avgScore.toFixed(1)} при ${obs.length} наблюдениях`;
  } else {
    reason = "Требует внимания";
  }

  const lastObs = obs.length > 0 ? obs.reduce((a, b) => (a.createdAt > b.createdAt ? a : b)) : null;
  const updatedAt = lastObs?.createdAt ?? new Date(0);

  return {
    playerId,
    playerName: playerName ?? "Игрок",
    reason,
    severity,
    observationsCount: obs.length,
    topSkillKeys,
    updatedAt: updatedAt.toISOString(),
  };
}

app.get("/api/coach/actions", async (req, res) => {
  try {
    const coachId = getCoachIdOr401(req, res);
    if (!coachId) return;

    const allObs = await prisma.observation.findMany({
      where: { coachId },
      orderBy: { createdAt: "desc" },
    });

    const byPlayer = {};
    for (const o of allObs) {
      const pid = typeof o.playerId === "string" ? o.playerId.trim() : "";
      if (!pid) continue;
      if (!byPlayer[pid]) byPlayer[pid] = [];
      byPlayer[pid].push(o);
    }

    const actions = [];
    const playerIds = Object.keys(byPlayer);
    const playersMap = {};
    if (playerIds.length > 0) {
      const players = await prisma.player.findMany({ where: { id: { in: playerIds } } });
      for (const p of players) {
        playersMap[p.id] = p.name;
      }
    }

    for (const playerId of playerIds) {
      const obs = byPlayer[playerId];
      if (!playerQualifiesForActions(obs)) continue;
      const playerName = playersMap[playerId] ?? null;
      actions.push(buildActionItem(playerId, playerName, obs));
    }

    actions.sort((a, b) => {
      const sevOrder = { high: 0, medium: 1 };
      const aSev = sevOrder[a.severity] ?? 2;
      const bSev = sevOrder[b.severity] ?? 2;
      if (aSev !== bSev) return aSev - bSev;
      return new Date(b.updatedAt) - new Date(a.updatedAt);
    });

    return res.json(actions);
  } catch (err) {
    console.error("[coach/actions] error:", err?.message);
    return res.status(500).json({ error: "Failed to get actions" });
  }
});

// --- COACH MESSAGES (MVP in-memory mock) ---
const COACH_MESSAGES_MOCK = {
  conversations: [
    {
      id: "conv_coach1_parent_1",
      coachId: "coach_1",
      title: "Родитель: Голыш Марк",
      playerId: "player-79119888885",
      groupName: null,
      kind: "parent",
      participants: [{ id: "parent-79001234567", name: "Родитель" }],
      lastMessage: "Спасибо за отчёт по тренировке!",
      lastMessageAt: "2026-03-23T12:00:00.000Z",
      unreadCount: 2,
    },
    {
      id: "conv_coach1_group_1",
      coachId: "coach_1",
      title: "Родительский комитет",
      playerId: null,
      groupName: "Родительский комитет",
      kind: "committee",
      participants: [
        { id: "parent-1", name: "Иванов" },
        { id: "parent-2", name: "Петрова" },
      ],
      lastMessage: "Согласовали дату собрания на пятницу",
      lastMessageAt: "2026-03-22T18:30:00.000Z",
      unreadCount: 0,
    },
    {
      id: "conv_coach1_parent_2",
      coachId: "coach_1",
      title: "Родитель: Сидоров Артём",
      playerId: "player-79129598881",
      groupName: null,
      kind: "parent",
      participants: [{ id: "parent-79129598881", name: "Сидоров" }],
      lastMessage: "Когда следующий отчёт?",
      lastMessageAt: "2026-03-21T09:15:00.000Z",
      unreadCount: 0,
    },
  ],
  messagesByConversation: {
    conv_coach1_parent_1: [
      { id: "msg_1", senderName: "Родитель", senderRole: "parent", text: "Добрый день! Как прошла тренировка?", createdAt: "2026-03-22T10:00:00.000Z", isOwn: false },
      { id: "msg_2", senderName: "Алексей Иванов", senderRole: "coach", text: "Тренировка прошла хорошо. Марк активно работал над катанием.", createdAt: "2026-03-22T11:30:00.000Z", isOwn: true },
      { id: "msg_3", senderName: "Родитель", senderRole: "parent", text: "Спасибо за отчёт по тренировке!", createdAt: "2026-03-23T12:00:00.000Z", isOwn: false },
    ],
    conv_coach1_group_1: [
      { id: "msg_g1", senderName: "Иванов", senderRole: "parent", text: "Предлагаю собрание в пятницу", createdAt: "2026-03-22T17:00:00.000Z", isOwn: false },
      { id: "msg_g2", senderName: "Петрова", senderRole: "parent", text: "Согласовали дату собрания на пятницу", createdAt: "2026-03-22T18:30:00.000Z", isOwn: false },
    ],
    conv_coach1_parent_2: [
      { id: "msg_p2_1", senderName: "Сидоров", senderRole: "parent", text: "Когда следующий отчёт?", createdAt: "2026-03-21T09:15:00.000Z", isOwn: false },
    ],
  },
};

app.get("/api/coach/messages", async (req, res) => {
  try {
    const coachId = getCoachIdOr401(req, res);
    if (!coachId) return;

    const list = (COACH_MESSAGES_MOCK.conversations || [])
      .filter((c) => c.coachId === coachId)
      .map((c) => ({
        id: c.id,
        title: c.title,
        playerId: c.playerId ?? null,
        groupName: c.groupName ?? null,
        lastMessage: c.lastMessage ?? null,
        lastMessageAt: c.lastMessageAt ?? null,
        unreadCount: typeof c.unreadCount === "number" ? c.unreadCount : 0,
        participants: Array.isArray(c.participants) ? c.participants : [],
        kind: c.kind ?? "parent",
      }))
      .sort((a, b) => {
        const aT = a.lastMessageAt ? new Date(a.lastMessageAt).getTime() : 0;
        const bT = b.lastMessageAt ? new Date(b.lastMessageAt).getTime() : 0;
        return bT - aT;
      });

    return res.json(list);
  } catch (err) {
    console.error("[coach/messages] error:", err?.message);
    return res.status(500).json({ error: "Failed to get messages" });
  }
});

app.get("/api/coach/messages/:conversationId", async (req, res) => {
  try {
    const coachId = getCoachIdOr401(req, res);
    if (!coachId) return;

    const conversationId = typeof req.params?.conversationId === "string" ? req.params.conversationId.trim() : "";
    if (!conversationId) {
      return res.status(404).json({ error: "Conversation not found" });
    }

    const conv = (COACH_MESSAGES_MOCK.conversations || []).find(
      (c) => c.id === conversationId && c.coachId === coachId
    );
    if (!conv) {
      return res.status(404).json({ error: "Conversation not found" });
    }

    const messages = COACH_MESSAGES_MOCK.messagesByConversation[conversationId] ?? [];
    const messagesOut = messages.map((m) => ({
      id: m.id,
      senderName: m.senderName ?? "",
      senderRole: m.senderRole ?? "",
      text: m.text ?? "",
      createdAt: m.createdAt ?? null,
      isOwn: !!m.isOwn,
    }));

    return res.json({
      id: conv.id,
      title: conv.title,
      playerId: conv.playerId ?? null,
      groupName: conv.groupName ?? null,
      participants: Array.isArray(conv.participants) ? conv.participants : [],
      messages: messagesOut,
    });
  } catch (err) {
    console.error("[coach/messages/:conversationId] error:", err?.message);
    return res.status(500).json({ error: "Failed to get conversation" });
  }
});

const COACH_NAMES_FALLBACK = { coach_1: "Алексей Иванов" };

app.post("/api/coach/messages/:conversationId/send", async (req, res) => {
  try {
    const coachId = getCoachIdOr401(req, res);
    if (!coachId) return;

    const conversationId = typeof req.params?.conversationId === "string" ? req.params.conversationId.trim() : "";
    if (!conversationId) {
      return res.status(404).json({ error: "Conversation not found" });
    }

    const text = typeof req.body?.text === "string" ? req.body.text.trim() : "";
    if (!text) {
      return res.status(400).json({ error: "text required" });
    }

    const conv = (COACH_MESSAGES_MOCK.conversations || []).find(
      (c) => c.id === conversationId && c.coachId === coachId
    );
    if (!conv) {
      return res.status(404).json({ error: "Conversation not found" });
    }

    const senderName = COACH_NAMES_FALLBACK[coachId] ?? "Тренер";
    const createdAt = new Date().toISOString();
    const message = {
      id: `msg_${Date.now()}_${conversationId}`,
      senderName,
      senderRole: "coach",
      text,
      createdAt,
      isOwn: true,
    };

    const messages = COACH_MESSAGES_MOCK.messagesByConversation[conversationId];
    if (!messages) {
      COACH_MESSAGES_MOCK.messagesByConversation[conversationId] = [message];
    } else {
      messages.push(message);
    }

    conv.lastMessage = text;
    conv.lastMessageAt = createdAt;

    emitEvent("message.sent", { id: message.id, conversationId, coachId, text });
    return res.status(201).json(message);
  } catch (err) {
    console.error("[coach/messages/:conversationId/send] error:", err?.message);
    return res.status(500).json({ error: "Failed to send message" });
  }
});

// --- COACH REPORTS ---
async function buildPlayerReportData(coachId, playerId, observations) {
  const obs = observations || [];
  const observationsCount = obs.length;
  const ready = observationsCount >= 3;

  const skillCounts = {};
  const notesWithText = [];
  let totalScore = 0;
  let scoreCount = 0;
  for (const o of obs) {
    if (o.skillKey) skillCounts[o.skillKey] = (skillCounts[o.skillKey] || 0) + 1;
    if (o.noteText && typeof o.noteText === "string" && o.noteText.trim()) {
      notesWithText.push(o.noteText.trim());
    }
    if (typeof o.score === "number" && Number.isFinite(o.score)) {
      totalScore += o.score;
      scoreCount++;
    }
  }
  const topSkillKeys = Object.entries(skillCounts)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5)
    .map(([k]) => k);
  const avgScore = scoreCount > 0 ? Math.round((totalScore / scoreCount) * 10) / 10 : null;

  const shortSummary =
    notesWithText.length > 0
      ? notesWithText.slice(0, 3).join(". ").slice(0, 200) + (notesWithText.slice(0, 3).join(". ").length > 200 ? "…" : "")
      : ready
        ? `На основе ${observationsCount} наблюдений. Ключевые навыки: ${topSkillKeys.join(", ") || "—"}.`
        : `Недостаточно данных (${observationsCount}/3).`;

  const keyPoints = notesWithText.slice(0, 5).filter(Boolean);
  const recommendations = [];
  if (topSkillKeys.length > 0) {
    recommendations.push(`Сделать акцент на: ${topSkillKeys[0]}`);
  }
  if (avgScore != null && avgScore < 6) {
    recommendations.push("Усилить базовые навыки.");
  }
  if (observationsCount >= 5 && keyPoints.length === 0) {
    recommendations.push("Добавить текстовые заметки к наблюдениям для более детального отчёта.");
  }
  if (recommendations.length === 0 && ready) {
    recommendations.push("Продолжить текущую программу тренировок.");
  }

  const lastObs = obs.length > 0 ? obs.reduce((a, b) => (a.createdAt > b.createdAt ? a : b)) : null;
  const updatedAt = lastObs?.createdAt ?? new Date(0);

  return {
    playerId,
    observationsCount,
    topSkillKeys,
    shortSummary,
    keyPoints,
    recommendations,
    updatedAt: updatedAt.toISOString(),
    ready,
    avgScore,
  };
}

function buildParentMessage(data) {
  const { playerName, shortSummary, keyPoints, recommendations } = data;
  const name = playerName || "Игрок";
  const parts = [];
  parts.push(`Здравствуйте! Отчёт по ${name}.`);
  if (shortSummary) parts.push(shortSummary);
  if (keyPoints && keyPoints.length > 0) {
    parts.push("Ключевые моменты: " + keyPoints.join(". "));
  }
  if (recommendations && recommendations.length > 0) {
    parts.push("Рекомендации: " + recommendations.join(" "));
  }
  return parts.join(" ");
}

app.get("/api/coach/parent-drafts", async (req, res) => {
  try {
    const coachId = getCoachIdOr401(req, res);
    if (!coachId) return;

    const allObs = await prisma.observation.findMany({
      where: { coachId },
      orderBy: { createdAt: "desc" },
    });
    const byPlayer = {};
    for (const o of allObs) {
      const pid = o.playerId;
      if (!byPlayer[pid]) byPlayer[pid] = [];
      byPlayer[pid].push(o);
    }
    const readyPlayers = Object.entries(byPlayer)
      .filter(([, obs]) => obs.length >= 3)
      .map(([playerId, obs]) => ({ playerId, obs }))
      .sort((a, b) => {
        const aLast = a.obs[0]?.createdAt ?? new Date(0);
        const bLast = b.obs[0]?.createdAt ?? new Date(0);
        return bLast - aLast;
      });

    const drafts = [];
    for (const { playerId, obs } of readyPlayers) {
      const player = await prisma.player.findUnique({ where: { id: playerId } });
      const data = await buildPlayerReportData(coachId, playerId, obs);
      const playerName = player?.name ?? null;
      const message = buildParentMessage({ ...data, playerName });
      drafts.push({
        playerId,
        playerName,
        shortSummary: data.shortSummary,
        messagePreview: message.slice(0, 150) + (message.length > 150 ? "…" : ""),
        updatedAt: data.updatedAt,
        ready: data.ready,
      });
    }
    return res.json(drafts);
  } catch (err) {
    console.error("[coach/parent-drafts] error:", err?.message);
    return res.status(500).json({ error: "Failed to get parent drafts" });
  }
});

app.get("/api/coach/players/:playerId/share-report", async (req, res) => {
  try {
    const coachId = getCoachIdOr401(req, res);
    if (!coachId) return;
    const playerId = req.params?.playerId;
    if (typeof playerId !== "string" || playerId.trim() === "") {
      return res.status(400).json({ error: "playerId required" });
    }

    const observations = await prisma.observation.findMany({
      where: { coachId, playerId: playerId.trim() },
      orderBy: { createdAt: "desc" },
    });
    const player = await prisma.player.findUnique({ where: { id: playerId.trim() } });
    const data = await buildPlayerReportData(coachId, playerId.trim(), observations);
    const playerName = player?.name ?? null;
    const message = buildParentMessage({ ...data, playerName });

    return res.json({
      playerId: playerId.trim(),
      playerName,
      ready: data.ready,
      message,
      shortSummary: data.shortSummary,
      keyPoints: data.keyPoints,
      recommendations: data.recommendations,
      updatedAt: data.updatedAt,
    });
  } catch (err) {
    console.error("[coach/players/:playerId/share-report] error:", err?.message);
    return res.status(500).json({ error: "Failed to get share report" });
  }
});

app.get("/api/coach/reports/weekly", async (req, res) => {
  try {
    const coachId = getCoachIdOr401(req, res);
    if (!coachId) return;

    const allObs = await prisma.observation.findMany({
      where: { coachId },
      orderBy: { createdAt: "desc" },
    });
    const byPlayer = {};
    for (const o of allObs) {
      const pid = o.playerId;
      if (!byPlayer[pid]) byPlayer[pid] = [];
      byPlayer[pid].push(o);
    }
    const readyPlayers = Object.entries(byPlayer)
      .filter(([, obs]) => obs.length >= 3)
      .map(([playerId, obs]) => ({ playerId, obs }))
      .sort((a, b) => {
        const aLast = a.obs[0]?.createdAt ?? new Date(0);
        const bLast = b.obs[0]?.createdAt ?? new Date(0);
        return bLast - aLast;
      });

    const reports = [];
    for (const { playerId, obs } of readyPlayers) {
      const player = await prisma.player.findUnique({ where: { id: playerId } });
      const data = await buildPlayerReportData(coachId, playerId, obs);
      reports.push({
        ...data,
        playerName: player?.name ?? null,
      });
    }
    return res.json(reports);
  } catch (err) {
    console.error("[coach/reports/weekly] error:", err?.message);
    return res.status(500).json({ error: "Failed to get weekly reports" });
  }
});

app.get("/api/coach/reports/player/:playerId", async (req, res) => {
  try {
    const coachId = getCoachIdOr401(req, res);
    if (!coachId) return;
    const playerId = req.params?.playerId;
    if (typeof playerId !== "string" || playerId.trim() === "") {
      return res.status(400).json({ error: "playerId required" });
    }

    const observations = await prisma.observation.findMany({
      where: { coachId, playerId: playerId.trim() },
      orderBy: { createdAt: "desc" },
    });
    const player = await prisma.player.findUnique({ where: { id: playerId.trim() } });
    const data = await buildPlayerReportData(coachId, playerId.trim(), observations);
    return res.json({
      ...data,
      playerName: player?.name ?? null,
      observations: observations.map((o) => ({
        id: o.id,
        skillKey: o.skillKey,
        noteType: o.noteType,
        score: o.score,
        noteText: o.noteText,
        createdAt: o.createdAt.toISOString(),
      })),
    });
  } catch (err) {
    console.error("[coach/reports/player/:playerId] error:", err?.message);
    return res.status(500).json({ error: "Failed to get player report" });
  }
});

app.get("/api/schedule", (_req, res) => {
  // First DB-backed schedule version (response shape must stay unchanged).
  // If Prisma isn't ready for some reason, return empty list (honest failure).
  return prisma?.scheduleEvent?.findMany
    ? prisma
        .scheduleEvent.findMany({ orderBy: { startTime: "asc" } })
        .catch((_err) => [])
        .then((rows) =>
          res.json(
            rows.map((r) => ({
              id: r.id,
              title: r.title ?? null,
              startTime: r.startTime.toISOString(),
              location: r.location ?? null,
              teamId: r.teamId,
            }))
          )
        )
    : res.json([]);
});

// --- PLAYER SESSION EVALUATIONS (per TrainingSession; roster = players mapped to session.teamId) ---
app.get("/api/trainings/:trainingId/evaluations", async (req, res) => {
  try {
    const coachId = getCoachIdOr401(req, res);
    if (!coachId) return;

    const trainingId = typeof req.params?.trainingId === "string" ? req.params.trainingId.trim() : "";
    if (!trainingId) {
      return res.status(404).json({ error: "Training session not found" });
    }

    const session = await prisma.trainingSession.findUnique({ where: { id: trainingId } });
    if (!session) {
      return res.status(404).json({ error: "Training session not found" });
    }
    if (session.coachId !== coachId) {
      return res.status(403).json({ error: "Forbidden" });
    }

    const weekStartDate = weekStartDateUTC(session.startedAt);
    const roster = await playersForTrainingSessionTeam(session.teamId);
    const evalRows = await prisma.playerSessionEvaluation.findMany({
      where: { trainingId },
    });
    const byPlayer = {};
    for (const e of evalRows) {
      byPlayer[e.playerId] = e;
    }

    const players = roster.map((p) => ({
      playerId: p.id,
      name: p.name,
      attendanceStatus: null,
      evaluation: mapEvaluationRowToApi(byPlayer[p.id]),
    }));

    return res.json({
      trainingSessionId: session.id,
      teamId: session.teamId,
      weekStartDate,
      startedAt: session.startedAt.toISOString(),
      players,
    });
  } catch (err) {
    console.error("[trainings/:id/evaluations GET] error:", err?.message);
    return res.status(500).json({ error: "Failed to load evaluations" });
  }
});

app.post("/api/trainings/:trainingId/evaluations", async (req, res) => {
  try {
    const coachId = getCoachIdOr401(req, res);
    if (!coachId) return;

    const trainingId = typeof req.params?.trainingId === "string" ? req.params.trainingId.trim() : "";
    if (!trainingId) {
      return res.status(404).json({ error: "Training session not found" });
    }

    const session = await prisma.trainingSession.findUnique({ where: { id: trainingId } });
    if (!session) {
      return res.status(404).json({ error: "Training session not found" });
    }
    if (session.coachId !== coachId) {
      return res.status(403).json({ error: "Forbidden" });
    }

    const body = req.body || {};
    const playerId = typeof body.playerId === "string" ? body.playerId.trim() : "";
    if (!playerId) {
      return res.status(400).json({ error: "playerId required" });
    }

    let effort;
    let focus;
    let discipline;
    let note;
    try {
      effort = parseOptionalScore1to5(body.effort, "effort");
      focus = parseOptionalScore1to5(body.focus, "focus");
      discipline = parseOptionalScore1to5(body.discipline, "discipline");
      note = normalizeEvaluationNote(body.note);
    } catch (e) {
      if (e.code === "INVALID_SCORE") {
        return res.status(400).json({ error: "Scores must be integers 1..5 or null" });
      }
      if (e.code === "NOTE_TOO_LONG") {
        return res.status(400).json({ error: "note must be at most 500 characters" });
      }
      return res.status(400).json({ error: "Invalid body" });
    }

    const roster = await playersForTrainingSessionTeam(session.teamId);
    const allowed = roster.some((p) => p.id === playerId);
    if (!allowed) {
      return res.status(403).json({ error: "Player not in roster for this session" });
    }

    const saved = await prisma.playerSessionEvaluation.upsert({
      where: { trainingId_playerId: { trainingId, playerId } },
      create: {
        trainingId,
        playerId,
        effort: effort === undefined ? null : effort,
        focus: focus === undefined ? null : focus,
        discipline: discipline === undefined ? null : discipline,
        note: note === undefined ? null : note,
      },
      update: {
        ...(effort !== undefined && { effort }),
        ...(focus !== undefined && { focus }),
        ...(discipline !== undefined && { discipline }),
        ...(note !== undefined && { note }),
      },
    });

    emitEvent("evaluation.upserted", {
      trainingSessionId: trainingId,
      playerId,
      effort: saved.effort,
      focus: saved.focus,
      discipline: saved.discipline,
    });

    return res.status(201).json({
      id: saved.id,
      trainingSessionId: saved.trainingId,
      playerId: saved.playerId,
      evaluation: mapEvaluationRowToApi(saved),
    });
  } catch (err) {
    console.error("[trainings/:id/evaluations POST] error:", err?.message);
    return res.status(500).json({ error: "Failed to save evaluation" });
  }
});

app.get("/api/trainings/:trainingId/report", async (req, res) => {
  try {
    const coachId = getCoachIdOr401(req, res);
    if (!coachId) return;

    const trainingId = typeof req.params?.trainingId === "string" ? req.params.trainingId.trim() : "";
    if (!trainingId) {
      return res.status(404).json({ error: "Training session not found" });
    }

    const session = await prisma.trainingSession.findUnique({
      where: { id: trainingId },
      include: { report: true },
    });
    if (!session) {
      return res.status(404).json({ error: "Training session not found" });
    }
    if (session.coachId !== coachId) {
      return res.status(403).json({ error: "Forbidden" });
    }

    return res.json({
      trainingId: session.id,
      report: mapTrainingSessionReportToApi(session.report),
    });
  } catch (err) {
    console.error("[trainings/:id/report GET] error:", err?.message);
    return res.status(500).json({ error: "Failed to load session report" });
  }
});

app.post("/api/trainings/:trainingId/report", async (req, res) => {
  try {
    const coachId = getCoachIdOr401(req, res);
    if (!coachId) return;

    const trainingId = typeof req.params?.trainingId === "string" ? req.params.trainingId.trim() : "";
    if (!trainingId) {
      return res.status(404).json({ error: "Training session not found" });
    }

    const session = await prisma.trainingSession.findUnique({ where: { id: trainingId } });
    if (!session) {
      return res.status(404).json({ error: "Training session not found" });
    }
    if (session.coachId !== coachId) {
      return res.status(403).json({ error: "Forbidden" });
    }

    const body = req.body || {};
    let summary;
    let focusAreas;
    let coachNote;
    let parentMessage;
    try {
      summary = body.summary !== undefined ? normalizeSessionReportField(body.summary) : undefined;
      focusAreas = body.focusAreas !== undefined ? normalizeSessionReportField(body.focusAreas) : undefined;
      coachNote = body.coachNote !== undefined ? normalizeSessionReportField(body.coachNote) : undefined;
      parentMessage =
        body.parentMessage !== undefined ? normalizeSessionReportField(body.parentMessage) : undefined;
    } catch (e) {
      if (e.code === "REPORT_FIELD_TOO_LONG") {
        return res.status(400).json({ error: `Each field must be at most ${SESSION_REPORT_MAX_LEN} characters` });
      }
      return res.status(400).json({ error: "Invalid body" });
    }

    const saved = await prisma.trainingSessionReport.upsert({
      where: { trainingId },
      create: {
        trainingId,
        summary: summary === undefined ? null : summary,
        focusAreas: focusAreas === undefined ? null : focusAreas,
        coachNote: coachNote === undefined ? null : coachNote,
        parentMessage: parentMessage === undefined ? null : parentMessage,
      },
      update: {
        ...(summary !== undefined && { summary }),
        ...(focusAreas !== undefined && { focusAreas }),
        ...(coachNote !== undefined && { coachNote }),
        ...(parentMessage !== undefined && { parentMessage }),
      },
    });

    emitEvent("training.report.upserted", { trainingId, coachId });

    return res.json({
      ok: true,
      report: mapTrainingSessionReportToApi(saved),
    });
  } catch (err) {
    console.error("[trainings/:id/report POST] error:", err?.message);
    return res.status(500).json({ error: "Failed to save session report" });
  }
});

// --- TRAININGS (DB-backed minimal first version) ---
app.get("/api/trainings", (_req, res) => {
  return prisma?.trainingEvent?.findMany
    ? prisma
        .trainingEvent.findMany({ orderBy: { startTime: "asc" } })
        .catch((_err) => [])
        .then((rows) =>
          res.json(
            rows.map((r) => ({
              id: r.id,
              title: r.title ?? null,
              startTime: r.startTime.toISOString(),
              location: r.location ?? null,
              teamId: r.teamId,
            }))
          )
        )
    : res.json([]);
});

// --- MARKETPLACE COACHES ---
app.get("/api/marketplace/coaches", async (_req, res) => {
  try {
    if (!prisma?.coach?.findMany) return res.json([]);

    const coaches = await prisma.coach.findMany({
      orderBy: { id: "asc" },
    });

    return res.json(
      coaches.map((c) => ({
        id: c.id,
        name: c.name,
        specialization: c.specialization ?? "",
        rating: c.rating ?? 0,
        priceFrom: c.priceFrom ?? 0,
        city: c.city ?? "",
        avatar: c.avatar ?? "",
        description: c.description ?? "",
      }))
    );
  } catch (err) {
    console.error("[marketplace/coaches] error:", err);
    return res.json([]);
  }
});

app.get("/api/marketplace/coaches/:id", async (req, res) => {
  const coachId = req.params?.id;
  try {
    if (typeof coachId !== "string" || coachId.trim() === "") {
      return res.status(404).json({ error: "Coach not found" });
    }
    if (!prisma?.coach?.findUnique) {
      return res.status(404).json({ error: "Coach not found" });
    }

    const coach = await prisma.coach.findUnique({ where: { id: coachId } });
    if (!coach) {
      return res.status(404).json({ error: "Coach not found" });
    }

    return res.json({
      id: coach.id,
      name: coach.name,
      specialization: coach.specialization ?? "",
      rating: coach.rating ?? 0,
      priceFrom: coach.priceFrom ?? 0,
      city: coach.city ?? "",
      avatar: coach.avatar ?? "",
      description: coach.description ?? "",
    });
  } catch (err) {
    console.error("[marketplace/coaches/:id] error:", err);
    return res.status(500).json({ error: "Failed to get coach" });
  }
});

app.get("/api/marketplace/coaches/:coachId/slots", async (req, res) => {
  const coachId = req.params?.coachId;
  try {
    if (typeof coachId !== "string" || coachId.trim() === "") {
      return res.status(404).json({ error: "Coach not found" });
    }

    if (!prisma?.coach?.findUnique || !prisma?.coachSlot?.findMany) {
      return res.status(404).json({ error: "Coach not found" });
    }

    const coach = await prisma.coach.findUnique({ where: { id: coachId } });
    if (!coach) {
      return res.status(404).json({ error: "Coach not found" });
    }

    const slots = await prisma.coachSlot.findMany({
      where: { coachId },
      orderBy: { time: "asc" },
    });

    return res.json(
      slots.map((s) => ({
        time: s.time,
        available: Boolean(s.available),
      }))
    );
  } catch (err) {
    console.error("[marketplace/coaches/:coachId/slots] error:", err);
    return res.status(500).json({ error: "Failed to get coach slots" });
  }
});

app.post("/api/marketplace/booking-request", async (req, res) => {
  const coachId = req.body?.coachId;
  try {
    if (typeof coachId !== "string" || coachId.trim() === "") {
      return res.status(400).json({ error: "coachId is required" });
    }

    if (!prisma?.coach?.findUnique || !prisma?.bookingRequest?.create) {
      return res.status(404).json({ error: "Coach not found" });
    }

    const coach = await prisma.coach.findUnique({ where: { id: coachId } });
    if (!coach) {
      return res.status(404).json({ error: "Coach not found" });
    }

    const requestId = `request_${Date.now()}`;
    await prisma.bookingRequest.create({
      data: { id: requestId, coachId },
    });

    return res.json({
      id: requestId,
      message: "Booking request sent successfully",
      coachId,
    });
  } catch (err) {
    console.error("[marketplace/booking-request] error:", err);
    return res.status(500).json({ error: "Failed to send booking request" });
  }
});

// --- HEALTH (deploy liveness) ---
app.get("/api/health", (_req, res) => {
  res.json({ status: "ok" });
});

// --- ROOT ---
app.get("/", (_req, res) => {
  res.json({ ok: true, message: "hockey-server" });
});

// --- 404: return JSON so frontend doesn't get HTML on wrong path
app.use((req, res) => {
  if (process.env.NODE_ENV !== "production") {
    console.log("[404]", req.method, req.path);
  }
  res.status(404).json({ error: "Not found", path: req.path });
});

// --- Error handler: always return JSON (no HTML)
app.use((err, req, res, _next) => {
  console.error("[express-error]", err?.message ?? err);
  if (!res.headersSent) {
    res.status(500).json({ error: "Internal server error" });
  }
});

const HOST = process.env.HOST || "0.0.0.0";
app.listen(PORT, HOST, () => {
  console.log("Server listening on", HOST + ":" + PORT);
});
