/**
 * Next-training handoff: краткий мост «сегодня → следующий старт» без LLM.
 * Источники: continuity, outcome, action candidates, truth (для отложенного).
 */

import { buildLiveTrainingCoachTruthSummary } from "@/lib/liveTrainingCoachTruthViewModel";
import { formatLiveTrainingMetricDomain } from "@/lib/liveTrainingMetricDomainLabel";
import type { LiveTrainingActionCandidate } from "@/services/liveTrainingService";
import type { LiveTrainingContinuitySnapshot, LiveTrainingSessionOutcome } from "@/types/liveTraining";

function shortName(full: string): string {
  const t = full.trim().split(/\s+/)[0];
  return t || full;
}

function truncate(s: string, max: number): string {
  const t = s.trim();
  if (t.length <= max) return t;
  return `${t.slice(0, max - 1)}…`;
}

export type LiveTrainingHandoffPlayerAccent = {
  playerId: string;
  displayName: string;
  note: string;
};

export type LiveTrainingHandoffImmediateAction = {
  title: string;
  subtitle?: string;
  /** player — задача по игроку; team — ориентир по пятёрке/сессии. */
  scope: "player" | "team";
};

/** Компактный контракт handoff-слоя на complete. */
export type LiveTrainingNextTrainingHandoff = {
  nextTrainingFocus: string[];
  playersForIndividualAccent: LiveTrainingHandoffPlayerAccent[];
  teamAndSessionFocus: string[];
  /** Темы из сигналов (метрики), в основном про индивидуальную работу. */
  playerThematicFocus: string[];
  suggestedImmediateActions: LiveTrainingHandoffImmediateAction[];
  deferredOrReviewItems: string[];
};

function dedupeLines(lines: string[]): string[] {
  const seen = new Set<string>();
  const out: string[] = [];
  for (const raw of lines) {
    const k = raw.trim().toLowerCase();
    if (!k || seen.has(k)) continue;
    seen.add(k);
    out.push(raw.trim());
  }
  return out;
}

/**
 * Правила: приоритет lock-in (continuity), затем outcome; действия — только не materialized.
 */
export function buildLiveTrainingNextTrainingHandoff(input: {
  outcome: LiveTrainingSessionOutcome;
  continuitySnapshot?: LiveTrainingContinuitySnapshot | null;
  actionCandidates?: LiveTrainingActionCandidate[];
}): LiveTrainingNextTrainingHandoff {
  const { outcome, continuitySnapshot: snap, actionCandidates = [] } = input;
  const truth = buildLiveTrainingCoachTruthSummary({ outcome, actionCandidates });

  const nextTrainingFocusRaw: string[] = [];
  if (snap?.summaryLines?.length) {
    nextTrainingFocusRaw.push(...snap.summaryLines.slice(0, 3).map((l) => l.trim()).filter(Boolean));
  }
  if (snap) {
    for (const d of snap.carriedDomains.slice(0, 2)) {
      const label = d.labelRu?.trim() || formatLiveTrainingMetricDomain(d.domain);
      const r = d.reason?.trim();
      nextTrainingFocusRaw.push(r ? truncate(`${label} — ${r}`, 120) : label);
    }
    for (const r of snap.carriedReinforceAreas.slice(0, 1)) {
      const label = r.labelRu?.trim() || formatLiveTrainingMetricDomain(r.domain);
      const reason = r.reason?.trim();
      nextTrainingFocusRaw.push(
        reason ? truncate(`Закрепить в группе: ${label} — ${reason}`, 120) : `Закрепить в группе: ${label}`
      );
    }
  }
  if (nextTrainingFocusRaw.length === 0 && outcome.topDomains.length > 0) {
    nextTrainingFocusRaw.push(
      `Опереться на темы сигналов: ${outcome.topDomains
        .slice(0, 3)
        .map((d) => formatLiveTrainingMetricDomain(d))
        .join(", ")}.`
    );
  }
  const nextTrainingFocus = dedupeLines(nextTrainingFocusRaw).slice(0, 4);

  const accentById = new Map<string, LiveTrainingHandoffPlayerAccent>();
  if (snap) {
    for (const pl of snap.carriedFocusPlayers.slice(0, 3)) {
      const note = pl.reason?.trim() ? truncate(pl.reason, 72) : "В фокусе переноса";
      accentById.set(pl.playerId, {
        playerId: pl.playerId,
        displayName: shortName(pl.playerName),
        note,
      });
    }
  }
  const attentionSorted = [...outcome.topPlayers]
    .filter((p) => p.negativeCount > 0 || (p.totalSignals > 0 && p.negativeCount > p.positiveCount))
    .sort((a, b) => b.negativeCount - a.negativeCount || b.totalSignals - a.totalSignals);
  for (const p of attentionSorted) {
    if (accentById.size >= 4) break;
    if (accentById.has(p.playerId)) continue;
    accentById.set(p.playerId, {
      playerId: p.playerId,
      displayName: shortName(p.playerName),
      note:
        p.negativeCount > 0
          ? `Внимание по сигналам: −${p.negativeCount}`
          : "На контроле по балансу сигналов",
    });
  }
  if (accentById.size < 2 && outcome.topPlayers.length > 0) {
    for (const p of outcome.topPlayers) {
      if (accentById.size >= 4) break;
      if (accentById.has(p.playerId)) continue;
      if (p.positiveCount <= 0) continue;
      accentById.set(p.playerId, {
        playerId: p.playerId,
        displayName: shortName(p.playerName),
        note: `Плюс по сигналам — можно усилить в следующем старте`,
      });
    }
  }
  const playersForIndividualAccent = [...accentById.values()].slice(0, 4);

  const teamAndSessionFocus: string[] = [];
  if (outcome.teamObservationCount > 0) {
    teamAndSessionFocus.push(
      `Пятёрка: ${outcome.teamObservationCount} подтверждённых наблюдений — заложи групповой акцент в плане следующей тренировки.`
    );
  }
  if (outcome.sessionObservationCount > 0) {
    teamAndSessionFocus.push(
      `Сессия в целом: ${outcome.sessionObservationCount} записей — учти в общем разборе и сообщении команде.`
    );
  }
  if (teamAndSessionFocus.length === 0 && (outcome.playerObservationCount > 0 || outcome.signalsCreatedCount > 0)) {
    teamAndSessionFocus.push(
      "Командных записей по пятёрке/сессии в этой фиксации не было — фокус следующего старта можно вести через индивидуальные темы ниже."
    );
  }

  const playerThematicFocus = outcome.topDomains
    .slice(0, 4)
    .map((d) => formatLiveTrainingMetricDomain(d));

  const suggestedImmediateActions: LiveTrainingHandoffImmediateAction[] = [];
  for (const c of actionCandidates) {
    if (c.isMaterialized) continue;
    const body = c.body.trim();
    suggestedImmediateActions.push({
      title: c.title.trim(),
      subtitle: truncate(
        `${shortName(c.playerName)}${body ? ` — ${body}` : ""}`,
        96
      ),
      scope: "player",
    });
    if (suggestedImmediateActions.length >= 3) break;
  }
  if (outcome.teamObservationCount > 0 && suggestedImmediateActions.length < 3) {
    suggestedImmediateActions.push({
      title: "Запланировать групповой блок",
      subtitle: `Опирайся на ${outcome.teamObservationCount} наблюдений по пятёрке из этой сессии.`,
      scope: "team",
    });
  }

  const deferredOrReviewItems: string[] = [];
  if (truth.needsManualAttentionCount > 0) {
    const n = truth.needsManualAttentionCount;
    const word =
      n % 10 === 1 && n % 100 !== 11
        ? "черновик"
        : n % 10 >= 2 && n % 10 <= 4 && (n % 100 < 10 || n % 100 >= 20)
          ? "черновика"
          : "черновиков";
    deferredOrReviewItems.push(`Сначала закрой ручную проверку (${n} ${word}).`);
  }
  if (truth.excludedObservationsCount > 0) {
    deferredOrReviewItems.push(
      `${truth.excludedObservationsCount} наблюдений исключено из подтверждения — они не переносятся в аналитику этой сессии.`
    );
  }
  if (
    truth.totalActionCandidates > suggestedImmediateActions.length &&
    truth.pendingActionCount > 0
  ) {
    deferredOrReviewItems.push("Остальные подсказки-действия — в блоке ниже, добавь по мере готовности.");
  }

  return {
    nextTrainingFocus,
    playersForIndividualAccent,
    teamAndSessionFocus: teamAndSessionFocus.slice(0, 3),
    playerThematicFocus,
    suggestedImmediateActions: suggestedImmediateActions.slice(0, 4),
    deferredOrReviewItems: deferredOrReviewItems.slice(0, 3),
  };
}

export function liveTrainingNextHandoffHasContent(h: LiveTrainingNextTrainingHandoff): boolean {
  return (
    h.nextTrainingFocus.length > 0 ||
    h.playersForIndividualAccent.length > 0 ||
    h.teamAndSessionFocus.length > 0 ||
    h.playerThematicFocus.length > 0 ||
    h.suggestedImmediateActions.length > 0 ||
    h.deferredOrReviewItems.length > 0
  );
}
