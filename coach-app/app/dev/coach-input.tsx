import React, { useState, useMemo, useEffect, useCallback, useRef } from "react";
import {
  StyleSheet,
  Text,
  View,
  TextInput,
  Pressable,
  Alert,
  Switch,
} from "react-native";
import { ScreenContainer } from "@/components/layout/ScreenContainer";
import { SectionCard } from "@/components/ui/SectionCard";
import { PrimaryButton } from "@/components/ui/PrimaryButton";
import { PressableFeedback } from "@/components/ui/PressableFeedback";
import { DashboardSection } from "@/components/dashboard/DashboardSection";
import { EmptyState } from "@/components/ui/EmptyState";
import { theme } from "@/constants/theme";
import { getCoachSessionPlayers } from "@/lib/getCoachSessionPlayers";
import {
  SkillType,
  createDefaultPlayerSkills,
  applySkillUpdate,
  type PlayerSkillsMap,
} from "@/models/playerDevelopment";
import {
  type SessionObservation,
  type TrainingSessionDraft,
  type CompletedTrainingSession,
  type ObservationImpact,
  type SessionStatus,
} from "@/models/sessionObservation";
import {
  groupObservationsByPlayer,
  countImpacts,
  computeMostObservedSkill,
  buildPlayerSummaryText,
} from "@/lib/sessionReviewHelpers";
import { getLastDraftObservation } from "@/lib/quickRepeatObservationHelpers";
import { getRecentPlayersFromObservations } from "@/lib/recentPlayersHelpers";
import { getRecentSkillsFromObservations } from "@/lib/recentSkillsHelpers";
import { getRecentCombosFromObservations } from "@/lib/recentCombosHelpers";
import { getLivePlayerSessionStats } from "@/lib/livePlayerSessionStatsHelpers";
import { getLiveSkillSessionStats } from "@/lib/liveSkillSessionStatsHelpers";
import { getSuggestedNextAction } from "@/lib/suggestedNextActionHelpers";
import { getLiveTeamSessionPulse } from "@/lib/liveTeamSessionPulseHelpers";
import {
  getSessionFocusQueue,
  allPlayersInFocus,
} from "@/lib/sessionFocusQueueHelpers";
import { recalculatePlayerDevelopmentFromObservations } from "@/lib/recalculatePlayerDevelopment";
import { buildSessionHudData } from "@/lib/sessionHudHelpers";
import { getSessionGuardrailHints } from "@/lib/sessionGuardrailHelpers";
import { buildParentSummariesForSession } from "@/lib/parentSessionSummaryHelpers";
import { buildCoachSessionBundlePayload } from "@/lib/buildCoachSessionSyncPayload";
import { syncCoachSessionBundle } from "@/services/coachSessionSyncService";
import {
  startCoachSession,
  createCoachObservation,
  getActiveCoachSession,
  getCoachSessionObservations,
  DEFAULT_TEAM_ID,
  ApiRequestError,
} from "@/services/coachSessionLiveService";
import {
  loadCoachInputState,
  saveCoachInputState,
  clearCoachInputState,
  getDefaultCoachInputState,
  resetSessionDraftOnly,
} from "@/lib/coachInputStorage";
import { needsSessionExitGuard } from "@/lib/resumeSessionHelpers";
import AsyncStorage from "@react-native-async-storage/async-storage";
import {
  useVoiceNote,
  SUPPORTED_VOICE_LOCALES,
  DEFAULT_VOICE_LOCALE,
  type VoiceLocale,
} from "@/hooks/useVoiceNote";
import type { SessionSyncMeta, SessionSyncStateMap } from "@/models/sessionSyncState";
import type { CoachSessionBundlePayload } from "@/models/coachSessionSync";
import * as Clipboard from "expo-clipboard";
import { SymbolView } from "expo-symbols";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useNavigation } from "@react-navigation/native";
import {
  buildVoiceStarterDestinationContext,
  enrichVoiceStarterWithAi,
  consumeVoiceStarterPayload,
  consumeVoiceObservationPrefill,
  formatVoiceStarterForActionItem,
  formatVoiceStarterForCoachNote,
  formatVoiceStarterForParentDraft,
  getVoiceCreationMemoryForNote,
  isVoiceSeriesEditLastPayloadFresh,
  markVoiceCreationForNote,
  parseContinuousVoiceCommand,
  parseVoiceSeriesEditLastPayload,
  saveVoiceStarterPayload,
  type SkillTypeCandidate,
  type VoiceStarterPayload,
  VOICE_MVP_SOURCE,
  VOICE_SERIES_EDIT_LAST_STORAGE_KEY,
} from "@/lib/voiceMvp";
import {
  createParentDraft,
  type CreateParentDraftPayload,
} from "@/services/voiceCreateService";
import { VoiceLoopNextStepsCard } from "@/components/voice/VoiceStarterServerSuccessPanel";
import {
  VOICE_AI_ACCOUNTED_LINE,
  VOICE_AI_PILL_LABEL,
  VOICE_LOOP_ACTION_LOCAL_DONE_LEAD,
  VOICE_LOOP_ACTION_LOCAL_DONE_TITLE,
  VOICE_LOOP_PARENT_DRAFT_DONE_LEAD,
  VOICE_LOOP_PARENT_DRAFT_DONE_TITLE,
} from "@/lib/voiceMvp/voiceStarterCompletionCopy";
import {
  POST_CREATE_FOLLOW_UP_LEAD,
  POST_CREATE_FOLLOW_UP_TITLE,
} from "@/lib/postCreateFollowUp";
import { StaggerFadeIn } from "@/components/dashboard/StaggerFadeIn";
import { coachHapticSuccess, coachHapticSelection } from "@/lib/coachHaptics";
import {
  appendVoiceSeriesLog,
  buildVoiceSeriesRecap,
  clearVoiceSeriesLog,
  loadVoiceSeriesLog,
  removeVoiceSeriesLogEntry,
  truncateForVoiceSeriesPreview,
  type VoiceSeriesLogEntry,
  type VoiceSeriesRecap,
} from "@/lib/voiceSeriesObservationLog";

const SKILL_TYPE_LABELS: Record<SkillType, string> = {
  [SkillType.skating]: "Катание",
  [SkillType.shooting]: "Броски",
  [SkillType.passing]: "Передачи",
  [SkillType.positioning]: "Позиционирование",
  [SkillType.defense]: "Защита",
  [SkillType.effort]: "Усилие",
  [SkillType.confidence]: "Уверенность",
  [SkillType.communication]: "Коммуникация",
};

const VOICE_LOCALE_KEY = "@hockey_voice_locale";

const IMPACT_OPTIONS: Array<{ value: ObservationImpact; label: string }> = [
  { value: "positive", label: "Позитив" },
  { value: "neutral", label: "Нейтрально" },
  { value: "negative", label: "Негатив" },
];

const QUICK_NOTE_TEMPLATES: string[] = [
  "Хороший прогресс",
  "Нужна уверенность",
  "Хорошая работа ног",
  "Добавить скорость",
  "Больше контроля шайбы",
  "Следить за позицией",
  "Хорошее решение",
  "Нужна стабильность",
  "Сильный бросок",
  "Больше движения без шайбы",
  "Работать над передачей",
  "Активнее в защите",
];

const SKILL_RELEVANT_TEMPLATES: Partial<Record<SkillType, string[]>> = {
  [SkillType.skating]: ["Хорошая работа ног", "Добавить скорость", "Больше движения без шайбы"],
  [SkillType.shooting]: ["Сильный бросок", "Больше контроля шайбы"],
  [SkillType.passing]: ["Работать над передачей", "Хорошее решение"],
  [SkillType.positioning]: ["Следить за позицией", "Больше движения без шайбы"],
  [SkillType.defense]: ["Активнее в защите", "Следить за позицией"],
  [SkillType.effort]: ["Хороший прогресс", "Нужна стабильность"],
  [SkillType.confidence]: ["Нужна уверенность", "Хорошее решение"],
  [SkillType.communication]: ["Хорошее решение", "Нужна уверенность"],
};

function generateId(): string {
  return `obs_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`;
}

function createFreshSession(): TrainingSessionDraft {
  return {
    id: `session_${Date.now()}`,
    title: "Тренировка",
    startedAt: Date.now(),
    status: "idle",
    observations: [],
  };
}

function formatTime(ts: number): string {
  const d = new Date(ts);
  return d.toLocaleTimeString("ru-RU", { hour: "2-digit", minute: "2-digit" });
}

function formatDuration(start: number, end: number): string {
  const mins = Math.round((end - start) / 60000);
  if (mins < 60) return `${mins} мин`;
  const h = Math.floor(mins / 60);
  const m = mins % 60;
  return m ? `${h} ч ${m} мин` : `${h} ч`;
}

function pluralObservation(n: number): string {
  const m10 = n % 10;
  const m100 = n % 100;
  if (m10 === 1 && m100 !== 11) return "наблюдение";
  if (m10 >= 2 && m10 <= 4 && (m100 < 10 || m100 >= 20)) return "наблюдения";
  return "наблюдений";
}

function pluralPlayerGen(n: number): string {
  return n === 1 ? "игрока" : "игроков";
}

function pluralPlayerNom(n: number): string {
  const m10 = n % 10;
  const m100 = n % 100;
  if (m10 === 1 && m100 !== 11) return "игрок";
  if (m10 >= 2 && m10 <= 4 && (m100 < 10 || m100 >= 20)) return "игрока";
  return "игроков";
}

function normalizeName(value: string): string {
  return value
    .toLowerCase()
    .replace(/ё/g, "е")
    .replace(/[^\p{L}\p{N}\s]/gu, " ")
    .replace(/\s+/g, " ")
    .trim();
}

type PlayerMatchResult =
  | { kind: "matched"; playerId: string; hint: string }
  | { kind: "ambiguous"; hint: string; candidates: Array<{ id: string; name: string; jerseyNumber?: number }> }
  | { kind: "not_found"; hint: string }
  | { kind: "no_candidate"; hint: string };

type VoicePrefillReviewState = {
  playerStatusLabel: string;
  skillStatusLabel: string;
  impactStatusLabel: string;
  noteStatusLabel: string;
};

type VoiceSeriesFinishSnapshot = {
  count: number;
  entries: VoiceSeriesLogEntry[];
  recent: VoiceSeriesLogEntry[];
  uniquePlayers: string[];
  recap: VoiceSeriesRecap | null;
};

function buildParentDraftStarterFromSeries(finish: VoiceSeriesFinishSnapshot): VoiceStarterPayload | null {
  if (!finish.recap || finish.recap.total === 0) return null;
  const recap = finish.recap;
  const focusSkills = recap.topSkills.slice(0, 2);
  const focusLine =
    focusSkills.length > 0
      ? focusSkills
          .map((s) => `${SKILL_TYPE_LABELS[s.skillKey as SkillType] ?? s.skillKey} (${s.count})`)
          .join(", ")
      : null;
  const summary = `Коротко по серии: ${recap.total} ${pluralObservation(recap.total)} по ${recap.uniquePlayers} ${pluralPlayerNom(recap.uniquePlayers)}.`;
  const highlights: string[] = [
    `Оценки: позитив ${recap.impactPositive}, нейтрально ${recap.impactNeutral}, негатив ${recap.impactNegative}.`,
    ...(focusLine ? [`Фокус серии: ${focusLine}.`] : []),
  ];
  for (const entry of finish.recent.slice(0, 3)) {
    const base = `${entry.playerName}: ${SKILL_TYPE_LABELS[entry.skillType as SkillType] ?? entry.skillType}, ${entry.impact === "positive" ? "позитив" : entry.impact === "negative" ? "негатив" : "нейтрально"}`;
    highlights.push(entry.notePreview ? `${base}. ${entry.notePreview}` : base);
  }

  const parts: string[] = [
    "Коротко по серии наблюдений на тренировке:",
    "",
    summary,
    `Оценки: +${recap.impactPositive} / =${recap.impactNeutral} / -${recap.impactNegative}.`,
    ...(focusLine ? [`Фокус серии: ${focusLine}.`] : []),
  ];
  if (finish.recent.length > 0) {
    parts.push(
      "",
      "Ключевые наблюдения:",
      ...finish.recent.slice(0, 3).map((entry) => {
        const row = `• ${entry.playerName}: ${SKILL_TYPE_LABELS[entry.skillType as SkillType] ?? entry.skillType}, ${entry.impact === "positive" ? "позитив" : entry.impact === "negative" ? "негатив" : "нейтрально"}`;
        return entry.notePreview ? `${row}. ${entry.notePreview}` : row;
      })
    );
  }
  parts.push("", "Проверьте и при необходимости уточните детали перед отправкой.");
  const transcript = parts.join("\n").trim();

  const playerCounts = new Map<string, { name: string; count: number }>();
  for (const entry of finish.entries) {
    const prev = playerCounts.get(entry.playerId);
    if (prev) prev.count += 1;
    else playerCounts.set(entry.playerId, { name: entry.playerName, count: 1 });
  }
  const sortedPlayers = [...playerCounts.entries()].sort((a, b) => b[1].count - a[1].count);
  const top = sortedPlayers[0];
  const second = sortedPlayers[1];
  const hasSafeDominantPlayer =
    !!top &&
    top[1].count >= 2 &&
    top[1].count / recap.total >= 0.6 &&
    (!second || top[1].count > second[1].count);

  return {
    id: `voice_series_parent_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
    createdAt: new Date().toISOString(),
    intent: "parent_draft",
    source: VOICE_MVP_SOURCE,
    transcript,
    summary,
    highlights: highlights.slice(0, 4),
    context: hasSafeDominantPlayer
      ? {
          playerId: top[0],
          playerLabel: top[1].name,
          sessionHint: "Серия голосовых наблюдений",
        }
      : {
          sessionHint: "Серия голосовых наблюдений",
        },
  };
}

/** UI-only parsing of VoiceStarterPayload for parent-draft composer (no contract change). */
type ParentDraftComposerDerived = {
  obsCount: number | null;
  playerCount: number | null;
  impactPlus: number | null;
  impactEq: number | null;
  impactMinus: number | null;
  topSkillLabels: string[];
  observationPreviews: string[];
  isSeriesSessionHint: boolean;
  hasRecapSummaryLine: boolean;
};

function parseSeriesCountsFromSummary(summary: string): { obs: number; players: number } | null {
  const m = summary.match(/Коротко по серии:\s*(\d+)\D+по\s+(\d+)\b/);
  if (!m) return null;
  const obs = Number(m[1]);
  const players = Number(m[2]);
  if (!Number.isFinite(obs) || !Number.isFinite(players)) return null;
  return { obs, players };
}

function parseImpactFromHighlight(line: string): { plus: number; eq: number; minus: number } | null {
  const w = line.match(/позитив\s+(\d+),\s*нейтрально\s+(\d+),\s*негатив\s+(\d+)/i);
  if (w) {
    return { plus: Number(w[1]), eq: Number(w[2]), minus: Number(w[3]) };
  }
  const c = line.match(/\+\s*(\d+)\s*\/\s*=\s*(\d+)\s*\/\s*-\s*(\d+)/);
  if (c) {
    return { plus: Number(c[1]), eq: Number(c[2]), minus: Number(c[3]) };
  }
  return null;
}

function parseFocusSkillsFromHighlight(line: string): string[] {
  const m = line.match(/^Фокус серии:\s*(.+?)\.?$/i);
  if (!m) return [];
  return m[1]
    .split(",")
    .map((s) => s.replace(/\s*\(\d+\)\s*$/u, "").trim())
    .filter(Boolean)
    .slice(0, 2);
}

function extractObservationLinesFromHighlights(highlights: string[]): string[] {
  const out: string[] = [];
  for (const h of highlights) {
    const t = h.trim();
    if (!t) continue;
    if (/^Оценки:/i.test(t)) continue;
    if (/^Фокус серии:/i.test(t)) continue;
    out.push(t.replace(/^•\s*/, "").trim());
    if (out.length >= 3) break;
  }
  return out;
}

function extractObservationPreviewsFromTranscript(transcript: string): string[] {
  const key = "Ключевые наблюдения:";
  const idx = transcript.indexOf(key);
  if (idx === -1) return [];
  const rest = transcript.slice(idx + key.length).split("\n");
  const out: string[] = [];
  for (const line of rest) {
    const t = line.trim();
    if (!t) continue;
    if (t.startsWith("Проверьте")) break;
    if (t.startsWith("•")) {
      out.push(t.replace(/^•\s*/, "").trim());
    }
    if (out.length >= 3) break;
  }
  return out;
}

function deriveParentDraftComposerUi(payload: VoiceStarterPayload): ParentDraftComposerDerived {
  const summary = payload.summary?.trim() ?? "";
  const counts = parseSeriesCountsFromSummary(summary);
  const isSeriesSessionHint =
    (payload.context?.sessionHint?.trim() ?? "").toLowerCase().includes("серия") ||
    /серии|серия/i.test(summary);

  let impactPlus: number | null = null;
  let impactEq: number | null = null;
  let impactMinus: number | null = null;
  const hl = payload.highlights ?? [];
  for (const line of hl) {
    const imp = parseImpactFromHighlight(line);
    if (imp) {
      impactPlus = imp.plus;
      impactEq = imp.eq;
      impactMinus = imp.minus;
      break;
    }
  }
  if (impactPlus === null && payload.transcript) {
    const imp = parseImpactFromHighlight(payload.transcript);
    if (imp) {
      impactPlus = imp.plus;
      impactEq = imp.eq;
      impactMinus = imp.minus;
    }
  }

  let topSkillLabels: string[] = [];
  for (const line of hl) {
    topSkillLabels = parseFocusSkillsFromHighlight(line);
    if (topSkillLabels.length) break;
  }

  let observationPreviews = extractObservationLinesFromHighlights(hl);
  if (observationPreviews.length === 0) {
    observationPreviews = extractObservationPreviewsFromTranscript(payload.transcript ?? "");
  }

  return {
    obsCount: counts?.obs ?? null,
    playerCount: counts?.players ?? null,
    impactPlus,
    impactEq,
    impactMinus,
    topSkillLabels,
    observationPreviews: observationPreviews.slice(0, 3),
    isSeriesSessionHint,
    hasRecapSummaryLine: /Коротко по серии/i.test(summary),
  };
}

function parentDraftHasStarterBody(payload: VoiceStarterPayload): boolean {
  const s = payload.summary?.trim();
  if (s) return true;
  if ((payload.highlights?.length ?? 0) > 0) return true;
  return Boolean(payload.transcript?.trim());
}

type StarterIntakeCopy = {
  eyebrow: string;
  title: string;
  secondaryHint: string;
  primaryCta: string;
};

function getStarterIntakeCopy(payload: VoiceStarterPayload): StarterIntakeCopy {
  const fromVoice =
    payload.source === VOICE_MVP_SOURCE || Boolean(payload.originVoiceNoteId?.trim());
  if (payload.intent === "parent_draft") {
    if (fromVoice) {
      return {
        eyebrow: "Сообщение из заметки",
        title: "Черновик для родителя уже собран",
        secondaryHint:
          "Текст добавлен в поле заметки — проверьте формулировки и тон. Ниже откроется блок оформления сообщения.",
        primaryCta: "Перейти к сообщению",
      };
    }
    return {
      eyebrow: "Черновик ответа родителю",
      title: "Подготовим ответ на основе последнего сообщения",
      secondaryHint: "Это только стартовая заготовка — всё можно отредактировать вручную",
      primaryCta: "Продолжить подготовку",
    };
  }
  if (fromVoice) {
    return {
      eyebrow: "Задача из заметки",
      title: "Заготовка действия готова к правке",
      secondaryHint: "Текст добавлен в заметку — уточните формулировку перед сохранением или копированием.",
      primaryCta: "Продолжить",
    };
  }
  return {
    eyebrow: "Черновик задачи",
    title: "Зафиксируем задачу на основе последнего сообщения",
    secondaryHint: "Это только стартовая заготовка задачи — всё можно отредактировать вручную",
    primaryCta: "Продолжить",
  };
}

function trimStarterPreview(text: string): string {
  const normalized = text.replace(/\s+/g, " ").trim();
  if (!normalized) return "Контекст из сообщения недоступен.";
  return normalized.length > 260 ? `${normalized.slice(0, 259).trimEnd()}…` : normalized;
}

function pickStarterHighlights(payload: VoiceStarterPayload): string[] {
  return (payload.highlights ?? [])
    .map((line) => line.trim())
    .filter(Boolean)
    .slice(0, 2);
}

const PARENT_DRAFT_PRESAVE_CHECKS = [
  "Получатель сообщения выбран верно",
  "Тон спокойный и уместный",
  "Нет сырых или лишних формулировок",
  "Родителю понятны важные детали",
] as const;

function findPlayerMatchResult(
  players: Array<{ id: string; name: string; jerseyNumber?: number }>,
  candidateName?: string | null,
  candidateJersey?: number | null
): PlayerMatchResult {
  const byNumber =
    candidateJersey != null
      ? players.filter((p) => p.jerseyNumber != null && p.jerseyNumber === candidateJersey)
      : [];
  if (candidateJersey != null && byNumber.length === 1) {
    return {
      kind: "matched",
      playerId: byNumber[0].id,
      hint: `Игрок определён: #${candidateJersey} ${byNumber[0].name}`,
    };
  }
  if (candidateJersey != null && byNumber.length > 1) {
    return {
      kind: "ambiguous",
      hint: "Найдено несколько возможных совпадений по номеру — проверьте игрока.",
      candidates: byNumber.slice(0, 4).map((p) => ({
        id: p.id,
        name: p.name,
        jerseyNumber: p.jerseyNumber,
      })),
    };
  }

  const c = normalizeName(candidateName ?? "");
  if (!c) {
    return {
      kind: "no_candidate",
      hint: "Игрок не указан в расшифровке — выберите вручную.",
    };
  }

  const cTokens = c.split(" ").filter(Boolean);
  const scored = players
    .map((p) => {
      const n = normalizeName(p.name);
      const nTokens = n.split(" ").filter(Boolean);
      let score = 0;
      if (n === c) score += 100;
      if (n.includes(c) || c.includes(n)) score += 40;
      const tokenHits = cTokens.filter((t) => nTokens.includes(t)).length;
      score += tokenHits * 15;
      return { p, score };
    })
    .filter((x) => x.score > 0)
    .sort((a, b) => b.score - a.score);

  if (scored.length === 0) {
    return {
      kind: "not_found",
      hint: "Не удалось точно определить игрока — выберите вручную.",
    };
  }

  const best = scored[0];
  const second = scored[1];
  const tiedTop = scored.filter((x) => x.score === best.score);
  if ((second && best.score === second.score) || tiedTop.length > 1) {
    return {
      kind: "ambiguous",
      hint: "Найдено несколько возможных совпадений — проверьте игрока.",
      candidates: scored.slice(0, 4).map((x) => ({
        id: x.p.id,
        name: x.p.name,
        jerseyNumber: x.p.jerseyNumber,
      })),
    };
  }
  return {
    kind: "matched",
    playerId: best.p.id,
    hint: `Игрок определён: ${best.p.name}`,
  };
}

function toSkillTypeFromCandidate(candidate: SkillTypeCandidate | null): SkillType | null {
  if (!candidate) return null;
  return Object.values(SkillType).includes(candidate as SkillType)
    ? (candidate as SkillType)
    : null;
}

function getSyncStatusLabel(
  meta: SessionSyncMeta | undefined,
  hasFrozenBundle?: boolean
): string {
  const state = meta?.state ?? "pending";
  if (!hasFrozenBundle && (state === "failed" || state === "pending")) {
    return "Синхронизация недоступна";
  }
  switch (state) {
    case "syncing":
      return "Синхронизация…";
    case "synced":
      return "Синхронизировано";
    case "failed":
      return "Ошибка синхронизации";
    default:
      return "Ожидает синхронизации";
  }
}

function formatSessionDate(ts: number): string {
  const d = new Date(ts);
  const now = new Date();
  const isToday =
    d.getDate() === now.getDate() &&
    d.getMonth() === now.getMonth() &&
    d.getFullYear() === now.getFullYear();
  if (isToday) {
    return `Сегодня, ${d.toLocaleTimeString("ru-RU", { hour: "2-digit", minute: "2-digit" })}`;
  }
  return d.toLocaleDateString("ru-RU", {
    month: "short",
    day: "numeric",
    year: d.getFullYear() !== now.getFullYear() ? "numeric" : undefined,
    hour: "2-digit",
    minute: "2-digit",
  });
}

function buildInitialDefaults() {
  const players = getCoachSessionPlayers();
  const map: Record<string, PlayerSkillsMap> = {};
  for (const p of players) {
    map[p.id] = createDefaultPlayerSkills();
  }
  return {
    sessionDraft: createFreshSession(),
    playerDevelopmentById: map,
    completedSessions: [] as CompletedTrainingSession[],
  };
}

export default function CoachInputScreen() {
  const router = useRouter();
  const params = useLocalSearchParams<{
    voiceStarterId?: string;
    voiceObservationPrefillId?: string;
    voiceSeries?: string;
  }>();
  const navigation = useNavigation();
  const [selectedPlayerId, setSelectedPlayerId] = useState<string | null>(null);
  const [selectedSkillType, setSelectedSkillType] = useState<SkillType | null>(null);
  const [selectedImpact, setSelectedImpact] = useState<ObservationImpact | null>(null);
  const [isStickyPlayer, setStickyPlayer] = useState(false);
  const [isStickySkill, setStickySkill] = useState(false);
  const [note, setNote] = useState("");
  const [voiceObservationMatchHint, setVoiceObservationMatchHint] = useState<string | null>(
    null
  );
  const [voiceObservationQuickPickCandidates, setVoiceObservationQuickPickCandidates] =
    useState<Array<{ id: string; name: string; jerseyNumber?: number }>>([]);
  const [voicePrefillReview, setVoicePrefillReview] = useState<VoicePrefillReviewState | null>(
    null
  );
  const [voiceRapidLoopVisible, setVoiceRapidLoopVisible] = useState(false);
  const [isVoiceSeriesMode, setIsVoiceSeriesMode] = useState(false);
  const [voiceSeriesLog, setVoiceSeriesLog] = useState<VoiceSeriesLogEntry[]>([]);
  const [voiceSeriesFinish, setVoiceSeriesFinish] = useState<VoiceSeriesFinishSnapshot | null>(
    null
  );
  const prevVoiceSeriesModeRef = useRef(false);
  const voiceSeriesSessionIdRef = useRef<string | null>(null);
  const exitVoiceSeriesModeRef = useRef<() => void>(() => {});

  const exitVoiceSeriesMode = useCallback(() => {
    const log = [...voiceSeriesLog];
    const uniqueNames = [...new Map(log.map((e) => [e.playerId, e.playerName] as const)).values()].slice(
      0,
      8
    );
    setVoiceSeriesFinish({
      count: log.length,
      entries: log,
      recent: log.slice(0, 5),
      uniquePlayers: uniqueNames,
      recap: log.length > 0 ? buildVoiceSeriesRecap(log) : null,
    });
    setIsVoiceSeriesMode(false);
    setVoiceRapidLoopVisible(false);
    setVoicePrefillReview(null);
    setVoiceObservationMatchHint(null);
    setVoiceObservationQuickPickCandidates([]);
  }, [voiceSeriesLog]);

  exitVoiceSeriesModeRef.current = exitVoiceSeriesMode;
  const [voiceLocale, setVoiceLocale] = useState<VoiceLocale>(DEFAULT_VOICE_LOCALE);
  const [isRestored, setIsRestored] = useState(false);
  const appliedVoiceStarterRef = useRef<string | null>(null);
  const [parentDraftVoicePayload, setParentDraftVoicePayload] =
    useState<VoiceStarterPayload | null>(null);
  const [savingParentDraftToServer, setSavingParentDraftToServer] = useState(false);
  const [parentDraftSaveSuccessId, setParentDraftSaveSuccessId] = useState<string | null>(null);
  const [parentDraftSaveSuccessPlayerId, setParentDraftSaveSuccessPlayerId] = useState<string | null>(null);
  const [parentDraftDuplicateHint, setParentDraftDuplicateHint] = useState(false);
  const parentDraftSubmitLockRef = useRef(false);
  const [starterIntakePayload, setStarterIntakePayload] = useState<VoiceStarterPayload | null>(null);
  const [starterIntakeHint, setStarterIntakeHint] = useState<string | null>(null);
  const starterInjectedTextRef = useRef<string | null>(null);
  const [parentDraftCompletionDismissed, setParentDraftCompletionDismissed] = useState(false);
  const [parentDraftCopyFeedback, setParentDraftCopyFeedback] = useState(false);
  const parentDraftCopyFeedbackTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [actionItemVoicePayload, setActionItemVoicePayload] =
    useState<VoiceStarterPayload | null>(null);
  const [actionItemCompletionDismissed, setActionItemCompletionDismissed] = useState(false);
  const [actionItemCopyFeedback, setActionItemCopyFeedback] = useState(false);
  const actionItemCopyFeedbackTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const parentDraftComposerDerived = useMemo(
    () => (parentDraftVoicePayload ? deriveParentDraftComposerUi(parentDraftVoicePayload) : null),
    [parentDraftVoicePayload]
  );
  const parentDraftStarterPresent = useMemo(
    () => (parentDraftVoicePayload ? parentDraftHasStarterBody(parentDraftVoicePayload) : false),
    [parentDraftVoicePayload]
  );
  const parentDraftDestinationContext = useMemo(
    () =>
      parentDraftVoicePayload
        ? buildVoiceStarterDestinationContext(parentDraftVoicePayload)
        : null,
    [parentDraftVoicePayload]
  );
  const starterIntakeContext = useMemo(
    () => (starterIntakePayload ? buildVoiceStarterDestinationContext(starterIntakePayload) : null),
    [starterIntakePayload]
  );

  const parentDraftResolvedText = useMemo(() => {
    if (!parentDraftVoicePayload) return "";
    const fromNote = note.trim();
    const fromStarter = formatVoiceStarterForParentDraft(parentDraftVoicePayload).trim();
    return fromNote || fromStarter;
  }, [note, parentDraftVoicePayload]);

  const showParentDraftCompletion =
    Boolean(parentDraftVoicePayload) &&
    Boolean(parentDraftResolvedText) &&
    !starterIntakePayload &&
    !parentDraftCompletionDismissed;

  const actionItemResolvedText = useMemo(() => {
    if (!actionItemVoicePayload) return "";
    const fromNote = note.trim();
    const fromStarter = formatVoiceStarterForActionItem(actionItemVoicePayload).trim();
    return fromNote || fromStarter;
  }, [note, actionItemVoicePayload]);

  const showActionItemCompletion =
    Boolean(actionItemVoicePayload) &&
    Boolean(actionItemResolvedText) &&
    !starterIntakePayload &&
    !actionItemCompletionDismissed &&
    !parentDraftVoicePayload;

  const [sessionDraft, setSessionDraft] = useState<TrainingSessionDraft>(() =>
    buildInitialDefaults().sessionDraft
  );

  const [playerDevelopmentById, setPlayerDevelopmentById] = useState<
    Record<string, PlayerSkillsMap>
  >(() => buildInitialDefaults().playerDevelopmentById);

  const [completedSessions, setCompletedSessions] = useState<
    CompletedTrainingSession[]
  >([]);

  const [expandedSessionId, setExpandedSessionId] = useState<string | null>(null);
  const [editingDraftKey, setEditingDraftKey] = useState<string | null>(null);
  const [editBuffer, setEditBuffer] = useState<{ headline: string; parentMessage: string }>({
    headline: "",
    parentMessage: "",
  });
  const [editedDrafts, setEditedDrafts] = useState<
    Record<string, { headline: string; parentMessage: string }>
  >({});

  const [sessionSyncStateMap, setSessionSyncStateMap] = useState<SessionSyncStateMap>({});
  const [frozenSyncBundles, setFrozenSyncBundles] = useState<
    Record<string, CoachSessionBundlePayload>
  >({});

  const handleEditLastForVoiceRef = useRef<() => void>(() => {});

  const handleVoiceTranscript = useCallback(
    (text: string) => {
      const t = text.trim();
      if (!t) return;

      if (isVoiceSeriesMode) {
        const cmd = parseContinuousVoiceCommand(t);
        if (cmd) {
          if (voicePrefillReview) {
            if (cmd === "exit") {
              exitVoiceSeriesModeRef.current();
              return;
            }
            return;
          }
          if (cmd === "exit") {
            exitVoiceSeriesModeRef.current();
            return;
          }
          if (voiceRapidLoopVisible) {
            if (cmd === "next") {
              router.push(
                isVoiceSeriesMode ? "/voice-note?voiceSeries=1" : "/voice-note"
              );
              return;
            }
            if (cmd === "fix") {
              setVoiceRapidLoopVisible(false);
              handleEditLastForVoiceRef.current();
              return;
            }
          }
        }
      }

      setNote((prev) => {
        const p = prev.trim();
        return p ? `${p} ${t}` : t;
      });
    },
    [isVoiceSeriesMode, router, voicePrefillReview, voiceRapidLoopVisible]
  );
  const voiceNote = useVoiceNote(handleVoiceTranscript, voiceLocale);

  useEffect(() => {
    AsyncStorage.getItem(VOICE_LOCALE_KEY).then((stored) => {
      if (stored && SUPPORTED_VOICE_LOCALES.includes(stored as VoiceLocale)) {
        setVoiceLocale(stored as VoiceLocale);
      }
    });
  }, []);

  const handleVoiceLocaleChange = useCallback((loc: VoiceLocale) => {
    setVoiceLocale(loc);
    AsyncStorage.setItem(VOICE_LOCALE_KEY, loc).catch(() => {});
  }, []);

  const players = useMemo(() => getCoachSessionPlayers(), []);
  const hasPlayers = players.length > 0;

  useEffect(() => {
    setEditingDraftKey(null);
  }, [expandedSessionId]);

  useEffect(() => {
    if (selectedPlayerId === null) setStickyPlayer(false);
  }, [selectedPlayerId]);

  useEffect(() => {
    if (selectedSkillType === null) setStickySkill(false);
  }, [selectedSkillType]);

  useEffect(() => {
    loadCoachInputState().then(async (data) => {
      if (data) {
        setSessionDraft(data.sessionDraft);
        setPlayerDevelopmentById(data.playerDevelopmentById);
        setCompletedSessions(data.completedSessions ?? []);
        setEditedDrafts(data.editedParentDrafts ?? {});
        setSessionSyncStateMap(data.sessionSyncStateMap ?? {});
        setFrozenSyncBundles(data.frozenSyncBundles ?? {});
      }
      const draft = data?.sessionDraft;
      const isIdleEmpty = !draft || (draft.status === "idle" && (draft.observations?.length ?? 0) === 0);
      if (isIdleEmpty) {
        const active = await getActiveCoachSession(DEFAULT_TEAM_ID);
        if (active) {
          const apiObs = await getCoachSessionObservations(active.sessionId);
          const mapImpact = (o: { impact?: string; score?: number }): ObservationImpact => {
            if (o.impact === "positive" || o.impact === "negative" || o.impact === "neutral") return o.impact;
            if (o.score != null) return o.score > 0 ? "positive" : o.score < 0 ? "negative" : "neutral";
            return "neutral";
          };
          const mapSkill = (k?: string): SkillType =>
            k && Object.values(SkillType).includes(k as SkillType) ? (k as SkillType) : SkillType.effort;
          const observations: SessionObservation[] = apiObs.map((o) => ({
            id: o.id || generateId(),
            playerId: o.playerId,
            playerName: o.playerName ?? "Игрок",
            skillType: mapSkill(o.skillKey),
            impact: mapImpact(o),
            note: o.noteText,
            createdAt: o.createdAt ? new Date(o.createdAt).getTime() : Date.now(),
          }));
          const completedObs = (data?.completedSessions ?? []).flatMap((s) => s.observations);
          const allObs = [...completedObs, ...observations];
          setPlayerDevelopmentById(recalculatePlayerDevelopmentFromObservations(allObs));
          setSessionDraft((prev) => ({
            ...prev,
            id: active.sessionId,
            status: "active",
            startedAt: active.startedAt ? new Date(active.startedAt).getTime() : Date.now(),
            observations,
          }));
        }
      }
      setIsRestored(true);
    });
  }, []);

  useEffect(() => {
    if (!isRestored) return;
    saveCoachInputState({
      sessionDraft,
      playerDevelopmentById,
      completedSessions,
      editedParentDrafts: editedDrafts,
      sessionSyncStateMap,
      frozenSyncBundles,
    });
  }, [isRestored, sessionDraft, playerDevelopmentById, completedSessions, editedDrafts, sessionSyncStateMap, frozenSyncBundles]);

  useEffect(() => {
    if (!isRestored) return;
    const starterId = params.voiceStarterId?.trim();
    if (!starterId) return;
    if (appliedVoiceStarterRef.current === starterId) return;
    appliedVoiceStarterRef.current = starterId;

    consumeVoiceStarterPayload(starterId).then((payload) => {
      if (!payload) {
        setStarterIntakePayload(null);
        setStarterIntakeHint("Черновик не найден — можно продолжить в обычном режиме.");
        setActionItemVoicePayload(null);
        setActionItemCompletionDismissed(false);
        setActionItemCopyFeedback(false);
        return;
      }

      if (payload.intent !== "parent_draft" && payload.intent !== "action_item") {
        setStarterIntakePayload(null);
        setStarterIntakeHint("Тип черновика не поддержан — можно продолжить в обычном режиме.");
        setActionItemVoicePayload(null);
        setActionItemCompletionDismissed(false);
        setActionItemCopyFeedback(false);
        return;
      }

      if (payload.intent === "parent_draft") {
        setParentDraftVoicePayload(payload);
        setParentDraftSaveSuccessId(null);
        setParentDraftSaveSuccessPlayerId(null);
        setParentDraftCompletionDismissed(false);
        setActionItemVoicePayload(null);
        setActionItemCompletionDismissed(false);
        setActionItemCopyFeedback(false);
      } else {
        setParentDraftVoicePayload(null);
        setParentDraftSaveSuccessId(null);
        setParentDraftSaveSuccessPlayerId(null);
        setParentDraftCompletionDismissed(false);
        setParentDraftCopyFeedback(false);
        setActionItemVoicePayload(payload);
        setActionItemCompletionDismissed(false);
        setActionItemCopyFeedback(false);
      }

      const text =
        payload.intent === "parent_draft"
          ? formatVoiceStarterForParentDraft(payload)
          : payload.intent === "action_item"
            ? formatVoiceStarterForActionItem(payload)
            : formatVoiceStarterForCoachNote(payload);
      starterInjectedTextRef.current = text;

      setNote((prev) => {
        const p = prev.trim();
        return p ? `${p}\n\n———\n\n${text}` : text;
      });
      setStarterIntakePayload(payload);
      setStarterIntakeHint(null);

      if (payload.context?.playerId) {
        setSelectedPlayerId(payload.context.playerId);
      }
      setSelectedSkillType((prev) => prev ?? SkillType.effort);
      setSelectedImpact((prev) => prev ?? "neutral");
    });
  }, [isRestored, params.voiceStarterId]);

  useEffect(() => {
    if (params.voiceSeries === "1") {
      setIsVoiceSeriesMode(true);
      setVoiceSeriesFinish(null);
    }
  }, [params.voiceSeries]);

  useEffect(() => {
    if (isVoiceSeriesMode && sessionDraft.id) {
      voiceSeriesSessionIdRef.current = sessionDraft.id;
    }
  }, [isVoiceSeriesMode, sessionDraft.id]);

  useEffect(() => {
    if (!isVoiceSeriesMode) {
      setVoiceSeriesLog([]);
      return;
    }
    if (!sessionDraft.id) return;
    void loadVoiceSeriesLog(sessionDraft.id).then(setVoiceSeriesLog);
  }, [isVoiceSeriesMode, sessionDraft.id]);

  useEffect(() => {
    if (prevVoiceSeriesModeRef.current && !isVoiceSeriesMode) {
      const sid = voiceSeriesSessionIdRef.current;
      if (sid) void clearVoiceSeriesLog(sid);
      voiceSeriesSessionIdRef.current = null;
    }
    prevVoiceSeriesModeRef.current = isVoiceSeriesMode;
  }, [isVoiceSeriesMode]);

  useEffect(() => {
    if (!isRestored) return;
    const prefillId = params.voiceObservationPrefillId?.trim();
    if (!prefillId) return;
    if (appliedVoiceStarterRef.current === `obs:${prefillId}`) return;
    appliedVoiceStarterRef.current = `obs:${prefillId}`;

    consumeVoiceObservationPrefill(prefillId).then((payload) => {
      if (!payload) return;

      const match = findPlayerMatchResult(
        players,
        payload.playerNameCandidate,
        payload.playerJerseyCandidate
      );
      setVoiceObservationMatchHint(match.hint);
      setVoiceObservationQuickPickCandidates(
        match.kind === "ambiguous" ? match.candidates : []
      );
      if (match.kind === "matched") setSelectedPlayerId(match.playerId);

      const skill = toSkillTypeFromCandidate(payload.skillCandidate);
      if (skill) setSelectedSkillType(skill);

      if (payload.impactCandidate) setSelectedImpact(payload.impactCandidate);

      if (payload.noteCandidate?.trim()) {
        setNote((prev) => {
          const p = prev.trim();
          return p ? `${p}\n\n${payload.noteCandidate.trim()}` : payload.noteCandidate.trim();
        });
      }

      setVoicePrefillReview({
        playerStatusLabel:
          match.kind === "matched"
            ? match.hint
            : match.kind === "ambiguous"
              ? "Игрок: найдено несколько совпадений"
              : "Игрок: нужно выбрать вручную",
        skillStatusLabel: skill
          ? `Навык: ${SKILL_TYPE_LABELS[skill]}`
          : "Навык: нужно выбрать",
        impactStatusLabel: payload.impactCandidate
          ? `Оценка: ${payload.impactCandidate === "positive" ? "позитив" : payload.impactCandidate === "negative" ? "негатив" : "нейтрально"}`
          : "Оценка: нужно выбрать",
        noteStatusLabel: payload.noteCandidate?.trim()
          ? "Заметка: заполнено из расшифровки"
          : "Заметка: пусто",
      });

      Alert.alert(
        "Автозаполнение из голосовой заметки",
        `${match.hint}\n\nПроверьте игрока, навык и оценку перед добавлением наблюдения.`
      );
    });
  }, [isRestored, params.voiceObservationPrefillId, players]);

  const handleSaveParentDraftToServer = useCallback(async () => {
    if (
      !parentDraftVoicePayload ||
      parentDraftSubmitLockRef.current ||
      parentDraftSaveSuccessId
    ) {
      return;
    }
    const textBody =
      note.trim() ||
      formatVoiceStarterForParentDraft(parentDraftVoicePayload).trim();
    if (!textBody) {
      Alert.alert(
        "Пустой текст",
        "Добавьте текст в заметку или вернитесь к голосовой заметке."
      );
      return;
    }
    parentDraftSubmitLockRef.current = true;
    setSavingParentDraftToServer(true);
    try {
      const input: CreateParentDraftPayload = { text: textBody };
      const pid = parentDraftVoicePayload.context?.playerId?.trim();
      if (pid) input.playerId = pid;
      const vid = parentDraftVoicePayload.originVoiceNoteId?.trim();
      if (vid) input.voiceNoteId = vid;
      const res = await createParentDraft(input);
      if (!res.ok) {
        Alert.alert("Не удалось сохранить", res.error);
        return;
      }
      const voiceNoteId = parentDraftVoicePayload.originVoiceNoteId?.trim();
      if (voiceNoteId) {
        await markVoiceCreationForNote(voiceNoteId, "parent_draft");
      }
      coachHapticSuccess();
      setParentDraftSaveSuccessId(res.data.id);
      setParentDraftSaveSuccessPlayerId(pid || null);
      setParentDraftVoicePayload(null);
    } finally {
      parentDraftSubmitLockRef.current = false;
      setSavingParentDraftToServer(false);
    }
  }, [note, parentDraftVoicePayload, parentDraftSaveSuccessId]);

  const handleDismissParentDraftComposer = useCallback(() => {
    setParentDraftVoicePayload(null);
    setParentDraftSaveSuccessId(null);
    setParentDraftSaveSuccessPlayerId(null);
    setParentDraftDuplicateHint(false);
    setParentDraftCompletionDismissed(false);
    setParentDraftCopyFeedback(false);
  }, []);

  const handleContinueStarterIntake = useCallback(() => {
    setStarterIntakePayload(null);
    setStarterIntakeHint(null);
  }, []);

  const handleCopyParentDraftResolved = useCallback(async () => {
    if (!parentDraftResolvedText) return;
    await Clipboard.setStringAsync(parentDraftResolvedText);
    coachHapticSelection();
    if (parentDraftCopyFeedbackTimerRef.current) {
      clearTimeout(parentDraftCopyFeedbackTimerRef.current);
    }
    setParentDraftCopyFeedback(true);
    parentDraftCopyFeedbackTimerRef.current = setTimeout(() => {
      setParentDraftCopyFeedback(false);
      parentDraftCopyFeedbackTimerRef.current = null;
    }, 2000);
  }, [parentDraftResolvedText]);

  const handleCopyActionItemResolved = useCallback(async () => {
    if (!actionItemResolvedText) return;
    await Clipboard.setStringAsync(actionItemResolvedText);
    coachHapticSelection();
    if (actionItemCopyFeedbackTimerRef.current) {
      clearTimeout(actionItemCopyFeedbackTimerRef.current);
    }
    setActionItemCopyFeedback(true);
    actionItemCopyFeedbackTimerRef.current = setTimeout(() => {
      setActionItemCopyFeedback(false);
      actionItemCopyFeedbackTimerRef.current = null;
    }, 2000);
  }, [actionItemResolvedText]);

  useEffect(() => {
    return () => {
      if (parentDraftCopyFeedbackTimerRef.current) {
        clearTimeout(parentDraftCopyFeedbackTimerRef.current);
      }
      if (actionItemCopyFeedbackTimerRef.current) {
        clearTimeout(actionItemCopyFeedbackTimerRef.current);
      }
    };
  }, []);

  useEffect(() => {
    if (!parentDraftVoicePayload) setParentDraftCopyFeedback(false);
  }, [parentDraftVoicePayload]);

  useEffect(() => {
    if (!actionItemVoicePayload) setActionItemCopyFeedback(false);
  }, [actionItemVoicePayload]);

  const handleClearStarterIntake = useCallback(() => {
    setStarterIntakePayload(null);
    setStarterIntakeHint(null);
    setParentDraftVoicePayload(null);
    setParentDraftSaveSuccessId(null);
    setParentDraftSaveSuccessPlayerId(null);
    setParentDraftDuplicateHint(false);
    setParentDraftCompletionDismissed(false);
    setParentDraftCopyFeedback(false);
    setActionItemVoicePayload(null);
    setActionItemCompletionDismissed(false);
    setActionItemCopyFeedback(false);
    const injected = starterInjectedTextRef.current?.trim();
    if (!injected) return;
    setNote((prev) => {
      if (!prev.trim()) return prev;
      if (prev.trim() === injected) return "";
      const suffix = `\n\n———\n\n${injected}`;
      if (prev.endsWith(suffix)) return prev.slice(0, prev.length - suffix.length).trimEnd();
      return prev;
    });
    starterInjectedTextRef.current = null;
  }, []);

  useEffect(() => {
    const voiceNoteId = parentDraftVoicePayload?.originVoiceNoteId?.trim();
    if (!voiceNoteId) {
      setParentDraftDuplicateHint(false);
      return;
    }
    let cancelled = false;
    getVoiceCreationMemoryForNote(voiceNoteId).then((memory) => {
      if (cancelled) return;
      setParentDraftDuplicateHint(Boolean(memory.parent_draft));
    });
    return () => {
      cancelled = true;
    };
  }, [parentDraftVoicePayload?.originVoiceNoteId]);

  const sessionDraftRef = useRef(sessionDraft);
  const syncingSessionIdRef = useRef<string | null>(null);
  sessionDraftRef.current = sessionDraft;

  useEffect(() => {
    const unsubscribe = navigation.addListener("beforeRemove", (e) => {
      if (!needsSessionExitGuard(sessionDraftRef.current)) return;
      e.preventDefault();
      Alert.alert(
        "Незавершённая тренировка",
        "Вы можете продолжить позже с того места, где остановились.",
        [
          {
            text: "Продолжить тренировку",
            style: "cancel",
            onPress: () => {},
          },
          {
            text: "Выйти",
            onPress: () => navigation.dispatch(e.data.action),
          },
          {
            text: "Сбросить",
            style: "destructive",
            onPress: () => {
              resetSessionDraftOnly().then(() => navigation.dispatch(e.data.action));
            },
          },
        ]
      );
    });
    return unsubscribe;
  }, [navigation]);

  const selectedPlayer = useMemo(
    () => players.find((p) => p.id === selectedPlayerId) ?? null,
    [players, selectedPlayerId]
  );

  const selectedSkills = selectedPlayerId
    ? playerDevelopmentById[selectedPlayerId] ?? null
    : null;

  const canAddObservation =
    selectedPlayerId && selectedSkillType !== null && selectedImpact !== null;

  const status: SessionStatus = sessionDraft.status;
  const isIdle = status === "idle";
  const isActive = status === "active";
  const isReview = status === "review";
  const isCompleted = status === "completed";

  const handleStartSession = () => {
    startCoachSession(DEFAULT_TEAM_ID)
      .then((res) => {
        const updated = {
          ...sessionDraftRef.current,
          id: res.sessionId,
          status: "active" as const,
          startedAt: res.startedAt ? new Date(res.startedAt).getTime() : Date.now(),
        };
        sessionDraftRef.current = updated;
        setSessionDraft(updated);
      })
      .catch((err: unknown) => {
        const isNetwork = err instanceof ApiRequestError && (err.status === 0 || err.status >= 500);
        if (isNetwork) {
          Alert.alert(
            "Сервер недоступен",
            "Сессия создана локально. Данные сохранятся при появлении связи."
          );
        }
        setSessionDraft((prev) => ({ ...prev, status: "active" }));
      });
  };

  const handleFinishSession = () => {
    setStickyPlayer(false);
    setStickySkill(false);
    setSessionDraft((prev) => ({
      ...prev,
      status: "review",
      endedAt: Date.now(),
    }));
  };

  const handleConfirmSession = () => {
    setStickyPlayer(false);
    setStickySkill(false);
    const draft = sessionDraft;
    const endedAt = draft.endedAt ?? Date.now();
    const completed: CompletedTrainingSession = {
      id: draft.id,
      title: draft.title,
      startedAt: draft.startedAt,
      endedAt,
      status: "completed",
      observations: [...draft.observations],
    };

    const newCompletedSessions = completedSessions.some((s) => s.id === completed.id)
      ? completedSessions
      : [completed, ...completedSessions];
    const newSessionDraft = { ...draft, status: "completed" as const, endedAt };
    const bundle = buildCoachSessionBundlePayload(
      completed,
      playerDevelopmentById,
      editedDrafts
    );
    const now = Date.now();
    const newFrozenSyncBundles = { ...frozenSyncBundles, [completed.id]: bundle };
    const newSessionSyncStateMap = {
      ...sessionSyncStateMap,
      [completed.id]: { state: "syncing" as const, lastAttemptAt: now },
    };

    setCompletedSessions(newCompletedSessions);
    setSessionDraft(newSessionDraft);
    setFrozenSyncBundles(newFrozenSyncBundles);
    setSessionSyncStateMap(newSessionSyncStateMap);

    saveCoachInputState({
      sessionDraft: newSessionDraft,
      playerDevelopmentById,
      completedSessions: newCompletedSessions,
      editedParentDrafts: editedDrafts,
      sessionSyncStateMap: newSessionSyncStateMap,
      frozenSyncBundles: newFrozenSyncBundles,
    }).then(() => {
      router.push("/session-review");
    });

    syncCoachSessionBundle(bundle)
      .then(() => {
        setSessionSyncStateMap((prev) => ({
          ...prev,
          [completed.id]: { state: "synced", lastSyncedAt: Date.now() },
        }));
      })
      .catch((err: Error) => {
        setSessionSyncStateMap((prev) => ({
          ...prev,
          [completed.id]: {
            state: "failed",
            lastAttemptAt: now,
            errorMessage: err?.message ?? "Ошибка синхронизации",
          },
        }));
      });
  };

  const handleStartNewSession = () => {
    setStickyPlayer(false);
    setStickySkill(false);
    setSessionDraft(createFreshSession());
    setNote("");
    setSelectedPlayerId(null);
    setSelectedSkillType(null);
    setSelectedImpact(null);
  };

  const handleRetrySyncForSession = (sessionId: string) => {
    if (syncingSessionIdRef.current) return;
    const bundle = frozenSyncBundles[sessionId];
    if (!bundle) return;
    syncingSessionIdRef.current = sessionId;
    const now = Date.now();
    setSessionSyncStateMap((prev) => ({
      ...prev,
      [sessionId]: { state: "syncing", lastAttemptAt: now },
    }));
    syncCoachSessionBundle(bundle)
      .then(() => {
        setSessionSyncStateMap((prev) => ({
          ...prev,
          [sessionId]: { state: "synced", lastSyncedAt: Date.now() },
        }));
      })
      .catch((err: Error) => {
        setSessionSyncStateMap((prev) => ({
          ...prev,
          [sessionId]: {
            state: "failed",
            lastAttemptAt: now,
            errorMessage: err?.message ?? "Ошибка синхронизации",
          },
        }));
      })
      .finally(() => {
        syncingSessionIdRef.current = null;
      });
  };

  const handleClearLocalData = () => {
    Alert.alert(
      "Очистить локальные данные",
      "Будут удалены все сессии, история и данные развития игроков. Действие необратимо.",
      [
        { text: "Отмена", style: "cancel" },
        {
          text: "Очистить",
          style: "destructive",
          onPress: async () => {
            const sidToClear = sessionDraft.id;
            if (sidToClear) await clearVoiceSeriesLog(sidToClear);
            setVoiceSeriesLog([]);
            setVoiceSeriesFinish(null);
            await clearCoachInputState();
            const defaults = getDefaultCoachInputState();
            setSessionDraft(defaults.sessionDraft);
            setPlayerDevelopmentById(defaults.playerDevelopmentById);
            setCompletedSessions(defaults.completedSessions);
            setExpandedSessionId(null);
            setEditingDraftKey(null);
            setEditedDrafts({});
            setSessionSyncStateMap({});
            setFrozenSyncBundles({});
            setNote("");
            setSelectedPlayerId(null);
            setSelectedSkillType(null);
            setSelectedImpact(null);
            setStickyPlayer(false);
            setStickySkill(false);
            setActionItemVoicePayload(null);
            setActionItemCompletionDismissed(false);
            setActionItemCopyFeedback(false);
          },
        },
      ]
    );
  };

  const handleAddObservation = (overrideImpact?: ObservationImpact) => {
    const impact = overrideImpact ?? selectedImpact;
    const canAdd =
      selectedPlayer &&
      selectedSkillType &&
      impact !== null &&
      impact !== undefined &&
      isActive;
    if (!canAdd) return;

    const obs: SessionObservation = {
      id: generateId(),
      playerId: selectedPlayer.id,
      playerName: selectedPlayer.name,
      skillType: selectedSkillType!,
      impact: impact!,
      note: note.trim() || undefined,
      createdAt: Date.now(),
    };

    setSessionDraft((prev) => ({
      ...prev,
      observations: [obs, ...prev.observations],
    }));

    setPlayerDevelopmentById((prev) => ({
      ...prev,
      [selectedPlayer.id]: applySkillUpdate(
        prev[selectedPlayer.id] ?? createDefaultPlayerSkills(),
        selectedSkillType!,
        impact!
      ),
    }));

    const fromVoicePrefill = !!voicePrefillReview;

    if (isStickyPlayer && isStickySkill) {
      setSelectedImpact(null);
    } else if (isStickyPlayer) {
      setSelectedSkillType(null);
      setSelectedImpact(null);
    } else if (isStickySkill) {
      setSelectedPlayerId(null);
      setSelectedImpact(null);
    }
    setNote("");

    if (fromVoicePrefill) {
      setVoiceRapidLoopVisible(true);
      setVoicePrefillReview(null);
      setVoiceObservationMatchHint(null);
      setVoiceObservationQuickPickCandidates([]);
    } else {
      setVoiceRapidLoopVisible(false);
    }

    if (fromVoicePrefill && isVoiceSeriesMode) {
      const seriesSid = sessionDraftRef.current.id;
      if (seriesSid) {
        const logEntry: VoiceSeriesLogEntry = {
          obsId: obs.id,
          playerId: obs.playerId,
          playerName: obs.playerName,
          skillType: obs.skillType,
          impact: obs.impact,
          notePreview: truncateForVoiceSeriesPreview(obs.note ?? ""),
          createdAt: obs.createdAt,
        };
        void appendVoiceSeriesLog(seriesSid, logEntry).then(setVoiceSeriesLog);
      }
    }

    const sid = sessionDraftRef.current.id;
    const isServerBacked = sid && !sid.startsWith("session_local_");
    if (isServerBacked) {
      const impactToScore = (i: ObservationImpact) => (i === "positive" ? 1 : i === "negative" ? -1 : 0);
      createCoachObservation({
        sessionId: sid,
        teamId: DEFAULT_TEAM_ID,
        playerId: selectedPlayer.id,
        playerName: selectedPlayer.name,
        skillKey: selectedSkillType!,
        score: impactToScore(impact!),
        noteText: note.trim() || undefined,
      }).catch(() => {
        /* fire-and-forget; local state already updated */
      });
    }
  };

  const lastObs = useMemo(
    () => getLastDraftObservation(sessionDraft),
    [sessionDraft]
  );

  const handleQuickAddObservation = useCallback(
    (
      playerId: string,
      playerName: string,
      skillType: SkillType,
      impact: ObservationImpact,
      noteText?: string
    ) => {
      const obs: SessionObservation = {
        id: generateId(),
        playerId,
        playerName,
        skillType,
        impact,
        note: noteText?.trim() || undefined,
        createdAt: Date.now(),
      };
      setSessionDraft((prev) => ({
        ...prev,
        observations: [obs, ...prev.observations],
      }));
      setPlayerDevelopmentById((prev) => ({
        ...prev,
        [playerId]: applySkillUpdate(
          prev[playerId] ?? createDefaultPlayerSkills(),
          skillType,
          impact
        ),
      }));
    },
    []
  );

  const handlePrefillSamePlayer = useCallback(() => {
    if (!lastObs) return;
    setSelectedPlayerId(lastObs.playerId);
    setSelectedSkillType(null);
    setSelectedImpact(null);
    setNote("");
  }, [lastObs]);

  const handlePrefillSameSkill = useCallback(() => {
    if (!lastObs) return;
    setSelectedSkillType(lastObs.skillType);
    setSelectedPlayerId(null);
    setSelectedImpact(null);
    setNote("");
  }, [lastObs]);

  const handleUndoLast = useCallback(() => {
    if (!lastObs || sessionDraft.observations.length === 0) return;
    const remaining = sessionDraft.observations.slice(1);
    setSessionDraft((prev) => ({ ...prev, observations: remaining }));
    setPlayerDevelopmentById(
      recalculatePlayerDevelopmentFromObservations(remaining)
    );
  }, [lastObs, sessionDraft.observations]);

  const handleEditLast = useCallback(() => {
    if (!lastObs || sessionDraft.observations.length === 0) return;
    setSelectedPlayerId(lastObs.playerId);
    setSelectedSkillType(lastObs.skillType);
    setSelectedImpact(lastObs.impact);
    setNote(lastObs.note ?? "");
    const remaining = sessionDraft.observations.slice(1);
    setSessionDraft((prev) => ({ ...prev, observations: remaining }));
    setPlayerDevelopmentById(
      recalculatePlayerDevelopmentFromObservations(remaining)
    );
  }, [lastObs, sessionDraft.observations]);
  handleEditLastForVoiceRef.current = handleEditLast;

  const handleVoiceSeriesLogEntryPress = useCallback(
    (entry: VoiceSeriesLogEntry) => {
      const observations = sessionDraft.observations;
      const idx = observations.findIndex((o) => o.id === entry.obsId);
      if (idx === -1) {
        Alert.alert(
          "Недоступно",
          "Этого наблюдения уже нет в черновике сессии. Список серии обновлён."
        );
        const sid = sessionDraft.id;
        if (sid) void loadVoiceSeriesLog(sid).then(setVoiceSeriesLog);
        return;
      }
      const obs = observations[idx];
      setSelectedPlayerId(obs.playerId);
      setSelectedSkillType(obs.skillType);
      setSelectedImpact(obs.impact);
      setNote(obs.note ?? "");
      const remaining = observations.filter((_, i) => i !== idx);
      setSessionDraft((prev) => ({ ...prev, observations: remaining }));
      setPlayerDevelopmentById(recalculatePlayerDevelopmentFromObservations(remaining));
      setVoiceRapidLoopVisible(false);
      setVoicePrefillReview(null);
      setVoiceObservationMatchHint(null);
      setVoiceObservationQuickPickCandidates([]);
      const sid = sessionDraft.id;
      if (sid) void removeVoiceSeriesLogEntry(sid, entry.obsId).then(setVoiceSeriesLog);
    },
    [sessionDraft.id, sessionDraft.observations]
  );

  const handleStartParentDraftFromSeries = useCallback(async () => {
    if (!voiceSeriesFinish) return;
    const payload = buildParentDraftStarterFromSeries(voiceSeriesFinish);
    if (!payload) {
      Alert.alert(
        "Недостаточно данных",
        "Для серии пока мало подтверждённых голосовых наблюдений. Продолжите наблюдения или создайте черновик вручную."
      );
      return;
    }
    const enriched = await enrichVoiceStarterWithAi(payload);
    const id = await saveVoiceStarterPayload(enriched);
    setVoiceSeriesFinish(null);
    router.replace(`/dev/coach-input?voiceStarterId=${encodeURIComponent(id)}`);
  }, [router, voiceSeriesFinish]);

  useEffect(() => {
    if (!isRestored) return;
    let cancelled = false;
    void (async () => {
      try {
        const raw = await AsyncStorage.getItem(VOICE_SERIES_EDIT_LAST_STORAGE_KEY);
        const payload = parseVoiceSeriesEditLastPayload(raw);
        if (cancelled) return;
        if (!payload || !isVoiceSeriesEditLastPayloadFresh(payload)) {
          if (raw) await AsyncStorage.removeItem(VOICE_SERIES_EDIT_LAST_STORAGE_KEY);
          return;
        }
        await AsyncStorage.removeItem(VOICE_SERIES_EDIT_LAST_STORAGE_KEY);
        handleEditLast();
      } catch {
        /* ignore */
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [isRestored, handleEditLast]);

  const handleQuickNoteTemplate = useCallback((template: string) => {
    setNote((prev) => {
      const trimmed = prev.trimEnd();
      if (!trimmed) return template;
      if (trimmed.endsWith(template)) return prev;
      return `${trimmed} ${template}`;
    });
  }, []);

  const quickNoteTemplatesOrdered = useMemo(() => {
    if (!selectedSkillType) return QUICK_NOTE_TEMPLATES;
    const relevant = SKILL_RELEVANT_TEMPLATES[selectedSkillType] ?? [];
    const rest = QUICK_NOTE_TEMPLATES.filter((t) => !relevant.includes(t));
    return [...relevant, ...rest];
  }, [selectedSkillType]);

  const impactLabel = (impact: ObservationImpact) => {
    if (impact === "positive") return "Позитив";
    if (impact === "negative") return "Негатив";
    return "Нейтрально";
  };

  const impactColor = (impact: ObservationImpact) => {
    if (impact === "positive") return theme.colors.success;
    if (impact === "negative") return theme.colors.error;
    return theme.colors.textSecondary;
  };

  const groupedPlayers = useMemo(
    () => groupObservationsByPlayer(sessionDraft.observations),
    [sessionDraft.observations]
  );
  const impactCounts = useMemo(
    () => countImpacts(sessionDraft.observations),
    [sessionDraft.observations]
  );
  const mostObservedSkill = useMemo(
    () => computeMostObservedSkill(sessionDraft.observations),
    [sessionDraft.observations]
  );
  const recentPlayers = useMemo(
    () => getRecentPlayersFromObservations(sessionDraft.observations),
    [sessionDraft.observations]
  );
  const recentSkills = useMemo(
    () => getRecentSkillsFromObservations(sessionDraft.observations),
    [sessionDraft.observations]
  );
  const recentCombos = useMemo(
    () => getRecentCombosFromObservations(sessionDraft.observations),
    [sessionDraft.observations]
  );
  const playerSessionStats = useMemo(() => {
    if (!selectedPlayerId || !selectedPlayer) return null;
    return getLivePlayerSessionStats(
      selectedPlayerId,
      selectedPlayer.name,
      sessionDraft.observations
    );
  }, [selectedPlayerId, selectedPlayer, sessionDraft.observations]);
  const skillSessionStats = useMemo(() => {
    if (!selectedSkillType) return null;
    return getLiveSkillSessionStats(
      selectedSkillType,
      sessionDraft.observations
    );
  }, [selectedSkillType, sessionDraft.observations]);
  const guardrailHints = useMemo(
    () =>
      getSessionGuardrailHints(
        selectedPlayerId,
        selectedSkillType,
        sessionDraft.observations
      ),
    [
      selectedPlayerId,
      selectedSkillType,
      sessionDraft.observations,
    ]
  );
  const suggestedNextAction = useMemo(
    () =>
      getSuggestedNextAction(
        status,
        selectedPlayerId,
        selectedSkillType,
        isStickyPlayer,
        isStickySkill,
        sessionDraft.observations
      ),
    [
      status,
      selectedPlayerId,
      selectedSkillType,
      isStickyPlayer,
      isStickySkill,
      sessionDraft.observations,
    ]
  );
  const teamPulse = useMemo(
    () => getLiveTeamSessionPulse(sessionDraft.observations),
    [sessionDraft.observations]
  );
  const focusQueue = useMemo(
    () => getSessionFocusQueue(players, sessionDraft.observations),
    [players, sessionDraft.observations]
  );
  const allInFocus = useMemo(
    () => allPlayersInFocus(players, sessionDraft.observations),
    [players, sessionDraft.observations]
  );
  const hudData = useMemo(
    () =>
      buildSessionHudData(
        sessionDraft.observations,
        status,
        selectedPlayer
          ? selectedPlayer.jerseyNumber
            ? `#${selectedPlayer.jerseyNumber} ${selectedPlayer.name}`
            : selectedPlayer.name
          : null,
        selectedSkillType ? SKILL_TYPE_LABELS[selectedSkillType] : null,
        isStickyPlayer,
        isStickySkill
      ),
    [
      sessionDraft.observations,
      status,
      selectedPlayer,
      selectedSkillType,
      isStickyPlayer,
      isStickySkill,
    ]
  );

  return (
    <ScreenContainer contentContainerStyle={styles.content}>
      {!isActive && (
        <Text style={styles.subtitle}>
          Запись наблюдений с тренировки
        </Text>
      )}

      {!hasPlayers ? (
        <SectionCard elevated style={styles.emptyCard}>
          <EmptyState
            title="Нет игроков"
            subtitle="Добавьте игроков на вкладке «Игроки»"
            icon="👤"
          />
        </SectionCard>
      ) : (
        <>
      {/* Live Session HUD */}
      <View style={styles.hudContainer}>
        <View style={styles.hudMainRow}>
          <Text
            style={[
              styles.hudStatus,
              !isIdle && styles.hudStatusActive,
            ]}
          >
            {hudData.statusLabel}
          </Text>
          {hudData.statusSubtitle ? (
            <Text style={styles.hudSubtitle}>{hudData.statusSubtitle}</Text>
          ) : (
            <View style={styles.hudCounts}>
              <Text style={styles.hudCountText}>
                {hudData.observationCount} наблюдений · {hudData.uniquePlayersCount} игроков
              </Text>
            </View>
          )}
        </View>
        {!hudData.statusSubtitle && (
          <>
            {(hudData.selectedPlayerLabel || hudData.selectedSkillLabel) ? (
              <Text style={styles.hudContext} numberOfLines={1}>
                {[hudData.selectedPlayerLabel, hudData.selectedSkillLabel]
                  .filter(Boolean)
                  .join(" · ")}
              </Text>
            ) : null}
            {(hudData.stickyPlayerActive || hudData.stickySkillActive) ? (
              <View style={styles.hudModesRow}>
                {hudData.stickyPlayerActive && (
                  <View style={styles.hudModeChip}>
                    <Text style={styles.hudModeChipText}>Игрок закреплён</Text>
                  </View>
                )}
                {hudData.stickySkillActive && (
                  <View style={styles.hudModeChip}>
                    <Text style={styles.hudModeChipText}>Навык закреплён</Text>
                  </View>
                )}
              </View>
            ) : null}
            {isActive && sessionDraft.startedAt ? (
              <Text style={styles.hudTime}>
                Начало {formatTime(sessionDraft.startedAt)}
              </Text>
            ) : null}
            {isReview && sessionDraft.endedAt && sessionDraft.startedAt ? (
              <Text style={styles.hudTime}>
                {formatDuration(sessionDraft.startedAt, sessionDraft.endedAt)}
              </Text>
            ) : null}
          </>
        )}
      </View>

      {(isIdle || isActive) && (
        <View style={styles.nextActionContainer}>
          <Text style={styles.nextActionTitle}>Действие</Text>
          <Text
            style={[
              styles.nextActionLabel,
              suggestedNextAction.tone === "action" && styles.nextActionLabelAction,
              suggestedNextAction.tone === "note" && styles.nextActionLabelNote,
            ]}
          >
            {suggestedNextAction.label}
          </Text>
        </View>
      )}

      {isActive && (
        <View style={styles.teamPulseContainer}>
          <Text style={styles.teamPulseTitle}>Пульс</Text>
          {teamPulse.total > 0 ? (
            <>
              <View style={styles.teamPulseRow}>
                <Text style={styles.teamPulseCount}>
                  {teamPulse.total} {pluralObservation(teamPulse.total)}
                </Text>
                <Text style={styles.teamPulseCount}>
                  {teamPulse.uniquePlayers} {pluralPlayerNom(teamPulse.uniquePlayers)}
                </Text>
              </View>
              <View style={styles.playerStatsBreakdown}>
                <Text style={[styles.playerStatsImpact, { color: theme.colors.success }]}>
                  +{teamPulse.positive}
                </Text>
                <Text style={[styles.playerStatsImpact, { color: theme.colors.textSecondary }]}>
                  {teamPulse.neutral}
                </Text>
                <Text style={[styles.playerStatsImpact, { color: theme.colors.error }]}>
                  −{teamPulse.negative}
                </Text>
              </View>
              {(teamPulse.topSkills.length > 0 || teamPulse.topPlayers.length > 0) && (
                <Text style={styles.teamPulseTop} numberOfLines={1}>
                  {[
                    teamPulse.topSkills.map((s) => SKILL_TYPE_LABELS[s]).join(", "),
                    teamPulse.topPlayers
                      .map((p) => {
                        const full = players.find((fp) => fp.id === p.playerId);
                        return full?.jerseyNumber ? `#${full.jerseyNumber} ${p.playerName}` : p.playerName;
                      })
                      .join(", "),
                  ]
                    .filter(Boolean)
                    .join(" · ")}
                </Text>
              )}
            </>
          ) : null}
          <Text style={styles.playerStatsSummary}>
            {teamPulse.summaryLine}
          </Text>
        </View>
      )}

      {isActive && hasPlayers && (
        <View style={styles.focusQueueContainer}>
          <Text style={styles.focusQueueTitle}>В фокусе</Text>
          {focusQueue.length > 0 ? (
            <View style={styles.focusQueueList}>
              {focusQueue.map((item) => (
                <Pressable
                  key={item.playerId}
                  onPress={() => setSelectedPlayerId(item.playerId)}
                  style={({ pressed }) => [
                    styles.focusQueueItem,
                    item.status === "none" && styles.focusQueueItemNone,
                    selectedPlayerId === item.playerId && styles.focusQueueItemSelected,
                    pressed && styles.chipPressed,
                  ]}
                >
                  <Text
                    style={[
                      styles.focusQueueItemName,
                      item.status === "none" && styles.focusQueueItemNameHighlight,
                      selectedPlayerId === item.playerId && styles.chipTextSelected,
                    ]}
                    numberOfLines={1}
                  >
                    {item.jerseyNumber ? `#${item.jerseyNumber} ${item.playerName}` : item.playerName}
                  </Text>
                  <Text
                    style={[
                      styles.focusQueueItemStatus,
                      item.status === "none" && styles.focusQueueItemStatusHighlight,
                    ]}
                  >
                    {item.statusLabel}
                  </Text>
                </Pressable>
              ))}
            </View>
          ) : allInFocus ? (
            <Text style={styles.focusQueueEmpty}>
              Все в фокусе
            </Text>
          ) : null}
        </View>
      )}

      {/* Idle state */}
      {isIdle && (
        <>
          <SectionCard elevated style={styles.idleCard}>
          <EmptyState
            title="Готовы"
            subtitle="Нажмите «Начать сессию»"
            icon="▶"
          />
          </SectionCard>
          <PrimaryButton
            title="Начать сессию"
            onPress={handleStartSession}
            style={styles.ctaBtn}
          />
        </>
      )}

      {/* Active state — input controls */}
      {isActive && (
        <>
          <DashboardSection title="Игрок" compact>
            <SectionCard elevated>
              <View style={styles.chipRow}>
                {players.map((p) => {
                  const isSelected = selectedPlayerId === p.id;
                  return (
                    <Pressable
                      key={p.id}
                      onPress={() => setSelectedPlayerId(p.id)}
                      style={({ pressed }) => [
                        styles.chip,
                        isSelected && styles.chipSelected,
                        pressed && styles.chipPressed,
                      ]}
                    >
                      <Text
                        style={[
                          styles.chipText,
                          isSelected && styles.chipTextSelected,
                        ]}
                        numberOfLines={1}
                      >
                        {p.jerseyNumber ? `#${p.jerseyNumber} ${p.name}` : p.name}
                      </Text>
                    </Pressable>
                  );
                })}
              </View>
              <View style={styles.stickyRow}>
                <Text
                  style={[
                    styles.stickyLabel,
                    !selectedPlayerId && styles.stickyLabelDisabled,
                  ]}
                >
                  Закрепить
                </Text>
                <Switch
                  value={isStickyPlayer}
                  onValueChange={(v) => {
                    coachHapticSelection();
                    setStickyPlayer(v);
                  }}
                  disabled={!selectedPlayerId}
                  trackColor={{
                    false: theme.colors.border,
                    true: theme.colors.primaryMuted,
                  }}
                  thumbColor={
                    isStickyPlayer ? theme.colors.primary : theme.colors.textMuted
                  }
                />
              </View>
              {isStickyPlayer && selectedPlayer && (
                <View style={styles.stickyIndicator}>
                  <Text style={styles.stickyIndicatorText}>
                    {selectedPlayer.jerseyNumber ? `#${selectedPlayer.jerseyNumber} ` : ""}{selectedPlayer.name}
                  </Text>
                </View>
              )}
              {voiceObservationMatchHint ? (
                <Text style={styles.voicePrefillHint}>{voiceObservationMatchHint}</Text>
              ) : null}
              {voiceObservationQuickPickCandidates.length > 0 ? (
                <View style={styles.voiceQuickPickWrap}>
                  <Text style={styles.voiceQuickPickTitle}>
                    Возможно, это один из игроков:
                  </Text>
                  <View style={styles.chipRow}>
                    {voiceObservationQuickPickCandidates.map((c) => {
                      const isSelected = selectedPlayerId === c.id;
                      return (
                        <Pressable
                          key={c.id}
                          onPress={() => setSelectedPlayerId(c.id)}
                          style={({ pressed }) => [
                            styles.chip,
                            isSelected && styles.chipSelected,
                            pressed && styles.chipPressed,
                          ]}
                        >
                          <Text
                            style={[
                              styles.chipText,
                              isSelected && styles.chipTextSelected,
                            ]}
                            numberOfLines={1}
                          >
                            {c.jerseyNumber ? `#${c.jerseyNumber} ` : ""}
                            {c.name}
                          </Text>
                        </Pressable>
                      );
                    })}
                  </View>
                </View>
              ) : null}
            </SectionCard>
          </DashboardSection>

          {playerSessionStats && (
            <DashboardSection title="По игроку" compact>
              <SectionCard elevated>
                <View style={styles.playerStatsRow}>
                  <Text style={styles.playerStatsName}>
                    {selectedPlayer?.jerseyNumber ? `#${selectedPlayer.jerseyNumber} ` : ""}
                    {playerSessionStats.playerName}
                  </Text>
                  <Text style={styles.playerStatsCount}>
                    {playerSessionStats.total} {pluralObservation(playerSessionStats.total)}
                  </Text>
                </View>
                {playerSessionStats.total > 0 ? (
                  <>
                    <View style={styles.playerStatsBreakdown}>
                      <Text style={[styles.playerStatsImpact, { color: theme.colors.success }]}>
                        +{playerSessionStats.positive}
                      </Text>
                      <Text style={[styles.playerStatsImpact, { color: theme.colors.textSecondary }]}>
                        {playerSessionStats.neutral}
                      </Text>
                      <Text style={[styles.playerStatsImpact, { color: theme.colors.error }]}>
                        −{playerSessionStats.negative}
                      </Text>
                    </View>
                    {playerSessionStats.skillsNoted.length > 0 && (
                      <Text style={styles.playerStatsSkills}>
                        {playerSessionStats.skillsNoted
                          .map((s) => SKILL_TYPE_LABELS[s])
                          .join(" · ")}
                      </Text>
                    )}
                  </>
                ) : null}
                <Text style={styles.playerStatsSummary}>
                  {playerSessionStats.summaryLine}
                </Text>
              </SectionCard>
            </DashboardSection>
          )}

          {recentPlayers.length > 0 && (
            <DashboardSection title="Недавние игроки" compact>
              <SectionCard elevated>
                <View style={styles.chipRow}>
                  {recentPlayers.map((rp) => {
                    const fullPlayer = players.find((p) => p.id === rp.playerId);
                    const displayName = fullPlayer
                      ? fullPlayer.jerseyNumber
                        ? `#${fullPlayer.jerseyNumber} ${fullPlayer.name}`
                        : fullPlayer.name
                      : rp.playerName;
                    const isSelected = selectedPlayerId === rp.playerId;
                    return (
                      <Pressable
                        key={rp.playerId}
                        onPress={() => setSelectedPlayerId(rp.playerId)}
                        style={({ pressed }) => [
                          styles.chip,
                          isSelected && styles.chipSelected,
                          pressed && styles.chipPressed,
                        ]}
                      >
                        <Text
                          style={[
                            styles.chipText,
                            isSelected && styles.chipTextSelected,
                          ]}
                          numberOfLines={1}
                        >
                          {displayName}
                        </Text>
                      </Pressable>
                    );
                  })}
                </View>
              </SectionCard>
            </DashboardSection>
          )}

          <DashboardSection title="Навык" compact>
            <SectionCard elevated>
              <View style={styles.chipRow}>
                {(Object.keys(SKILL_TYPE_LABELS) as SkillType[]).map((st) => {
                  const isSelected = selectedSkillType === st;
                  return (
                    <Pressable
                      key={st}
                      onPress={() => setSelectedSkillType(st)}
                      style={({ pressed }) => [
                        styles.chip,
                        isSelected && styles.chipSelected,
                        pressed && styles.chipPressed,
                      ]}
                    >
                      <Text
                        style={[
                          styles.chipText,
                          isSelected && styles.chipTextSelected,
                        ]}
                      >
                        {SKILL_TYPE_LABELS[st]}
                      </Text>
                    </Pressable>
                  );
                })}
              </View>
              <View style={styles.stickyRow}>
                <Text
                  style={[
                    styles.stickyLabel,
                    !selectedSkillType && styles.stickyLabelDisabled,
                  ]}
                >
                  Закрепить
                </Text>
                <Switch
                  value={isStickySkill}
                  onValueChange={(v) => {
                    coachHapticSelection();
                    setStickySkill(v);
                  }}
                  disabled={!selectedSkillType}
                  trackColor={{
                    false: theme.colors.border,
                    true: theme.colors.primaryMuted,
                  }}
                  thumbColor={
                    isStickySkill ? theme.colors.primary : theme.colors.textMuted
                  }
                />
              </View>
              {isStickySkill && selectedSkillType && (
                <View style={styles.stickyIndicator}>
                  <Text style={styles.stickyIndicatorText}>
                    {SKILL_TYPE_LABELS[selectedSkillType]}
                  </Text>
                </View>
              )}
            </SectionCard>
          </DashboardSection>

          {skillSessionStats && (
            <DashboardSection title="По навыку" compact>
              <SectionCard elevated>
                <View style={styles.playerStatsRow}>
                  <Text style={styles.playerStatsName}>
                    {SKILL_TYPE_LABELS[skillSessionStats.skillType]}
                  </Text>
                  <Text style={styles.playerStatsCount}>
                    {skillSessionStats.total} {pluralObservation(skillSessionStats.total)}
                  </Text>
                </View>
                {skillSessionStats.total > 0 ? (
                  <>
                    <Text style={styles.skillStatsPlayers}>
                      {skillSessionStats.uniquePlayers} {pluralPlayerNom(skillSessionStats.uniquePlayers)}
                    </Text>
                    <View style={styles.playerStatsBreakdown}>
                      <Text style={[styles.playerStatsImpact, { color: theme.colors.success }]}>
                        +{skillSessionStats.positive}
                      </Text>
                      <Text style={[styles.playerStatsImpact, { color: theme.colors.textSecondary }]}>
                        {skillSessionStats.neutral}
                      </Text>
                      <Text style={[styles.playerStatsImpact, { color: theme.colors.error }]}>
                        −{skillSessionStats.negative}
                      </Text>
                    </View>
                    {skillSessionStats.topPlayers.length > 0 && (
                      <Text style={styles.playerStatsSkills}>
                        {skillSessionStats.topPlayers
                          .map((p) => {
                            const full = players.find((fp) => fp.id === p.playerId);
                            return full?.jerseyNumber ? `#${full.jerseyNumber} ${p.playerName}` : p.playerName;
                          })
                          .join(" · ")}
                      </Text>
                    )}
                  </>
                ) : null}
                <Text style={styles.playerStatsSummary}>
                  {skillSessionStats.summaryLine}
                </Text>
              </SectionCard>
            </DashboardSection>
          )}

          {recentSkills.length > 0 && (
            <DashboardSection title="Недавние навыки" compact>
              <SectionCard elevated>
                <View style={styles.chipRow}>
                  {recentSkills.map((st) => {
                    const isSelected = selectedSkillType === st;
                    return (
                      <Pressable
                        key={st}
                        onPress={() => setSelectedSkillType(st)}
                        style={({ pressed }) => [
                          styles.chip,
                          isSelected && styles.chipSelected,
                          pressed && styles.chipPressed,
                        ]}
                      >
                        <Text
                          style={[
                            styles.chipText,
                            isSelected && styles.chipTextSelected,
                          ]}
                        >
                          {SKILL_TYPE_LABELS[st]}
                        </Text>
                      </Pressable>
                    );
                  })}
                </View>
              </SectionCard>
            </DashboardSection>
          )}

          {recentCombos.length > 0 && (
            <DashboardSection title="Недавние связки" compact>
              <SectionCard elevated>
                <View style={styles.chipRow}>
                  {recentCombos.map((rc) => {
                    const fullPlayer = players.find((p) => p.id === rc.playerId);
                    const playerLabel = fullPlayer
                      ? fullPlayer.jerseyNumber
                        ? `#${fullPlayer.jerseyNumber} ${fullPlayer.name}`
                        : fullPlayer.name
                      : rc.playerName;
                    const skillLabel = SKILL_TYPE_LABELS[rc.skillType];
                    const displayText = `${playerLabel} · ${skillLabel}`;
                    const isSelected =
                      selectedPlayerId === rc.playerId &&
                      selectedSkillType === rc.skillType;
                    return (
                      <Pressable
                        key={`${rc.playerId}:${rc.skillType}`}
                        onPress={() => {
                          setSelectedPlayerId(rc.playerId);
                          setSelectedSkillType(rc.skillType);
                        }}
                        style={({ pressed }) => [
                          styles.chip,
                          isSelected && styles.chipSelected,
                          pressed && styles.chipPressed,
                        ]}
                      >
                        <Text
                          style={[
                            styles.chipText,
                            isSelected && styles.chipTextSelected,
                          ]}
                          numberOfLines={1}
                        >
                          {displayText}
                        </Text>
                      </Pressable>
                    );
                  })}
                </View>
              </SectionCard>
            </DashboardSection>
          )}

          <DashboardSection title="Оценка" compact>
            <SectionCard elevated>
              <View style={styles.chipRow}>
                {IMPACT_OPTIONS.map((opt) => {
                  const isSelected = selectedImpact === opt.value;
                  return (
                    <Pressable
                      key={opt.value}
                      onPress={() => setSelectedImpact(opt.value)}
                      style={({ pressed }) => [
                        styles.chip,
                        isSelected && styles.chipSelected,
                        pressed && styles.chipPressed,
                      ]}
                    >
                      <Text
                        style={[
                          styles.chipText,
                          isSelected && styles.chipTextSelected,
                        ]}
                      >
                        {opt.label}
                      </Text>
                    </Pressable>
                  );
                })}
              </View>
            </SectionCard>
          </DashboardSection>

          {starterIntakePayload ? (
            <StaggerFadeIn preset="snappy" delay={0} revealKey={`intake_${starterIntakePayload.id}`}>
              <SectionCard elevated style={styles.starterIntakeCard}>
                <Text style={styles.starterIntakeEyebrow}>
                  {getStarterIntakeCopy(starterIntakePayload).eyebrow}
                </Text>
                <Text style={styles.starterIntakeTitle}>
                  {getStarterIntakeCopy(starterIntakePayload).title}
                </Text>

                {starterIntakeContext?.playerLabel ? (
                  <Text style={styles.starterContextRow}>Игрок: {starterIntakeContext.playerLabel}</Text>
                ) : null}
                {starterIntakeContext?.sessionLabel ? (
                  <Text style={styles.starterContextRow}>Контекст: {starterIntakeContext.sessionLabel}</Text>
                ) : null}

                <Text style={styles.starterPreviewText} numberOfLines={4}>
                  {trimStarterPreview(starterIntakePayload.transcript)}
                </Text>

                {pickStarterHighlights(starterIntakePayload).length > 0 ? (
                  <View style={styles.starterHighlightsWrap}>
                    {pickStarterHighlights(starterIntakePayload).map((line, idx) => (
                      <Text key={`${line}_${idx}`} style={styles.starterHighlightLine} numberOfLines={2}>
                        • {line}
                      </Text>
                    ))}
                  </View>
                ) : null}

                <Text style={styles.starterSecondaryHint}>
                  {getStarterIntakeCopy(starterIntakePayload).secondaryHint}
                </Text>

                <View style={styles.starterActionsRow}>
                  <PrimaryButton
                    animatedPress
                    title={getStarterIntakeCopy(starterIntakePayload).primaryCta}
                    onPress={handleContinueStarterIntake}
                    style={styles.starterActionBtn}
                  />
                  <PrimaryButton
                    animatedPress
                    title="Очистить"
                    variant="outline"
                    onPress={handleClearStarterIntake}
                    style={styles.starterActionBtn}
                  />
                </View>
              </SectionCard>
            </StaggerFadeIn>
          ) : null}

          {starterIntakeHint ? (
            <SectionCard elevated style={styles.starterHintCard}>
              <Text style={styles.starterHintText}>{starterIntakeHint}</Text>
            </SectionCard>
          ) : null}

          {parentDraftVoicePayload && parentDraftComposerDerived ? (
            <StaggerFadeIn
              style={styles.pdFlowRoot}
              preset="snappy"
              delay={0}
              revealKey={parentDraftVoicePayload.id}
            >
              <SectionCard elevated style={styles.pdHeroCard}>
                <Text style={styles.pdHeroEyebrow}>Готово к отправке (черновик)</Text>
                <Text style={styles.pdHeroTitle}>Сообщение для родителя</Text>
                <Text style={styles.pdHeroSubtitle}>
                  {parentDraftComposerDerived.hasRecapSummaryLine ||
                  parentDraftComposerDerived.isSeriesSessionHint
                    ? "Текст собран по итогам серии наблюдений — это почти готовое сообщение. Просмотрите тон и детали перед копированием или сохранением."
                    : "Заметка обработана и превращена в черновик сообщения. Просмотрите формулировки — затем можно скопировать или сохранить локально."}
                </Text>
                <View style={styles.pdHeroMetaRow}>
                  <View style={styles.pdHintPill}>
                    <Text style={styles.pdHintPillText}>
                      {parentDraftDestinationContext?.sourceHint ?? "На основе заметки"}
                    </Text>
                  </View>
                  {parentDraftVoicePayload.aiProcessed ? (
                    <View style={styles.pdAiPill}>
                      <Text style={styles.pdAiPillText}>{VOICE_AI_PILL_LABEL}</Text>
                    </View>
                  ) : null}
                </View>
              </SectionCard>

              <SectionCard elevated style={styles.pdReadOnlyCard}>
                <Text style={styles.pdBlockKicker}>Краткий контекст</Text>
                <Text style={styles.pdReadOnlyBody}>
                  {parentDraftDestinationContext?.summary ?? "Краткая выжимка пока недоступна."}
                </Text>
                {parentDraftDestinationContext?.highlights?.length ? (
                  <View style={styles.pdPreviewList}>
                    <Text style={styles.pdPreviewKicker}>Ключевые акценты</Text>
                    {parentDraftDestinationContext.highlights.map((line, i) => (
                      <Text key={`${line}_${i}`} style={styles.pdPreviewLine} numberOfLines={3}>
                        {line}
                      </Text>
                    ))}
                  </View>
                ) : null}
              </SectionCard>

              {(() => {
                const d = parentDraftComposerDerived;
                const hasMetrics =
                  d.obsCount != null ||
                  d.playerCount != null ||
                  (d.impactPlus != null && d.impactEq != null && d.impactMinus != null) ||
                  d.topSkillLabels.length > 0 ||
                  d.observationPreviews.length > 0;
                const showBlock = hasMetrics || d.hasRecapSummaryLine || d.isSeriesSessionHint;
                if (!showBlock) return null;
                return (
                  <SectionCard elevated style={styles.pdReadOnlyCard}>
                    <Text style={styles.pdBlockKicker}>На основе серии</Text>
                        {!hasMetrics && d.isSeriesSessionHint ? (
                      <Text style={styles.pdReadOnlyBody}>
                        Черновик связан с голосовой серией наблюдений. Детальная сводка недоступна —
                        опирайтесь на текст ниже.
                      </Text>
                    ) : !hasMetrics && parentDraftVoicePayload.summary?.trim() ? (
                      <Text style={styles.pdReadOnlyBody}>
                        {parentDraftVoicePayload.summary.trim()}
                      </Text>
                    ) : (
                      <>
                        {(d.obsCount != null || d.playerCount != null) && (
                          <View style={styles.pdStatRow}>
                            {d.obsCount != null ? (
                              <View style={styles.pdStatChip}>
                                <Text style={styles.pdStatValue}>{d.obsCount}</Text>
                                <Text style={styles.pdStatLabel}>
                                  {pluralObservation(d.obsCount)}
                                </Text>
                              </View>
                            ) : null}
                            {d.playerCount != null ? (
                              <View style={styles.pdStatChip}>
                                <Text style={styles.pdStatValue}>{d.playerCount}</Text>
                                <Text style={styles.pdStatLabel}>
                                  {pluralPlayerNom(d.playerCount)}
                                </Text>
                              </View>
                            ) : null}
                          </View>
                        )}
                        {d.impactPlus != null &&
                        d.impactEq != null &&
                        d.impactMinus != null ? (
                          <Text style={styles.pdImpactLine}>
                            Оценки: +{d.impactPlus} · ={d.impactEq} · −{d.impactMinus}
                          </Text>
                        ) : null}
                        {d.topSkillLabels.length > 0 ? (
                          <Text style={styles.pdSkillsLine}>
                            {d.topSkillLabels.length >= 2 ? "Фокус: " : "Навык: "}
                            {d.topSkillLabels.join(" · ")}
                          </Text>
                        ) : null}
                        {d.observationPreviews.length > 0 ? (
                          <View style={styles.pdPreviewList}>
                            <Text style={styles.pdPreviewKicker}>Фрагменты наблюдений</Text>
                            {d.observationPreviews.map((line, i) => (
                              <Text key={i} style={styles.pdPreviewLine} numberOfLines={3}>
                                {line}
                              </Text>
                            ))}
                          </View>
                        ) : null}
                      </>
                    )}
                  </SectionCard>
                );
              })()}

              <SectionCard elevated style={styles.pdPlayerCard}>
                {parentDraftVoicePayload.context?.playerId?.trim() ? (
                  <>
                    <View style={styles.pdAutoPlayerPill}>
                      <Text style={styles.pdAutoPlayerPillText}>
                        Игрок определён автоматически
                      </Text>
                    </View>
                    <Text style={styles.pdPlayerNameText}>
                      {parentDraftVoicePayload.context?.playerLabel?.trim() ||
                        parentDraftVoicePayload.context?.playerId?.trim()}
                    </Text>
                  </>
                ) : (
                  <Text style={styles.pdPlayerHelper}>
                    Игрок не выбран автоматически — проверьте получателя вручную перед сохранением.
                  </Text>
                )}
              </SectionCard>

              <SectionCard elevated style={styles.pdChecklistCard}>
                <Text style={styles.pdChecklistTitle}>Перед сохранением проверьте</Text>
                {PARENT_DRAFT_PRESAVE_CHECKS.map((item) => (
                  <Text key={item} style={styles.pdChecklistItem}>
                    • {item}
                  </Text>
                ))}
              </SectionCard>
            </StaggerFadeIn>
          ) : null}

          {showParentDraftCompletion ? (
            <StaggerFadeIn
              preset="snappy"
              delay={0}
              revealKey={`pd_done_${parentDraftVoicePayload?.id ?? "x"}`}
            >
              <SectionCard elevated style={styles.pdCompletionCard}>
                <Text style={styles.pdCompletionEyebrow}>Готово к отправке (черновик)</Text>
                <Text style={styles.pdCompletionTitle}>{VOICE_LOOP_PARENT_DRAFT_DONE_TITLE}</Text>
                <Text style={styles.pdCompletionLead}>{VOICE_LOOP_PARENT_DRAFT_DONE_LEAD}</Text>
                {parentDraftVoicePayload?.aiProcessed ? (
                  <Text style={styles.pdCompletionMetaLine}>{VOICE_AI_ACCOUNTED_LINE}</Text>
                ) : null}
                <View style={styles.pdCompletionPreviewShell}>
                  <Text style={styles.pdCompletionPreviewLabel}>Текст</Text>
                  <Text
                    style={styles.pdCompletionPreviewBody}
                    numberOfLines={6}
                    ellipsizeMode="tail"
                  >
                    {parentDraftResolvedText}
                  </Text>
                </View>
                {parentDraftCopyFeedback ? (
                  <Text style={styles.pdCompletionCopySuccess}>Скопировано</Text>
                ) : null}
                <View style={styles.pdCompletionActions}>
                  <PrimaryButton
                    animatedPress
                    title="Скопировать текст"
                    onPress={handleCopyParentDraftResolved}
                    style={styles.pdCompletionPrimaryBtn}
                  />
                  <PrimaryButton
                    animatedPress
                    title="Продолжить редактирование"
                    variant="outline"
                    onPress={() => setParentDraftCompletionDismissed(true)}
                    style={styles.pdCompletionSecondaryBtn}
                  />
                  <PressableFeedback
                    style={styles.pdCompletionBackLink}
                    onPress={() => {
                      if (navigation.canGoBack()) {
                        navigation.goBack();
                      }
                    }}
                  >
                    <Text style={styles.pdCompletionBackLinkTitle}>Вернуться к диалогу</Text>
                    <Text style={styles.pdCompletionBackLinkHint}>
                      Без отправки сообщения из этого экрана
                    </Text>
                  </PressableFeedback>
                </View>
              </SectionCard>
              <VoiceLoopNextStepsCard router={router} />
            </StaggerFadeIn>
          ) : null}

          {showActionItemCompletion ? (
            <StaggerFadeIn
              preset="snappy"
              delay={0}
              revealKey={`ai_done_${actionItemVoicePayload?.id ?? "x"}`}
            >
              <SectionCard elevated style={styles.pdCompletionCard}>
                <Text style={styles.pdCompletionEyebrow}>Локальный черновик</Text>
                <Text style={styles.pdCompletionTitle}>{VOICE_LOOP_ACTION_LOCAL_DONE_TITLE}</Text>
                <Text style={styles.pdCompletionLead}>{VOICE_LOOP_ACTION_LOCAL_DONE_LEAD}</Text>
                {actionItemVoicePayload?.aiProcessed ? (
                  <Text style={styles.pdCompletionMetaLine}>{VOICE_AI_ACCOUNTED_LINE}</Text>
                ) : null}
                <View style={styles.pdCompletionPreviewShell}>
                  <Text style={styles.pdCompletionPreviewLabel}>Текст</Text>
                  <Text
                    style={styles.pdCompletionPreviewBody}
                    numberOfLines={6}
                    ellipsizeMode="tail"
                  >
                    {actionItemResolvedText}
                  </Text>
                </View>
                {actionItemCopyFeedback ? (
                  <Text style={styles.pdCompletionCopySuccess}>Скопировано</Text>
                ) : null}
                <View style={styles.pdCompletionActions}>
                  <PrimaryButton
                    animatedPress
                    title="Скопировать задачу"
                    onPress={handleCopyActionItemResolved}
                    style={styles.pdCompletionPrimaryBtn}
                  />
                  <PrimaryButton
                    animatedPress
                    title="Продолжить редактирование"
                    variant="outline"
                    onPress={() => setActionItemCompletionDismissed(true)}
                    style={styles.pdCompletionSecondaryBtn}
                  />
                  <PressableFeedback
                    style={styles.pdCompletionBackLink}
                    onPress={() => {
                      if (navigation.canGoBack()) {
                        navigation.goBack();
                      }
                    }}
                  >
                    <Text style={styles.pdCompletionBackLinkTitle}>Вернуться к диалогу</Text>
                    <Text style={styles.pdCompletionBackLinkHint}>
                      Без создания задачи на сервере
                    </Text>
                  </PressableFeedback>
                </View>
              </SectionCard>
              <VoiceLoopNextStepsCard router={router} />
            </StaggerFadeIn>
          ) : null}

          <DashboardSection title={parentDraftVoicePayload ? "Текст сообщения" : "Заметка"}>
            <SectionCard elevated>
              {parentDraftVoicePayload ? (
                <View style={styles.pdComposerFieldHeader}>
                  <Text style={styles.pdComposerLabel}>Черновик для родителя</Text>
                  <Text style={styles.pdComposerHelper}>
                    {parentDraftStarterPresent
                      ? "Ниже — черновик на основе итогов серии. Отредактируйте при необходимости."
                      : "Текст можно набрать вручную. При необходимости вернитесь к голосовой заметке и повторите подготовку."}
                  </Text>
                </View>
              ) : null}
              {!voiceNote.isAvailable && (
                <Text style={styles.voiceDevUnsupported}>
                  Голосовой ввод недоступен в Expo Go
                </Text>
              )}
              {voiceNote.isAvailable && (
                <View style={styles.localeRow}>
                  <Text style={styles.localeLabel}>Голос:</Text>
                  {SUPPORTED_VOICE_LOCALES.map((loc) => {
                    const isSelected = voiceLocale === loc;
                    const label = loc === "ru-RU" ? "RU" : "EN";
                    return (
                      <Pressable
                        key={loc}
                        onPress={() => handleVoiceLocaleChange(loc)}
                        style={({ pressed }) => [
                          styles.localeChip,
                          isSelected && styles.localeChipSelected,
                          pressed && styles.chipPressed,
                        ]}
                      >
                        <Text
                          style={[
                            styles.localeChipText,
                            isSelected && styles.localeChipTextSelected,
                          ]}
                        >
                          {label}
                        </Text>
                      </Pressable>
                    );
                  })}
                </View>
              )}
              {isVoiceSeriesMode && voiceNote.isAvailable ? (
                <Text style={styles.voiceHandsFreeHint}>
                  Серия: после «Наблюдение добавлено» скажите у поля заметки одну короткую фразу:
                  дальше, исправить, выйти. Пока открыта проверка автозаполнения из голоса
                  распознаётся только «выйти» из серии. Наблюдение по-прежнему только кнопкой.
                </Text>
              ) : null}
              <View
                style={[
                  styles.noteRow,
                  parentDraftVoicePayload ? styles.noteRowComposer : null,
                ]}
              >
                <TextInput
                  style={[
                    styles.noteInput,
                    parentDraftVoicePayload ? styles.noteInputComposer : null,
                  ]}
                  placeholder={
                    parentDraftVoicePayload
                      ? "Текст сообщения родителю…"
                      : "Текст заметки"
                  }
                  placeholderTextColor={theme.colors.textMuted}
                  value={note}
                  onChangeText={setNote}
                  editable={voiceNote.state !== "listening"}
                  multiline={Boolean(parentDraftVoicePayload)}
                />
                {voiceNote.isAvailable && (
                  <View style={styles.noteVoiceRow}>
                    {__DEV__ && (
                      <Text style={styles.voiceDevHint}>
                        {voiceNote.state} · {voiceNote.voiceLocale}
                      </Text>
                    )}
                    {(voiceNote.state === "listening" || voiceNote.state === "processing") ? (
                      <>
                        <Text style={styles.voiceStatusText}>
                          {voiceNote.state === "listening" ? "Слушаю…" : "Обработка…"}
                        </Text>
                        <Pressable
                          onPress={voiceNote.cancelListening}
                          style={({ pressed }) => [
                            styles.voiceBtn,
                            styles.voiceBtnCancel,
                            pressed && styles.chipPressed,
                          ]}
                        >
                          <Text style={styles.voiceBtnText}>Отмена</Text>
                        </Pressable>
                        {voiceNote.state === "listening" && (
                          <Pressable
                            onPress={voiceNote.stopListening}
                            style={({ pressed }) => [
                              styles.voiceBtn,
                              pressed && styles.chipPressed,
                            ]}
                          >
                            <SymbolView
                              name="stop.fill"
                              size={20}
                              tintColor={theme.colors.text}
                            />
                          </Pressable>
                        )}
                      </>
                    ) : voiceNote.state === "error" ? (
                      <>
                        <Text style={styles.voiceErrorText} numberOfLines={1}>
                          {voiceNote.errorMessage ?? "Voice failed"}
                        </Text>
                        <Pressable
                          onPress={voiceNote.clearError}
                          style={({ pressed }) => [
                            styles.voiceBtn,
                            styles.voiceBtnCancel,
                            pressed && styles.chipPressed,
                          ]}
                        >
                          <Text style={styles.voiceBtnText}>Закрыть</Text>
                        </Pressable>
                      </>
                    ) : (
                      <Pressable
                        onPress={voiceNote.startListening}
                        style={({ pressed }) => [
                          styles.voiceBtn,
                          pressed && styles.chipPressed,
                        ]}
                      >
                        <SymbolView
                          name="mic.fill"
                          size={22}
                          tintColor={theme.colors.primary}
                        />
                      </Pressable>
                    )}
                  </View>
                )}
              </View>
              <View style={styles.quickNoteTemplatesRow}>
                <Text style={styles.quickNoteTemplatesLabel}>Шаблоны</Text>
                <View style={styles.chipRow}>
                  {quickNoteTemplatesOrdered.map((tpl) => (
                    <Pressable
                      key={tpl}
                      onPress={() => handleQuickNoteTemplate(tpl)}
                      style={({ pressed }) => [
                        styles.quickNoteChip,
                        pressed && styles.chipPressed,
                      ]}
                    >
                      <Text style={styles.quickNoteChipText}>{tpl}</Text>
                    </Pressable>
                  ))}
                </View>
              </View>
            </SectionCard>
          </DashboardSection>

          {voicePrefillReview ? (
            <DashboardSection title="Проверка перед подтверждением" compact>
              <SectionCard elevated style={styles.voiceReviewCard}>
                <Text style={styles.voiceReviewTitle}>Распознано из голосовой заметки</Text>
                <View style={styles.voiceReviewList}>
                  <Text style={styles.voiceReviewItem}>• {voicePrefillReview.playerStatusLabel}</Text>
                  <Text style={styles.voiceReviewItem}>• {voicePrefillReview.skillStatusLabel}</Text>
                  <Text style={styles.voiceReviewItem}>• {voicePrefillReview.impactStatusLabel}</Text>
                  <Text style={styles.voiceReviewItem}>• {voicePrefillReview.noteStatusLabel}</Text>
                </View>
                <Text style={styles.voiceReviewHint}>
                  Проверьте поля выше и нажмите «Добавить наблюдение».
                </Text>
              </SectionCard>
            </DashboardSection>
          ) : null}

          {parentDraftVoicePayload ? (
            <DashboardSection title="Сохранение черновика" compact>
              <SectionCard elevated style={styles.pdSaveCard}>
                <Text style={styles.pdSaveHint}>
                  На сервер отправляется текст из поля выше. Если оно пустое, будет использован
                  исходный черновик из голоса.
                </Text>
                {parentDraftDuplicateHint ? (
                  <Text style={styles.pdSaveDuplicateHint}>
                    По этой заметке уже создавали черновик. Можно открыть существующий в списке или
                    сохранить новый вариант.
                  </Text>
                ) : null}
                <View style={styles.pdSaveActions}>
                  <PrimaryButton
                    animatedPress
                    title={
                      savingParentDraftToServer
                        ? "Сохранение…"
                        : parentDraftDuplicateHint
                          ? "Сохранить новый вариант"
                          : "Сохранить черновик"
                    }
                    onPress={handleSaveParentDraftToServer}
                    disabled={savingParentDraftToServer}
                    style={styles.pdSavePrimary}
                  />
                  <PrimaryButton
                    animatedPress
                    title="Закрыть без сохранения"
                    variant="outline"
                    onPress={handleDismissParentDraftComposer}
                    disabled={savingParentDraftToServer}
                    style={styles.pdSaveSecondary}
                  />
                </View>
              </SectionCard>
            </DashboardSection>
          ) : parentDraftSaveSuccessId ? (
            <DashboardSection title="Сохранение черновика" compact>
              <SectionCard elevated style={styles.pdSaveSuccessCard}>
                <Text style={styles.pdSaveSuccessTitle}>Черновик сохранён</Text>
                <Text style={styles.pdSaveSuccessHint}>
                  Подготовлено из голосовой заметки. Черновик можно открыть в списке и доработать
                  позже.
                </Text>
                <View style={styles.pdSaveActions}>
                  <PrimaryButton
                    animatedPress
                    title="К списку черновиков"
                    onPress={() => router.replace("/parent-drafts")}
                    style={styles.pdSavePrimary}
                  />
                  <PrimaryButton
                    animatedPress
                    title="Остаться здесь"
                    variant="ghost"
                    onPress={() => {
                      setParentDraftSaveSuccessId(null);
                      setParentDraftSaveSuccessPlayerId(null);
                    }}
                    style={styles.pdSaveSecondary}
                  />
                </View>
              </SectionCard>
              <SectionCard elevated style={styles.pdFollowUpCard}>
                <Text style={styles.pdFollowUpKicker}>{POST_CREATE_FOLLOW_UP_TITLE}</Text>
                <Text style={styles.pdFollowUpLead}>{POST_CREATE_FOLLOW_UP_LEAD}</Text>
                <PrimaryButton
                  animatedPress
                  title={parentDraftSaveSuccessPlayerId ? "Проверить и отправить родителю" : "Открыть черновики"}
                  onPress={() => {
                    if (parentDraftSaveSuccessPlayerId) {
                      router.push(`/player/${parentDraftSaveSuccessPlayerId}/share-report`);
                      return;
                    }
                    router.replace("/parent-drafts");
                  }}
                  style={styles.pdFollowUpBtn}
                />
                <PressableFeedback
                  style={styles.pdFollowUpLink}
                  onPress={() => router.replace("/parent-drafts")}
                >
                  <Text style={styles.pdFollowUpLinkTitle}>Открыть список черновиков</Text>
                  <Text style={styles.pdFollowUpLinkHint}>Проверить и отправить позже</Text>
                </PressableFeedback>
              </SectionCard>
            </DashboardSection>
          ) : null}

          {selectedPlayerId && selectedSkillType && (
            <DashboardSection title="Быстрая оценка" compact>
              <SectionCard elevated>
                <Text style={styles.impactTapHint}>
                  Тап = добавить
                </Text>
                <View style={styles.impactTapRow}>
                  <Pressable
                    onPress={() => handleAddObservation("positive")}
                    style={({ pressed }) => [
                      styles.impactTapBtn,
                      styles.impactTapPlus,
                      pressed && styles.chipPressed,
                    ]}
                  >
                    <Text style={styles.impactTapBtnText}>Плюс</Text>
                  </Pressable>
                  <Pressable
                    onPress={() => handleAddObservation("neutral")}
                    style={({ pressed }) => [
                      styles.impactTapBtn,
                      styles.impactTapNeut,
                      pressed && styles.chipPressed,
                    ]}
                  >
                    <Text style={styles.impactTapBtnText}>Нейтр.</Text>
                  </Pressable>
                  <Pressable
                    onPress={() => handleAddObservation("negative")}
                    style={({ pressed }) => [
                      styles.impactTapBtn,
                      styles.impactTapMinus,
                      pressed && styles.chipPressed,
                    ]}
                  >
                    <Text style={styles.impactTapBtnText}>Минус</Text>
                  </Pressable>
                </View>
              </SectionCard>
            </DashboardSection>
          )}

          <PrimaryButton
            title="Добавить наблюдение"
            onPress={() => handleAddObservation()}
            disabled={!canAddObservation}
            style={styles.addBtn}
          />

          {voiceSeriesFinish && !isVoiceSeriesMode ? (
            <SectionCard elevated style={styles.voiceSeriesFinishCard}>
              <Text style={styles.voiceSeriesFinishTitle}>Серия завершена</Text>
              <Text style={styles.voiceSeriesFinishBody}>
                {voiceSeriesFinish.count === 0
                  ? "В этой серии не было подтверждённых голосовых наблюдений из голосовых заметок."
                  : "Подтверждённые голосом наблюдения сохранены в текущей сессии. Ниже — локальный итог по серии."}
              </Text>
              {voiceSeriesFinish.recap ? (
                <View style={styles.voiceSeriesRecapBlock}>
                  <Text style={styles.voiceSeriesRecapTitle}>Итог серии</Text>
                  <Text style={styles.voiceSeriesRecapMeta}>
                    {voiceSeriesFinish.recap.total}{" "}
                    {pluralObservation(voiceSeriesFinish.recap.total)}
                    {" · "}
                    {voiceSeriesFinish.recap.uniquePlayers}{" "}
                    {pluralPlayerNom(voiceSeriesFinish.recap.uniquePlayers)}
                  </Text>
                  <View style={styles.voiceSeriesRecapChipRow}>
                    <View style={[styles.voiceSeriesRecapChip, styles.voiceSeriesRecapChipPlus]}>
                      <Text style={styles.voiceSeriesRecapChipText}>
                        +{voiceSeriesFinish.recap.impactPositive}
                      </Text>
                    </View>
                    <View style={[styles.voiceSeriesRecapChip, styles.voiceSeriesRecapChipNeut]}>
                      <Text style={styles.voiceSeriesRecapChipText}>
                        нейтр. {voiceSeriesFinish.recap.impactNeutral}
                      </Text>
                    </View>
                    <View style={[styles.voiceSeriesRecapChip, styles.voiceSeriesRecapChipMinus]}>
                      <Text style={styles.voiceSeriesRecapChipText}>
                        −{voiceSeriesFinish.recap.impactNegative}
                      </Text>
                    </View>
                  </View>
                  {voiceSeriesFinish.recap.topSkills.length > 0 ? (
                    <>
                      <Text style={styles.voiceSeriesRecapFocusLabel}>Фокус (навыки)</Text>
                      <View style={styles.voiceSeriesRecapChipRow}>
                        {voiceSeriesFinish.recap.topSkills.slice(0, 2).map((s) => (
                          <View key={s.skillKey} style={styles.voiceSeriesRecapChip}>
                            <Text style={styles.voiceSeriesRecapChipText} numberOfLines={1}>
                              {SKILL_TYPE_LABELS[s.skillKey as SkillType] ?? s.skillKey} · {s.count}
                            </Text>
                          </View>
                        ))}
                      </View>
                    </>
                  ) : null}
                </View>
              ) : null}
              {voiceSeriesFinish.uniquePlayers.length > 0 ? (
                <Text style={styles.voiceSeriesFinishPlayers} numberOfLines={4}>
                  Упомянуты: {voiceSeriesFinish.uniquePlayers.join(", ")}
                </Text>
              ) : null}
              {voiceSeriesFinish.recent.length > 0 ? (
                <>
                  <Text style={styles.voiceSeriesFinishSub}>Последние в серии:</Text>
                  {voiceSeriesFinish.recent.map((entry) => (
                    <Text
                      key={entry.obsId}
                      style={styles.voiceSeriesFinishLine}
                      numberOfLines={2}
                    >
                      • {entry.playerName} —{" "}
                      {SKILL_TYPE_LABELS[entry.skillType as SkillType] ?? entry.skillType} —{" "}
                      {impactLabel(entry.impact)}
                    </Text>
                  ))}
                </>
              ) : null}
              <Text style={styles.voiceSeriesFinishHint}>
                Дальше можно открыть «Мои материалы» и проверить, что уже создано тренером после
                серии, или продолжить работу в текущей сессии. Без автосохранения: всё подтверждено
                вручную.
              </Text>
              <PrimaryButton
                title="Подготовить сообщение родителю"
                variant="outline"
                onPress={handleStartParentDraftFromSeries}
                style={styles.voiceLoopBtn}
              />
              <PrimaryButton
                title="Продолжить запись сессии"
                variant="outline"
                onPress={() => setVoiceSeriesFinish(null)}
                style={styles.voiceLoopBtn}
              />
              <PrimaryButton
                title="Голосовые заметки"
                variant="outline"
                onPress={() => {
                  setVoiceSeriesFinish(null);
                  router.push("/voice-notes");
                }}
                style={styles.voiceLoopBtn}
              />
              <PrimaryButton
                title="Открыть «Мои материалы»"
                variant="outline"
                onPress={() => {
                  setVoiceSeriesFinish(null);
                  router.push("/created");
                }}
                style={styles.voiceLoopBtn}
              />
              <PrimaryButton
                title="Новая голосовая серия"
                onPress={() => {
                  setVoiceSeriesFinish(null);
                  router.push("/voice-note?voiceSeries=1");
                }}
                style={styles.voiceLoopBtn}
              />
            </SectionCard>
          ) : null}

          {isVoiceSeriesMode && !voiceRapidLoopVisible ? (
            <SectionCard elevated style={styles.voiceSeriesModeCard}>
              <Text style={styles.voiceSeriesModeTitle}>Серия голосовых наблюдений включена</Text>
              <Text style={styles.voiceSeriesModeHint}>
                После подтверждения можно сразу перейти к следующей голосовой заметке. Голосовые
                команды у поля заметки работают на шаге «Наблюдение добавлено» (дальше / исправить /
                выйти); при проверке автозаполнения — только «выйти».
              </Text>
              <PrimaryButton
                title="Выйти из серии"
                variant="ghost"
                onPress={exitVoiceSeriesMode}
                style={styles.voiceLoopBtn}
              />
            </SectionCard>
          ) : null}

          {isVoiceSeriesMode && voiceSeriesLog.length > 0 ? (
            <SectionCard elevated style={styles.voiceSeriesLogCard}>
              <Text style={styles.voiceSeriesLogTitle}>Добавлено в этой серии</Text>
              <Text style={styles.voiceSeriesLogSub}>
                Тап по строке — вынести в форму для правки; подтвердите снова кнопкой «Добавить
                наблюдение».
              </Text>
              {voiceSeriesLog.slice(0, 5).map((entry) => (
                <Pressable
                  key={entry.obsId}
                  onPress={() => handleVoiceSeriesLogEntryPress(entry)}
                  style={({ pressed }) => [
                    styles.voiceSeriesLogRow,
                    pressed && styles.chipPressed,
                  ]}
                >
                  <Text style={styles.voiceSeriesLogRowMain} numberOfLines={1}>
                    {entry.playerName}
                    {" · "}
                    {SKILL_TYPE_LABELS[entry.skillType as SkillType] ?? entry.skillType}
                    {" · "}
                    {impactLabel(entry.impact)}
                  </Text>
                  {entry.notePreview ? (
                    <Text style={styles.voiceSeriesLogRowNote} numberOfLines={2}>
                      {entry.notePreview}
                    </Text>
                  ) : null}
                </Pressable>
              ))}
            </SectionCard>
          ) : null}

          {voiceRapidLoopVisible ? (
            <SectionCard elevated style={styles.voiceLoopCard}>
              <Text style={styles.voiceLoopTitle}>Наблюдение добавлено</Text>
              <Text style={styles.voiceLoopHint}>
                {isVoiceSeriesMode
                  ? "Серия включена. Кнопки ниже или короткая команда у поля заметки: дальше, исправить, выйти."
                  : "Выберите следующий шаг для быстрого цикла во время тренировки."}
              </Text>
              <PrimaryButton
                title={isVoiceSeriesMode ? "Следующая голосовая заметка" : "Ещё голосовая заметка"}
                variant="outline"
                onPress={() =>
                  router.push(isVoiceSeriesMode ? "/voice-note?voiceSeries=1" : "/voice-note")
                }
                style={styles.voiceLoopBtn}
              />
              <PrimaryButton
                title="Исправить последнее"
                variant="ghost"
                onPress={() => {
                  setVoiceRapidLoopVisible(false);
                  handleEditLast();
                }}
                style={styles.voiceLoopBtn}
              />
              <PrimaryButton
                title="Продолжить вручную"
                variant="ghost"
                onPress={() => setVoiceRapidLoopVisible(false)}
                style={styles.voiceLoopBtn}
              />
              {isVoiceSeriesMode ? (
                <PrimaryButton
                  title="Выйти из серии"
                  variant="ghost"
                  onPress={exitVoiceSeriesMode}
                  style={styles.voiceLoopBtn}
                />
              ) : null}
            </SectionCard>
          ) : null}

          {guardrailHints.length > 0 && (
            <View style={styles.guardrailContainer}>
              {guardrailHints.map((hint, i) => (
                <Text key={i} style={styles.guardrailHint}>
                  {hint}
                </Text>
              ))}
            </View>
          )}

          {lastObs && (
            <DashboardSection title="Повторить" compact>
              <SectionCard elevated style={styles.quickRepeatCard}>
                <View style={styles.quickRepeatRow}>
                  <Pressable
                    onPress={() =>
                      handleQuickAddObservation(
                        lastObs.playerId,
                        lastObs.playerName,
                        lastObs.skillType,
                        lastObs.impact
                      )
                    }
                    style={({ pressed }) => [
                      styles.quickRepeatBtn,
                      styles.quickRepeatBtnPrimary,
                      pressed && styles.chipPressed,
                    ]}
                  >
                    <Text style={styles.quickRepeatBtnText}>Повторить</Text>
                  </Pressable>
                  <Pressable
                    onPress={handlePrefillSamePlayer}
                    style={({ pressed }) => [
                      styles.quickRepeatBtn,
                      pressed && styles.chipPressed,
                    ]}
                  >
                    <Text style={styles.quickRepeatBtnText}>Тот же игрок</Text>
                  </Pressable>
                  <Pressable
                    onPress={handlePrefillSameSkill}
                    style={({ pressed }) => [
                      styles.quickRepeatBtn,
                      pressed && styles.chipPressed,
                    ]}
                  >
                    <Text style={styles.quickRepeatBtnText}>Тот же навык</Text>
                  </Pressable>
                </View>
                <View style={styles.quickImpactRow}>
                  <Text style={styles.quickImpactLabel}>Оценка:</Text>
                  <Pressable
                    onPress={() =>
                      handleQuickAddObservation(
                        lastObs.playerId,
                        lastObs.playerName,
                        lastObs.skillType,
                        "positive"
                      )
                    }
                    style={({ pressed }) => [
                      styles.quickImpactBtn,
                      styles.quickImpactPlus,
                      pressed && styles.chipPressed,
                    ]}
                  >
                    <Text style={styles.quickImpactBtnText}>Плюс</Text>
                  </Pressable>
                  <Pressable
                    onPress={() =>
                      handleQuickAddObservation(
                        lastObs.playerId,
                        lastObs.playerName,
                        lastObs.skillType,
                        "neutral"
                      )
                    }
                    style={({ pressed }) => [
                      styles.quickImpactBtn,
                      styles.quickImpactNeut,
                      pressed && styles.chipPressed,
                    ]}
                  >
                    <Text style={styles.quickImpactBtnText}>Нейтр.</Text>
                  </Pressable>
                  <Pressable
                    onPress={() =>
                      handleQuickAddObservation(
                        lastObs.playerId,
                        lastObs.playerName,
                        lastObs.skillType,
                        "negative"
                      )
                    }
                    style={({ pressed }) => [
                      styles.quickImpactBtn,
                      styles.quickImpactMinus,
                      pressed && styles.chipPressed,
                    ]}
                  >
                    <Text style={styles.quickImpactBtnText}>Минус</Text>
                  </Pressable>
                </View>
                <View style={styles.undoEditRow}>
                  <Pressable
                    onPress={handleUndoLast}
                    style={({ pressed }) => [
                      styles.undoEditBtn,
                      pressed && styles.chipPressed,
                    ]}
                  >
                    <Text style={styles.undoEditBtnText}>Отменить</Text>
                  </Pressable>
                  <Pressable
                    onPress={handleEditLast}
                    style={({ pressed }) => [
                      styles.undoEditBtn,
                      pressed && styles.chipPressed,
                    ]}
                  >
                    <Text style={styles.undoEditBtnText}>Изменить</Text>
                  </Pressable>
                </View>
              </SectionCard>
            </DashboardSection>
          )}

          <DashboardSection title="Черновик" compact>
            <SectionCard elevated>
              {sessionDraft.observations.length === 0 ? (
                <EmptyState
                  title="Пока нет"
                  subtitle="Выберите игрока и навык"
                  icon="📋"
                />
              ) : (
                <View style={styles.obsList}>
                  {sessionDraft.observations.map((obs) => (
                    <View key={obs.id} style={styles.obsItem}>
                      <View style={styles.obsHeader}>
                        <Text style={styles.obsPlayer}>{obs.playerName}</Text>
                        <Text style={styles.obsTime}>
                          {formatTime(obs.createdAt)}
                        </Text>
                      </View>
                      <View style={styles.obsMeta}>
                        <Text style={styles.obsSkill}>
                          {SKILL_TYPE_LABELS[obs.skillType]}
                        </Text>
                        <Text
                          style={[
                            styles.obsImpact,
                            { color: impactColor(obs.impact) },
                          ]}
                        >
                          {impactLabel(obs.impact)}
                        </Text>
                      </View>
                      {obs.note ? (
                        <Text style={styles.obsNote} numberOfLines={2}>
                          {obs.note}
                        </Text>
                      ) : null}
                    </View>
                  ))}
                </View>
              )}
            </SectionCard>
          </DashboardSection>

          {selectedPlayer && selectedSkills ? (
            <DashboardSection title={`Навыки — ${selectedPlayer.name}`}>
              <SectionCard elevated>
                <View style={styles.skillGrid}>
                  {(Object.keys(selectedSkills) as SkillType[]).map((st) => {
                    const s = selectedSkills[st];
                    return (
                      <View key={st} style={styles.skillCard}>
                        <Text style={styles.skillName}>
                          {SKILL_TYPE_LABELS[st]}
                        </Text>
                        <Text style={styles.skillScore}>{s.score}</Text>
                        <Text style={styles.skillTrend}>{s.trend}</Text>
                        <Text style={styles.skillConf}>
                          {(s.confidence * 100).toFixed(0)}%
                        </Text>
                      </View>
                    );
                  })}
                </View>
              </SectionCard>
            </DashboardSection>
          ) : null}

          <PrimaryButton
            title="Завершить сессию"
            onPress={handleFinishSession}
            variant="outline"
            style={styles.ctaBtn}
          />
        </>
      )}

      {/* Review state */}
      {isReview && (
        <>
          <DashboardSection title="Итоги сессии">
            <SectionCard elevated>
              <View style={styles.summaryGrid}>
                <View style={styles.summaryItem}>
                  <Text style={styles.summaryValue}>
                    {sessionDraft.observations.length}
                  </Text>
                  <Text style={styles.summaryLabel}>наблюдений</Text>
                </View>
                <View style={styles.summaryItem}>
                  <Text style={styles.summaryValue}>{groupedPlayers.length}</Text>
                  <Text style={styles.summaryLabel}>игроков</Text>
                </View>
                <View style={styles.summaryItem}>
                  <Text style={styles.summaryValue}>
                    {mostObservedSkill
                      ? SKILL_TYPE_LABELS[mostObservedSkill]
                      : "—"}
                  </Text>
                  <Text style={styles.summaryLabel}>главный навык</Text>
                </View>
                <View style={styles.summaryItem}>
                  <Text style={[styles.summaryValue, { color: theme.colors.success }]}>
                    {impactCounts.positive}
                  </Text>
                  <Text style={styles.summaryLabel}>позитивных</Text>
                </View>
                <View style={styles.summaryItem}>
                  <Text style={[styles.summaryValue, { color: theme.colors.textSecondary }]}>
                    {impactCounts.neutral}
                  </Text>
                  <Text style={styles.summaryLabel}>нейтральных</Text>
                </View>
                <View style={styles.summaryItem}>
                  <Text style={[styles.summaryValue, { color: theme.colors.error }]}>
                    {impactCounts.negative}
                  </Text>
                  <Text style={styles.summaryLabel}>негативных</Text>
                </View>
              </View>
            </SectionCard>
          </DashboardSection>

          <DashboardSection title="По игрокам">
            <SectionCard elevated>
              {groupedPlayers.length === 0 ? (
                <EmptyState
                  title="Пока нет"
                  subtitle="Запишите тренировку"
                  icon="👥"
                />
              ) : (
                <View style={styles.groupedList}>
                  {groupedPlayers.map((group, idx) => (
                    <View
                      key={group.playerId}
                      style={[
                        styles.playerGroup,
                        idx === groupedPlayers.length - 1 && styles.playerGroupLast,
                      ]}
                    >
                      <Text style={styles.groupPlayerName}>
                        {group.playerName}
                      </Text>
                      <Text style={styles.groupCount}>
                        {group.observations.length} {pluralObservation(group.observations.length)}
                      </Text>
                      <Text style={styles.groupSummary}>
                        {buildPlayerSummaryText(
                          group.observations,
                          SKILL_TYPE_LABELS
                        )}
                      </Text>
                      <View style={styles.groupObsList}>
                        {group.observations.map((obs) => (
                          <View key={obs.id} style={styles.groupObsItem}>
                            <Text style={styles.groupObsSkill}>
                              {SKILL_TYPE_LABELS[obs.skillType]}
                            </Text>
                            <Text
                              style={[
                                styles.groupObsImpact,
                                { color: impactColor(obs.impact) },
                              ]}
                            >
                              {impactLabel(obs.impact)}
                            </Text>
                            {obs.note ? (
                              <Text
                                style={styles.groupObsNote}
                                numberOfLines={1}
                              >
                                {obs.note}
                              </Text>
                            ) : null}
                          </View>
                        ))}
                      </View>
                    </View>
                  ))}
                </View>
              )}
            </SectionCard>
          </DashboardSection>

          <PrimaryButton
            title="Подтвердить сессию"
            onPress={handleConfirmSession}
            style={styles.ctaBtn}
          />
        </>
      )}

      {/* Completed state */}
      {isCompleted && (() => {
        const currentSyncMeta = sessionSyncStateMap[sessionDraft.id];
        const syncState = currentSyncMeta?.state ?? "pending";
        return (
        <>
          <SectionCard elevated style={styles.completedCard}>
            <View style={styles.completedIcon}>
              <Text style={styles.completedIconText}>✓</Text>
            </View>
            <Text style={styles.completedTitle}>Сессия сохранена</Text>
            <Text style={styles.completedSubtitle}>
              {sessionDraft.observations.length} {pluralObservation(sessionDraft.observations.length)} для{" "}
              {groupedPlayers.length} {pluralPlayerGen(groupedPlayers.length)}. Сохранено локально.
            </Text>
            {syncState === "syncing" && (
              <Text style={styles.syncStatusText}>Сохранение в CRM…</Text>
            )}
            {syncState === "synced" && (
              <Text style={[styles.syncStatusText, styles.syncStatusSuccess]}>
                Синхронизировано с CRM
              </Text>
            )}
            {(syncState === "failed" || syncState === "pending") && (
              <View style={styles.syncErrorRow}>
                <Text style={styles.syncStatusError}>
                  {frozenSyncBundles[sessionDraft.id]
                    ? (syncState === "failed"
                        ? `Сохранено локально. Ошибка синхронизации. ${currentSyncMeta?.errorMessage ?? ""}`
                        : "Ожидает синхронизации")
                    : "Нет данных для синхронизации"}
                </Text>
                {frozenSyncBundles[sessionDraft.id] && (
                  <Pressable
                    onPress={() => handleRetrySyncForSession(sessionDraft.id)}
                    style={({ pressed }) => [
                      styles.retrySyncBtn,
                      pressed && styles.chipPressed,
                    ]}
                  >
                    <Text style={styles.retrySyncBtnText}>
                      {syncState === "failed" ? "Повторить" : "Синхронизировать"}
                    </Text>
                  </Pressable>
                )}
              </View>
            )}
          </SectionCard>

          <PrimaryButton
            title="Новая сессия"
            onPress={handleStartNewSession}
            style={styles.ctaBtn}
          />
        </>
        );
      })()}
        </>
      )}

      {completedSessions.length > 0 ? (
        <DashboardSection title="Прошлые сессии">
          <SectionCard elevated>
            <View style={styles.historyList}>
              {completedSessions.map((session, idx) => {
                const grouped = groupObservationsByPlayer(session.observations);
                const isExpanded = expandedSessionId === session.id;
                const isLast = idx === completedSessions.length - 1;
                return (
                  <View
                    key={session.id}
                    style={[styles.historyItem, isLast && styles.historyItemLast]}
                  >
                    <Pressable
                      onPress={() =>
                        setExpandedSessionId((prev) =>
                          prev === session.id ? null : session.id
                        )
                      }
                      style={({ pressed }) => [
                        styles.historyCard,
                        pressed && styles.chipPressed,
                      ]}
                    >
                      <View style={styles.historyCardTop}>
                        <Text style={styles.historyTitle}>{session.title}</Text>
                        <Text style={styles.historyMeta}>
                          {session.observations.length} {pluralObservation(session.observations.length)} · {grouped.length}{" "}
                          {pluralPlayerNom(grouped.length)}
                        </Text>
                      </View>
                      <Text style={styles.historyDate}>
                        {formatSessionDate(session.startedAt)}
                      </Text>
                      <Text
                        style={[
                          styles.historySyncStatus,
                          (sessionSyncStateMap[session.id]?.state ?? "pending") === "synced" &&
                            styles.historySyncStatusSynced,
                          (sessionSyncStateMap[session.id]?.state ?? "pending") === "failed" &&
                            styles.historySyncStatusFailed,
                          !frozenSyncBundles[session.id] &&
                            styles.historySyncStatusUnavailable,
                        ]}
                      >
                        {getSyncStatusLabel(
                          sessionSyncStateMap[session.id],
                          !!frozenSyncBundles[session.id]
                        )}
                      </Text>
                      <Text style={styles.historyExpand}>
                        {isExpanded ? "Нажмите, чтобы свернуть" : "Нажмите для деталей"}
                      </Text>
                    </Pressable>
                    {isExpanded ? (
                      <View style={styles.historyExpanded}>
                        <View style={styles.historySyncDetail}>
                          <Text
                            style={[
                              styles.historySyncDetailText,
                              (sessionSyncStateMap[session.id]?.state ?? "pending") === "synced" &&
                                styles.historySyncDetailSynced,
                              (sessionSyncStateMap[session.id]?.state ?? "pending") === "failed" &&
                                styles.historySyncDetailFailed,
                            ]}
                          >
                            {frozenSyncBundles[session.id]
                            ? getSyncStatusLabel(sessionSyncStateMap[session.id])
                            : (sessionSyncStateMap[session.id]?.state === "synced"
                                ? "Синхронизировано"
                                : "Нет данных для синхронизации")}
                            {(sessionSyncStateMap[session.id]?.state === "synced" &&
                              sessionSyncStateMap[session.id]?.lastSyncedAt) &&
                              ` · ${formatSessionDate(sessionSyncStateMap[session.id]!.lastSyncedAt!)}`}
                            {(sessionSyncStateMap[session.id]?.state === "failed" &&
                              sessionSyncStateMap[session.id]?.errorMessage &&
                              frozenSyncBundles[session.id]) &&
                              ` — ${sessionSyncStateMap[session.id]!.errorMessage}`}
                          </Text>
                          {frozenSyncBundles[session.id] &&
                            (sessionSyncStateMap[session.id]?.state ?? "pending") === "failed" && (
                            <Pressable
                              onPress={() => handleRetrySyncForSession(session.id)}
                              style={({ pressed }) => [
                                styles.retrySyncBtn,
                                styles.retrySyncBtnSmall,
                                pressed && styles.chipPressed,
                              ]}
                            >
                              <Text style={styles.retrySyncBtnText}>Повторить</Text>
                            </Pressable>
                          )}
                          {frozenSyncBundles[session.id] &&
                            (sessionSyncStateMap[session.id]?.state ?? "pending") === "pending" && (
                            <Pressable
                              onPress={() => handleRetrySyncForSession(session.id)}
                              style={({ pressed }) => [
                                styles.retrySyncBtn,
                                styles.retrySyncBtnSmall,
                                pressed && styles.chipPressed,
                              ]}
                            >
                              <Text style={styles.retrySyncBtnText}>Синхронизировать</Text>
                            </Pressable>
                          )}
                        </View>
                        {grouped.map((group) => (
                          <View key={group.playerId} style={styles.historyPlayerGroup}>
                            <Text style={styles.historyPlayerName}>
                              {group.playerName}
                            </Text>
                            <Text style={styles.historyGroupSummary}>
                              {buildPlayerSummaryText(
                                group.observations,
                                SKILL_TYPE_LABELS
                              )}
                            </Text>
                            <View style={styles.historyGroupObsList}>
                              {group.observations.map((obs) => (
                                <View key={obs.id} style={styles.groupObsItem}>
                                  <Text style={styles.groupObsSkill}>
                                    {SKILL_TYPE_LABELS[obs.skillType]}
                                  </Text>
                                  <Text
                                    style={[
                                      styles.groupObsImpact,
                                      { color: impactColor(obs.impact) },
                                    ]}
                                  >
                                    {impactLabel(obs.impact)}
                                  </Text>
                                  {obs.note ? (
                                    <Text
                                      style={styles.groupObsNote}
                                      numberOfLines={1}
                                    >
                                      {obs.note}
                                    </Text>
                                  ) : null}
                                </View>
                              ))}
                            </View>
                          </View>
                        ))}
                        <View style={styles.parentDraftSection}>
                          {__DEV__ ? (() => {
                            const bundle = buildCoachSessionBundlePayload(
                              session,
                              playerDevelopmentById,
                              editedDrafts
                            );
                            return (
                              <Text style={styles.syncBundleHint}>
                                Prepared sync: {bundle.session.observationCount} obs · {bundle.playerSnapshots.length} snapshots · {bundle.parentDrafts.length} drafts
                              </Text>
                            );
                          })() : null}
                          <View style={styles.parentDraftSectionHeader}>
                            <Text style={styles.parentDraftSectionTitle}>
                              Черновик для родителей
                            </Text>
                            <Pressable
                              onPress={async () => {
                                const summaries = buildParentSummariesForSession(session.observations);
                                const blocks: string[] = [];
                                for (const summary of summaries) {
                                  const key = `${session.id}_${summary.playerId}`;
                                  const edited = editedDrafts[key];
                                  const headline = edited?.headline ?? summary.headline;
                                  const message = edited?.parentMessage ?? summary.parentMessage;
                                  const lines: string[] = [
                                    summary.playerName,
                                    headline,
                                    "",
                                    message,
                                  ];
                                  if (summary.positives.length > 0) {
                                    lines.push("", "Positives:");
                                    summary.positives.forEach((p) => lines.push(`• ${p}`));
                                  }
                                  if (summary.improvementAreas.length > 0) {
                                    lines.push("", "Improvement areas:");
                                    summary.improvementAreas.forEach((p) => lines.push(`• ${p}`));
                                  }
                                  blocks.push(lines.join("\n"));
                                }
                                await Clipboard.setStringAsync(blocks.join("\n\n———\n\n"));
                                Alert.alert("Скопировано", "Текст в буфере");
                              }}
                              style={({ pressed }) => [
                                styles.parentDraftCopyAllBtn,
                                pressed && styles.chipPressed,
                              ]}
                            >
                              <Text style={styles.parentDraftCopyAllText}>
                                Копировать все черновики
                              </Text>
                            </Pressable>
                          </View>
                          {buildParentSummariesForSession(session.observations).map(
                            (summary) => {
                              const draftKey = `${session.id}_${summary.playerId}`;
                              const edited = editedDrafts[draftKey];
                              const displayHeadline = edited?.headline ?? summary.headline;
                              const displayMessage = edited?.parentMessage ?? summary.parentMessage;
                              const isEditing = editingDraftKey === draftKey;

                              const handleEdit = () => {
                                setEditBuffer({
                                  headline: displayHeadline,
                                  parentMessage: displayMessage,
                                });
                                setEditingDraftKey(draftKey);
                              };
                              const handleSave = () => {
                                setEditedDrafts((prev) => ({
                                  ...prev,
                                  [draftKey]: { headline: editBuffer.headline, parentMessage: editBuffer.parentMessage },
                                }));
                                setEditingDraftKey(null);
                              };
                              const handleCancel = () => {
                                setEditingDraftKey(null);
                              };
                              const handleCopy = async () => {
                                const lines: string[] = [
                                  summary.playerName,
                                  displayHeadline,
                                  "",
                                  displayMessage,
                                ];
                                if (summary.positives.length > 0) {
                                  lines.push("", "Positives:");
                                  summary.positives.forEach((p) => lines.push(`• ${p}`));
                                }
                                if (summary.improvementAreas.length > 0) {
                                  lines.push("", "Improvement areas:");
                                  summary.improvementAreas.forEach((p) => lines.push(`• ${p}`));
                                }
                                await Clipboard.setStringAsync(lines.join("\n"));
                                Alert.alert("Скопировано", "Текст в буфере");
                              };

                              return (
                                <View
                                  key={summary.playerId}
                                  style={styles.parentDraftCard}
                                >
                                  <Text style={styles.parentDraftPlayerName}>
                                    {summary.playerName}
                                  </Text>
                                  {isEditing ? (
                                    <>
                                      <TextInput
                                        style={styles.parentDraftInput}
                                        value={editBuffer.headline}
                                        onChangeText={(t) =>
                                          setEditBuffer((p) => ({ ...p, headline: t }))
                                        }
                                        placeholder="Заголовок"
                                        placeholderTextColor={theme.colors.textMuted}
                                      />
                                      <TextInput
                                        style={[styles.parentDraftInput, styles.parentDraftInputMultiline]}
                                        value={editBuffer.parentMessage}
                                        onChangeText={(t) =>
                                          setEditBuffer((p) => ({ ...p, parentMessage: t }))
                                        }
                                        placeholder="Сообщение родителю"
                                        placeholderTextColor={theme.colors.textMuted}
                                        multiline
                                      />
                                      <View style={styles.parentDraftActions}>
                                        <PrimaryButton
                                          title="Сохранить"
                                          onPress={handleSave}
                                          style={styles.parentDraftActionBtn}
                                        />
                                        <PrimaryButton
                                          title="Отмена"
                                          variant="outline"
                                          onPress={handleCancel}
                                          style={styles.parentDraftActionBtn}
                                        />
                                      </View>
                                    </>
                                  ) : (
                                    <>
                                      <Text style={styles.parentDraftHeadline}>
                                        {displayHeadline}
                                      </Text>
                                      <Text style={styles.parentDraftMessage}>
                                        {displayMessage}
                                      </Text>
                                      {summary.positives.length > 0 ? (
                                        <View style={styles.parentDraftList}>
                                          {summary.positives.map((p, i) => (
                                            <Text key={i} style={styles.parentDraftBullet}>
                                              • {p}
                                            </Text>
                                          ))}
                                        </View>
                                      ) : null}
                                      {summary.improvementAreas.length > 0 ? (
                                        <View style={styles.parentDraftList}>
                                          {summary.improvementAreas.map((p, i) => (
                                            <Text
                                              key={i}
                                              style={[
                                                styles.parentDraftBullet,
                                                styles.parentDraftImprovement,
                                              ]}
                                            >
                                              • {p}
                                            </Text>
                                          ))}
                                        </View>
                                      ) : null}
                                      <View style={styles.parentDraftActions}>
                                        <Pressable
                                          onPress={handleEdit}
                                          style={({ pressed }) => [
                                            styles.parentDraftLinkBtn,
                                            pressed && styles.chipPressed,
                                          ]}
                                        >
                                          <Text style={styles.parentDraftLinkText}>
                                            Редактировать
                                          </Text>
                                        </Pressable>
                                        <Pressable
                                          onPress={handleCopy}
                                          style={({ pressed }) => [
                                            styles.parentDraftLinkBtn,
                                            pressed && styles.chipPressed,
                                          ]}
                                        >
                                          <Text style={styles.parentDraftLinkText}>
                                            Копировать
                                          </Text>
                                        </Pressable>
                                      </View>
                                    </>
                                  )}
                                </View>
                              );
                            }
                          )}
                        </View>
                      </View>
                    ) : null}
                  </View>
                );
              })}
            </View>
          </SectionCard>
        </DashboardSection>
      ) : null}

      <Pressable
        onPress={handleClearLocalData}
        style={({ pressed }) => [styles.clearBtn, pressed && styles.clearBtnPressed]}
      >
        <Text style={styles.clearBtnText}>Очистить локальные данные</Text>
      </Pressable>

      <View style={styles.bottomSpacer} />
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  content: {
    paddingBottom: theme.spacing.xxl,
  },
  subtitle: {
    ...theme.typography.caption,
    color: theme.colors.textSecondary,
    marginBottom: theme.spacing.md,
  },
  hudContainer: {
    backgroundColor: theme.colors.surfaceElevated,
    borderRadius: theme.borderRadius.md,
    padding: theme.spacing.md,
    marginBottom: theme.spacing.md,
    borderWidth: 1,
    borderColor: theme.colors.border,
  },
  hudMainRow: {
    flexDirection: "row",
    alignItems: "center",
    flexWrap: "wrap",
    gap: theme.spacing.sm,
  },
  hudStatus: {
    ...theme.typography.subtitle,
    fontSize: 14,
    color: theme.colors.textSecondary,
  },
  hudStatusActive: {
    color: theme.colors.text,
    fontWeight: "600",
  },
  hudSubtitle: {
    ...theme.typography.caption,
    color: theme.colors.textMuted,
    flex: 1,
  },
  hudCounts: {},
  hudCountText: {
    ...theme.typography.caption,
    color: theme.colors.textSecondary,
  },
  hudContext: {
    ...theme.typography.caption,
    color: theme.colors.textMuted,
    marginTop: theme.spacing.xs,
  },
  hudModesRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: theme.spacing.xs,
    marginTop: theme.spacing.xs,
  },
  hudModeChip: {
    paddingHorizontal: theme.spacing.sm,
    paddingVertical: 2,
    borderRadius: theme.borderRadius.sm,
    backgroundColor: theme.colors.primaryMuted,
  },
  hudModeChipText: {
    fontSize: 11,
    fontWeight: "600",
    color: theme.colors.primary,
  },
  hudTime: {
    ...theme.typography.caption,
    color: theme.colors.textMuted,
    marginTop: theme.spacing.xs,
  },
  nextActionContainer: {
    marginBottom: theme.spacing.md,
    paddingHorizontal: theme.spacing.sm,
  },
  nextActionTitle: {
    ...theme.typography.caption,
    color: theme.colors.textMuted,
    textTransform: "uppercase",
    letterSpacing: 0.5,
    marginBottom: theme.spacing.xs,
  },
  nextActionLabel: {
    ...theme.typography.body,
    color: theme.colors.textSecondary,
  },
  nextActionLabelAction: {
    color: theme.colors.text,
    fontWeight: "500",
  },
  nextActionLabelNote: {
    color: theme.colors.textMuted,
    fontStyle: "italic",
  },
  teamPulseContainer: {
    backgroundColor: theme.colors.surfaceElevated,
    borderRadius: theme.borderRadius.md,
    padding: theme.spacing.md,
    marginBottom: theme.spacing.md,
    borderWidth: 1,
    borderColor: theme.colors.border,
  },
  teamPulseTitle: {
    ...theme.typography.caption,
    color: theme.colors.textMuted,
    textTransform: "uppercase",
    letterSpacing: 0.5,
    marginBottom: theme.spacing.xs,
  },
  teamPulseRow: {
    flexDirection: "row",
    gap: theme.spacing.md,
    marginBottom: theme.spacing.xs,
  },
  teamPulseCount: {
    ...theme.typography.caption,
    color: theme.colors.textSecondary,
  },
  teamPulseTop: {
    ...theme.typography.caption,
    color: theme.colors.textMuted,
    marginTop: theme.spacing.xs,
    marginBottom: theme.spacing.xs,
  },
  focusQueueContainer: {
    marginBottom: theme.spacing.md,
    paddingHorizontal: theme.spacing.sm,
  },
  focusQueueTitle: {
    ...theme.typography.caption,
    color: theme.colors.textMuted,
    textTransform: "uppercase",
    letterSpacing: 0.5,
    marginBottom: theme.spacing.sm,
  },
  focusQueueList: {
    gap: theme.spacing.xs,
  },
  focusQueueItem: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingVertical: theme.spacing.sm,
    paddingHorizontal: theme.spacing.md,
    borderRadius: theme.borderRadius.sm,
    backgroundColor: theme.colors.surfaceElevated,
  },
  focusQueueItemNone: {
    borderLeftWidth: 3,
    borderLeftColor: theme.colors.primary,
  },
  focusQueueItemSelected: {
    backgroundColor: theme.colors.primaryMuted,
  },
  focusQueueItemName: {
    ...theme.typography.body,
    color: theme.colors.text,
    flex: 1,
  },
  focusQueueItemNameHighlight: {
    fontWeight: "600",
  },
  focusQueueItemStatus: {
    ...theme.typography.caption,
    color: theme.colors.textMuted,
  },
  focusQueueItemStatusHighlight: {
    color: theme.colors.primary,
  },
  focusQueueEmpty: {
    ...theme.typography.caption,
    color: theme.colors.textMuted,
    fontStyle: "italic",
  },
  statusRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: theme.spacing.sm,
    marginBottom: theme.spacing.lg,
  },
  statusChip: {
    paddingHorizontal: theme.spacing.md,
    paddingVertical: theme.spacing.xs,
    borderRadius: theme.borderRadius.sm,
  },
  statusIdle: {
    backgroundColor: theme.colors.surfaceElevated,
  },
  statusActive: {
    backgroundColor: theme.colors.primaryMuted,
  },
  statusReview: {
    backgroundColor: theme.colors.accentMuted,
  },
  statusCompleted: {
    backgroundColor: theme.colors.primaryMuted,
  },
  statusChipText: {
    fontSize: 12,
    fontWeight: "600",
    letterSpacing: 0.3,
    color: theme.colors.textSecondary,
    textTransform: "uppercase",
  },
  statusChipTextHighlight: {
    color: theme.colors.primary,
  },
  sessionTime: {
    ...theme.typography.caption,
    color: theme.colors.textMuted,
  },
  emptyCard: {
    marginBottom: theme.spacing.lg,
  },
  idleCard: {
    marginBottom: theme.spacing.lg,
  },
  ctaBtn: {
    marginBottom: theme.spacing.lg,
  },
  chipRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: theme.spacing.sm,
  },
  chip: {
    paddingHorizontal: theme.spacing.md,
    paddingVertical: theme.spacing.sm,
    borderRadius: theme.borderRadius.md,
    backgroundColor: theme.colors.surfaceElevated,
  },
  chipSelected: {
    backgroundColor: theme.colors.primaryMuted,
  },
  chipPressed: {
    opacity: 0.85,
  },
  chipText: {
    ...theme.typography.subtitle,
    color: theme.colors.textSecondary,
  },
  chipTextSelected: {
    color: theme.colors.primary,
    fontWeight: "600",
  },
  stickyRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginTop: theme.spacing.md,
    paddingTop: theme.spacing.sm,
    borderTopWidth: 1,
    borderTopColor: theme.colors.border,
  },
  stickyLabel: {
    ...theme.typography.body,
    color: theme.colors.text,
  },
  stickyLabelDisabled: {
    color: theme.colors.textMuted,
  },
  stickyIndicator: {
    marginTop: theme.spacing.sm,
    paddingHorizontal: theme.spacing.sm,
    paddingVertical: theme.spacing.xs,
    backgroundColor: theme.colors.primaryMuted,
    borderRadius: theme.borderRadius.sm,
    alignSelf: "flex-start",
  },
  stickyIndicatorText: {
    ...theme.typography.caption,
    color: theme.colors.primary,
    fontWeight: "600",
  },
  voicePrefillHint: {
    ...theme.typography.caption,
    color: theme.colors.textSecondary,
    marginTop: theme.spacing.sm,
    lineHeight: 18,
  },
  voiceQuickPickWrap: {
    marginTop: theme.spacing.sm,
    paddingTop: theme.spacing.sm,
    borderTopWidth: 1,
    borderTopColor: theme.colors.border,
  },
  voiceQuickPickTitle: {
    ...theme.typography.caption,
    color: theme.colors.textMuted,
    marginBottom: theme.spacing.xs,
  },
  voiceReviewCard: {
    borderLeftWidth: 4,
    borderLeftColor: theme.colors.primary,
  },
  voiceReviewTitle: {
    ...theme.typography.subtitle,
    color: theme.colors.text,
    marginBottom: theme.spacing.sm,
  },
  voiceReviewList: {
    gap: theme.spacing.xs,
  },
  voiceReviewItem: {
    ...theme.typography.caption,
    color: theme.colors.textSecondary,
    lineHeight: 18,
  },
  voiceReviewHint: {
    ...theme.typography.caption,
    color: theme.colors.textMuted,
    marginTop: theme.spacing.sm,
    lineHeight: 18,
  },
  voiceLoopCard: {
    borderLeftWidth: 4,
    borderLeftColor: theme.colors.success,
    marginBottom: theme.spacing.sm,
  },
  voiceSeriesModeCard: {
    borderLeftWidth: 4,
    borderLeftColor: theme.colors.primary,
    marginBottom: theme.spacing.sm,
  },
  voiceSeriesModeTitle: {
    ...theme.typography.subtitle,
    color: theme.colors.text,
    marginBottom: theme.spacing.xs,
  },
  voiceSeriesModeHint: {
    ...theme.typography.caption,
    color: theme.colors.textMuted,
    marginBottom: theme.spacing.sm,
    lineHeight: 18,
  },
  voiceHandsFreeHint: {
    ...theme.typography.caption,
    color: theme.colors.textSecondary,
    marginBottom: theme.spacing.sm,
    lineHeight: 18,
  },
  voiceSeriesLogCard: {
    borderLeftWidth: 4,
    borderLeftColor: theme.colors.textMuted,
    marginBottom: theme.spacing.sm,
  },
  voiceSeriesLogTitle: {
    ...theme.typography.subtitle,
    color: theme.colors.text,
    marginBottom: theme.spacing.xs,
  },
  voiceSeriesLogSub: {
    ...theme.typography.caption,
    color: theme.colors.textMuted,
    marginBottom: theme.spacing.sm,
    lineHeight: 18,
  },
  voiceSeriesLogRow: {
    paddingVertical: theme.spacing.sm,
    paddingHorizontal: theme.spacing.xs,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: theme.colors.border,
  },
  voiceSeriesLogRowMain: {
    ...theme.typography.caption,
    color: theme.colors.text,
    fontWeight: "600",
  },
  voiceSeriesLogRowNote: {
    ...theme.typography.caption,
    color: theme.colors.textSecondary,
    marginTop: 4,
    lineHeight: 18,
  },
  voiceSeriesFinishCard: {
    borderLeftWidth: 4,
    borderLeftColor: theme.colors.primary,
    marginBottom: theme.spacing.md,
  },
  voiceSeriesFinishTitle: {
    ...theme.typography.subtitle,
    color: theme.colors.text,
    marginBottom: theme.spacing.xs,
  },
  voiceSeriesFinishBody: {
    ...theme.typography.body,
    color: theme.colors.textSecondary,
    marginBottom: theme.spacing.sm,
    lineHeight: 22,
  },
  voiceSeriesRecapBlock: {
    marginBottom: theme.spacing.md,
    paddingTop: theme.spacing.sm,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: theme.colors.border,
  },
  voiceSeriesRecapTitle: {
    ...theme.typography.subtitle,
    color: theme.colors.text,
    marginBottom: theme.spacing.xs,
  },
  voiceSeriesRecapMeta: {
    ...theme.typography.caption,
    color: theme.colors.textSecondary,
    marginBottom: theme.spacing.sm,
    lineHeight: 18,
  },
  voiceSeriesRecapChipRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: theme.spacing.xs,
    marginBottom: theme.spacing.xs,
  },
  voiceSeriesRecapChip: {
    paddingHorizontal: theme.spacing.sm,
    paddingVertical: 6,
    borderRadius: theme.borderRadius.sm,
    backgroundColor: theme.colors.primaryMuted,
    maxWidth: "100%",
  },
  voiceSeriesRecapChipPlus: {
    backgroundColor: theme.colors.primaryMuted,
  },
  voiceSeriesRecapChipNeut: {
    backgroundColor: theme.colors.surfaceElevated,
  },
  voiceSeriesRecapChipMinus: {
    backgroundColor: "rgba(255, 77, 106, 0.15)",
  },
  voiceSeriesRecapChipText: {
    ...theme.typography.caption,
    fontWeight: "600",
    color: theme.colors.text,
  },
  voiceSeriesRecapFocusLabel: {
    ...theme.typography.caption,
    color: theme.colors.textMuted,
    marginTop: theme.spacing.xs,
    marginBottom: theme.spacing.xs,
  },
  voiceSeriesFinishPlayers: {
    ...theme.typography.caption,
    color: theme.colors.text,
    marginBottom: theme.spacing.sm,
    lineHeight: 18,
    fontWeight: "600",
  },
  voiceSeriesFinishSub: {
    ...theme.typography.caption,
    color: theme.colors.textMuted,
    marginBottom: theme.spacing.xs,
  },
  voiceSeriesFinishLine: {
    ...theme.typography.caption,
    color: theme.colors.textSecondary,
    marginBottom: 4,
    lineHeight: 18,
  },
  voiceSeriesFinishHint: {
    ...theme.typography.caption,
    color: theme.colors.textMuted,
    marginTop: theme.spacing.sm,
    marginBottom: theme.spacing.sm,
    lineHeight: 18,
  },
  voiceLoopTitle: {
    ...theme.typography.subtitle,
    color: theme.colors.text,
    marginBottom: theme.spacing.xs,
  },
  voiceLoopHint: {
    ...theme.typography.caption,
    color: theme.colors.textMuted,
    marginBottom: theme.spacing.sm,
    lineHeight: 18,
  },
  voiceLoopBtn: {
    marginTop: theme.spacing.xs,
  },
  playerStatsRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: theme.spacing.xs,
  },
  playerStatsName: {
    ...theme.typography.subtitle,
    color: theme.colors.text,
  },
  playerStatsCount: {
    ...theme.typography.caption,
    color: theme.colors.textSecondary,
  },
  playerStatsBreakdown: {
    flexDirection: "row",
    gap: theme.spacing.md,
    marginBottom: theme.spacing.xs,
  },
  playerStatsImpact: {
    ...theme.typography.caption,
    fontWeight: "600",
  },
  playerStatsSkills: {
    ...theme.typography.caption,
    color: theme.colors.textMuted,
    marginBottom: theme.spacing.xs,
  },
  skillStatsPlayers: {
    ...theme.typography.caption,
    color: theme.colors.textSecondary,
    marginBottom: theme.spacing.xs,
  },
  playerStatsSummary: {
    ...theme.typography.caption,
    color: theme.colors.textSecondary,
    fontStyle: "italic",
  },
  localeRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: theme.spacing.sm,
    marginBottom: theme.spacing.sm,
  },
  localeLabel: {
    ...theme.typography.caption,
    color: theme.colors.textMuted,
    marginRight: theme.spacing.xs,
  },
  localeChip: {
    paddingHorizontal: theme.spacing.md,
    paddingVertical: theme.spacing.xs,
    borderRadius: theme.borderRadius.sm,
    backgroundColor: theme.colors.surfaceElevated,
  },
  localeChipSelected: {
    backgroundColor: theme.colors.primaryMuted,
  },
  localeChipText: {
    fontSize: 13,
    fontWeight: "500",
    color: theme.colors.textSecondary,
  },
  localeChipTextSelected: {
    color: theme.colors.primary,
    fontWeight: "600",
  },
  noteRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: theme.spacing.sm,
  },
  noteRowComposer: {
    flexDirection: "column",
    alignItems: "stretch",
  },
  quickNoteTemplatesRow: {
    marginTop: theme.spacing.md,
    paddingTop: theme.spacing.sm,
    borderTopWidth: 1,
    borderTopColor: theme.colors.border,
  },
  quickNoteTemplatesLabel: {
    ...theme.typography.caption,
    color: theme.colors.textMuted,
    marginBottom: theme.spacing.xs,
  },
  quickNoteChip: {
    paddingHorizontal: theme.spacing.sm,
    paddingVertical: theme.spacing.xs,
    borderRadius: theme.borderRadius.sm,
    backgroundColor: theme.colors.surfaceElevated,
  },
  quickNoteChipText: {
    ...theme.typography.caption,
    fontSize: 12,
    color: theme.colors.textSecondary,
  },
  noteInput: {
    ...theme.typography.body,
    color: theme.colors.text,
    minHeight: 52,
    flex: 1,
  },
  noteVoiceRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: theme.spacing.xs,
  },
  voiceBtn: {
    padding: theme.spacing.sm,
    borderRadius: theme.borderRadius.sm,
    backgroundColor: theme.colors.surfaceElevated,
  },
  voiceBtnCancel: {
    backgroundColor: theme.colors.cardBorder,
  },
  voiceBtnText: {
    ...theme.typography.caption,
    color: theme.colors.text,
    fontWeight: "500",
  },
  voiceStatusText: {
    ...theme.typography.caption,
    color: theme.colors.textSecondary,
  },
  voiceErrorText: {
    ...theme.typography.caption,
    color: theme.colors.error,
    maxWidth: 120,
  },
  voiceDevHint: {
    fontSize: 10,
    color: theme.colors.textMuted,
    marginRight: theme.spacing.xs,
  },
  voiceDevUnsupported: {
    fontSize: 11,
    color: theme.colors.textMuted,
    marginBottom: theme.spacing.xs,
    fontStyle: "italic",
  },
  pdFlowRoot: {
    marginBottom: theme.spacing.md,
    gap: theme.spacing.sm,
  },
  pdHeroCard: {
    paddingVertical: theme.spacing.md,
    paddingHorizontal: theme.spacing.md,
    borderLeftWidth: 3,
    borderLeftColor: theme.colors.primary,
    backgroundColor: theme.colors.surfaceElevated,
  },
  pdHeroEyebrow: {
    ...theme.typography.heroEyebrow,
    color: theme.colors.primary,
    marginBottom: theme.spacing.xs,
  },
  pdHeroTitle: {
    ...theme.typography.title,
    fontSize: 20,
    fontWeight: "700",
    color: theme.colors.text,
    marginBottom: theme.spacing.sm,
  },
  pdHeroSubtitle: {
    ...theme.typography.body,
    fontSize: 15,
    lineHeight: 22,
    color: theme.colors.textSecondary,
  },
  pdHeroMetaRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    alignItems: "center",
    gap: theme.spacing.sm,
    marginTop: theme.spacing.sm,
  },
  pdHintPill: {
    alignSelf: "flex-start",
    paddingVertical: 4,
    paddingHorizontal: theme.spacing.sm,
    borderRadius: theme.borderRadius.full,
    backgroundColor: theme.colors.primaryMuted,
  },
  pdHintPillText: {
    ...theme.typography.caption,
    fontSize: 11,
    fontWeight: "600",
    color: theme.colors.primary,
  },
  pdAiPill: {
    paddingVertical: 4,
    paddingHorizontal: theme.spacing.sm,
    borderRadius: theme.borderRadius.full,
    backgroundColor: theme.colors.accentMuted,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: theme.colors.border,
  },
  pdAiPillText: {
    ...theme.typography.caption,
    fontSize: 11,
    fontWeight: "600",
    color: theme.colors.accent,
  },
  pdReadOnlyCard: {
    padding: theme.spacing.md,
    backgroundColor: theme.colors.card,
    borderWidth: 1,
    borderColor: theme.colors.border,
  },
  pdBlockKicker: {
    fontSize: 11,
    fontWeight: "600",
    letterSpacing: 0.5,
    color: theme.colors.textMuted,
    textTransform: "uppercase",
    marginBottom: theme.spacing.sm,
  },
  pdReadOnlyBody: {
    ...theme.typography.body,
    fontSize: 14,
    lineHeight: 20,
    color: theme.colors.textSecondary,
  },
  pdStatRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: theme.spacing.sm,
    marginBottom: theme.spacing.sm,
  },
  pdStatChip: {
    paddingVertical: theme.spacing.xs,
    paddingHorizontal: theme.spacing.md,
    borderRadius: theme.borderRadius.md,
    backgroundColor: theme.colors.surfaceElevated,
    minWidth: 88,
  },
  pdStatValue: {
    ...theme.typography.title,
    fontSize: 20,
    color: theme.colors.text,
  },
  pdStatLabel: {
    ...theme.typography.caption,
    fontSize: 11,
    color: theme.colors.textMuted,
    marginTop: 2,
  },
  pdImpactLine: {
    ...theme.typography.body,
    fontSize: 14,
    color: theme.colors.textSecondary,
    marginBottom: theme.spacing.xs,
  },
  pdSkillsLine: {
    ...theme.typography.body,
    fontSize: 14,
    lineHeight: 20,
    color: theme.colors.text,
    marginBottom: theme.spacing.xs,
  },
  pdPreviewList: {
    marginTop: theme.spacing.sm,
    paddingTop: theme.spacing.sm,
    borderTopWidth: 1,
    borderTopColor: theme.colors.border,
  },
  pdPreviewKicker: {
    ...theme.typography.caption,
    fontSize: 12,
    color: theme.colors.textMuted,
    marginBottom: theme.spacing.xs,
  },
  pdPreviewLine: {
    ...theme.typography.caption,
    fontSize: 13,
    lineHeight: 18,
    color: theme.colors.textSecondary,
    marginBottom: theme.spacing.xs,
    paddingLeft: theme.spacing.sm,
    borderLeftWidth: 2,
    borderLeftColor: theme.colors.primaryMuted,
  },
  pdPlayerCard: {
    padding: theme.spacing.md,
  },
  pdAutoPlayerPill: {
    alignSelf: "flex-start",
    paddingVertical: 4,
    paddingHorizontal: theme.spacing.sm,
    borderRadius: theme.borderRadius.full,
    backgroundColor: theme.colors.primaryMuted,
    marginBottom: theme.spacing.sm,
  },
  pdAutoPlayerPillText: {
    ...theme.typography.caption,
    fontSize: 11,
    fontWeight: "600",
    color: theme.colors.primary,
  },
  pdPlayerNameText: {
    ...theme.typography.subtitle,
    fontSize: 17,
    color: theme.colors.text,
  },
  pdPlayerHelper: {
    ...theme.typography.body,
    fontSize: 14,
    lineHeight: 20,
    color: theme.colors.textSecondary,
  },
  pdChecklistCard: {
    padding: theme.spacing.md,
    backgroundColor: theme.colors.surfaceElevated,
  },
  pdChecklistTitle: {
    ...theme.typography.subtitle,
    fontSize: 14,
    fontWeight: "600",
    color: theme.colors.text,
    marginBottom: theme.spacing.sm,
  },
  pdChecklistItem: {
    ...theme.typography.caption,
    fontSize: 13,
    lineHeight: 20,
    color: theme.colors.textSecondary,
    marginBottom: 4,
  },
  pdCompletionCard: {
    padding: theme.spacing.md,
    backgroundColor: theme.colors.surfaceElevated,
    borderLeftWidth: 3,
    borderLeftColor: theme.colors.primaryMuted,
  },
  pdCompletionEyebrow: {
    fontSize: 11,
    fontWeight: "600",
    letterSpacing: 0.5,
    color: theme.colors.textMuted,
    textTransform: "uppercase",
    marginBottom: theme.spacing.xs,
  },
  pdCompletionTitle: {
    ...theme.typography.subtitle,
    fontSize: 17,
    fontWeight: "700",
    color: theme.colors.text,
    marginBottom: theme.spacing.xs,
  },
  pdCompletionLead: {
    ...theme.typography.caption,
    fontSize: 13,
    lineHeight: 19,
    color: theme.colors.textSecondary,
    marginBottom: theme.spacing.sm,
  },
  pdCompletionMetaLine: {
    ...theme.typography.caption,
    fontSize: 12,
    lineHeight: 18,
    color: theme.colors.accent,
    marginBottom: theme.spacing.md,
  },
  pdCompletionPreviewShell: {
    borderRadius: theme.borderRadius.md,
    backgroundColor: theme.colors.card,
    padding: theme.spacing.sm,
    marginBottom: theme.spacing.md,
    maxHeight: 132,
    overflow: "hidden",
  },
  pdCompletionPreviewLabel: {
    ...theme.typography.caption,
    fontSize: 11,
    fontWeight: "600",
    color: theme.colors.textMuted,
    marginBottom: 4,
  },
  pdCompletionPreviewBody: {
    ...theme.typography.caption,
    fontSize: 14,
    lineHeight: 21,
    color: theme.colors.textSecondary,
  },
  pdCompletionCopySuccess: {
    ...theme.typography.caption,
    fontSize: 13,
    fontWeight: "600",
    color: theme.colors.success,
    marginBottom: theme.spacing.sm,
  },
  pdCompletionActions: {
    gap: theme.spacing.sm,
  },
  pdCompletionPrimaryBtn: {
    width: "100%",
  },
  pdCompletionSecondaryBtn: {
    width: "100%",
  },
  pdCompletionBackLink: {
    paddingVertical: theme.spacing.xs,
    paddingHorizontal: theme.spacing.xs,
    alignSelf: "flex-start",
  },
  pdCompletionBackLinkTitle: {
    ...theme.typography.caption,
    fontSize: 14,
    color: theme.colors.textMuted,
  },
  pdCompletionBackLinkHint: {
    ...theme.typography.caption,
    fontSize: 12,
    color: theme.colors.textMuted,
    marginTop: 2,
    opacity: 0.85,
  },
  pdComposerFieldHeader: {
    marginBottom: theme.spacing.md,
  },
  pdComposerLabel: {
    ...theme.typography.subtitle,
    fontSize: 15,
    fontWeight: "600",
    color: theme.colors.text,
    marginBottom: theme.spacing.xs,
  },
  pdComposerHelper: {
    ...theme.typography.caption,
    fontSize: 13,
    lineHeight: 18,
    color: theme.colors.textMuted,
  },
  noteInputComposer: {
    minHeight: 160,
    paddingVertical: theme.spacing.md,
    textAlignVertical: "top",
  },
  pdSaveCard: {
    padding: theme.spacing.md,
  },
  pdSaveSuccessCard: {
    padding: theme.spacing.md,
    backgroundColor: theme.colors.surfaceElevated,
    borderLeftWidth: 3,
    borderLeftColor: theme.colors.success,
  },
  pdSaveSuccessTitle: {
    ...theme.typography.subtitle,
    fontSize: 16,
    fontWeight: "700",
    color: theme.colors.text,
    marginBottom: theme.spacing.xs,
  },
  pdSaveSuccessHint: {
    ...theme.typography.caption,
    fontSize: 13,
    lineHeight: 19,
    color: theme.colors.textSecondary,
    marginBottom: theme.spacing.md,
  },
  pdFollowUpCard: {
    marginTop: theme.spacing.sm,
    padding: theme.spacing.md,
    borderLeftWidth: 3,
    borderLeftColor: theme.colors.border,
    backgroundColor: theme.colors.card,
  },
  pdFollowUpKicker: {
    fontSize: 11,
    fontWeight: "600",
    letterSpacing: 0.5,
    color: theme.colors.textMuted,
    textTransform: "uppercase",
    marginBottom: theme.spacing.xs,
  },
  pdFollowUpLead: {
    ...theme.typography.caption,
    fontSize: 13,
    lineHeight: 18,
    color: theme.colors.textSecondary,
    marginBottom: theme.spacing.md,
  },
  pdFollowUpBtn: {
    width: "100%",
    marginBottom: theme.spacing.sm,
  },
  pdFollowUpLink: {
    paddingVertical: theme.spacing.sm,
    paddingHorizontal: theme.spacing.xs,
  },
  pdFollowUpLinkTitle: {
    ...theme.typography.subtitle,
    fontSize: 15,
    color: theme.colors.text,
  },
  pdFollowUpLinkHint: {
    ...theme.typography.caption,
    fontSize: 12,
    color: theme.colors.textMuted,
    marginTop: 2,
  },
  pdSaveHint: {
    ...theme.typography.caption,
    fontSize: 13,
    lineHeight: 19,
    color: theme.colors.textSecondary,
    marginBottom: theme.spacing.md,
  },
  pdSaveDuplicateHint: {
    ...theme.typography.caption,
    fontSize: 13,
    lineHeight: 18,
    color: theme.colors.textMuted,
    marginBottom: theme.spacing.md,
  },
  pdSaveActions: {
    gap: theme.spacing.sm,
  },
  pdSavePrimary: {
    width: "100%",
  },
  pdSaveSecondary: {
    width: "100%",
  },
  addBtn: {
    marginBottom: theme.spacing.lg,
  },
  guardrailContainer: {
    marginBottom: theme.spacing.lg,
    paddingHorizontal: theme.spacing.sm,
    gap: theme.spacing.xs,
  },
  guardrailHint: {
    ...theme.typography.caption,
    color: theme.colors.textMuted,
  },
  impactTapHint: {
    ...theme.typography.caption,
    color: theme.colors.textMuted,
    marginBottom: theme.spacing.sm,
  },
  impactTapRow: {
    flexDirection: "row",
    gap: theme.spacing.sm,
  },
  impactTapBtn: {
    flex: 1,
    paddingVertical: theme.spacing.lg,
    borderRadius: theme.borderRadius.md,
    alignItems: "center",
    justifyContent: "center",
  },
  impactTapPlus: {
    backgroundColor: theme.colors.primaryMuted,
  },
  impactTapNeut: {
    backgroundColor: theme.colors.surfaceElevated,
  },
  impactTapMinus: {
    backgroundColor: "rgba(255, 77, 106, 0.15)",
  },
  impactTapBtnText: {
    ...theme.typography.subtitle,
    fontWeight: "700",
    color: theme.colors.text,
  },
  quickRepeatCard: {
    padding: theme.spacing.md,
  },
  quickRepeatRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: theme.spacing.sm,
    marginBottom: theme.spacing.sm,
  },
  quickRepeatBtn: {
    paddingHorizontal: theme.spacing.md,
    paddingVertical: theme.spacing.sm,
    borderRadius: theme.borderRadius.sm,
    backgroundColor: theme.colors.card,
    borderWidth: 1,
    borderColor: theme.colors.cardBorder,
  },
  quickRepeatBtnPrimary: {
    backgroundColor: theme.colors.primaryMuted,
    borderColor: theme.colors.primary,
  },
  quickRepeatBtnText: {
    ...theme.typography.caption,
    color: theme.colors.text,
    fontWeight: "600",
  },
  quickImpactRow: {
    flexDirection: "row",
    alignItems: "center",
    flexWrap: "wrap",
    gap: theme.spacing.sm,
  },
  quickImpactLabel: {
    ...theme.typography.caption,
    color: theme.colors.textMuted,
  },
  quickImpactBtn: {
    paddingHorizontal: theme.spacing.sm,
    paddingVertical: theme.spacing.xs,
    borderRadius: theme.borderRadius.sm,
  },
  quickImpactPlus: {
    backgroundColor: "rgba(0, 212, 170, 0.15)",
  },
  quickImpactNeut: {
    backgroundColor: theme.colors.card,
  },
  quickImpactMinus: {
    backgroundColor: "rgba(255, 77, 106, 0.12)",
  },
  quickImpactBtnText: {
    fontSize: 12,
    fontWeight: "600",
    color: theme.colors.text,
  },
  undoEditRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: theme.spacing.sm,
    marginTop: theme.spacing.md,
    paddingTop: theme.spacing.sm,
    borderTopWidth: 1,
    borderTopColor: theme.colors.border,
  },
  undoEditBtn: {
    paddingHorizontal: theme.spacing.md,
    paddingVertical: theme.spacing.sm,
    borderRadius: theme.borderRadius.sm,
    backgroundColor: theme.colors.surfaceElevated,
  },
  undoEditBtnText: {
    ...theme.typography.caption,
    color: theme.colors.textSecondary,
    fontWeight: "500",
  },
  obsList: {
    gap: theme.spacing.md,
  },
  obsItem: {
    paddingBottom: theme.spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.border,
  },
  obsHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: theme.spacing.xs,
  },
  obsPlayer: {
    ...theme.typography.subtitle,
    color: theme.colors.text,
  },
  obsTime: {
    ...theme.typography.caption,
    color: theme.colors.textMuted,
  },
  obsMeta: {
    flexDirection: "row",
    gap: theme.spacing.sm,
    marginBottom: theme.spacing.xs,
  },
  obsSkill: {
    ...theme.typography.caption,
    color: theme.colors.textSecondary,
  },
  obsImpact: {
    ...theme.typography.caption,
    fontWeight: "600",
  },
  obsNote: {
    ...theme.typography.caption,
    color: theme.colors.textMuted,
    fontStyle: "italic",
  },
  skillGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: theme.spacing.sm,
  },
  skillCard: {
    width: "47%",
    padding: theme.spacing.md,
    backgroundColor: theme.colors.surfaceElevated,
    borderRadius: theme.borderRadius.sm,
  },
  skillName: {
    fontSize: 11,
    fontWeight: "600",
    letterSpacing: 0.4,
    color: theme.colors.textMuted,
    textTransform: "uppercase",
    marginBottom: theme.spacing.xs,
  },
  skillScore: {
    ...theme.typography.title,
    color: theme.colors.primary,
  },
  skillTrend: {
    ...theme.typography.caption,
    color: theme.colors.textSecondary,
  },
  skillConf: {
    fontSize: 11,
    color: theme.colors.textMuted,
  },
  summaryGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: theme.spacing.md,
  },
  summaryItem: {
    minWidth: 80,
  },
  summaryValue: {
    ...theme.typography.title,
    color: theme.colors.text,
  },
  summaryLabel: {
    fontSize: 11,
    color: theme.colors.textMuted,
    textTransform: "uppercase",
    letterSpacing: 0.3,
    marginTop: theme.spacing.xs,
  },
  groupedList: {
    gap: theme.spacing.lg,
  },
  playerGroup: {
    paddingBottom: theme.spacing.lg,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.border,
  },
  playerGroupLast: {
    borderBottomWidth: 0,
    paddingBottom: 0,
  },
  groupPlayerName: {
    ...theme.typography.subtitle,
    color: theme.colors.text,
    marginBottom: theme.spacing.xs,
  },
  groupCount: {
    ...theme.typography.caption,
    color: theme.colors.textMuted,
    marginBottom: theme.spacing.xs,
  },
  groupSummary: {
    ...theme.typography.body,
    color: theme.colors.textSecondary,
    marginBottom: theme.spacing.sm,
  },
  groupObsList: {
    gap: theme.spacing.sm,
  },
  groupObsItem: {
    flexDirection: "row",
    alignItems: "center",
    gap: theme.spacing.sm,
  },
  groupObsSkill: {
    ...theme.typography.caption,
    color: theme.colors.textSecondary,
  },
  groupObsImpact: {
    ...theme.typography.caption,
    fontWeight: "600",
  },
  groupObsNote: {
    ...theme.typography.caption,
    color: theme.colors.textMuted,
    fontStyle: "italic",
    flex: 1,
  },
  completedCard: {
    alignItems: "center",
    paddingVertical: theme.spacing.xl,
    marginBottom: theme.spacing.lg,
  },
  completedIcon: {
    width: 56,
    height: 56,
    borderRadius: theme.borderRadius.full,
    backgroundColor: theme.colors.primaryMuted,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: theme.spacing.md,
  },
  completedIconText: {
    fontSize: 28,
    color: theme.colors.primary,
    fontWeight: "700",
  },
  completedTitle: {
    ...theme.typography.title,
    color: theme.colors.text,
    marginBottom: theme.spacing.xs,
  },
  completedSubtitle: {
    ...theme.typography.caption,
    color: theme.colors.textSecondary,
    textAlign: "center",
  },
  syncStatusText: {
    ...theme.typography.caption,
    color: theme.colors.textSecondary,
    textAlign: "center",
    marginTop: theme.spacing.sm,
  },
  syncStatusSuccess: {
    color: theme.colors.success,
  },
  syncStatusError: {
    ...theme.typography.caption,
    color: theme.colors.textSecondary,
    flex: 1,
  },
  syncErrorRow: {
    flexDirection: "row",
    alignItems: "center",
    marginTop: theme.spacing.sm,
    gap: theme.spacing.sm,
    flexWrap: "wrap",
  },
  retrySyncBtn: {
    paddingHorizontal: theme.spacing.md,
    paddingVertical: theme.spacing.xs,
    backgroundColor: theme.colors.primary,
    borderRadius: theme.borderRadius.md,
  },
  retrySyncBtnText: {
    ...theme.typography.caption,
    color: "#fff",
    fontWeight: "600",
  },
  historyList: {
    gap: theme.spacing.md,
  },
  historyItem: {
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.border,
    paddingBottom: theme.spacing.md,
  },
  historyItemLast: {
    borderBottomWidth: 0,
    paddingBottom: 0,
  },
  historyCard: {
    padding: 0,
  },
  historyCardTop: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: theme.spacing.xs,
  },
  historyTitle: {
    ...theme.typography.subtitle,
    color: theme.colors.text,
    flex: 1,
  },
  historyMeta: {
    ...theme.typography.caption,
    color: theme.colors.textMuted,
  },
  historyDate: {
    ...theme.typography.caption,
    color: theme.colors.textSecondary,
    marginBottom: theme.spacing.xs,
  },
  historySyncStatus: {
    fontSize: 12,
    color: theme.colors.textMuted,
    marginBottom: theme.spacing.xs,
  },
  historySyncStatusSynced: {
    color: theme.colors.success,
  },
  historySyncStatusFailed: {
    color: theme.colors.error,
  },
  historySyncStatusUnavailable: {
    color: theme.colors.textMuted,
    fontStyle: "italic",
  },
  historySyncDetail: {
    flexDirection: "row",
    alignItems: "center",
    flexWrap: "wrap",
    gap: theme.spacing.sm,
    marginBottom: theme.spacing.md,
    paddingBottom: theme.spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.border,
  },
  historySyncDetailText: {
    ...theme.typography.caption,
    color: theme.colors.textMuted,
    flex: 1,
  },
  historySyncDetailSynced: {
    color: theme.colors.success,
  },
  historySyncDetailFailed: {
    color: theme.colors.error,
  },
  retrySyncBtnSmall: {
    paddingHorizontal: theme.spacing.sm,
    paddingVertical: theme.spacing.xs,
  },
  historyExpand: {
    fontSize: 12,
    color: theme.colors.primary,
  },
  historyExpanded: {
    marginTop: theme.spacing.md,
    paddingTop: theme.spacing.md,
    borderTopWidth: 1,
    borderTopColor: theme.colors.border,
  },
  historyPlayerGroup: {
    marginBottom: theme.spacing.md,
  },
  historyPlayerName: {
    ...theme.typography.subtitle,
    color: theme.colors.text,
    marginBottom: theme.spacing.xs,
  },
  historyGroupSummary: {
    ...theme.typography.caption,
    color: theme.colors.textSecondary,
    marginBottom: theme.spacing.sm,
  },
  historyGroupObsList: {
    gap: theme.spacing.xs,
  },
  syncBundleHint: {
    fontSize: 11,
    color: theme.colors.textMuted,
    marginBottom: theme.spacing.xs,
  },
  parentDraftSection: {
    marginTop: theme.spacing.lg,
    paddingTop: theme.spacing.md,
    borderTopWidth: 1,
    borderTopColor: theme.colors.border,
  },
  parentDraftSectionHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    flexWrap: "wrap",
    gap: theme.spacing.sm,
    marginBottom: theme.spacing.sm,
  },
  parentDraftCopyAllBtn: {
    paddingVertical: theme.spacing.xs,
    paddingHorizontal: theme.spacing.sm,
  },
  parentDraftCopyAllText: {
    ...theme.typography.caption,
    color: theme.colors.primary,
    fontWeight: "600",
  },
  parentDraftSectionTitle: {
    fontSize: 11,
    fontWeight: "600",
    letterSpacing: 0.4,
    color: theme.colors.textMuted,
    textTransform: "uppercase",
    marginBottom: theme.spacing.sm,
  },
  parentDraftCard: {
    marginBottom: theme.spacing.md,
    padding: theme.spacing.md,
    backgroundColor: theme.colors.surfaceElevated,
    borderRadius: theme.borderRadius.sm,
  },
  parentDraftPlayerName: {
    ...theme.typography.subtitle,
    color: theme.colors.text,
    marginBottom: theme.spacing.xs,
  },
  parentDraftHeadline: {
    ...theme.typography.caption,
    color: theme.colors.primary,
    fontWeight: "600",
    marginBottom: theme.spacing.xs,
  },
  parentDraftMessage: {
    ...theme.typography.body,
    color: theme.colors.textSecondary,
    marginBottom: theme.spacing.sm,
  },
  parentDraftList: {
    marginTop: theme.spacing.xs,
  },
  parentDraftBullet: {
    ...theme.typography.caption,
    color: theme.colors.textSecondary,
  },
  parentDraftImprovement: {
    color: theme.colors.warning,
  },
  parentDraftInput: {
    ...theme.typography.body,
    color: theme.colors.text,
    backgroundColor: theme.colors.surface,
    borderRadius: theme.borderRadius.sm,
    padding: theme.spacing.md,
    marginBottom: theme.spacing.sm,
    borderWidth: 1,
    borderColor: theme.colors.border,
  },
  parentDraftInputMultiline: {
    minHeight: 80,
    textAlignVertical: "top",
  },
  parentDraftActions: {
    flexDirection: "row",
    gap: theme.spacing.sm,
    marginTop: theme.spacing.md,
  },
  parentDraftActionBtn: {
    flex: 1,
  },
  parentDraftLinkBtn: {
    paddingVertical: theme.spacing.sm,
    paddingHorizontal: theme.spacing.md,
  },
  parentDraftLinkText: {
    ...theme.typography.subtitle,
    color: theme.colors.primary,
  },
  starterIntakeCard: {
    marginBottom: theme.spacing.md,
    borderLeftWidth: 3,
    borderLeftColor: theme.colors.primary,
  },
  starterIntakeEyebrow: {
    fontSize: 11,
    fontWeight: "600",
    letterSpacing: 0.4,
    textTransform: "uppercase",
    color: theme.colors.textMuted,
    marginBottom: theme.spacing.xs,
  },
  starterIntakeTitle: {
    ...theme.typography.subtitle,
    color: theme.colors.text,
    marginBottom: theme.spacing.sm,
  },
  starterContextRow: {
    ...theme.typography.caption,
    color: theme.colors.textSecondary,
    marginBottom: 4,
  },
  starterPreviewText: {
    ...theme.typography.body,
    color: theme.colors.text,
    lineHeight: 21,
    marginTop: theme.spacing.xs,
    marginBottom: theme.spacing.sm,
  },
  starterHighlightsWrap: {
    marginBottom: theme.spacing.sm,
    gap: 4,
  },
  starterHighlightLine: {
    ...theme.typography.caption,
    color: theme.colors.textSecondary,
  },
  starterSecondaryHint: {
    ...theme.typography.caption,
    color: theme.colors.textMuted,
    marginBottom: theme.spacing.md,
  },
  starterActionsRow: {
    gap: theme.spacing.xs,
  },
  starterActionBtn: {
    alignSelf: "flex-start",
  },
  starterHintCard: {
    marginBottom: theme.spacing.md,
    borderLeftWidth: 3,
    borderLeftColor: theme.colors.border,
  },
  starterHintText: {
    ...theme.typography.caption,
    color: theme.colors.textMuted,
  },
  clearBtn: {
    marginTop: theme.spacing.lg,
    paddingVertical: theme.spacing.sm,
    alignItems: "center",
  },
  clearBtnPressed: {
    opacity: 0.7,
  },
  clearBtnText: {
    ...theme.typography.caption,
    color: theme.colors.textMuted,
    textDecorationLine: "underline",
  },
  bottomSpacer: {
    height: theme.spacing.xl,
  },
});
