/**
 * Клиентский слой: события live / черновики → домены развития из общего фреймворка паспорта
 * (`DevelopmentDomain`, см. `coachPlayerDevelopmentEvidence.ts`).
 * Rule-based, без API и без ML.
 */

import type { LiveTrainingEventItem } from "@/services/liveTrainingService";
import type { LiveTrainingObservationDraft } from "@/types/liveTraining";
import {
  DOMAIN_TITLE_RU,
  type DevelopmentDomain,
} from "@/lib/coachAgeStandardsPresentation";
import type { LiveTrainingEventOutboxBody } from "@/lib/liveTrainingEventOutbox";

export type ArenaDevelopmentMapResult = {
  /** Домен развития (паспорт / стандарты возраста). */
  skill: DevelopmentDomain;
  /** Короткий источник: slug категории или keyword. */
  category: string;
  /** Вес наблюдения (тон + уверенность). */
  weight: number;
};

export type PlayerDevelopmentStressMap = Record<
  string,
  Partial<Record<DevelopmentDomain, { stress: number; lift: number }>>
>;

export type ArenaDevelopmentZoneLineVm = {
  domain: DevelopmentDomain;
  labelRu: string;
  trend: "down" | "up" | "neutral";
};

export type ArenaDevelopmentPlayerBlockVm = {
  playerId: string;
  playerLabel: string;
  zones: ArenaDevelopmentZoneLineVm[];
};

const KEYWORD_RULES: Array<{ re: RegExp; domain: DevelopmentDomain }> = [
  { re: /потеря(л|ла|ли)?\s+шайб|потеря\s+шайбы|turnover|lost\s+(the\s+)?puck/i, domain: "decision_making" },
  {
    re: /не\s+успел\s+вернуться|опоздал|поздно\s+верн|не\s+догнал|lazy\s+back|не\s+возвращ/i,
    domain: "discipline",
  },
  {
    re: /позицион|не\s+на\s+месте|не\s+туда|зону\s+упустил|wrong\s+side|coverage/i,
    domain: "decision_making",
  },
  { re: /отвлёк|отвлек|концентрац|внимани|слушал|listening|focus/i, domain: "attention" },
  { re: /хорош(ий|ая|ое|ие)?\s+пас|отличн(ый|ая|ое|ие)?\s+пас|vision|поднял\s+голов/i, domain: "decision_making" },
  { re: /\bпас\b|передач|pass\b/i, domain: "puck_control" },
  { re: /веден|клюшк|контрол.*шайб|puck\s+control|stickhandl/i, domain: "puck_control" },
  { re: /катан|шаг|кант|stride|скорост|ускорен/i, domain: "skating" },
  { re: /бросок|гол|shot\b|shoot/i, domain: "puck_control" },
  { re: /силов|офп|доработал|ног|work\s*rate|conditioning/i, domain: "physical" },
];

function normSentiment(s: string | null | undefined): "positive" | "negative" | "neutral" {
  const t = (s ?? "").trim().toLowerCase();
  if (t === "positive") return "positive";
  if (t === "negative") return "negative";
  return "neutral";
}

function weightForObservation(
  sentiment: "positive" | "negative" | "neutral",
  confidence: number | null | undefined
): number {
  let w = sentiment === "negative" ? 1.22 : sentiment === "positive" ? 0.82 : 0.58;
  if (confidence != null && Number.isFinite(confidence) && confidence >= 0.78) {
    w *= 1.06;
  }
  return w;
}

function matchKeywordDomain(lowerText: string): DevelopmentDomain | null {
  for (const rule of KEYWORD_RULES) {
    if (rule.re.test(lowerText)) return rule.domain;
  }
  return null;
}

function slugToDevelopmentDomain(slug: string): DevelopmentDomain | null {
  const k = slug.trim().toLowerCase();
  if (
    k === "skating" ||
    k === "puck_control" ||
    k === "decision_making" ||
    k === "discipline" ||
    k === "attention" ||
    k === "physical"
  ) {
    return k;
  }
  if (k === "pace") return "decision_making";
  if (k === "shooting") return "puck_control";
  if (k === "workrate" || k === "ofp" || k === "effort") return "physical";
  if (k === "engagement" || k === "coachability") return "attention";
  return null;
}

function mapPlainDraftCategory(categoryLower: string): DevelopmentDomain | null {
  switch (categoryLower) {
    case "pace":
      return "decision_making";
    case "puck_control":
      return "puck_control";
    case "skating":
      return "skating";
    case "shooting":
      return "puck_control";
    case "discipline":
      return "discipline";
    case "attention":
      return "attention";
    case "effort":
      return "physical";
    case "ofp_technique":
      return "physical";
    default:
      return null;
  }
}

/**
 * Категория с сервера / ingest (`arena:…` или плоский slug).
 */
export function resolveDevelopmentDomainFromCategory(
  category: string | null | undefined
): DevelopmentDomain | null {
  const c = (category ?? "").trim().toLowerCase();
  if (!c) return null;
  if (c.startsWith("arena:")) {
    const tail = c.slice("arena:".length);
    const parts = tail
      .split("|")
      .map((p) => p.trim().toLowerCase())
      .filter(Boolean);
    if (parts.length === 0) return null;
    const head = parts[0]!;
    if (head === "team" || head === "session") return null;
    if (head === "behavior") {
      const sub = parts[1];
      if (sub === "discipline") return "discipline";
      if (sub === "attention") return "attention";
      return null;
    }
    return slugToDevelopmentDomain(head);
  }
  return slugToDevelopmentDomain(c) ?? mapPlainDraftCategory(c);
}

/**
 * Текст + категория → домен. Сначала ключевые фразы (продуктовые примеры), затем категория.
 */
export function resolveDevelopmentDomain(text: string, category: string | null | undefined): DevelopmentDomain | null {
  const t = text.trim().toLowerCase();
  if (t.length > 0) {
    const kw = matchKeywordDomain(t);
    if (kw) return kw;
  }
  return resolveDevelopmentDomainFromCategory(category);
}

/**
 * Одно наблюдение → домен развития + вес (для агрегатов).
 */
export function mapEventToDevelopment(event: LiveTrainingEventItem): ArenaDevelopmentMapResult | null {
  const pid = event.playerId?.trim();
  if (!pid) return null;
  const text = [event.normalizedText ?? "", event.rawText ?? ""]
    .map((x) => x.trim())
    .filter(Boolean)
    .join(" ")
    .trim();
  const corpus = text || (event.rawText ?? "").trim();
  const domain = resolveDevelopmentDomain(corpus, event.category);
  if (!domain) return null;
  const sent = normSentiment(event.sentiment);
  const cat = (event.category ?? "").trim();
  return {
    skill: domain,
    category: cat || "observation",
    weight: weightForObservation(sent, event.confidence),
  };
}

export function mapDraftToDevelopment(draft: LiveTrainingObservationDraft): ArenaDevelopmentMapResult | null {
  const pid = draft.playerId?.trim();
  if (!pid) return null;
  const domain = resolveDevelopmentDomain(draft.sourceText ?? "", draft.category);
  if (!domain) return null;
  const sent = normSentiment(draft.sentiment);
  return {
    skill: domain,
    category: draft.category.trim() || "draft",
    weight: weightForObservation(sent, draft.confidence),
  };
}

function bumpPlayerDomain(
  acc: PlayerDevelopmentStressMap,
  playerId: string,
  domain: DevelopmentDomain,
  weight: number,
  sentiment: "positive" | "negative" | "neutral"
): void {
  const row = acc[playerId] ?? {};
  const cell = row[domain] ?? { stress: 0, lift: 0 };
  if (sentiment === "negative") {
    cell.stress += weight;
  } else if (sentiment === "positive") {
    cell.lift += weight;
  } else {
    cell.stress += weight * 0.42;
    cell.lift += weight * 0.42;
  }
  row[domain] = cell;
  acc[playerId] = row;
}

export function accumulateDevelopmentFromEvents(events: LiveTrainingEventItem[]): PlayerDevelopmentStressMap {
  const acc: PlayerDevelopmentStressMap = {};
  for (const ev of events) {
    const mapped = mapEventToDevelopment(ev);
    if (!mapped) continue;
    const pid = ev.playerId!.trim();
    bumpPlayerDomain(acc, pid, mapped.skill, mapped.weight, normSentiment(ev.sentiment));
  }
  return acc;
}

export function accumulateDevelopmentFromDrafts(drafts: LiveTrainingObservationDraft[]): PlayerDevelopmentStressMap {
  const acc: PlayerDevelopmentStressMap = {};
  for (const d of drafts) {
    const mapped = mapDraftToDevelopment(d);
    if (!mapped) continue;
    const pid = d.playerId!.trim();
    bumpPlayerDomain(acc, pid, mapped.skill, mapped.weight, normSentiment(d.sentiment));
  }
  return acc;
}

export function accumulateDevelopmentFromOutboxBodies(
  bodies: LiveTrainingEventOutboxBody[]
): PlayerDevelopmentStressMap {
  const acc: PlayerDevelopmentStressMap = {};
  for (const b of bodies) {
    const pid = b.playerId?.trim();
    if (!pid) continue;
    const text = (b.rawText ?? "").trim();
    const domain = resolveDevelopmentDomain(text, b.category ?? null);
    if (!domain) continue;
    const sent = normSentiment(b.sentiment);
    const w = weightForObservation(sent, b.confidence);
    bumpPlayerDomain(acc, pid, domain, w, sent);
  }
  return acc;
}

function mergeStressMaps(a: PlayerDevelopmentStressMap, b: PlayerDevelopmentStressMap): PlayerDevelopmentStressMap {
  const out: PlayerDevelopmentStressMap = { ...a };
  for (const pid of Object.keys(b)) {
    const src = b[pid];
    if (!src) continue;
    const dest = { ...(out[pid] ?? {}) };
    for (const dk of Object.keys(src) as DevelopmentDomain[]) {
      const d = dk as DevelopmentDomain;
      const add = src[d];
      if (!add) continue;
      const prev = dest[d] ?? { stress: 0, lift: 0 };
      dest[d] = {
        stress: prev.stress + add.stress,
        lift: prev.lift + add.lift,
      };
    }
    out[pid] = dest;
  }
  return out;
}

/** Сводка live-ленты + очередь outbox (ещё не на сервере). */
export function mergeLiveDevelopmentAccumulators(
  fromEvents: PlayerDevelopmentStressMap,
  fromOutbox: PlayerDevelopmentStressMap
): PlayerDevelopmentStressMap {
  return mergeStressMaps(fromEvents, fromOutbox);
}

function zoneTrend(stress: number, lift: number): "down" | "up" | "neutral" {
  if (stress >= 0.35 && stress >= lift * 1.12) return "down";
  if (lift >= 0.35 && lift >= stress * 1.12) return "up";
  return "neutral";
}

/** Суммарный stress по игроку (для приоритизации review). */
export function totalStressSumForPlayer(
  acc: PlayerDevelopmentStressMap,
  playerId: string
): number {
  const row = acc[playerId];
  if (!row) return 0;
  let s = 0;
  for (const v of Object.values(row)) {
    s += v.stress;
  }
  return s;
}

/** Зоны развития по одному игроку из накопителя (без сортировки списка всех игроков). */
export function getZonesForPlayerFromStressMap(
  acc: PlayerDevelopmentStressMap,
  playerId: string,
  maxZones: number
): ArenaDevelopmentZoneLineVm[] {
  const row = acc[playerId];
  if (!row) return [];
  const domains = (Object.keys(row) as DevelopmentDomain[])
    .map((domain) => {
      const cell = row[domain]!;
      const intensity = cell.stress + cell.lift;
      return { domain, cell, intensity };
    })
    .filter((x) => x.intensity >= 0.2)
    .sort((a, b) => {
      if (b.cell.stress !== a.cell.stress) return b.cell.stress - a.cell.stress;
      return b.intensity - a.intensity;
    })
    .slice(0, maxZones);

  return domains.map(({ domain, cell }) => ({
    domain,
    labelRu: DOMAIN_TITLE_RU[domain],
    trend: zoneTrend(cell.stress, cell.lift),
  }));
}

function trendArrow(t: "down" | "up" | "neutral"): string {
  if (t === "down") return "↓";
  if (t === "up") return "↑";
  return "→";
}

export function formatDevelopmentZoneLine(vm: ArenaDevelopmentZoneLineVm): string {
  return `${vm.labelRu} ${trendArrow(vm.trend)}`;
}

/**
 * Игроки с максимальным «давлением» по stress; у каждого до `maxZonesPerPlayer` зон.
 */
export function buildArenaDevelopmentPlayerBlocks(
  acc: PlayerDevelopmentStressMap,
  rosterNameById: Record<string, string>,
  maxZonesPerPlayer: number,
  maxPlayers: number
): ArenaDevelopmentPlayerBlockVm[] {
  const playerIds = Object.keys(acc);
  if (playerIds.length === 0) return [];

  const scored = playerIds.map((pid) => {
    const row = acc[pid]!;
    let stressSum = 0;
    for (const v of Object.values(row)) {
      stressSum += v.stress;
    }
    return { pid, stressSum };
  });
  scored.sort((a, b) => b.stressSum - a.stressSum);

  const blocks: ArenaDevelopmentPlayerBlockVm[] = [];
  for (const { pid } of scored.slice(0, maxPlayers)) {
    const row = acc[pid];
    if (!row) continue;
    const domains = (Object.keys(row) as DevelopmentDomain[])
      .map((domain) => {
        const cell = row[domain]!;
        const intensity = cell.stress + cell.lift;
        return { domain, cell, intensity };
      })
      .filter((x) => x.intensity >= 0.25)
      .sort((a, b) => {
        if (b.cell.stress !== a.cell.stress) return b.cell.stress - a.cell.stress;
        return b.intensity - a.intensity;
      })
      .slice(0, maxZonesPerPlayer);

    if (domains.length === 0) continue;

    const name = rosterNameById[pid]?.trim() || "Игрок";
    const first = name.split(/\s+/)[0] ?? name;

    blocks.push({
      playerId: pid,
      playerLabel: first,
      zones: domains.map(({ domain, cell }) => ({
        domain,
        labelRu: DOMAIN_TITLE_RU[domain],
        trend: zoneTrend(cell.stress, cell.lift),
      })),
    });
  }
  return blocks;
}

export type ArenaDevelopmentActionHintVm = {
  line: string;
  domain: DevelopmentDomain;
};

/** Короткие приглашения к следующему шагу (без нового API). */
export function buildArenaDevelopmentActionHints(
  blocks: ArenaDevelopmentPlayerBlockVm[],
  maxHints: number
): ArenaDevelopmentActionHintVm[] {
  const out: ArenaDevelopmentActionHintVm[] = [];
  for (const b of blocks) {
    const stressed = b.zones.filter((z) => z.trend === "down");
    const pick = stressed[0] ?? b.zones[0];
    if (!pick) continue;
    const label = pick.labelRu.toLowerCase();
    out.push({
      domain: pick.domain,
      line: `Задача или упражнение на ${label}?`,
    });
    if (out.length >= maxHints) break;
  }
  return out;
}
