/**
 * Сборка полей канонического `TrainingSessionReport` из coachPreviewNarrativeV1 (без Arena seed / внутренних JSON).
 * Запись в БД только через `upsertTrainingSessionReportCanonicalInTransaction` из live publish (P0-1).
 */

import type { LiveTrainingCoachPreviewNarrativeV1 } from "./live-training-session-report-draft";
import { playerHighlightBody, sanitizeCoachPreviewNarrativeV1 } from "./report-draft/coach-preview-narrative-v1-normalize";

const MAX_FIELD_LEN = 8000;

function clipField(s: string): string {
  const t = s.trim();
  if (t.length <= MAX_FIELD_LEN) return t;
  return `${t.slice(0, MAX_FIELD_LEN - 1)}…`;
}

function toNullableField(s: string): string | null {
  const t = s.trim();
  if (!t) return null;
  return clipField(t);
}

/**
 * parentMessage: если в CRM уже есть непустое — сохраняем; иначе первая строка сводки или мягкий плейсхолдер.
 */
export function buildTrainingSessionReportPayloadFromCoachNarrative(
  narrative: LiveTrainingCoachPreviewNarrativeV1,
  teamName: string,
  existingParentMessage: string | null | undefined
): {
  summary: string | null;
  focusAreas: string | null;
  coachNote: string | null;
  parentMessage: string | null;
} {
  const n = sanitizeCoachPreviewNarrativeV1(narrative);
  const summary =
    n.sessionSummaryLines.length > 0 ? toNullableField(n.sessionSummaryLines.join("\n")) : null;
  const focusAreas = n.focusAreas.length > 0 ? toNullableField(n.focusAreas.join("\n")) : null;

  const coachNoteParts: string[] = [];
  for (const h of n.playerHighlights) {
    const body = playerHighlightBody(h).trim();
    if (!body) continue;
    const name = h.playerName?.trim();
    const who = (name || h.playerId) ? `${name || "Игрок"}: ` : "";
    coachNoteParts.push(`${who}${body}`);
  }
  const coachNote = coachNoteParts.length > 0 ? toNullableField(coachNoteParts.join("\n\n")) : null;

  const existingPm = existingParentMessage?.trim();
  if (existingPm) {
    return {
      summary,
      focusAreas,
      coachNote,
      parentMessage: toNullableField(existingPm),
    };
  }

  const firstLine = n.sessionSummaryLines.find((l) => l.trim());
  const placeholder = teamName.trim()
    ? `Краткий отчёт по тренировке команды «${teamName.trim()}» доступен в приложении.`
    : "Краткий отчёт по тренировке доступен в приложении.";
  const parentMessage = toNullableField(firstLine?.trim() ? firstLine! : placeholder);

  return { summary, focusAreas, coachNote, parentMessage };
}
