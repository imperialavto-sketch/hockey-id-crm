/**
 * Агрегат по наблюдениям игрока за сессию — только правила и шаблоны, без LLM.
 */

import type { ArenaCoachDecisionDto } from "@/lib/arena/decision/arenaCoachDecisionTypes";
import type { ArenaObservationInterpretation } from "@/lib/arena/interpretation/arenaInterpretationTypes";
import type { ArenaParentExplanation } from "@/lib/arena/parent/arenaParentExplanationTypes";
import type { ArenaParentProgressState, ArenaParentSummary } from "./arenaParentSummaryTypes";

export type ArenaParentSummaryDraftInput = {
  interpretation?: ArenaObservationInterpretation | null;
  coachDecision?: ArenaCoachDecisionDto | null;
  parentExplanation?: ArenaParentExplanation | null;
};

type Classified = {
  attentionMarker: boolean;
  bucket: "pos" | "neg" | "neu" | "unk";
};

function classifyDraft(d: ArenaParentSummaryDraftInput): Classified {
  const i = d.interpretation ?? null;
  const cd = d.coachDecision ?? null;
  const pe = d.parentExplanation ?? null;

  const attentionMarker =
    cd?.reviewPriority === "high" ||
    Boolean(cd?.repeatedConcernInSession) ||
    Boolean(pe?.attention) ||
    Boolean(i?.needsReview);

  if (!i) {
    return { attentionMarker, bucket: pe ? "neu" : "unk" };
  }

  let bucket: Classified["bucket"] = "neu";
  if (i.signalKind === "success" || (i.signalKind === "neutral_observation" && i.direction === "positive")) {
    bucket = "pos";
  } else if (i.signalKind === "mistake" || i.direction === "negative") {
    bucket = "neg";
  } else {
    bucket = "neu";
  }

  return { attentionMarker, bucket };
}

function pickProgressState(classified: Classified[]): ArenaParentProgressState {
  const anyAttention = classified.some((c) => c.attentionMarker);
  const buckets = classified.filter((c) => c.bucket !== "unk");
  const pos = buckets.filter((c) => c.bucket === "pos").length;
  const neg = buckets.filter((c) => c.bucket === "neg").length;
  const neu = buckets.filter((c) => c.bucket === "neu").length;
  const t = buckets.length;

  const strongNegDominance = t > 0 && neg >= 2 && neg / t >= 0.5 && neg > pos;

  if (anyAttention || strongNegDominance) {
    return "attention";
  }

  if (t === 0) {
    return "mixed";
  }

  if (pos > neg && pos >= neu) {
    return "positive";
  }

  return "mixed";
}

function titleForState(state: ArenaParentProgressState): string {
  switch (state) {
    case "positive":
      return "Тренировка с хорошей динамикой";
    case "attention":
      return "Есть моменты, которым стоит уделить внимание";
    case "mixed":
    default:
      return "Тренировка с разными сигналами";
  }
}

function textForState(state: ArenaParentProgressState, n: number): string {
  const countPhrase =
    n === 1
      ? "Зафиксирована одна отметка с этой тренировки."
      : `Зафиксировано ${n} отметок с этой тренировки.`;

  switch (state) {
    case "positive":
      return `${countPhrase} В сумме картина складывается в сторону уверенности и закрепления — это нормальная часть развития. Важен не один день, а спокойная регулярность.`;
    case "attention":
      return `${countPhrase} Есть рабочие моменты, на которые обращено внимание — это часть учёбы, а не «оценка характера». Такие отметки помогают видеть прогресс в динамике нескольких занятий.`;
    case "mixed":
    default:
      return `${countPhrase} Были и удачные эпизоды, и нейтральные — так чаще всего выглядит обычная тренировка. Это часть развития: картина складывается из серии занятий, а не из одной строки.`;
  }
}

export type BuildArenaParentSummaryInput = {
  drafts: ArenaParentSummaryDraftInput[];
};

export function buildArenaParentSummary(input: BuildArenaParentSummaryInput): ArenaParentSummary | null {
  const drafts = input.drafts;
  if (drafts.length === 0) return null;

  const hasAnySignal = drafts.some(
    (d) => d.interpretation != null || d.parentExplanation != null
  );
  if (!hasAnySignal) return null;

  const classified = drafts.map(classifyDraft);
  const progressState = pickProgressState(classified);

  return {
    summaryTitle: titleForState(progressState),
    summaryText: textForState(progressState, drafts.length),
    progressState,
  };
}
