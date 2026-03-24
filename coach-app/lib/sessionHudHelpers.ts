/**
 * Live Session HUD — helpers for compact session summary
 */

import type { SessionObservation } from "@/models/sessionObservation";
import type { SessionStatus } from "@/models/sessionObservation";

export interface SessionHudData {
  statusLabel: string;
  statusSubtitle: string | null;
  observationCount: number;
  uniquePlayersCount: number;
  selectedPlayerLabel: string | null;
  selectedSkillLabel: string | null;
  stickyPlayerActive: boolean;
  stickySkillActive: boolean;
}

export function buildSessionHudData(
  observations: SessionObservation[],
  status: SessionStatus,
  selectedPlayerLabel: string | null,
  selectedSkillLabel: string | null,
  isStickyPlayer: boolean,
  isStickySkill: boolean
): SessionHudData {
  const uniquePlayers = new Set(observations.map((o) => o.playerId)).size;

  let statusLabel: string;
  let statusSubtitle: string | null = null;

  switch (status) {
    case "idle":
      statusLabel = "Сессия не начата";
      statusSubtitle = "Начните тренировку, чтобы фиксировать наблюдения";
      break;
    case "active":
      statusLabel = "Тренировка активна";
      break;
    case "review":
      statusLabel = "Обзор сессии";
      break;
    case "completed":
      statusLabel = "Сессия завершена";
      break;
    default:
      statusLabel = "Сессия";
  }

  return {
    statusLabel,
    statusSubtitle,
    observationCount: observations.length,
    uniquePlayersCount: uniquePlayers,
    selectedPlayerLabel,
    selectedSkillLabel,
    stickyPlayerActive: isStickyPlayer,
    stickySkillActive: isStickySkill,
  };
}
