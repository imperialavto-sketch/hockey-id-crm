/**
 * PHASE 20: rule-based guidance cues из planning snapshot (без LLM).
 * PHASE 31: приоритизация и привязка к seed blocks (warmup / main / focus / reinforcement).
 */

import type { LiveTrainingPlanningSnapshotDto } from "./live-training-planning-snapshot";
import { liveTrainingMetricDomainLabelRu } from "./player-live-training-signals-labels";

export type LiveTrainingGuidanceCueType =
  | "focus_player"
  | "focus_domain"
  | "reinforce"
  | "reminder";

export type LiveTrainingGuidanceSourceBlockType =
  | "warmup"
  | "main"
  | "focus"
  | "reinforcement";

export type LiveTrainingGuidanceCueDto = {
  id: string;
  cueType: LiveTrainingGuidanceCueType;
  title: string;
  body?: string;
  tone: "attention" | "neutral" | "positive";
  linkedPlayerId?: string;
  linkedDomain?: string;
  /** PHASE 31: какому блоку плана ближе cue (опционально для обратной совместимости) */
  sourceBlockType?: LiveTrainingGuidanceSourceBlockType;
};

export type LiveTrainingGuidanceCuesPayload = {
  cues: LiveTrainingGuidanceCueDto[];
  lowData: boolean;
};

const MAX_CUES = 6;
const MAX_FOCUS_PLAYERS = 3;
const MAX_FOCUS_DOMAINS = 3;
const MAX_REINFORCE = 2;
const MAX_REMINDERS_FROM_SUMMARY = 2;
const SNIP_TITLE = 120;
const SNIP_BODY = 100;

function snip(s: string, max: number): string {
  const t = s.replace(/\s+/g, " ").trim();
  if (t.length <= max) return t;
  return `${t.slice(0, max - 1).trimEnd()}…`;
}

function firstToken(name: string): string {
  const t = name.trim().split(/\s+/)[0];
  return t || name.trim() || "Игрок";
}

function toneForPlayerPriority(priority: string): "attention" | "neutral" | "positive" {
  if (priority === "high") return "attention";
  if (priority === "low") return "positive";
  return "neutral";
}

type SeedBlock = LiveTrainingPlanningSnapshotDto["planSeeds"]["blocks"][number];

function firstBlockOfType(blocks: SeedBlock[], type: LiveTrainingGuidanceSourceBlockType): SeedBlock | undefined {
  return blocks.find((b) => b.type === type);
}

function pushCue(cues: LiveTrainingGuidanceCueDto[], cue: LiveTrainingGuidanceCueDto): boolean {
  if (cues.length >= MAX_CUES) return false;
  cues.push(cue);
  return true;
}

/**
 * Старый порядок без planSeeds blocks — без sourceBlockType.
 */
function buildGuidanceCuesLegacy(snapshot: LiveTrainingPlanningSnapshotDto): LiveTrainingGuidanceCuesPayload {
  const cues: LiveTrainingGuidanceCueDto[] = [];

  for (const p of snapshot.focusPlayers.slice(0, MAX_FOCUS_PLAYERS)) {
    if (!pushCue(cues, {
      id: `focus_player:${p.playerId}`,
      cueType: "focus_player",
      title: `Держим в фокусе: ${firstToken(p.playerName)}`,
      body: p.reasons[0] ? snip(p.reasons[0], SNIP_BODY) : undefined,
      tone: toneForPlayerPriority(p.priority),
      linkedPlayerId: p.playerId,
    })) {
      break;
    }
  }

  for (const d of snapshot.focusDomains.slice(0, MAX_FOCUS_DOMAINS)) {
    if (!pushCue(cues, {
      id: `focus_domain:${d.domain}`,
      cueType: "focus_domain",
      title: `Проверить: ${snip(d.labelRu, 48)}`,
      body:
        d.reason && d.reason !== "—" && d.reason.trim()
          ? snip(d.reason, SNIP_BODY)
          : undefined,
      tone: "attention",
      linkedDomain: d.domain,
    })) {
      break;
    }
  }

  for (const r of snapshot.reinforceAreas.slice(0, MAX_REINFORCE)) {
    if (!pushCue(cues, {
      id: `reinforce:${r.domain}`,
      cueType: "reinforce",
      title: `Закрепить: ${snip(r.labelRu, 48)}`,
      body:
        r.reason && r.reason !== "—" && r.reason.trim()
          ? snip(r.reason, SNIP_BODY)
          : undefined,
      tone: "positive",
      linkedDomain: r.domain,
    })) {
      break;
    }
  }

  let ri = 0;
  while (
    cues.length < MAX_CUES &&
    ri < snapshot.summaryLines.length &&
    ri < MAX_REMINDERS_FROM_SUMMARY
  ) {
    const line = snapshot.summaryLines[ri]?.trim();
    if (line) {
      cues.push({
        id: `reminder:summary:${ri}`,
        cueType: "reminder",
        title: snip(line, SNIP_TITLE),
        tone: "neutral",
      });
    }
    ri += 1;
  }

  if (cues.length === 0 && snapshot.planSeeds?.blocks?.length) {
    const b =
      snapshot.planSeeds.blocks.find((x) => x.type === "main" || x.type === "focus") ??
      snapshot.planSeeds.blocks[0];
    if (b?.title?.trim()) {
      cues.push({
        id: "reminder:plan_seed",
        cueType: "reminder",
        title: snip(b.title.trim(), SNIP_TITLE),
        body: b.description?.trim() ? snip(b.description.trim(), SNIP_BODY) : undefined,
        tone: "neutral",
      });
    }
  }

  const trimmed = cues.slice(0, MAX_CUES);
  const substantiveCount = trimmed.filter((c) => c.cueType !== "reminder").length;
  const lowData =
    substantiveCount === 0 ||
    (snapshot.planSeeds?.lowData === true && substantiveCount <= 1);

  return { cues: trimmed, lowData };
}

function buildGuidanceCuesBlockAware(
  snapshot: LiveTrainingPlanningSnapshotDto,
  blocks: SeedBlock[]
): LiveTrainingGuidanceCuesPayload {
  const cues: LiveTrainingGuidanceCueDto[] = [];
  const usedPlayerIds = new Set<string>();
  const usedFocusDomains = new Set<string>();
  const usedReinforceDomains = new Set<string>();

  const playerById = new Map(snapshot.focusPlayers.map((p) => [p.playerId, p]));
  const domainByKey = new Map(snapshot.focusDomains.map((d) => [d.domain, d]));
  const reinforceByDomain = new Map(snapshot.reinforceAreas.map((r) => [r.domain, r]));

  const focusBlock = firstBlockOfType(blocks, "focus");
  const mainBlock = firstBlockOfType(blocks, "main");
  const reinfBlock = firstBlockOfType(blocks, "reinforcement");
  const warmupBlock = firstBlockOfType(blocks, "warmup");

  // 1) Focus block — игроки из seed focus приоритетнее
  const seedFocusPlayers = Array.isArray(focusBlock?.focusPlayers) ? focusBlock!.focusPlayers! : [];
  let focusBlockCueCount = 0;
  for (const fp of seedFocusPlayers) {
    if (cues.length >= MAX_CUES || focusBlockCueCount >= MAX_FOCUS_PLAYERS) break;
    if (!fp || typeof fp.playerId !== "string" || !fp.playerId.trim()) continue;
    const pid = fp.playerId.trim();
    const name =
      typeof fp.playerName === "string" && fp.playerName.trim()
        ? fp.playerName.trim()
        : playerById.get(pid)?.playerName ?? "Игрок";
    const sp = playerById.get(pid);
    if (
      pushCue(cues, {
        id: `focus_player:block_focus:${pid}`,
        cueType: "focus_player",
        title: `Держим в фокусе: ${firstToken(name)}`,
        body: sp?.reasons[0] ? snip(sp.reasons[0], SNIP_BODY) : undefined,
        tone: sp ? toneForPlayerPriority(sp.priority) : "neutral",
        linkedPlayerId: pid,
        sourceBlockType: "focus",
      })
    ) {
      focusBlockCueCount += 1;
      usedPlayerIds.add(pid);
    }
  }

  // 2) Main block — домены из основного блока
  const mainDomains = Array.isArray(mainBlock?.linkedDomains) ? mainBlock!.linkedDomains! : [];
  let mainBlockCueCount = 0;
  for (const dom of mainDomains) {
    if (cues.length >= MAX_CUES || mainBlockCueCount >= MAX_FOCUS_DOMAINS) break;
    if (typeof dom !== "string" || !dom.trim()) continue;
    const key = dom.trim();
    const d = domainByKey.get(key);
    const label = d?.labelRu ?? liveTrainingMetricDomainLabelRu(key);
    if (
      pushCue(cues, {
        id: `focus_domain:block_main:${key}`,
        cueType: "focus_domain",
        title: `Проверить: ${snip(label, 48)}`,
        body:
          d?.reason && d.reason !== "—" && d.reason.trim()
            ? snip(d.reason, SNIP_BODY)
            : undefined,
        tone: "attention",
        linkedDomain: key,
        sourceBlockType: "main",
      })
    ) {
      mainBlockCueCount += 1;
      usedFocusDomains.add(key);
    }
  }

  // 3) Reinforcement block — без дубля домена с main (уже «проверить»)
  const reinfDomains = Array.isArray(reinfBlock?.linkedDomains) ? reinfBlock!.linkedDomains! : [];
  let reinfBlockCueCount = 0;
  for (const dom of reinfDomains) {
    if (cues.length >= MAX_CUES || reinfBlockCueCount >= MAX_REINFORCE) break;
    if (typeof dom !== "string" || !dom.trim()) continue;
    const key = dom.trim();
    if (usedFocusDomains.has(key)) continue;
    const r = reinforceByDomain.get(key);
    const label = r?.labelRu ?? liveTrainingMetricDomainLabelRu(key);
    if (
      pushCue(cues, {
        id: `reinforce:block:${key}`,
        cueType: "reinforce",
        title: `Закрепить: ${snip(label, 48)}`,
        body:
          r?.reason && r.reason !== "—" && r.reason.trim()
            ? snip(r.reason, SNIP_BODY)
            : undefined,
        tone: "positive",
        linkedDomain: key,
        sourceBlockType: "reinforcement",
      })
    ) {
      reinfBlockCueCount += 1;
      usedReinforceDomains.add(key);
    }
  }

  // 4) Snapshot-only: игроки / домены / закрепление, ещё не покрытые блоками
  for (const p of snapshot.focusPlayers.slice(0, MAX_FOCUS_PLAYERS)) {
    if (cues.length >= MAX_CUES) break;
    if (usedPlayerIds.has(p.playerId)) continue;
    if (
      pushCue(cues, {
        id: `focus_player:snapshot:${p.playerId}`,
        cueType: "focus_player",
        title: `Держим в фокусе: ${firstToken(p.playerName)}`,
        body: p.reasons[0] ? snip(p.reasons[0], SNIP_BODY) : undefined,
        tone: toneForPlayerPriority(p.priority),
        linkedPlayerId: p.playerId,
      })
    ) {
      usedPlayerIds.add(p.playerId);
    }
  }

  for (const d of snapshot.focusDomains.slice(0, MAX_FOCUS_DOMAINS)) {
    if (cues.length >= MAX_CUES) break;
    if (usedFocusDomains.has(d.domain)) continue;
    if (
      pushCue(cues, {
        id: `focus_domain:snapshot:${d.domain}`,
        cueType: "focus_domain",
        title: `Проверить: ${snip(d.labelRu, 48)}`,
        body:
          d.reason && d.reason !== "—" && d.reason.trim()
            ? snip(d.reason, SNIP_BODY)
            : undefined,
        tone: "attention",
        linkedDomain: d.domain,
      })
    ) {
      usedFocusDomains.add(d.domain);
    }
  }

  for (const r of snapshot.reinforceAreas.slice(0, MAX_REINFORCE)) {
    if (cues.length >= MAX_CUES) break;
    if (usedReinforceDomains.has(r.domain) || usedFocusDomains.has(r.domain)) continue;
    if (
      pushCue(cues, {
        id: `reinforce:snapshot:${r.domain}`,
        cueType: "reinforce",
        title: `Закрепить: ${snip(r.labelRu, 48)}`,
        body:
          r.reason && r.reason !== "—" && r.reason.trim()
            ? snip(r.reason, SNIP_BODY)
            : undefined,
        tone: "positive",
        linkedDomain: r.domain,
      })
    ) {
      usedReinforceDomains.add(r.domain);
    }
  }

  // 5) Summary reminders, затем мягкий warmup из блока
  let ri = 0;
  while (
    cues.length < MAX_CUES &&
    ri < snapshot.summaryLines.length &&
    ri < MAX_REMINDERS_FROM_SUMMARY
  ) {
    const line = snapshot.summaryLines[ri]?.trim();
    if (line) {
      cues.push({
        id: `reminder:summary:${ri}`,
        cueType: "reminder",
        title: snip(line, SNIP_TITLE),
        tone: "neutral",
      });
    }
    ri += 1;
  }

  if (cues.length < MAX_CUES && warmupBlock?.title?.trim()) {
    pushCue(cues, {
      id: "reminder:block_warmup",
      cueType: "reminder",
      title: snip(warmupBlock.title.trim(), SNIP_TITLE),
      body: warmupBlock.description?.trim()
        ? snip(warmupBlock.description.trim(), SNIP_BODY)
        : undefined,
      tone: "neutral",
      sourceBlockType: "warmup",
    });
  }

  if (cues.length === 0) {
    const b =
      blocks.find((x) => x.type === "main" || x.type === "focus") ?? blocks[0];
    if (b?.title?.trim()) {
      cues.push({
        id: "reminder:plan_seed_fallback",
        cueType: "reminder",
        title: snip(b.title.trim(), SNIP_TITLE),
        body: b.description?.trim() ? snip(b.description.trim(), SNIP_BODY) : undefined,
        tone: "neutral",
      });
    }
  }

  const trimmed = cues.slice(0, MAX_CUES);
  const substantiveCount = trimmed.filter((c) => c.cueType !== "reminder").length;
  const lowData =
    substantiveCount === 0 ||
    (snapshot.planSeeds?.lowData === true && substantiveCount <= 1);

  return { cues: trimmed, lowData };
}

/**
 * Порядок (при наличии planSeeds.blocks):
 * 1 focus block → 2 main → 3 reinforcement → 4 snapshot-only → 5 summary + warmup reminder.
 * Без блоков — legacy-порядок как в PHASE 20.
 */
export function buildLiveTrainingGuidanceCuesFromPlanningSnapshot(
  snapshot: LiveTrainingPlanningSnapshotDto
): LiveTrainingGuidanceCuesPayload {
  const blocks = snapshot.planSeeds?.blocks;
  if (!Array.isArray(blocks) || blocks.length === 0) {
    return buildGuidanceCuesLegacy(snapshot);
  }
  return buildGuidanceCuesBlockAware(snapshot, blocks);
}
