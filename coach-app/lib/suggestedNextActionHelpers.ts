/**
 * Suggested Next Action — one contextual cue for the coach
 */

import type { SessionObservation } from "@/models/sessionObservation";
import type { SkillType } from "@/models/playerDevelopment";
import type { SessionStatus } from "@/models/sessionObservation";

export type NextActionTone = "neutral" | "action" | "note";

export interface SuggestedNextAction {
  label: string;
  tone: NextActionTone;
}

export function getSuggestedNextAction(
  status: SessionStatus,
  selectedPlayerId: string | null,
  selectedSkillType: SkillType | null,
  isStickyPlayer: boolean,
  isStickySkill: boolean,
  observations: SessionObservation[]
): SuggestedNextAction {
  if (status === "idle") {
    return {
      label: "Начните тренировку — Coach Mark соберёт сигналы",
      tone: "action",
    };
  }

  if (status !== "active") {
    return {
      label: "Сессия в режиме обзора",
      tone: "neutral",
    };
  }

  const playerObsCount = selectedPlayerId
    ? observations.filter((o) => o.playerId === selectedPlayerId).length
    : 0;
  const skillObsCount = selectedSkillType
    ? observations.filter((o) => o.skillType === selectedSkillType).length
    : 0;

  const hasPlayer = !!selectedPlayerId;
  const hasSkill = !!selectedSkillType;

  if (!hasPlayer && !hasSkill) {
    return {
      label: "Выберите игрока или воспользуйтесь недавними связками",
      tone: "action",
    };
  }

  if (hasPlayer && !hasSkill) {
    if (isStickyPlayer) {
      return {
        label: "Игрок закреплён — выберите следующий навык",
        tone: "action",
      };
    }
    return {
      label: "Выберите навык для следующего наблюдения",
      tone: "action",
    };
  }

  if (hasSkill && !hasPlayer) {
    if (isStickySkill) {
      return {
        label: "Навык закреплён — выберите следующего игрока",
        tone: "action",
      };
    }
    return {
      label: "Выберите игрока для этого навыка",
      tone: "action",
    };
  }

  if (playerObsCount >= 3) {
    return {
      label: "Добавьте короткую заметку или переключитесь на другого игрока",
      tone: "note",
    };
  }

  if (skillObsCount >= 5) {
    return {
      label: "Проверьте, не стоит ли переключиться на другой навык",
      tone: "note",
    };
  }

  return {
    label: "Можно сразу поставить быструю оценку",
    tone: "action",
  };
}
