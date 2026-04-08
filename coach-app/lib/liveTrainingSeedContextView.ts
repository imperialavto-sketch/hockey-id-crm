/**
 * PHASE 30: компактный view-model блоков planSeeds для live session (без server DTO).
 */

import { formatLiveTrainingMetricDomain } from "@/lib/liveTrainingMetricDomainLabel";
import type { LiveTrainingPlanningSnapshot } from "@/types/liveTraining";

const MAX_BLOCKS = 4;
const MAX_SHORT_DESCRIPTION = 96;
const MAX_DOMAIN_CHIPS = 4;
const MAX_PLAYER_CHIPS = 3;

export type LiveTrainingSeedContextBlockType = "warmup" | "main" | "focus" | "reinforcement";

export type LiveTrainingSeedContextBlockView = {
  type: LiveTrainingSeedContextBlockType;
  title: string;
  shortDescription: string;
  domainLabels: string[];
  focusPlayers: string[];
};

export type LiveTrainingSeedContextView = {
  blocks: LiveTrainingSeedContextBlockView[];
  lowData: boolean;
};

function snip(s: string, max: number): string {
  const t = s.replace(/\s+/g, " ").trim();
  if (t.length <= max) return t;
  return `${t.slice(0, max - 1).trimEnd()}…`;
}

function shortPlayerName(full: string): string {
  const t = full.trim().split(/\s+/)[0];
  return t || full;
}

function normalizeBlockType(raw: string): LiveTrainingSeedContextBlockType {
  if (raw === "warmup" || raw === "main" || raw === "focus" || raw === "reinforcement") {
    return raw;
  }
  return "main";
}

function fallbackLineForType(type: LiveTrainingSeedContextBlockType): string {
  if (type === "warmup") return "Включение в работу.";
  if (type === "main") return "Основная часть.";
  if (type === "focus") return "Точечная работа.";
  return "Закрепление.";
}

/**
 * Строит компактный контекст по сохранённому planSeeds (read-only).
 * Без парсинга description для извлечения доменов — только linkedDomains и focusPlayers.
 */
export function buildLiveTrainingSeedContextView(
  planSeeds: LiveTrainingPlanningSnapshot["planSeeds"] | null | undefined
): LiveTrainingSeedContextView | null {
  const rawBlocks = planSeeds?.blocks;
  if (!Array.isArray(rawBlocks) || rawBlocks.length === 0) {
    return null;
  }

  const blocks: LiveTrainingSeedContextBlockView[] = rawBlocks.slice(0, MAX_BLOCKS).map((b) => {
    const type = normalizeBlockType(typeof b.type === "string" ? b.type : "main");
    const title = typeof b.title === "string" && b.title.trim() ? b.title.trim() : "Блок";
    const desc = typeof b.description === "string" ? b.description.trim() : "";
    const shortDescription = desc
      ? snip(desc, MAX_SHORT_DESCRIPTION)
      : fallbackLineForType(type);

    const domainLabels = (Array.isArray(b.linkedDomains) ? b.linkedDomains : [])
      .filter((d): d is string => typeof d === "string" && d.trim().length > 0)
      .map((d) => formatLiveTrainingMetricDomain(d))
      .slice(0, MAX_DOMAIN_CHIPS);

    const focusPlayers = (Array.isArray(b.focusPlayers) ? b.focusPlayers : [])
      .filter((p) => p && typeof p.playerName === "string")
      .map((p) => shortPlayerName(p.playerName))
      .filter(Boolean)
      .slice(0, MAX_PLAYER_CHIPS);

    return {
      type,
      title,
      shortDescription,
      domainLabels,
      focusPlayers,
    };
  });

  return {
    blocks,
    lowData: Boolean(planSeeds?.lowData),
  };
}
