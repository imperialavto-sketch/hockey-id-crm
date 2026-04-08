/**
 * Поведенческий слой ассистента «Арена» (тексты, ритм, тон).
 * Без API и без смены пайплайна — только copy и выбор фраз.
 *
 * Личность: коротко, по делу, второй тренер на площадке — не сервисный бот.
 */

import type { LiveTrainingSession } from "@/types/liveTraining";
import { formatLiveTrainingMode } from "@/lib/liveTrainingUi";

/** Контекст слота расписания (передаётся в live без серверного поля). */
export type ArenaScheduleSlotContext = {
  groupId: string | null;
  groupName: string | null;
  scheduleKind?: "ice" | "ofp";
  slotStartAt?: string;
  slotEndAt?: string;
};

function scheduleTypeLabelRu(kind?: "ice" | "ofp"): string {
  if (kind === "ofp") return "ОФП";
  if (kind === "ice") return "Лёд";
  return "";
}

/** Одна строка для hero: «Команда · Группа/Команда · Лёд». */
export function buildLiveScheduleHeroContextLine(input: {
  teamName: string;
  liveModeLabel: string;
  scheduleCtx: ArenaScheduleSlotContext | null;
}): string {
  const team = input.teamName.trim() || "Команда";
  const typePart =
    input.scheduleCtx?.scheduleKind === "ofp"
      ? "ОФП"
      : input.scheduleCtx?.scheduleKind === "ice"
        ? "Лёд"
        : input.liveModeLabel;
  const groupPart =
    input.scheduleCtx &&
    input.scheduleCtx.groupId &&
    input.scheduleCtx.groupName?.trim()
      ? input.scheduleCtx.groupName.trim()
      : "Команда";
  return `${team} · ${groupPart} · ${typePart}`;
}

export function buildLiveScheduleSlotTimeLine(
  scheduleCtx: ArenaScheduleSlotContext | null
): string | null {
  if (!scheduleCtx?.slotStartAt || !scheduleCtx?.slotEndAt) return null;
  try {
    const a = new Date(scheduleCtx.slotStartAt).toLocaleTimeString("ru-RU", {
      hour: "2-digit",
      minute: "2-digit",
    });
    const b = new Date(scheduleCtx.slotEndAt).toLocaleTimeString("ru-RU", {
      hour: "2-digit",
      minute: "2-digit",
    });
    return `Слот ${a}–${b}`;
  } catch {
    return null;
  }
}

function arenaSchedulePrefixRu(scheduleCtx: ArenaScheduleSlotContext | null | undefined): string {
  if (!scheduleCtx) return "";
  if (scheduleCtx.groupId && scheduleCtx.groupName?.trim()) {
    return `Смотрим группу ${scheduleCtx.groupName.trim()}. `;
  }
  return "Вся команда. ";
}

function shortFirstName(full: string): string {
  const t = full.trim().split(/\s+/)[0];
  return t || full;
}

/** Стабильный индекс 0..n-1 от строки (без Math.random — предсказуемо в рамках сессии). */
function stablePickIndex(seed: string, modulo: number): number {
  let h = 0;
  for (let i = 0; i < seed.length; i += 1) {
    h = (h * 31 + seed.charCodeAt(i)) | 0;
  }
  return Math.abs(h) % modulo;
}

// --- Opening (TTS при входе в live) ---

export function buildLiveSessionOpeningTts(
  session: LiveTrainingSession,
  scheduleCtx?: ArenaScheduleSlotContext | null
): string {
  const team = session.teamName?.trim() || "команда";
  const mode = formatLiveTrainingMode(session.mode);
  const prefix = arenaSchedulePrefixRu(scheduleCtx ?? null);
  const snap = session.planningSnapshot;
  const prio = snap?.startPriorities;
  if (prio?.summaryLine?.trim()) {
    const line = prio.summaryLine.trim();
    const short = line.length > 80 ? `${line.slice(0, 77)}…` : line;
    return `${prefix}Смотрим ${team}, ${mode}. ${short}`;
  }
  if (prio?.primaryPlayers?.[0]?.playerName?.trim()) {
    const nm = shortFirstName(prio.primaryPlayers[0].playerName);
    return `${prefix}На связи. Кого держим в прицеле первым — ${nm}?`;
  }
  if (snap?.focusPlayers?.[0]?.playerName?.trim()) {
    const nm = shortFirstName(snap.focusPlayers[0].playerName);
    return `${prefix}Начинаем. За ${nm} присмотри внимательнее?`;
  }
  if (snap?.focusDomains?.[0]?.labelRu?.trim()) {
    const d = snap.focusDomains[0].labelRu.trim();
    return `${prefix}${team}, ${mode}. Тема «${d}» — в центре смены.`;
  }
  if (snap?.summaryLines?.[0]?.trim()) {
    const s = snap.summaryLines[0].trim();
    const short = s.length > 72 ? `${s.slice(0, 69)}…` : s;
    return `${prefix}${team}, ${mode}. ${short}`;
  }
  return `${prefix}Начинаем: ${team}, ${mode}. Скажи «Арена» — и первое наблюдение.`;
}

/** Короткая подсказка под статусом в hero live-экрана (контекст без дубля TTS дословно). */
export function buildLiveSessionStatusSubline(
  session: LiveTrainingSession,
  scheduleCtx?: ArenaScheduleSlotContext | null
): string {
  if (scheduleCtx?.groupId && scheduleCtx.groupName?.trim()) {
    const typeRu = scheduleTypeLabelRu(scheduleCtx.scheduleKind);
    const tail = typeRu ? ` · ${typeRu}` : "";
    return `По этой группе${tail} — скажи «Арена», когда будешь готов говорить.`;
  }
  if (scheduleCtx && !scheduleCtx.groupId) {
    const typeRu = scheduleTypeLabelRu(scheduleCtx.scheduleKind);
    const tail = typeRu ? ` · ${typeRu}` : "";
    return `Вся команда${tail} — Арена на связи.`;
  }
  const snap = session.planningSnapshot;
  const prio = snap?.startPriorities;
  if (prio?.primaryPlayers?.[0]?.playerName?.trim()) {
    return `Фокус старта: ${shortFirstName(prio.primaryPlayers[0].playerName)} — скажи «Арена», когда будешь готов говорить.`;
  }
  if (snap?.focusDomains?.[0]?.labelRu?.trim()) {
    return `Тема смены: ${snap.focusDomains[0].labelRu.trim()} — Арена на связи.`;
  }
  return "Арена на связи — скажи «Арена», когда будешь готов говорить.";
}

// --- Микро-реакции после сохранения (TTS) — варианты, без спама одной фразой ---

export function pickTtsAfterPlayerObservation(firstName: string, salt: string): string {
  const opts = [
    `${shortFirstName(firstName)}. Зафиксировала.`,
    `${shortFirstName(firstName)} — в ленте.`,
    `Приняла, ${shortFirstName(firstName)}.`,
  ];
  return opts[stablePickIndex(salt, opts.length)];
}

export function pickTtsAfterTeamObservation(
  salt: string,
  scheduleCtx?: ArenaScheduleSlotContext | null
): string {
  const opts =
    scheduleCtx?.groupId && scheduleCtx.groupName?.trim()
      ? [
          `По группе «${scheduleCtx.groupName.trim()}» — записала.`,
          `Смотрим группу ${scheduleCtx.groupName.trim()} — приняла.`,
          "По этой группе — в ленте.",
        ]
      : scheduleCtx && !scheduleCtx.groupId
        ? ["Вся команда — записала.", "По команде приняла.", "Пятёрка целиком — в ленте."]
        : ["Пятёрка — записала.", "Команду зафиксировала.", "По пятёрке приняла."];
  return opts[stablePickIndex(salt, opts.length)];
}

export function pickTtsAfterSessionObservation(salt: string): string {
  const opts = ["Сессию записала.", "Общий итог — в ленте.", "По сессии приняла."];
  return opts[stablePickIndex(salt, opts.length)];
}

export function pickTtsQueued(salt: string): string {
  const opts = ["В очереди — отправится с сетью.", "Поставила в очередь.", "Уйдёт в ленту, как дойдёт сеть."];
  return opts[stablePickIndex(salt, opts.length)];
}

// --- Долгая тишина в idle (wake-listening) ---

const SILENCE_IDLE_PROMPTS = [
  "Продолжаем наблюдение?",
  "На кого сейчас смотришь — скажи «Арена».",
  "Есть момент — фиксируем?",
  "Кого разберём следующим?",
] as const;

export function pickSilenceIdlePrompt(
  sessionId: string,
  round: number,
  scheduleCtx?: ArenaScheduleSlotContext | null
): string {
  const extra: string[] =
    scheduleCtx?.groupId && scheduleCtx.groupName?.trim()
      ? [
          `По группе «${scheduleCtx.groupName.trim()}» — кого разберём?`,
          "Смотрим эту группу — есть момент?",
        ]
      : scheduleCtx && !scheduleCtx.groupId
        ? ["Вся команда — на кого смотришь?", "По команде — фиксируем что-то ещё?"]
        : [];
  const pool = [...SILENCE_IDLE_PROMPTS, ...extra];
  const idx = stablePickIndex(`${sessionId}:${round}`, pool.length);
  return pool[idx];
}

export const ARENA_SILENCE_IDLE_MS = 92_000;
export const ARENA_SILENCE_IDLE_MIN_GAP_MS = 140_000;

// --- In-session nudges: коучевый тон ---

export function buildNudgeAttentionLineRu(playerLabel: string): string {
  return `${playerLabel}: несколько жёстких сигналов подряд — стоит удержать картину в голове.`;
}

export function buildNudgeAttentionTts(playerLabel: string): string {
  return `${playerLabel}: минусы копятся — смотри внимательнее.`;
}

export function buildNudgeRepeatedPlayerLineRu(label: string): string {
  return `${label} всплывает часто — имеет смысл дожать тему до конца смены.`;
}

export function buildNudgeRepeatedDomainLineRu(domainRu: string): string {
  return `«${domainRu}» повторяется — хороший кандидат на явный вывод в конце.`;
}

export function buildNudgeTeamThemeLineRu(): string {
  return "Пятёрка в фокусе несколько раз — проверь баланс по игрокам.";
}

export function buildNudgeSessionThemeLineRu(): string {
  return "Общие замечания по сессии повторяются — зафиксируй итог словами.";
}

export function buildNudgePositiveStreakLineRu(label: string): string {
  return `У ${label} плюсы подряд — можно отметить на льду, пока горячо.`;
}

// --- Review: помочь думать ---

export function buildReviewStageCoachLine(input: {
  needsReviewCount: number;
  toConfirmCount: number;
  topDraftPlayerFirstName: string | null;
  /** Контекст слота расписания (группа / вся команда). */
  scheduleGroupLabel?: string | null;
}): string {
  const scope =
    input.scheduleGroupLabel != null && input.scheduleGroupLabel.trim()
      ? `Контекст: ${input.scheduleGroupLabel.trim()}. `
      : "";
  if (input.needsReviewCount > 0) {
    return `${scope}Сначала строки с «проверка» — там решение за тобой, без автопилота.`;
  }
  if (input.topDraftPlayerFirstName) {
    return `${scope}Начни с ${input.topDraftPlayerFirstName}: там плотнее всего наблюдений.`;
  }
  if (input.toConfirmCount > 0) {
    return `${scope}${input.toConfirmCount} к подтверждению — по одному, можно добавить ещё наблюдение, если вспомнится.`;
  }
  return `${scope}Пробеги список сверху вниз — что уйдёт в карточки, решаешь ты.`;
}

/** Подпись группы для review («Группа А» / «Вся команда»). */
export function buildReviewScheduleGroupLabelRu(
  scheduleCtx: ArenaScheduleSlotContext | null
): string | null {
  if (!scheduleCtx) return null;
  if (scheduleCtx.groupId && scheduleCtx.groupName?.trim()) {
    return `Группа ${scheduleCtx.groupName.trim()}`;
  }
  return "Вся команда";
}
