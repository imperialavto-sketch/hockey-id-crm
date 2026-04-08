/**
 * PHASE 6 Step 13: перенос `SessionMeaning.nextActions` с последней подтверждённой live-сессии
 * команды в стартовый `planningSnapshotJson` новой сессии (без правок старых отчётов).
 */

import type { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { parsePersistedSessionMeaning } from "./session-meaning";
import type { SessionMeaning } from "./session-meaning";
import { sessionMeaningPassesNextActionsConfidenceGate } from "./session-meaning";
import {
  parsePlanningObject,
  type LiveTrainingPreviousSessionNextActionsCarryV1Dto,
} from "./live-training-planning-snapshot";

export const PREVIOUS_SESSION_NEXT_ACTIONS_CARRY_VERSION = 1 as const;

const MAX_FOCUS = 3;
const MAX_TEAM = 3;
const MAX_PLAYERS = 3;
const MAX_ACTIONS_PER_PLAYER = 3;
const MAX_LINE = 220;

function clipLine(s: string, max: number): string {
  const t = s.trim().replace(/\s+/g, " ");
  if (t.length <= max) return t;
  return `${t.slice(0, max - 1)}…`;
}

export function buildPreviousSessionNextActionsCarryV1Dto(
  meaning: SessionMeaning,
  sourceLiveTrainingSessionId: string
): LiveTrainingPreviousSessionNextActionsCarryV1Dto | null {
  if (!sessionMeaningPassesNextActionsConfidenceGate(meaning)) return null;
  const na = meaning.nextActions;
  if (!na) return null;

  const trainingFocus = na.nextTrainingFocus
    .map((s) => clipLine(s, MAX_LINE))
    .filter(Boolean)
    .slice(0, MAX_FOCUS);

  const teamAccents = na.team
    .map((s) => clipLine(s, MAX_LINE))
    .filter(Boolean)
    .slice(0, MAX_TEAM);

  const players: LiveTrainingPreviousSessionNextActionsCarryV1Dto["players"] = [];
  for (const p of na.players) {
    if (players.length >= MAX_PLAYERS) break;
    const pid = typeof p.playerId === "string" ? p.playerId.trim() : "";
    const pname = typeof p.playerName === "string" ? p.playerName.trim().slice(0, 200) : "";
    if (!pid || !pname) continue;
    const actions = p.actions
      .map((s) => clipLine(s, MAX_LINE))
      .filter(Boolean)
      .slice(0, MAX_ACTIONS_PER_PLAYER);
    if (actions.length === 0) continue;
    players.push({ playerId: pid, playerName: pname, actions });
  }

  const hasBody =
    trainingFocus.length > 0 || teamAccents.length > 0 || players.length > 0;
  if (!hasBody) return null;

  return {
    version: PREVIOUS_SESSION_NEXT_ACTIONS_CARRY_VERSION,
    sourceLiveTrainingSessionId,
    trainingFocus,
    teamAccents,
    players,
  };
}

export async function fetchPreviousSessionNextActionsCarryForTeam(
  teamId: string,
  coachId: string
): Promise<LiveTrainingPreviousSessionNextActionsCarryV1Dto | null> {
  const row = await prisma.liveTrainingSession.findFirst({
    where: { teamId, coachId, status: "confirmed" },
    orderBy: [{ confirmedAt: "desc" }, { updatedAt: "desc" }],
    select: { id: true, sessionMeaningJson: true },
  });
  if (!row) return null;
  const meaning = parsePersistedSessionMeaning(row.sessionMeaningJson);
  if (!meaning) return null;
  return buildPreviousSessionNextActionsCarryV1Dto(meaning, row.id);
}

/**
 * Добавляет блок переноса в JSON снимка перед записью в БД; при ошибке парсера оставляет исходный JSON.
 */
export async function enrichPlanningSnapshotJsonWithPreviousSessionCarry(
  teamId: string,
  coachId: string,
  baseJson: Prisma.InputJsonValue
): Promise<Prisma.InputJsonValue> {
  const carry = await fetchPreviousSessionNextActionsCarryForTeam(teamId, coachId);
  if (!carry) return baseJson;

  const raw =
    baseJson && typeof baseJson === "object" && !Array.isArray(baseJson)
      ? { ...(baseJson as Record<string, unknown>) }
      : {};
  raw.previousSessionNextActionsCarryV1 = carry;

  const parsed = parsePlanningObject(raw as Record<string, unknown>);
  return (parsed ?? raw) as unknown as Prisma.InputJsonValue;
}
