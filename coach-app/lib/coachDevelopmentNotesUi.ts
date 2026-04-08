/**
 * UI helpers for coach notes persisted with type prefix from createCoachNote (see coachNotesService.buildNoteText).
 * No API changes — detects development notes by stored text shape.
 */

const STORED_DEVELOPMENT_PREFIX = '[Development]';

/** Stored note body starts with [Development] from coachNotesService. */
export function isStoredDevelopmentNote(fullText: string): boolean {
  return fullText.trimStart().startsWith(STORED_DEVELOPMENT_PREFIX);
}

/**
 * Strip [Development] and optional "· Focus: …" header; return main body for preview.
 */
export function developmentNoteBodyForDisplay(fullText: string): string {
  let t = fullText.trimStart();
  if (!t.startsWith(STORED_DEVELOPMENT_PREFIX)) {
    return fullText.trim();
  }
  t = t.slice(STORED_DEVELOPMENT_PREFIX.length).trimStart();
  if (t.startsWith('·')) {
    const sep = t.indexOf('\n\n');
    if (sep !== -1) {
      t = t.slice(sep + 2).trimStart();
    }
  } else if (t.startsWith('\n')) {
    t = t.replace(/^\n+/, '').trimStart();
  }
  return t;
}

/**
 * Heuristic: copy from AI signal → notes prefill mentions thread / conversation.
 * Not persisted as structured fields — text-only signal.
 */
export function developmentNoteSuggestsConversationSource(fullText: string): boolean {
  const body = developmentNoteBodyForDisplay(fullText);
  const head = body.slice(0, 420);
  return /из переписки|Сигнал из переписки|Контекст треда:/i.test(head);
}

export type DevelopmentObservationRow = {
  id: string;
  date: string;
  preview: string;
  fromConversation: boolean;
};

export function trimObservationPreview(text: string, maxLen = 140): string {
  const t = text.replace(/\s+/g, ' ').trim();
  if (t.length <= maxLen) return t;
  return `${t.slice(0, maxLen - 1).trimEnd()}…`;
}

export function pickDevelopmentObservationRows(
  notes: Array<{ id: string; date: string; text: string }>,
  max = 3,
  previewMaxLen = 140
): DevelopmentObservationRow[] {
  const rows = notes
    .filter((n) => isStoredDevelopmentNote(n.text))
    .map((n) => ({
      id: n.id,
      date: n.date,
      preview: trimObservationPreview(
        developmentNoteBodyForDisplay(n.text),
        previewMaxLen
      ),
      fromConversation: developmentNoteSuggestsConversationSource(n.text),
    }))
    .filter((r) => r.preview.trim().length > 0);
  return rows.slice(0, max);
}
