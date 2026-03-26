/**
 * Shared TrainingSession serialization and access checks for API routes.
 */

import type { ApiUser } from "./api-auth";
import { canAccessTraining } from "./data-scope";

/** Текущая модель: лёд vs ОФП */
export const TRAINING_SESSION_KINDS = ["ice", "ofp"] as const;
export type TrainingSessionKind = (typeof TRAINING_SESSION_KINDS)[number];

/**
 * Нормализует ввод API: ice|ofp, либо legacy hockey|game|individual → ice, ofp → ofp.
 */
export function normalizeTrainingSessionKind(raw: string): TrainingSessionKind | null {
  const t = raw.trim().toLowerCase();
  if (t === "ofp") return "ofp";
  if (t === "ice" || t === "hockey" || t === "game" || t === "individual") {
    return "ice";
  }
  return null;
}

export function isTrainingSessionKind(t: string): t is TrainingSessionKind {
  return t === "ice" || t === "ofp";
}

/** @deprecated используйте normalizeTrainingSessionKind + isTrainingSessionKind */
export function isTrainingSessionType(t: string): boolean {
  return normalizeTrainingSessionKind(t) !== null;
}

export function parseTrainingSessionSubType(raw: unknown): string | null {
  if (raw === undefined || raw === null) return null;
  if (typeof raw !== "string") return null;
  const s = raw.trim();
  if (!s) return null;
  return s.length > 64 ? s.slice(0, 64) : s;
}

export function canUserAccessSessionTeam(
  user: ApiUser,
  session: { teamId: string; team?: { schoolId: string } | null }
): boolean {
  return canAccessTraining(user, {
    id: session.teamId,
    teamId: session.teamId,
    team: session.team ?? undefined,
  });
}
