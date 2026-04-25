/**
 * Read-only binding builder: `ArenaCoreFacts` → interpretation / decision / explanation records.
 * Does not call `buildArenaParentSummary` / per-draft explainers (requires enriched drafts — excluded from facts v1).
 */

import type { ArenaCoreFacts } from "./types";
import type {
  ArenaCoreBindings,
  ArenaDecisionRecord,
  ArenaExplanationRecord,
  ArenaFactRef,
  ArenaInterpretationRecord,
} from "./bindings";

const MAX_THEMES = 8;
const MAX_FOCUS = 6;
const MAX_TEAM_LINES_PER_BUCKET = 4;
const MAX_NEXT_FOCUS_LINES = 8;
const MAX_TEAM_ACTIONS = 6;
const MAX_PLAYER_ACTIONS = 8;
const MAX_TRIGGERS = 8;
const LINE_CLIP = 120;

function clip(s: string, n: number): string {
  const t = s.trim().replace(/\s+/g, " ");
  if (t.length <= n) return t;
  return `${t.slice(0, n - 1)}…`;
}

function liveRef(sid: string): ArenaFactRef {
  return { tier: "canonical", kind: "live_training_session", liveTrainingSessionId: sid };
}

function meaningRef(sid: string): ArenaFactRef {
  return { tier: "derived", kind: "parsed_session_meaning", liveTrainingSessionId: sid };
}

function analyticsRef(sid: string): ArenaFactRef {
  return { tier: "derived", kind: "live_training_analytics_summary", liveTrainingSessionId: sid };
}

function arenaFocusRef(sid: string): ArenaFactRef {
  return { tier: "canonical", kind: "arena_next_focus_column", liveTrainingSessionId: sid };
}

/**
 * Build v1 bindings from supercore facts. Partial by design; see `notes` in output.
 */
export function buildArenaCoreBindings(facts: ArenaCoreFacts): ArenaCoreBindings {
  const sid = facts.canonical.liveTrainingSessionId;
  const baseRefs: ArenaFactRef[] = [liveRef(sid), analyticsRef(sid)];
  const interpretations: ArenaInterpretationRecord[] = [];
  const decisions: ArenaDecisionRecord[] = [];
  const explanations: ArenaExplanationRecord[] = [];
  const notes: string[] = [
    "v1: no per-draft interpretation / deriveArenaCoachReviewState (needs enriched drafts)",
    "v1: no materialize-live-training-action-candidate (mutation path)",
    "v1: no buildArenaParentGuidance / buildArenaParentSummary (needs draft-level inputs)",
  ];

  const m = facts.derived.sessionMeaning;
  const meaningRefs: ArenaFactRef[] = m ? [...baseRefs, meaningRef(sid)] : baseRefs;

  if (m) {
    m.themes.slice(0, MAX_THEMES).forEach((t, i) => {
      interpretations.push({
        id: `intp_theme_${i}`,
        kind: "session_meaning_theme",
        label: String(t.key ?? "").trim() || `theme_${i}`,
        weight: typeof t.weight === "number" ? t.weight : undefined,
        supportedByTier: "derived",
        factRefs: meaningRefs,
      });
    });

    m.focus.slice(0, MAX_FOCUS).forEach((f, i) => {
      interpretations.push({
        id: `intp_focus_${i}`,
        kind: "session_meaning_focus",
        label: clip(String(f.label ?? ""), LINE_CLIP) || `focus_${i}`,
        weight: typeof f.weight === "number" ? f.weight : undefined,
        supportedByTier: "derived",
        factRefs: meaningRefs,
      });
    });

    let ti = 0;
    for (const line of m.team.needsAttentionLines.slice(0, MAX_TEAM_LINES_PER_BUCKET)) {
      interpretations.push({
        id: `intp_team_attn_${ti++}`,
        kind: "session_meaning_team_line",
        label: clip(line, LINE_CLIP),
        supportedByTier: "derived",
        factRefs: meaningRefs,
      });
    }
    for (const line of m.team.positiveLines.slice(0, MAX_TEAM_LINES_PER_BUCKET)) {
      interpretations.push({
        id: `intp_team_pos_${ti++}`,
        kind: "session_meaning_team_line",
        label: clip(line, LINE_CLIP),
        supportedByTier: "derived",
        factRefs: meaningRefs,
      });
    }

    const na = m.nextActions;
    if (na) {
      na.nextTrainingFocus.slice(0, MAX_NEXT_FOCUS_LINES).forEach((line, i) => {
        const t = line.trim();
        if (!t) return;
        decisions.push({
          id: `dec_next_focus_${i}`,
          kind: "session_meaning_next_training_focus",
          text: t,
          supportedByTier: "derived",
          factRefs: meaningRefs,
        });
      });

      na.team.slice(0, MAX_TEAM_ACTIONS).forEach((line, i) => {
        const t = line.trim();
        if (!t) return;
        decisions.push({
          id: `dec_team_action_${i}`,
          kind: "session_meaning_team_next_action",
          text: t,
          supportedByTier: "derived",
          factRefs: meaningRefs,
        });
      });

      let pi = 0;
      for (const p of na.players.slice(0, MAX_PLAYER_ACTIONS)) {
        const pid = p.playerId?.trim();
        for (const a of p.actions.slice(0, 3)) {
          const t = a.trim();
          if (!t) continue;
          decisions.push({
            id: `dec_player_${pi}`,
            kind: "session_meaning_player_next_action",
            text: `${p.playerName?.trim() || pid || "player"}: ${t}`,
            supportedByTier: "derived",
            factRefs: meaningRefs,
            playerId: pid,
          });
          pi += 1;
        }
      }
    }

    m.actionTriggers?.slice(0, MAX_TRIGGERS).forEach((tr, i) => {
      decisions.push({
        id: `dec_trigger_${i}`,
        kind: "session_meaning_action_trigger",
        text: `${tr.type} (${tr.target})${tr.playerId ? ` player=${tr.playerId}` : ""}: ${tr.reason}`,
        supportedByTier: "derived",
        factRefs: meaningRefs,
        playerId: tr.playerId,
      });
    });
  }

  const focusLine = facts.canonical.arenaNextFocusLine?.trim();
  if (focusLine) {
    decisions.push({
      id: "dec_arena_next_focus_column",
      kind: "arena_next_focus_column",
      text: focusLine,
      supportedByTier: "canonical",
      factRefs: [liveRef(sid), arenaFocusRef(sid)],
    });
  }

  const { analyticsSummary } = facts.derived;
  explanations.push({
    id: "expl_analytics_counts",
    kind: "analytics_counts_profile",
    audience: "internal",
    text: `Агрегаты live-сессии: сигналы=${analyticsSummary.signalCount}, черновики с привязкой к игроку=${analyticsSummary.draftsWithPlayerCount}, игроков с сигналами=${analyticsSummary.playersWithSignals}.`,
    supportedByTier: "derived",
    factRefs: [liveRef(sid), analyticsRef(sid)],
  });

  if (m) {
    const c = m.confidence;
    explanations.push({
      id: "expl_session_meaning_confidence",
      kind: "session_meaning_confidence_profile",
      audience: "internal",
      text: `Профиль уверенности session meaning: overall=${c.overall}; события=${c.eventCount}, черновики=${c.draftCount}, сигналы=${c.signalCount}; подтверждённые сигналы=${c.hasConfirmedSignals ? "да" : "нет"}.`,
      supportedByTier: "derived",
      factRefs: meaningRefs,
    });
  }

  const pub = facts.canonical.publishedTrainingSessionReport;
  if (pub) {
    explanations.push({
      id: "expl_published_report",
      kind: "published_report_presence",
      audience: "coach",
      text: pub.hasPublishedText
        ? "Для связанного слота CRM есть опубликованный отчёт (TrainingSessionReport) с непустым текстом."
        : "Для связанного слота CRM есть строка TrainingSessionReport, но публичные поля пусты.",
      supportedByTier: "canonical",
      factRefs: [
        liveRef(sid),
        { tier: "canonical", kind: "linked_training_session", trainingSessionId: pub.trainingSessionId },
        {
          tier: "canonical",
          kind: "published_training_session_report",
          trainingSessionId: pub.trainingSessionId,
          reportId: pub.reportId,
        },
      ],
    });
  }

  const draft = facts.canonical.reportDraft;
  if (draft) {
    explanations.push({
      id: "expl_report_draft",
      kind: "report_draft_state",
      audience: "coach",
      text: `Черновик отчёта live-сессии: status=${draft.status}${draft.publishedAt ? `, publishedAt=${draft.publishedAt}` : ""}.`,
      supportedByTier: "canonical",
      factRefs: [
        liveRef(sid),
        { tier: "canonical", kind: "report_draft", liveTrainingSessionId: sid, draftId: draft.id },
      ],
    });
  }

  if (facts.canonical.linkedTrainingSessionId && !pub) {
    notes.push("linked_training_session present but no TrainingSessionReport row — no published_report explanation");
  }

  // --- Parent-safe explanations (supercore pass 5): same kinds as coach/internal, audience=parent, template-only.
  // Consumed only by latest-training-summary normalization on live_session_fallback (does not touch published branch).
  const linkedId = facts.canonical.linkedTrainingSessionId;
  explanations.push({
    id: "expl_parent_published_slot",
    kind: "published_report_presence",
    audience: "parent",
    text: pub
      ? pub.hasPublishedText
        ? "В системе есть опубликованный отчёт тренера по связанному слоту тренировки; этот экран дополнен сводкой по последней живой сессии команды."
        : "Отчёт по связанному слоту в системе есть, но текст для родителей пока не заполнен."
      : linkedId
        ? "Опубликованный отчёт тренера по связанному слоту тренировки в родительском приложении сейчас не отображается."
        : "Для этой живой тренировки слот в расписании команды не сопоставлён или опубликованный отчёт по нему не найден.",
    supportedByTier: "canonical",
    factRefs: pub
      ? [
          liveRef(sid),
          { tier: "canonical", kind: "linked_training_session", trainingSessionId: pub.trainingSessionId },
          {
            tier: "canonical",
            kind: "published_training_session_report",
            trainingSessionId: pub.trainingSessionId,
            reportId: pub.reportId,
          },
        ]
      : linkedId
        ? [liveRef(sid), { tier: "canonical", kind: "linked_training_session", trainingSessionId: linkedId }]
        : [liveRef(sid)],
  });

  if (m) {
    const c = m.confidence;
    explanations.push({
      id: "expl_parent_meaning_inputs",
      kind: "session_meaning_confidence_profile",
      audience: "parent",
      text: `Сводка в приложении опирается на ${c.eventCount} событий на льду, ${c.draftCount} заметок тренера и ${c.signalCount} сигналов по игрокам.`,
      supportedByTier: "derived",
      factRefs: meaningRefs,
    });
  } else {
    explanations.push({
      id: "expl_parent_analytics_only",
      kind: "analytics_counts_profile",
      audience: "parent",
      text: `По данным живой сессии учтено: ${analyticsSummary.signalCount} сигналов по игрокам, ${analyticsSummary.draftsWithPlayerCount} заметок тренера с привязкой к игроку, игроков со сигналами: ${analyticsSummary.playersWithSignals}.`,
      supportedByTier: "derived",
      factRefs: [liveRef(sid), analyticsRef(sid)],
    });
  }

  if (draft) {
    explanations.push({
      id: "expl_parent_report_draft",
      kind: "report_draft_state",
      audience: "parent",
      text: "У тренера есть черновик отчёта по этой тренировке — его можно опубликовать позже.",
      supportedByTier: "canonical",
      factRefs: [
        liveRef(sid),
        { tier: "canonical", kind: "report_draft", liveTrainingSessionId: sid, draftId: draft.id },
      ],
    });
  }

  return {
    version: "1",
    interpretations,
    decisions,
    explanations,
    notes,
  };
}
