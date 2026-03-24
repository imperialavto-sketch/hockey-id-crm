/**
 * Missing Context Guardrails — soft hints for input quality
 */

import type { SessionObservation } from "@/models/sessionObservation";
import type { SkillType } from "@/models/playerDevelopment";

const MAX_HINTS = 2;

export function getSessionGuardrailHints(
  selectedPlayerId: string | null,
  selectedSkillType: SkillType | null,
  observations: SessionObservation[]
): string[] {
  const hints: string[] = [];

  if (selectedPlayerId && !selectedSkillType) {
    hints.push("Выберите навык, чтобы наблюдение было точнее");
  }
  if (selectedSkillType && !selectedPlayerId) {
    hints.push("Выберите игрока для следующего наблюдения");
  }

  if (observations.length >= 3) {
    const last3 = observations.slice(0, 3);
    const allWithoutNote = last3.every((o) => !o.note || !o.note.trim());
    if (allWithoutNote) {
      hints.push("Иногда короткая заметка помогает сохранить контекст");
    }

    const sameImpact =
      last3[0]!.impact === last3[1]!.impact && last3[1]!.impact === last3[2]!.impact;
    if (sameImpact) {
      hints.push("Проверьте, не стоит ли добавить более точный контекст");
    }
  }

  if (observations.length >= 6) {
    hints.unshift("Coach Mark покажет это в отчётах и черновиках");
  }
  return hints.slice(0, MAX_HINTS);
}
