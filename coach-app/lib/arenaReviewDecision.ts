/**
 * Decision-first слой экрана review live training: герой, приоритетные игроки, следующие шаги.
 * Только клиент и уже загруженные черновики / summary — без смены API и confirm.
 */

import {
  formatDevelopmentZoneLine,
  getZonesForPlayerFromStressMap,
  totalStressSumForPlayer,
  type PlayerDevelopmentStressMap,
} from "@/lib/arenaDevelopmentMapping";
import {
  buildLiveTrainingReviewNextAction,
  type LiveTrainingReviewNextAction,
} from "@/lib/liveTrainingReviewNextAction";
import type {
  LiveTrainingReviewAccelerationCounts,
  LiveTrainingReviewFilterMode,
} from "@/lib/liveTrainingReviewAcceleration";
import { DOMAIN_TITLE_RU, type DevelopmentDomain } from "@/lib/coachAgeStandardsPresentation";
import { buildGroupReviewLayer } from "@/lib/arenaGroupIntelligence";
import type {
  LiveTrainingObservationDraft,
  LiveTrainingPreConfirmSummary,
  LiveTrainingReviewSummary,
} from "@/types/liveTraining";

export type ReviewDecisionHeroVm =
  | {
      kind: "player";
      playerId: string;
      playerLabel: string;
      zonesLine: string | null;
      thinkLine: string;
      arenaCatch: string | null;
      needsReviewBanner: boolean;
    }
  | {
      kind: "session";
      headline: string;
      thinkLine: string;
      arenaCatch: string | null;
      needsReviewBanner: boolean;
    };

export type ReviewDecisionPriorityPlayerVm = {
  playerId: string;
  playerLabel: string;
  zonesLine: string | null;
  statusLine: string;
  tone: "hot" | "warm" | "cool";
};

export type ReviewDecisionNextActionVm = {
  id: string;
  title: string;
  subtitle?: string;
  filter?: Exclude<LiveTrainingReviewFilterMode, "all">;
  href?: "/actions";
};

export type ReviewDecisionGroupLayerVm = {
  summary: string;
  domainsLine: string | null;
};

export type ReviewDecisionBundle = {
  hero: ReviewDecisionHeroVm;
  priorityPlayers: ReviewDecisionPriorityPlayerVm[];
  nextActions: ReviewDecisionNextActionVm[];
  /** Компактный групповой слой (только групповая смена + известный состав). */
  groupLayer: ReviewDecisionGroupLayerVm | null;
};

export type BuildReviewDecisionInput = {
  drafts: LiveTrainingObservationDraft[];
  rosterNameById: Record<string, string>;
  devAcc: PlayerDevelopmentStressMap;
  reviewSummary: LiveTrainingReviewSummary;
  preConfirmSummary: LiveTrainingPreConfirmSummary;
  intelBullets: string[];
  coachLine: string | null;
  accelerationCounts: LiveTrainingReviewAccelerationCounts;
  touchedDraftIds: ReadonlySet<string>;
  quickAppliedDraftIds: ReadonlySet<string>;
  /** Групповая смена: подпись + id игроков сегмента (клиент подгружает через coach players API). */
  groupReview?: {
    groupLabel: string;
    playerIdsInGroup: string[];
  } | null;
};

function firstNameFromRoster(pid: string, rosterNameById: Record<string, string>): string {
  const full = rosterNameById[pid]?.trim();
  if (full) {
    const t = full.split(/\s+/)[0];
    return t || full;
  }
  return "Игрок";
}

function uniquePlayerIds(drafts: LiveTrainingObservationDraft[]): string[] {
  const s = new Set<string>();
  for (const d of drafts) {
    const id = d.playerId?.trim();
    if (id) s.add(id);
  }
  return [...s];
}

function scorePlayer(
  pid: string,
  drafts: LiveTrainingObservationDraft[],
  devAcc: PlayerDevelopmentStressMap
): { score: number; stress: number; neg: number; needsReview: number; draftN: number } {
  const stress = totalStressSumForPlayer(devAcc, pid);
  let neg = 0;
  let needsReview = 0;
  let draftN = 0;
  for (const d of drafts) {
    if (d.playerId?.trim() !== pid) continue;
    draftN += 1;
    if (d.sentiment === "negative") neg += 1;
    if (d.needsReview) needsReview += 1;
  }
  const score = stress * 2.1 + neg * 1.35 + needsReview * 2.25 + draftN * 0.12;
  return { score, stress, neg, needsReview, draftN };
}

function rankedPlayers(
  drafts: LiveTrainingObservationDraft[],
  devAcc: PlayerDevelopmentStressMap
): Array<{ pid: string; meta: ReturnType<typeof scorePlayer> }> {
  const ids = uniquePlayerIds(drafts);
  const rows = ids.map((pid) => ({ pid, meta: scorePlayer(pid, drafts, devAcc) }));
  rows.sort((a, b) => {
    if (b.meta.score !== a.meta.score) return b.meta.score - a.meta.score;
    return b.meta.stress - a.meta.stress;
  });
  return rows;
}

function zonesLineForPlayer(
  devAcc: PlayerDevelopmentStressMap,
  pid: string,
  max: number
): string | null {
  const zs = getZonesForPlayerFromStressMap(devAcc, pid, max);
  if (zs.length === 0) return null;
  return zs.map((z) => formatDevelopmentZoneLine(z)).join(" · ");
}

function thinkLineForPlayer(meta: ReturnType<typeof scorePlayer>, zonesLine: string | null): string {
  if (zonesLine) {
    return `Куда смотреть: ${zonesLine.replace(/\s*·\s*/g, ", ").replace(/\s+/g, " ")}.`;
  }
  if (meta.neg >= 2) return "Плотнее минусы — проверь контекст, не только тон.";
  if (meta.draftN >= 3) return "Много карточек — выбери, что задаст тон после смены.";
  return "Пробеги наблюдения по этому игроку перед фиксацией.";
}

function pickArenaCatch(
  intelBullets: string[],
  coachLine: string | null,
  thinkLine: string
): string | null {
  const clip = (s: string, n: number) => {
    const t = s.trim();
    if (t.length <= n) return t;
    return `${t.slice(0, n - 1)}…`;
  };
  const candidates: string[] = [];
  if (intelBullets[0]) candidates.push(intelBullets[0]!);
  if (coachLine) candidates.push(coachLine);
  for (const c of candidates) {
    const short = clip(c, 96);
    if (short && !thinkLine.includes(short.slice(0, 24))) return short;
  }
  return candidates[0] ? clip(candidates[0]!, 96) : null;
}

function playerTone(meta: ReturnType<typeof scorePlayer>): "hot" | "warm" | "cool" {
  if (meta.needsReview > 0 || meta.neg >= 2) return "hot";
  if (meta.stress >= 0.45 || meta.draftN >= 3) return "warm";
  return "cool";
}

function statusLineForPlayer(meta: ReturnType<typeof scorePlayer>): string {
  if (meta.needsReview > 0) return "Есть «проверка»";
  if (meta.neg >= 2) return "Много минусов";
  if (meta.draftN >= 4) return "Плотный разбор";
  if (meta.draftN >= 2) return "Несколько меток";
  return "На контроле";
}

function shortenNextActionTitle(primary: string): string {
  const map: Record<string, string> = {
    "Начните с наблюдений, требующих проверки": "Сначала строки с «проверка»",
    "Дальше — наблюдения без привязки к игроку": "Привязать без игрока",
    "Можно быстро уточнить часть наблюдений": "Быстрые правки по подсказкам",
    "Пройдитесь по быстрым правкам": "Быстрые правки",
    "Просмотрите наблюдения перед подтверждением": "Пробежать карточки",
  };
  return map[primary] ?? primary;
}

function topDownDomainLabel(devAcc: PlayerDevelopmentStressMap): string | null {
  let bestStress = 0;
  let bestLabel: string | null = null;
  for (const pid of Object.keys(devAcc)) {
    const row = devAcc[pid];
    if (!row) continue;
    for (const dk of Object.keys(row) as DevelopmentDomain[]) {
      const cell = row[dk];
      if (!cell) continue;
      if (cell.stress >= 0.3 && cell.stress >= cell.lift * 1.05 && cell.stress > bestStress) {
        bestStress = cell.stress;
        bestLabel = DOMAIN_TITLE_RU[dk];
      }
    }
  }
  return bestLabel;
}

export function buildReviewDecisionHero(input: BuildReviewDecisionInput): ReviewDecisionHeroVm {
  const {
    drafts,
    rosterNameById,
    devAcc,
    reviewSummary,
    preConfirmSummary,
    intelBullets,
    coachLine,
  } = input;
  const needsReviewBanner = reviewSummary.needsReviewCount > 0;
  const ranked = rankedPlayers(drafts, devAcc);
  const top = ranked[0];

  const strongPlayer =
    top &&
    (top.meta.score >= 0.42 ||
      top.meta.stress >= 0.28 ||
      top.meta.neg >= 2 ||
      top.meta.needsReview >= 1);

  if (strongPlayer && top) {
    const label = firstNameFromRoster(top.pid, rosterNameById);
    const zonesLine = zonesLineForPlayer(devAcc, top.pid, 2);
    const think = thinkLineForPlayer(top.meta, zonesLine);
    const arenaCatch = pickArenaCatch(intelBullets, coachLine, think);
    return {
      kind: "player",
      playerId: top.pid,
      playerLabel: label,
      zonesLine,
      thinkLine: think,
      arenaCatch,
      needsReviewBanner,
    };
  }

  const fallbackPlayer = preConfirmSummary.topDraftPlayers[0];
  if (fallbackPlayer?.playerId?.trim()) {
    const pid = fallbackPlayer.playerId.trim();
    const meta = scorePlayer(pid, drafts, devAcc);
    const label = firstNameFromRoster(pid, rosterNameById);
    const zonesLine = zonesLineForPlayer(devAcc, pid, 2);
    const think =
      zonesLine != null
        ? thinkLineForPlayer(meta, zonesLine)
        : `Больше всего карточек по ${label} — логичный первый разбор.`;
    const arenaCatch = pickArenaCatch(intelBullets, coachLine, think);
    return {
      kind: "player",
      playerId: pid,
      playerLabel: label,
      zonesLine,
      thinkLine: think,
      arenaCatch,
      needsReviewBanner,
    };
  }

  const headline = drafts.length >= 4 ? "Несколько линий наблюдений" : "Смена без явного лидера";
  const thinkLine =
    intelBullets[0]?.trim() ||
    coachLine?.trim() ||
    (drafts.length === 0
      ? "Наблюдений нет — можно зафиксировать или вернуться на лайв."
      : "Пробеги список и реши, что задаст тон карточкам.");
  const arenaCatch =
    intelBullets[1]?.trim() ||
    (intelBullets[0] && coachLine && intelBullets[0] !== coachLine ? coachLine : null);
  return {
    kind: "session",
    headline,
    thinkLine,
    arenaCatch: arenaCatch ? (arenaCatch.length > 96 ? `${arenaCatch.slice(0, 95)}…` : arenaCatch) : null,
    needsReviewBanner,
  };
}

export function buildReviewPriorityPlayers(
  input: BuildReviewDecisionInput,
  heroFocusPlayerId: string | null
): ReviewDecisionPriorityPlayerVm[] {
  const ranked = rankedPlayers(input.drafts, input.devAcc);
  const out: ReviewDecisionPriorityPlayerVm[] = [];
  for (const row of ranked) {
    if (heroFocusPlayerId && row.pid === heroFocusPlayerId) continue;
    if (out.length >= 3) break;
    if (row.meta.score < 0.18 && row.meta.draftN < 2 && row.meta.stress < 0.08) continue;
    const label = firstNameFromRoster(row.pid, input.rosterNameById);
    const zonesLine = zonesLineForPlayer(input.devAcc, row.pid, 2);
    out.push({
      playerId: row.pid,
      playerLabel: label,
      zonesLine,
      statusLine: statusLineForPlayer(row.meta),
      tone: playerTone(row.meta),
    });
  }
  return out;
}

function nextActionFromNba(nba: LiveTrainingReviewNextAction | null): ReviewDecisionNextActionVm[] {
  if (!nba) return [];
  const title = shortenNextActionTitle(nba.primaryAction);
  const item: ReviewDecisionNextActionVm = {
    id: "flow",
    title,
    subtitle: nba.secondaryAction,
    filter: nba.targetFilter,
  };
  return [item];
}

export function buildReviewDecisionNextActions(input: BuildReviewDecisionInput): ReviewDecisionNextActionVm[] {
  const progress = {
    touchedDraftIds: input.touchedDraftIds,
    quickAppliedDraftIds: input.quickAppliedDraftIds,
  };
  const nba = buildLiveTrainingReviewNextAction({
    drafts: input.drafts,
    reviewSummary: input.reviewSummary,
    accelerationCounts: input.accelerationCounts,
    progress,
  });

  const items: ReviewDecisionNextActionVm[] = [];
  items.push(...nextActionFromNba(nba));

  const domainHint = topDownDomainLabel(input.devAcc);
  if (input.drafts.length > 0) {
    items.push({
      id: "tasks",
      title: "Задачи и следующий шаг",
      subtitle: domainHint ? `Идея: уделить внимание «${domainHint}»` : undefined,
      href: "/actions",
    });
  }

  const out = items.slice(0, 3);
  return out;
}

export function buildReviewDecisionBundle(input: BuildReviewDecisionInput): ReviewDecisionBundle {
  const hero = buildReviewDecisionHero(input);
  const heroFocusPlayerId = hero.kind === "player" ? hero.playerId : null;
  const priorityPlayers = buildReviewPriorityPlayers(input, heroFocusPlayerId);
  const nextActions = buildReviewDecisionNextActions(input);

  const gr = input.groupReview;
  const groupLayer =
    gr && gr.playerIdsInGroup.length > 0
      ? buildGroupReviewLayer({
          drafts: input.drafts,
          devAcc: input.devAcc,
          groupPlayerIds: new Set(gr.playerIdsInGroup),
          groupLabel: gr.groupLabel,
        })
      : null;

  return { hero, priorityPlayers, nextActions, groupLayer };
}
