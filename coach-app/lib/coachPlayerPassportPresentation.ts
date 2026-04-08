/**
 * Флагманский слой паспорта игрока (coach): hero reading, снимок развития, фокус тренера.
 * Только презентация — данные и API без изменений.
 */

import type { DevelopmentDomain } from "../../src/lib/player-development/ageDevelopmentFramework";
import { DOMAIN_TITLE_RU } from "@/lib/coachAgeStandardsPresentation";
import type { CoachPlayerDevelopmentSummaryVm } from "@/lib/coachPlayerDevelopmentEvidence";
import type { PlayerLiveTrainingSignalsBundle } from "@/services/coachPlayersService";

export type PassportEvidencePhase = "loading" | "error" | "ready";

/** Импульс для hero: давление / движение вверх / ровно (без исторических рядов — rule-based). */
export type PassportHeroReadingSignal = "down" | "up" | "steady";

export type PassportHeroReadingInput = {
  evidencePhase: PassportEvidencePhase;
  summary: CoachPlayerDevelopmentSummaryVm | null;
  ltTotal: number;
  ltNegative: number;
  ltPositive: number;
};

/**
 * Одна короткая строка «сейчас по игроку» для hero — без длинной аналитики.
 */
export function buildPassportHeroReading(input: PassportHeroReadingInput): string | null {
  if (input.evidencePhase === "loading") return null;
  if (input.evidencePhase === "error") {
    return "Отметки смен сейчас не подгрузились — остальной контекст на экране.";
  }
  const s = input.summary;
  if (s && s.summaryLines.length > 0) {
    const line = s.summaryLines[0]!.trim();
    if (line.startsWith("Сейчас в фокусе:")) {
      const rest = line.replace(/^Сейчас в фокусе:\s*/i, "").trim();
      return `Главное сейчас — ${rest}.`;
    }
    return line.length > 96 ? `${line.slice(0, 93)}…` : line;
  }
  if (input.ltTotal === 0) {
    return "Мало зафиксированных отметок в сменах — картина прояснится с live и review.";
  }
  if (input.ltNegative >= 2 && input.ltNegative >= input.ltPositive) {
    return "В последних фиксациях больше «внимания» — при разборе держи полный контекст.";
  }
  if (input.ltPositive >= 2 && input.ltPositive > input.ltNegative) {
    return "В сменах заметен плюс — можно усилить то, что уже идёт.";
  }
  return null;
}

/**
 * Лёгкий индикатор рядом с reading (↑ смена к плюсу, ↓ фокус внимания, → без явного вектора).
 */
export function buildPassportHeroReadingSignal(
  input: PassportHeroReadingInput
): PassportHeroReadingSignal | null {
  if (input.evidencePhase === "loading") return null;
  if (input.evidencePhase === "error") return "steady";
  if (input.summary?.focusDomains?.length) return "down";
  if (
    input.ltPositive >= 2 &&
    input.ltPositive > input.ltNegative &&
    input.ltTotal >= 2
  ) {
    return "up";
  }
  if (
    input.ltNegative >= 2 &&
    input.ltNegative >= input.ltPositive &&
    input.ltTotal >= 2
  ) {
    return "down";
  }
  if (input.ltTotal >= 5) return "steady";
  return null;
}

export type PassportZoneTrend = "down" | "up" | "flat";

/** Куда вести тренера из строки зоны (без новых API). */
export type DevelopmentZoneActionKind = "task" | "drill" | "note" | "live";

export type PassportZoneRow = {
  domain: DevelopmentDomain;
  label: string;
  trend: PassportZoneTrend;
  actionLabel: string;
  actionKind: DevelopmentZoneActionKind;
  /** Одна короткая строка «зачем нажать». */
  actionHint: string;
};

export type PassportDevelopmentTrendVm = {
  label: string;
  tone: "better" | "worse" | "steady";
};

export type PassportDevelopmentSnapshotVm = {
  phase: PassportEvidencePhase;
  attentionRows: PassportZoneRow[];
  strengthRows: PassportZoneRow[];
  lowDataRows: PassportZoneRow[];
  emptyMessage: string | null;
  /** Лёгкий тренд по двум последним сменам в таймлайне (без ML). */
  trend: PassportDevelopmentTrendVm | null;
  groupContextLine: string | null;
};

function zonePresentation(
  domain: DevelopmentDomain,
  zoneKind: "attention" | "strength" | "low"
): Pick<PassportZoneRow, "trend" | "actionLabel" | "actionKind" | "actionHint"> {
  if (zoneKind === "low") {
    return {
      trend: "flat",
      actionLabel: "Арена",
      actionKind: "live",
      actionHint: "Зафиксировать на смене",
    };
  }
  if (zoneKind === "strength") {
    return {
      trend: "up",
      actionLabel: "Закрепить",
      actionKind: "note",
      actionHint: "Короткая заметка",
    };
  }
  switch (domain) {
    case "discipline":
      return {
        trend: "down",
        actionLabel: "Задача",
        actionKind: "task",
        actionHint: "Поставить на контроль",
      };
    case "decision_making":
      return {
        trend: "down",
        actionLabel: "Упражнение",
        actionKind: "drill",
        actionHint: "Темп и чтение",
      };
    case "skating":
      return {
        trend: "down",
        actionLabel: "Упражнение",
        actionKind: "drill",
        actionHint: "Коньки и позиция",
      };
    case "puck_control":
      return {
        trend: "down",
        actionLabel: "Упражнение",
        actionKind: "drill",
        actionHint: "Шайба и касания",
      };
    case "attention":
      return {
        trend: "down",
        actionLabel: "Подсказка",
        actionKind: "note",
        actionHint: "Якорь внимания",
      };
    case "physical":
      return {
        trend: "down",
        actionLabel: "Упражнение",
        actionKind: "drill",
        actionHint: "Нагрузка / ОФП",
      };
    default:
      return {
        trend: "down",
        actionLabel: "В работу",
        actionKind: "task",
        actionHint: "Следующий шаг",
      };
  }
}

function mapZoneRow(
  domain: DevelopmentDomain,
  zoneKind: "attention" | "strength" | "low"
): PassportZoneRow {
  const z = zonePresentation(domain, zoneKind);
  return {
    domain,
    label: DOMAIN_TITLE_RU[domain],
    ...z,
  };
}

/**
 * Сравнение двух последних смен с валидным `startedAt`: чистый плюс/минус по счётчикам.
 */
export function buildPassportDevelopmentTrendVm(
  bundle: PlayerLiveTrainingSignalsBundle | null | undefined,
  evidencePhase: PassportEvidencePhase
): PassportDevelopmentTrendVm | null {
  if (evidencePhase !== "ready" || !bundle?.timeline?.length) return null;
  const sorted = [...bundle.timeline]
    .filter((s) => s.startedAt)
    .sort((a, b) => Date.parse(b.startedAt!) - Date.parse(a.startedAt!));
  if (sorted.length < 2) return null;
  const n0 = sorted[0]!.positiveCount - sorted[0]!.negativeCount;
  const n1 = sorted[1]!.positiveCount - sorted[1]!.negativeCount;
  const diff = n0 - n1;
  if (diff >= 2) {
    return { label: "Последние смены — сдвиг в плюс", tone: "better" };
  }
  if (diff <= -2) {
    return { label: "Последние смены — больше внимания", tone: "worse" };
  }
  return { label: "Последние смены без резких сдвигов", tone: "steady" };
}

/** Один спокойный контекст группы (без сравнительной аналитики). */
export function buildPassportGroupContextLine(
  groupName: string | null | undefined,
  peerCount: number | null | undefined
): string | null {
  const name = groupName?.trim();
  if (!name) return null;
  if (typeof peerCount === "number" && peerCount > 0) {
    return `Группа «${name}» · в подборке ${peerCount} игроков`;
  }
  return `Группа «${name}»`;
}

/**
 * Снимок зон для одного сильного блока под hero (макс. 3 / 2 / 2 строк).
 */
export function buildPassportDevelopmentSnapshotVm(
  summary: CoachPlayerDevelopmentSummaryVm | null,
  evidencePhase: PassportEvidencePhase,
  liveBundle: PlayerLiveTrainingSignalsBundle | null | undefined,
  groupContextLine?: string | null
): PassportDevelopmentSnapshotVm {
  if (evidencePhase === "loading") {
    return {
      phase: "loading",
      attentionRows: [],
      strengthRows: [],
      lowDataRows: [],
      emptyMessage: null,
      trend: null,
      groupContextLine: null,
    };
  }
  if (evidencePhase === "error") {
    return {
      phase: "error",
      attentionRows: [],
      strengthRows: [],
      lowDataRows: [],
      emptyMessage: null,
      trend: null,
      groupContextLine: null,
    };
  }
  const trend = buildPassportDevelopmentTrendVm(liveBundle, evidencePhase);
  const groupLine = groupContextLine?.trim() || null;
  if (!summary) {
    return {
      phase: "ready",
      attentionRows: [],
      strengthRows: [],
      lowDataRows: [],
      emptyMessage: "По последним отметкам нет выделенных зон — ниже стандарты по возрасту.",
      trend,
      groupContextLine: groupLine,
    };
  }
  const attentionRows: PassportZoneRow[] = summary.focusDomains
    .slice(0, 3)
    .map((d) => mapZoneRow(d, "attention"));
  const strengthRows: PassportZoneRow[] = summary.strengthDomains
    .slice(0, 2)
    .map((d) => mapZoneRow(d, "strength"));
  const lowDataRows: PassportZoneRow[] = summary.lowDataDomains
    .slice(0, 2)
    .map((d) => mapZoneRow(d, "low"));
  const empty =
    attentionRows.length === 0 && strengthRows.length === 0 && lowDataRows.length === 0;
  return {
    phase: "ready",
    attentionRows,
    strengthRows,
    lowDataRows,
    emptyMessage: empty
      ? "По последним отметкам нет выделенных зон — ниже стандарты по возрасту."
      : null,
    trend,
    groupContextLine: groupLine,
  };
}

export type PassportCoachDecisionRowVm = {
  id: string;
  source: "queue" | "live" | "hint";
  title: string;
  detail?: string;
};

type QueueSlice = { priority: number; actionLine: string; status: string };

/**
 * До 4 коротких строк: очередь → live → подсказки по развитию.
 */
export function buildPassportCoachDecisionRows(params: {
  queueItems: QueueSlice[];
  ltFirst: { title: string; body: string } | null;
  hintLines: string[];
  ltLoading: boolean;
  ltError: string | null;
}): PassportCoachDecisionRowVm[] {
  const rows: PassportCoachDecisionRowVm[] = [];
  const q = params.queueItems[0];
  if (q) {
    rows.push({
      id: "queue-0",
      source: "queue",
      title: q.actionLine.trim() || "Задача в очереди",
      detail: q.status?.trim() || undefined,
    });
  }
  if (params.ltLoading) {
    rows.push({ id: "lt-loading", source: "live", title: "Шаги из смен…" });
  } else if (params.ltError) {
    rows.push({ id: "lt-err", source: "live", title: params.ltError });
  } else if (params.ltFirst) {
    const body = params.ltFirst.body.trim();
    const short = body.length > 56 ? `${body.slice(0, 53)}…` : body;
    rows.push({
      id: "lt-0",
      source: "live",
      title: params.ltFirst.title.trim(),
      detail: short || undefined,
    });
  }
  const hintCap = Math.max(0, 3 - rows.length);
  for (let i = 0; i < hintCap && i < params.hintLines.length; i++) {
    const line = params.hintLines[i]!.trim();
    if (line) {
      const shortHint = line.length > 64 ? `${line.slice(0, 61)}…` : line;
      rows.push({ id: `hint-${i}`, source: "hint", title: shortHint });
    }
  }
  return rows.slice(0, 3);
}

export type PassportCoachPrimaryStripVm = {
  headline: string;
  ctaLabel: string;
  target: "actions" | "notes" | "arena";
};

/** Один главный призыв поверх списка — по первому осмысленному ряду. */
export function buildPassportCoachPrimaryStrip(
  rows: PassportCoachDecisionRowVm[]
): PassportCoachPrimaryStripVm | null {
  const r = rows[0];
  if (!r || r.id === "lt-loading") return null;
  const headline = r.title.length > 80 ? `${r.title.slice(0, 77)}…` : r.title;
  if (r.source === "queue") {
    return { headline, ctaLabel: "Открыть задачу", target: "actions" };
  }
  if (r.source === "live") {
    return { headline, ctaLabel: "Записать шаг", target: "notes" };
  }
  return { headline, ctaLabel: "В заметки", target: "notes" };
}
