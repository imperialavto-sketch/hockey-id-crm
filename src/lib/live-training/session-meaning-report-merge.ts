/**
 * PHASE 6: встраивание сохранённого SessionMeaning в черновик отчёта и в narrative при публикации.
 * Не заменяет summaryJson / ручной narrative — дополняет при наличии `sessionMeaningJson`.
 */

import type { SessionMeaning, SessionMeaningActionTrigger } from "./session-meaning";
import { buildSuggestedActionsFromSessionMeaning } from "./session-meaning-suggested-actions";
import { buildParentActionsFromSessionMeaning } from "./parent-actions-from-session-meaning";
import type {
  LiveTrainingCoachPreviewNarrativeV1,
  LiveTrainingReportDraftEvidenceItem,
  LiveTrainingSessionReportDraftSummary,
} from "./live-training-session-report-draft";

const NOTES_CAP = 14;
const EVIDENCE_PER_PLAYER = 3;

function truncate(s: string, max: number): string {
  const t = s.trim();
  if (t.length <= max) return t;
  return `${t.slice(0, max - 1)}…`;
}

export { parsePersistedSessionMeaning } from "./session-meaning";

/**
 * Обогащает структурированный summary черновика данными из SessionMeaning (приоритет смысла → затем исходные поля).
 */
export async function mergePersistedSessionMeaningIntoDraftSummary(
  summary: LiveTrainingSessionReportDraftSummary,
  meaning: SessionMeaning | null
): Promise<LiveTrainingSessionReportDraftSummary> {
  if (!meaning) return summary;

  const seenFocus = new Set<string>();
  const focusDomains: string[] = [];
  const addFocus = (s: string) => {
    const t = s.trim();
    if (!t) return;
    const k = t.toLowerCase();
    if (seenFocus.has(k)) return;
    seenFocus.add(k);
    focusDomains.push(t);
  };

  const sortedFocus = [...meaning.focus].sort((a, b) => b.weight - a.weight);
  for (const f of sortedFocus) addFocus(f.label);
  const sortedThemes = [...meaning.themes].sort((a, b) => b.weight - a.weight);
  for (const t of sortedThemes) addFocus(t.key);
  for (const x of summary.focusDomains) addFocus(x);
  const na = meaning.nextActions;
  if (na?.nextTrainingFocus?.length) {
    for (const line of na.nextTrainingFocus) addFocus(line);
  }

  const meaningByPlayer = new Map(meaning.players.map((p) => [p.playerId, p]));
  const players = summary.players.map((p) => {
    const m = meaningByPlayer.get(p.playerId);
    if (!m) return p;
    const topDomains = [...new Set([...m.topThemes, ...p.topDomains])].slice(0, 5);
    const evidence: LiveTrainingReportDraftEvidenceItem[] = [...p.evidence];
    const seenText = new Set(evidence.map((e) => e.text.toLowerCase()));
    const domain = m.topThemes[0] ?? "general";
    for (const line of m.sampleEvidence) {
      if (evidence.length >= EVIDENCE_PER_PLAYER) break;
      const t = line.trim();
      if (!t || seenText.has(t.toLowerCase())) continue;
      seenText.add(t.toLowerCase());
      evidence.push({
        text: truncate(t, 220),
        direction: "neutral",
        domain,
      });
    }
    return { ...p, topDomains, evidence };
  });

  const needsAttention = [...summary.notes.needsAttention];
  const positives = [...summary.notes.positives];
  const naSeen = new Set(needsAttention.map((n) => n.text.toLowerCase()));
  for (const line of meaning.team.needsAttentionLines) {
    if (needsAttention.length >= NOTES_CAP) break;
    const t = line.trim();
    if (!t || naSeen.has(t.toLowerCase())) continue;
    naSeen.add(t.toLowerCase());
    needsAttention.push({ text: truncate(t, 200) });
  }
  const posSeen = new Set(positives.map((n) => n.text.toLowerCase()));
  for (const line of meaning.team.positiveLines) {
    if (positives.length >= NOTES_CAP) break;
    const t = line.trim();
    if (!t || posSeen.has(t.toLowerCase())) continue;
    posSeen.add(t.toLowerCase());
    positives.push({ text: truncate(t, 200) });
  }

  const hasNextActions =
    na &&
    (na.team.length > 0 || na.players.length > 0 || na.nextTrainingFocus.length > 0);

  const parentActions = buildParentActionsFromSessionMeaning(meaning);
  const prog = meaning.progress;
  const triggers: SessionMeaningActionTrigger[] = meaning.actionTriggers?.length
    ? meaning.actionTriggers.map((t) => ({ ...t }))
    : [];
  /** Write-time: suggestedActions в summary; read path — projectSuggestedActionsFromDraftSummary. */
  const suggestedActions = await buildSuggestedActionsFromSessionMeaning(meaning);

  return {
    ...summary,
    focusDomains,
    players,
    notes: { needsAttention, positives },
    ...(hasNextActions ? { sessionMeaningNextActionsV1: na } : {}),
    /** Пустой массив сбрасывает устаревшие строки после пересборки смысла. */
    sessionMeaningParentActionsV1: parentActions,
    sessionMeaningProgressV1: prog
      ? {
          team: [...prog.team],
          players: prog.players.map((p) => ({ ...p })),
        }
      : { team: [], players: [] },
    sessionMeaningActionTriggersV1: triggers,
    sessionMeaningSuggestedActionsV1: suggestedActions,
  };
}

/**
 * Заполняет пустые слоты narrative из SessionMeaning (если тренер не заполнил — публикация всё ещё возможна при богатой картине).
 */
export function augmentCoachNarrativeWithSessionMeaning(
  narrative: LiveTrainingCoachPreviewNarrativeV1 | undefined | null,
  meaning: SessionMeaning | null
): LiveTrainingCoachPreviewNarrativeV1 {
  const base: LiveTrainingCoachPreviewNarrativeV1 = {
    sessionSummaryLines: narrative?.sessionSummaryLines?.length
      ? [...narrative.sessionSummaryLines]
      : [],
    focusAreas: narrative?.focusAreas?.length ? [...narrative.focusAreas] : [],
    playerHighlights: narrative?.playerHighlights?.length
      ? narrative.playerHighlights.map((h) => ({
          ...h,
          text: h.text,
        }))
      : [],
  };
  if (!meaning) return base;

  if (base.sessionSummaryLines.length === 0) {
    const lines: string[] = [];
    for (const t of meaning.team.needsAttentionLines.slice(0, 4)) {
      const s = t.trim();
      if (s) lines.push(s);
    }
    for (const t of meaning.team.positiveLines.slice(0, 3)) {
      const s = t.trim();
      if (s) lines.push(s);
    }
    if (lines.length === 0 && meaning.themes.length > 0) {
      const top = [...meaning.themes].sort((a, b) => b.weight - a.weight).slice(0, 4);
      for (const x of top) {
        lines.push(`Тема сессии: ${x.key}`);
      }
    }
    base.sessionSummaryLines = lines;
  }

  if (base.focusAreas.length === 0) {
    const areas: string[] = [];
    for (const f of [...meaning.focus].sort((a, b) => b.weight - a.weight)) {
      if (f.label.trim()) areas.push(f.label.trim());
    }
    for (const t of [...meaning.themes].sort((a, b) => b.weight - a.weight)) {
      if (areas.length >= 8) break;
      if (t.key.trim() && !areas.some((a) => a.toLowerCase() === t.key.toLowerCase())) {
        areas.push(t.key.trim());
      }
    }
    base.focusAreas = areas.slice(0, 10);
  }

  if (meaning.nextActions?.nextTrainingFocus?.length) {
    const seenFa = new Set(base.focusAreas.map((x) => x.toLowerCase().trim()));
    for (const line of meaning.nextActions.nextTrainingFocus) {
      const t = line.trim();
      if (!t || seenFa.has(t.toLowerCase())) continue;
      seenFa.add(t.toLowerCase());
      base.focusAreas.push(t);
      if (base.focusAreas.length >= 12) break;
    }
  }

  if (base.playerHighlights.length === 0) {
    const hl: LiveTrainingCoachPreviewNarrativeV1["playerHighlights"] = [];
    for (const p of meaning.players.slice(0, 10)) {
      const text =
        p.sampleEvidence.find((x) => x.trim().length > 0)?.trim() ??
        (p.topThemes[0] ? `Фокус: ${p.topThemes[0]}` : "");
      if (!text) continue;
      hl.push({
        playerId: p.playerId,
        playerName: p.playerName,
        text,
      });
      if (hl.length >= 8) break;
    }
    base.playerHighlights = hl;
  }

  return base;
}
