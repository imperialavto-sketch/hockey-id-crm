/**
 * MVP: одна строка из SessionMeaning.nextActions (команда → игроки) → детерминированный id кандидата задачи.
 * Используется сервером (materialize) и coach-app (report-draft). Не включает nextTrainingFocus.
 */

export type SessionMeaningNextActionsMin = {
  team: string[];
  players: Array<{ playerId: string; playerName: string; actions: string[] }>;
};

export type SessionMeaningFollowUpPick =
  | { kind: "team"; index: number; line: string }
  | { kind: "player"; playerId: string; playerName: string; actionIndex: number; line: string };

export function pickSessionMeaningFollowUpMvpLine(
  next: SessionMeaningNextActionsMin | null | undefined
): SessionMeaningFollowUpPick | null {
  if (!next) return null;
  const team = Array.isArray(next.team) ? next.team : [];
  for (let i = 0; i < team.length; i++) {
    const line = String(team[i] ?? "")
      .trim()
      .replace(/\s+/g, " ");
    if (line) return { kind: "team", index: i, line };
  }
  const players = Array.isArray(next.players) ? next.players : [];
  for (const p of players) {
    if (!p?.playerId || String(p.playerId).trim() === "") continue;
    const name = String(p.playerName ?? "").trim() || "Игрок";
    const actions = Array.isArray(p.actions) ? p.actions : [];
    for (let j = 0; j < actions.length; j++) {
      const line = String(actions[j] ?? "")
        .trim()
        .replace(/\s+/g, " ");
      if (line) {
        return {
          kind: "player",
          playerId: String(p.playerId).trim(),
          playerName: name,
          actionIndex: j,
          line,
        };
      }
    }
  }
  return null;
}

export function sessionMeaningFollowUpCandidateId(
  sessionId: string,
  pick: SessionMeaningFollowUpPick
): string {
  if (pick.kind === "team") {
    return `ltac:s:${sessionId}:meaning:team:${pick.index}`;
  }
  return `ltac:s:${sessionId}:meaning:p:${pick.playerId}:${pick.actionIndex}`;
}

/** Нормализация строки для сравнения team vs player action. */
export function normalizeMeaningFollowUpLine(s: string): string {
  return String(s ?? "")
    .trim()
    .replace(/\s+/g, " ");
}

/** Первая непустая строка командного блока (если нет — null). */
export function firstNonEmptyTeamLine(
  next: SessionMeaningNextActionsMin | null | undefined
): string | null {
  if (!next) return null;
  const team = Array.isArray(next.team) ? next.team : [];
  for (const t of team) {
    const n = normalizeMeaningFollowUpLine(t);
    if (n) return n;
  }
  return null;
}

/**
 * Персональная задача players[0].actions[0] с id `meaning:p:{playerId}:0`.
 * Только если есть командная строка и текст игрока от неё отличается (не дублировать team CTA).
 */
export function getPlayerZeroFollowUpWhenDistinctFromTeam(
  sessionId: string,
  next: SessionMeaningNextActionsMin | null | undefined
): { playerId: string; playerName: string; line: string; candidateId: string } | null {
  if (!next) return null;
  const teamFirst = firstNonEmptyTeamLine(next);
  if (!teamFirst) return null;

  const p0 = next.players?.[0];
  if (!p0?.playerId || String(p0.playerId).trim() === "") return null;
  const line = normalizeMeaningFollowUpLine(String(p0.actions?.[0] ?? ""));
  if (!line) return null;
  if (normalizeMeaningFollowUpLine(teamFirst) === line) return null;

  const playerId = String(p0.playerId).trim();
  const candidateId = `ltac:s:${sessionId}:meaning:p:${playerId}:0`;
  const playerName = String(p0.playerName ?? "").trim() || "Игрок";
  return { playerId, playerName, line, candidateId };
}
