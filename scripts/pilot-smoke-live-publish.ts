/**
 * Stage 3 — pilot smoke: coach → schedule → live → finish/confirm → report draft → publish → parent summary.
 *
 * Requires: DB seeded (`npm run db:seed:pilot`), Next app reachable (`npm run dev` / `npm start`).
 *
 * Run: `npm run smoke:pilot:live`
 */

export {};

const ORIGIN = (process.env.ORIGIN ?? "http://localhost:3000").replace(/\/$/, "");
const PILOT_COACH_EMAIL = process.env.PILOT_COACH_EMAIL ?? "pilot-coach@smoke.hockey-id.local";
const PILOT_PARENT_EMAIL = process.env.PILOT_PARENT_EMAIL ?? "pilot-parent@smoke.hockey-id.local";
const PILOT_PASSWORD = process.env.PILOT_PASSWORD ?? "SmokePilot1!";
const WEEK_START = process.env.WEEK_START ?? "2026-04-20";
const SLOT_NOTES = process.env.SLOT_NOTES ?? "PILOT_SMOKE_CANONICAL_SLOT";

type Json = Record<string, unknown> | unknown[] | string | number | boolean | null;

class PilotSmokeHttpError extends Error {
  constructor(
    message: string,
    readonly method: string,
    readonly path: string,
    readonly status: number,
    readonly bodySnippet: string
  ) {
    super(message);
    this.name = "PilotSmokeHttpError";
  }
}

function hintForKnownError(status: number, bodyText: string, parsed: unknown): string {
  const code =
    parsed && typeof parsed === "object" && parsed !== null && "code" in parsed
      ? String((parsed as Record<string, unknown>).code ?? "")
      : "";
  const lines: string[] = [];
  if (status === 401) lines.push("Hint: проверьте логин/пароль, ORIGIN, и что Bearer = mobileToken из POST /api/auth/login.");
  if (status === 403) lines.push("Hint: проверьте доступ к команде (coach) или связь родитель–игрок (parent).");
  if (status === 409 && code === "LIVE_TRAINING_NO_LINKED_TRAINING_SESSION") {
    lines.push("Hint: live-сессия без привязки к TrainingSession — проверьте trainingSessionId при POST /api/live-training/sessions.");
  }
  if (status === 409 && bodyText.includes("активн")) {
    lines.push("Hint: уже есть активная live/review сессия — завершите или отмените её вручную, затем повторите смоук.");
  }
  if (status === 400 && code === "REPORT_DRAFT_NOT_PUBLISHABLE_CONTENT") {
    lines.push("Hint: PATCH coachPreviewNarrative не прошёл валидацию или контракт на сервере изменился.");
  }
  if (status === 500 && bodyText.includes("Не удалось создать сессию")) {
    lines.push(
      "Hint: часто это Prisma P2022 / несовпадение схемы БД с клиентом — выполните `npx prisma migrate deploy` (или `db push`) и перезапустите сервер."
    );
  }
  return lines.join("\n");
}

async function requestJson(
  method: string,
  path: string,
  options: { body?: unknown; token?: string; okStatuses?: number[] } = {}
): Promise<{ status: number; data: unknown }> {
  const url = `${ORIGIN}${path.startsWith("/") ? path : `/${path}`}`;
  const headers: Record<string, string> = {
    Accept: "application/json",
  };
  if (options.body !== undefined) {
    headers["Content-Type"] = "application/json";
  }
  if (options.token) {
    headers["Authorization"] = `Bearer ${options.token}`;
  }
  const okSet = new Set(options.okStatuses ?? [200, 201]);
  let res: Response;
  try {
    res = await fetch(url, {
      method,
      headers,
      body: options.body !== undefined ? JSON.stringify(options.body) : undefined,
    });
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    throw new PilotSmokeHttpError(
      `Network error: ${msg}`,
      method,
      path,
      0,
      ""
    );
  }
  const text = await res.text();
  let parsed: unknown = null;
  if (text.trim()) {
    try {
      parsed = JSON.parse(text) as unknown;
    } catch {
      parsed = text;
    }
  }
  if (!okSet.has(res.status)) {
    const snippet = typeof parsed === "string" ? parsed.slice(0, 2000) : JSON.stringify(parsed, null, 2).slice(0, 2000);
    const hint = hintForKnownError(res.status, snippet, parsed);
    const msg = [
      `HTTP ${res.status} on ${method} ${path}`,
      snippet ? `Body:\n${snippet}` : "(empty body)",
      hint ? `\n${hint}` : "",
    ].join("\n");
    throw new PilotSmokeHttpError(msg, method, path, res.status, snippet);
  }
  return { status: res.status, data: parsed };
}

function asRecord(v: unknown): Record<string, unknown> | null {
  return v && typeof v === "object" && !Array.isArray(v) ? (v as Record<string, unknown>) : null;
}

function logStep(msg: string) {
  console.log(`[pilot-smoke] ✓ ${msg}`);
}

async function main() {
  console.log(`[pilot-smoke] ORIGIN=${ORIGIN} WEEK_START=${WEEK_START}`);

  // 1) Coach login
  const coachLogin = await requestJson("POST", "/api/auth/login", {
    body: { email: PILOT_COACH_EMAIL, password: PILOT_PASSWORD },
  });
  const coachRoot = asRecord(coachLogin.data);
  const coachToken =
    typeof coachRoot?.mobileToken === "string"
      ? coachRoot.mobileToken
      : typeof coachRoot?.token === "string"
        ? coachRoot.token
        : null;
  if (!coachToken) {
    console.error("[pilot-smoke] FATAL: coach login response missing mobileToken/token", coachLogin.data);
    process.exit(1);
  }
  const coachUser = asRecord(coachRoot?.user);
  const coachTeamId = typeof coachUser?.teamId === "string" ? coachUser.teamId : null;
  logStep("coach login OK");

  // 2) Schedule — try without teamId, then with teamId if required
  let schedulePath = `/api/coach/schedule?weekStartDate=${encodeURIComponent(WEEK_START)}`;
  let scheduleRes: { status: number; data: unknown };
  try {
    scheduleRes = await requestJson("GET", schedulePath, { token: coachToken });
  } catch (e) {
    if (
      e instanceof PilotSmokeHttpError &&
      e.status === 400 &&
      coachTeamId &&
      (e.bodySnippet.includes("teamId") || e.message.includes("teamId"))
    ) {
      schedulePath = `/api/coach/schedule?weekStartDate=${encodeURIComponent(WEEK_START)}&teamId=${encodeURIComponent(coachTeamId)}`;
      scheduleRes = await requestJson("GET", schedulePath, { token: coachToken });
    } else {
      throw e;
    }
  }

  if (!Array.isArray(scheduleRes.data)) {
    console.error("[pilot-smoke] FATAL: schedule response is not an array", scheduleRes.data);
    process.exit(1);
  }
  const slot = scheduleRes.data.find((row) => {
    const o = asRecord(row);
    return o?.notes === SLOT_NOTES;
  });
  if (!slot || typeof slot !== "object") {
    console.error(
      `[pilot-smoke] FATAL: no TrainingSession with notes="${SLOT_NOTES}" in week ${WEEK_START}. Run npm run db:seed:pilot.`
    );
    process.exit(1);
  }
  const slotRec = asRecord(slot)!;
  const trainingSessionId = String(slotRec.id ?? "");
  const teamId = String(slotRec.teamId ?? "");
  if (!trainingSessionId || !teamId) {
    console.error("[pilot-smoke] FATAL: slot missing id or teamId", slot);
    process.exit(1);
  }
  logStep(`schedule slot found (trainingSessionId=${trainingSessionId}, teamId=${teamId})`);

  // 4) Create live session
  const liveBody = {
    teamId,
    mode: "ice",
    trainingSessionId,
    scheduleSlotContext: {
      trainingSlotId: trainingSessionId,
    },
  };
  let liveSessionId: string;
  try {
    const liveRes = await requestJson("POST", "/api/live-training/sessions", {
      body: liveBody,
      token: coachToken,
      okStatuses: [201],
    });
    const liveRoot = asRecord(liveRes.data);
    liveSessionId = String(liveRoot?.id ?? "");
    if (!liveSessionId) {
      console.error("[pilot-smoke] FATAL: live create response missing id", liveRes.data);
      process.exit(1);
    }
  } catch (e) {
    if (e instanceof PilotSmokeHttpError && e.status === 409) {
      const parsed = (() => {
        try {
          return JSON.parse(e.bodySnippet) as unknown;
        } catch {
          return null;
        }
      })();
      const sid =
        parsed && typeof parsed === "object" && parsed !== null && "sessionId" in parsed
          ? String((parsed as Record<string, unknown>).sessionId ?? "")
          : "";
      console.error(
        `[pilot-smoke] FATAL: активная live-сессия уже существует (409).` +
          (sid ? ` sessionId с сервера: ${sid}` : "") +
          ` Завершите или отмените её и повторите смоук.`
      );
      console.error(e.message);
      process.exit(1);
    }
    throw e;
  }
  logStep(`live session created (liveSessionId=${liveSessionId})`);

  // 5) Finish
  const finishRes = await requestJson("POST", `/api/live-training/sessions/${encodeURIComponent(liveSessionId)}/finish`, {
    body: {},
    token: coachToken,
  });
  /** POST .../finish returns `LiveTrainingSessionDto` at top level (not wrapped in `{ session }`). */
  const finishSession = asRecord(finishRes.data);
  const finishStatus = typeof finishSession?.status === "string" ? finishSession.status : "";
  logStep(`finish OK (status=${finishStatus || "?"})`);

  // 6) Confirm if not confirmed
  let confirmed = finishStatus === "confirmed";
  if (!confirmed) {
    await requestJson("POST", `/api/live-training/sessions/${encodeURIComponent(liveSessionId)}/confirm`, {
      body: { clientMutationId: `pilot-smoke-${Date.now()}` },
      token: coachToken,
    });
    logStep("confirm OK");
    confirmed = true;
  } else {
    logStep("confirm skipped (auto-confirmed after finish)");
  }
  void confirmed;

  // 7) GET report-draft
  await requestJson("GET", `/api/live-training/sessions/${encodeURIComponent(liveSessionId)}/report-draft`, {
    token: coachToken,
  });
  logStep("report-draft GET OK (200)");

  // 8) PATCH narrative
  await requestJson("PATCH", `/api/live-training/sessions/${encodeURIComponent(liveSessionId)}/report-draft`, {
    token: coachToken,
    body: {
      coachPreviewNarrative: {
        sessionSummaryLines: [
          "Pilot smoke тренировка подтверждена и готова к публикации.",
          "Команда прошла контрольный сценарий live training → отчёт → родитель.",
        ],
        focusAreas: ["Контроль шайбы", "Командное взаимодействие"],
        playerHighlights: [
          {
            text: "PilotSmoke Player получил тестовую заметку для проверки родительской сводки.",
            playerName: "PilotSmoke Player",
          },
        ],
      },
    },
  });
  logStep("draft patched");

  // 9) Publish
  const publishRes = await requestJson(
    "POST",
    `/api/live-training/sessions/${encodeURIComponent(liveSessionId)}/report-draft/publish`,
    { body: {}, token: coachToken }
  );
  const pubRoot = asRecord(publishRes.data);
  const finalReport = asRecord(pubRoot?.finalReport);
  const trainingId = finalReport && typeof finalReport.trainingId === "string" ? finalReport.trainingId : "";
  if (!trainingId) {
    console.error("[pilot-smoke] FATAL: publish response missing finalReport.trainingId", publishRes.data);
    process.exit(1);
  }
  logStep(`publish OK (finalReport.trainingId=${trainingId})`);

  // 10) Parent login
  const parentLogin = await requestJson("POST", "/api/auth/login", {
    body: { email: PILOT_PARENT_EMAIL, password: PILOT_PASSWORD },
  });
  const parentRoot = asRecord(parentLogin.data);
  const parentToken =
    typeof parentRoot?.token === "string"
      ? parentRoot.token
      : typeof parentRoot?.mobileToken === "string"
        ? parentRoot.mobileToken
        : null;
  if (!parentToken) {
    console.error("[pilot-smoke] FATAL: parent login missing token/mobileToken", parentLogin.data);
    process.exit(1);
  }
  logStep("parent login OK");

  // 11) Parent players
  const playersRes = await requestJson("GET", "/api/parent/players", { token: parentToken });
  if (!Array.isArray(playersRes.data)) {
    console.error("[pilot-smoke] FATAL: GET /api/parent/players expected array", playersRes.data);
    process.exit(1);
  }
  const pilotPlayer = playersRes.data.find((p) => {
    const o = asRecord(p);
    return o?.firstName === "PilotSmoke" && o?.lastName === "Player";
  });
  if (!pilotPlayer || typeof pilotPlayer !== "object") {
    console.error("[pilot-smoke] FATAL: pilot player PilotSmoke / Player not found in /api/parent/players");
    process.exit(1);
  }
  const playerId = String(asRecord(pilotPlayer)?.id ?? "");
  if (!playerId) {
    console.error("[pilot-smoke] FATAL: pilot player missing id", pilotPlayer);
    process.exit(1);
  }
  logStep(`parent player found (playerId=${playerId})`);

  // 12) Latest training summary
  const summaryRes = await requestJson(
    "GET",
    `/api/parent/players/${encodeURIComponent(playerId)}/latest-training-summary`,
    { token: parentToken }
  );
  const sum = asRecord(summaryRes.data);
  if (sum?.hasData !== true) {
    console.error(
      "[pilot-smoke] FATAL: latest-training-summary expected hasData=true after publish",
      summaryRes.data
    );
    process.exit(1);
  }
  const shortSummary = typeof sum.shortSummary === "string" ? sum.shortSummary.trim() : "";
  const source = typeof sum.source === "string" ? sum.source : "";
  const isPublished = sum.isPublished === true;
  if (!shortSummary && !isPublished) {
    console.error(
      "[pilot-smoke] FATAL: summary hasData but empty shortSummary and not isPublished",
      summaryRes.data
    );
    process.exit(1);
  }
  if (!source) {
    console.error("[pilot-smoke] FATAL: summary missing source field", summaryRes.data);
    process.exit(1);
  }
  logStep(
    `latest summary OK (source=${source}, isPublished=${String(isPublished)}, shortSummary chars=${shortSummary.length})`
  );

  console.log("[pilot-smoke] DONE — main path Hockey ID OK.");
}

main().catch((e) => {
  if (e instanceof PilotSmokeHttpError) {
    console.error(`[pilot-smoke] FATAL: ${e.message}`);
  } else {
    console.error("[pilot-smoke] FATAL:", e);
  }
  process.exit(1);
});
