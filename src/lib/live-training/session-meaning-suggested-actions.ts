/**
 * PHASE 6 Step 17–18: производные suggestedActions только из SessionMeaning.actionTriggers.
 * Рекомендации внешних тренеров (STEP 18) подмешиваются только для extra_training через matchExternalCoaches(trigger).
 *
 * Ответственность (P1):
 * - `buildSuggestedActionsFromSessionMeaning` — только build/write (merge в summary, fallback когда
 *   в черновике ещё нет `sessionMeaningSuggestedActionsV1`).
 * - `projectSuggestedActionsFromDraftSummary` — только read/projection из сохранённого summary;
 *   не вызывать build поверх meaning, если черновик уже содержит `sessionMeaningSuggestedActionsV1`.
 */

import { matchExternalCoaches } from "@/lib/external-coach/match-external-coaches";
import { passesSessionMeaningArenaDerivedGate } from "./session-meaning-action-triggers";
import type { SessionMeaning, SessionMeaningActionTrigger } from "./session-meaning";

const DESC_MAX = 220;
const TITLE_MAX = 72;

function clip(s: string, max: number): string {
  const t = s.trim();
  if (t.length <= max) return t;
  return `${t.slice(0, max - 1)}…`;
}

export type SessionMeaningSuggestedRecommendedCoach = {
  id: string;
  name: string;
  skills: string[];
};

export type SessionMeaningSuggestedCoachAction = {
  type: "attention_required" | "extra_training" | "progress_high";
  target: "player" | "team";
  playerId?: string;
  title: string;
  description: string;
  cta: string;
  /** STEP 18: только для extra_training, из actionTriggers + ExternalCoach. */
  recommendedCoaches?: SessionMeaningSuggestedRecommendedCoach[];
};

export type SessionMeaningSuggestedParentAction = {
  type: "progress_high";
  playerId?: string;
  title: string;
  description: string;
};

export type SessionMeaningSuggestedActions = {
  coach: SessionMeaningSuggestedCoachAction[];
  parent: SessionMeaningSuggestedParentAction[];
};

function playerLabel(
  t: SessionMeaningActionTrigger,
  nameById: Map<string, string>
): string {
  if (t.target === "team") return "Команда";
  if (t.playerId) return nameById.get(t.playerId) ?? "Игрок";
  return "Игрок";
}

function triggerToCoach(
  t: SessionMeaningActionTrigger,
  nameById: Map<string, string>
): SessionMeaningSuggestedCoachAction {
  const who = playerLabel(t, nameById);
  const desc = clip(t.reason, DESC_MAX);
  if (t.type === "attention_required") {
    return {
      type: "attention_required",
      target: t.target,
      ...(t.playerId ? { playerId: t.playerId } : {}),
      title: clip(
        t.target === "team" ? "Команде нужен дополнительный контроль" : `${who}: усиление зоны внимания`,
        TITLE_MAX
      ),
      description: desc,
      cta: "Взять в особый фокус",
    };
  }
  if (t.type === "extra_training") {
    return {
      type: "extra_training",
      target: t.target,
      ...(t.playerId ? { playerId: t.playerId } : {}),
      title: clip(`${who}: повторяющийся акцент`, TITLE_MAX),
      description: desc,
      cta: "Добавить доп. акцент",
    };
  }
  return {
    type: "progress_high",
    target: t.target,
    ...(t.playerId ? { playerId: t.playerId } : {}),
    title: clip(
      t.target === "team" ? "Сильная динамика у команды" : `${who}: заметный рост`,
      TITLE_MAX
    ),
    description: desc,
    cta: "Отметить прогресс",
  };
}

function triggerToParent(t: SessionMeaningActionTrigger): SessionMeaningSuggestedParentAction {
  return {
    type: "progress_high",
    ...(t.playerId ? { playerId: t.playerId } : {}),
    title: clip(
      t.target === "team" ? "Хороший шаг команды" : "Заметный сдвиг у игрока",
      TITLE_MAX
    ),
    description: clip(t.reason, DESC_MAX),
  };
}

/**
 * Write-time / merge-time: строит suggestedActions из `meaning.actionTriggers` (в т.ч. async match для extra_training).
 * Не вызывать в read-модели, если в черновике уже есть `sessionMeaningSuggestedActionsV1` — см. `projectSuggestedActionsFromDraftSummary`.
 */
export async function buildSuggestedActionsFromSessionMeaning(
  meaning: SessionMeaning
): Promise<SessionMeaningSuggestedActions> {
  const empty: SessionMeaningSuggestedActions = { coach: [], parent: [] };
  if (!passesSessionMeaningArenaDerivedGate(meaning)) return empty;

  const triggers = meaning.actionTriggers ?? [];
  if (triggers.length === 0) return empty;

  const nameById = new Map(meaning.players.map((p) => [p.playerId, p.playerName]));
  const coach: SessionMeaningSuggestedCoachAction[] = [];
  for (const t of triggers) {
    const base = triggerToCoach(t, nameById);
    if (t.type === "extra_training") {
      const recommended = await matchExternalCoaches(t);
      coach.push(
        recommended.length > 0
          ? {
              ...base,
              recommendedCoaches: recommended.map((c) => ({
                id: c.id,
                name: c.name,
                skills: [...c.skills],
              })),
            }
          : base
      );
    } else {
      coach.push(base);
    }
  }
  const parent = triggers.filter((t) => t.type === "progress_high").map((t) => triggerToParent(t));

  return { coach, parent };
}

/**
 * Read-time: только чтение уже смерженного `summary.sessionMeaningSuggestedActionsV1`.
 * Не пересчитывать из SessionMeaning, если поле присутствует (канон в summaryJson).
 */
export function projectSuggestedActionsFromDraftSummary(summary: {
  sessionMeaningSuggestedActionsV1?: SessionMeaningSuggestedActions;
}): SessionMeaningSuggestedActions {
  return summary.sessionMeaningSuggestedActionsV1 ?? { coach: [], parent: [] };
}
