/**
 * PHASE 27: короткий post-confirm wrap-up для тренера (rule-based, без LLM).
 */

import { formatLiveTrainingMetricDomain } from "@/lib/liveTrainingMetricDomainLabel";
import type { LiveTrainingSessionOutcome } from "@/types/liveTraining";

export type LiveTrainingCoachWrapUpTone = "positive" | "mixed" | "attention";

export type LiveTrainingCoachWrapUp = {
  headline: string;
  lines: string[];
  tone: LiveTrainingCoachWrapUpTone;
  nextFocusLine?: string;
};

export type LiveTrainingCoachWrapUpActionHint = {
  playerName: string;
  title: string;
};

function ruPlayersPo(n: number): string {
  if (n === 1) return "1 игроку";
  if (n >= 2 && n <= 4) return `${n} игрокам`;
  return `${n} игрокам`;
}

function uniquePlayerNames(hints: LiveTrainingCoachWrapUpActionHint[]): string[] {
  const seen = new Set<string>();
  const out: string[] = [];
  for (const h of hints) {
    const n = h.playerName.trim();
    if (!n || seen.has(n)) continue;
    seen.add(n);
    out.push(n);
  }
  return out;
}

function headlineFor(params: {
  outcome: LiveTrainingSessionOutcome;
  hasRichOutcome: boolean;
}): string {
  const o = params.outcome;
  if (o.signalsCreatedCount === 0 && o.includedDraftsCount === 0) {
    return "Тренировка сохранена без персональных сигналов";
  }
  if (o.signalsCreatedCount === 0 && o.includedDraftsCount > 0) {
    return "Тренировка сохранена, но часть фокусов стоит держать в работе";
  }
  if (o.draftsFlaggedNeedsReview > 0) {
    return "Тренировка зафиксирована — часть пометок останется на контроле";
  }
  if (o.signalsCreatedCount > 0 && params.hasRichOutcome) {
    return "Тренировка зафиксирована и обновила профиль игроков";
  }
  if (o.signalsCreatedCount > 0) {
    return "Главные сигналы по тренировке уже сохранены";
  }
  return "Тренировка зафиксирована";
}

function toneFor(outcome: LiveTrainingSessionOutcome): LiveTrainingCoachWrapUpTone {
  if (outcome.signalsCreatedCount === 0 && outcome.includedDraftsCount > 0) {
    return "attention";
  }
  if (outcome.draftsFlaggedNeedsReview > 0) {
    return "mixed";
  }
  if (
    outcome.signalsCreatedCount > 0 &&
    outcome.negativeSignalsCount > outcome.positiveSignalsCount + 1
  ) {
    return "mixed";
  }
  if (outcome.signalsCreatedCount > 0) {
    return "positive";
  }
  return "mixed";
}

function buildNextFocusLine(params: {
  outcome: LiveTrainingSessionOutcome;
  actionHints: LiveTrainingCoachWrapUpActionHint[];
}): string | undefined {
  const { outcome, actionHints } = params;
  const names = uniquePlayerNames(actionHints);
  if (names.length >= 2) {
    return `Следом стоит взять в работу ориентиры по ${names[0]} и ${names[1]}.`;
  }
  if (names.length === 1 && actionHints[0]) {
    const t = actionHints[0].title.trim();
    const short = t.length > 56 ? `${t.slice(0, 53)}…` : t;
    return `Следующий фокус: ${short} (${names[0]}).`;
  }

  const domains = outcome.topDomains
    .slice(0, 2)
    .map((d) => formatLiveTrainingMetricDomain(d));
  if (domains.length >= 2) {
    return `На следующей тренировке удобно держать в фокусе ${domains[0]} и ${domains[1]}.`;
  }
  if (domains.length === 1) {
    return `На следующей тренировке удобно держать в фокусе ${domains[0]}.`;
  }

  const players = outcome.topPlayers;
  if (players.length >= 2) {
    return `Имеет смысл на следующем занятии заглянуть к ${players[0]!.playerName} и ${players[1]!.playerName}.`;
  }
  if (players.length === 1) {
    return `Имеет смысл на следующем занятии заглянуть к ${players[0]!.playerName}.`;
  }

  return undefined;
}

/**
 * @param hasRichOutcome — полный outcome с сервера (не только analyticsSummary fallback).
 */
export function buildLiveTrainingCoachWrapUp(params: {
  outcome: LiveTrainingSessionOutcome;
  hasRichOutcome: boolean;
  actionCandidateHints?: LiveTrainingCoachWrapUpActionHint[];
}): LiveTrainingCoachWrapUp {
  const { outcome, hasRichOutcome, actionCandidateHints = [] } = params;
  const headline = headlineFor({ outcome, hasRichOutcome });
  const tone = toneFor(outcome);

  const lines: string[] = [];

  if (outcome.signalsCreatedCount > 0 && outcome.affectedPlayersCount > 0) {
    lines.push(
      `Сигналы ушли в аналитику по ${ruPlayersPo(outcome.affectedPlayersCount)}.`
    );
  } else if (outcome.signalsCreatedCount > 0) {
    lines.push(`В аналитике зафиксировано ${outcome.signalsCreatedCount} сигналов.`);
  }

  if (outcome.signalsCreatedCount > 0 && hasRichOutcome) {
    if (
      outcome.positiveSignalsCount > 0 ||
      outcome.negativeSignalsCount > 0 ||
      outcome.neutralSignalsCount > 0
    ) {
      lines.push(
        `По тону: плюс ${outcome.positiveSignalsCount}, на внимание ${outcome.negativeSignalsCount}, нейтрально ${outcome.neutralSignalsCount}.`
      );
    }
  }

  if (outcome.topDomains.length > 0) {
    const labels = outcome.topDomains
      .slice(0, 3)
      .map((d) => formatLiveTrainingMetricDomain(d));
    lines.push(`Чаще всего в фокусе были: ${labels.join(" · ")}.`);
  }

  if (outcome.topPlayers.length > 0) {
    const top = outcome.topPlayers.slice(0, 2);
    if (top.length >= 2) {
      lines.push(`Больше всего записей сейчас по ${top[0]!.playerName} и ${top[1]!.playerName}.`);
    } else {
      lines.push(`Больше всего записей сейчас по ${top[0]!.playerName}.`);
    }
  }

  if (
    outcome.signalsCreatedCount === 0 &&
    outcome.includedDraftsCount > 0
  ) {
    lines.push(
      "Без привязки наблюдений к игрокам сигналы в карточки не попадают — это можно поправить на следующих тренировках."
    );
  }

  let trimmed = lines.filter(Boolean).slice(0, 4);
  if (trimmed.length === 0) {
    if (outcome.signalsCreatedCount === 0 && outcome.includedDraftsCount === 0) {
      trimmed = ["Подтверждение сохранено; новых сигналов в этот раз не добавилось."];
    } else {
      trimmed = ["Сессия закрыта, сводка учтена в истории команды."];
    }
  }

  const nextFocusLine = buildNextFocusLine({
    outcome,
    actionHints: actionCandidateHints,
  });

  return {
    headline,
    lines: trimmed,
    tone,
    nextFocusLine,
  };
}
