/**
 * CRM player tab «Hockey ID» — map GET /api/players/:id/professional-stats JSON → UI model.
 */

export type CrmProfessionalStatsSection = {
  key: string;
  title: string;
  rows: Array<{ label: string; value: string }>;
};

export type CrmProfessionalStatsViewModel = {
  empty: boolean;
  headline: string;
  supportingLine: string;
  sections: CrmProfessionalStatsSection[];
  lastUpdatedLabel: string | null;
};

const GAME_EVENT_LABELS: Record<string, string> = {
  GOAL: "Голы",
  ASSIST: "Передачи",
  SHOT: "Броски",
  TURNOVER: "Потери",
  TAKEAWAY: "Отборы",
  ZONE_ENTRY_SUCCESS: "Входы в зону (успех)",
  ZONE_ENTRY_FAIL: "Входы в зону (неуспех)",
  PASS_SUCCESS: "Пасы (успех)",
  PASS_FAIL: "Пасы (неуспех)",
  GOOD_DECISION: "Верные решения",
  BAD_DECISION: "Ошибки в решениях",
};

const BEHAVIOR_LABELS: Record<string, string> = {
  GOOD_POSITIONING: "Позиционирование",
  LOST_POSITION: "Потеря позиции",
  RETURNS_TO_DEFENSE: "Возврат в оборону",
  IGNORES_TEAMPLAY: "Командная игра",
  ACTIVE_PLAY: "Активность",
  PASSIVE_PLAY: "Пассивность",
  GOOD_EFFORT: "Вовлечённость",
  LOW_ENGAGEMENT: "Низкая вовлечённость",
};

const SKILL_LABELS: Record<string, string> = {
  SKATING: "Коньки",
  STICKHANDLING: "Владение клюшкой",
  PASSING: "Пас",
  SHOOTING: "Бросок",
  BALANCE: "Баланс",
  GAME_WITHOUT_PUCK: "Игра без шайбы",
  ONE_ON_ONE: "Один в один",
};

const SKILL_STATUS: Record<string, string> = {
  WEAK: "Слабо",
  DEVELOPING: "В развитии",
  STABLE: "Стабильно",
  STRONG: "Сильно",
};

const TREND_LABELS: Record<string, string> = {
  UP: "Рост",
  SAME: "Без изменений",
  DOWN: "Спад",
};

function str(v: unknown): string {
  if (v == null) return "";
  if (typeof v === "string") return v;
  if (typeof v === "number" && Number.isFinite(v)) return String(v);
  return String(v);
}

function formatDate(iso: unknown): string | null {
  const s = str(iso).trim();
  if (!s) return null;
  const d = new Date(s);
  if (Number.isNaN(d.getTime())) return s;
  return d.toLocaleString("ru-RU", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function numish(v: unknown): string {
  if (v == null) return "—";
  if (typeof v === "number" && Number.isFinite(v)) return v.toFixed(v % 1 === 0 ? 0 : 2);
  const s = str(v).trim();
  return s || "—";
}

type ApiPayload = {
  gameEventsByType?: Record<string, number> | null;
  recentBehaviors?: Array<{
    type?: string;
    intensity?: string | null;
    note?: string | null;
    createdAt?: string | null;
  }> | null;
  skillProgress?: Array<{
    skill?: string;
    status?: string;
    trend?: string;
    note?: string | null;
    measuredAt?: string | null;
  }> | null;
  latestIndex?: {
    attackIndex?: unknown;
    defenseIndex?: unknown;
    skatingIndex?: unknown;
    iqIndex?: unknown;
    physicalIndex?: unknown;
    overallIndex?: unknown;
    calculatedAt?: string | null;
  } | null;
  latestSnapshot?: {
    periodType?: string | null;
    periodStart?: string | null;
    periodEnd?: string | null;
    goals?: number | null;
    assists?: number | null;
    shots?: number | null;
    summary?: string | null;
  } | null;
};

function isPayload(x: unknown): x is ApiPayload {
  return x != null && typeof x === "object" && !Array.isArray(x);
}

/**
 * Map successful API JSON to a dashboard view model. Called only after `res.ok`.
 */
export function mapCrmProfessionalStats(data: unknown): CrmProfessionalStatsViewModel {
  if (!isPayload(data)) {
    return {
      empty: true,
      headline: "Hockey ID",
      supportingLine: "Нет данных для отображения.",
      sections: [],
      lastUpdatedLabel: null,
    };
  }

  const sections: CrmProfessionalStatsSection[] = [];

  const ge = data.gameEventsByType && typeof data.gameEventsByType === "object"
    ? data.gameEventsByType
    : {};
  const geRows = Object.entries(ge)
    .filter(([, n]) => typeof n === "number" && n > 0)
    .map(([k, n]) => ({
      label: GAME_EVENT_LABELS[k] ?? k,
      value: String(n),
    }));
  if (geRows.length > 0) {
    sections.push({
      key: "events",
      title: "События в игре (накопительно)",
      rows: geRows.sort((a, b) => a.label.localeCompare(b.label, "ru")),
    });
  }

  const bh = Array.isArray(data.recentBehaviors) ? data.recentBehaviors : [];
  if (bh.length > 0) {
    sections.push({
      key: "behavior",
      title: "Недавние наблюдения поведения",
      rows: bh.slice(0, 12).map((b, i) => {
        const typeLabel = (BEHAVIOR_LABELS[str(b.type)] ?? str(b.type)) || "—";
        const when = formatDate(b.createdAt) ?? "—";
        const note = str(b.note).trim();
        const inten = str(b.intensity).trim();
        const tail = [inten && `интенсивность: ${inten}`, note].filter(Boolean).join(" · ");
        return {
          label: `${typeLabel} · ${when}`,
          value: tail || "—",
        };
      }),
    });
  }

  const sp = Array.isArray(data.skillProgress) ? data.skillProgress : [];
  if (sp.length > 0) {
    sections.push({
      key: "skills",
      title: "Навыки (последние записи)",
      rows: sp.slice(0, 12).map((s) => {
        const skill = (SKILL_LABELS[str(s.skill)] ?? str(s.skill)) || "—";
        const st = (SKILL_STATUS[str(s.status)] ?? str(s.status)) || "—";
        const tr = (TREND_LABELS[str(s.trend)] ?? str(s.trend)) || "—";
        const when = formatDate(s.measuredAt) ?? "";
        const note = str(s.note).trim();
        return {
          label: `${skill}${when ? ` · ${when}` : ""}`,
          value: [st, tr, note].filter(Boolean).join(" · ") || "—",
        };
      }),
    });
  }

  const idx = data.latestIndex;
  if (idx && typeof idx === "object") {
    const rows: Array<{ label: string; value: string }> = [
      { label: "Атака", value: numish(idx.attackIndex) },
      { label: "Оборона", value: numish(idx.defenseIndex) },
      { label: "Катание", value: numish(idx.skatingIndex) },
      { label: "Хоккейное мышление", value: numish(idx.iqIndex) },
      { label: "Физика", value: numish(idx.physicalIndex) },
      { label: "Сводный индекс", value: numish(idx.overallIndex) },
    ];
    if (rows.some((r) => r.value !== "—")) {
      sections.push({
        key: "indices",
        title: "Индексы (последний расчёт)",
        rows: [
          ...rows,
          ...(formatDate(idx.calculatedAt)
            ? [{ label: "Рассчитано", value: formatDate(idx.calculatedAt)! }]
            : []),
        ],
      });
    }
  }

  const snap = data.latestSnapshot;
  if (snap && typeof snap === "object") {
    const rows: Array<{ label: string; value: string }> = [];
    if (snap.periodType) rows.push({ label: "Период", value: str(snap.periodType) });
    if (snap.periodStart && snap.periodEnd) {
      rows.push({
        label: "Окно",
        value: `${formatDate(snap.periodStart) ?? str(snap.periodStart)} — ${formatDate(snap.periodEnd) ?? str(snap.periodEnd)}`,
      });
    }
    if (snap.goals != null) rows.push({ label: "Голы", value: String(snap.goals) });
    if (snap.assists != null) rows.push({ label: "Передачи", value: String(snap.assists) });
    if (snap.shots != null) rows.push({ label: "Броски", value: String(snap.shots) });
    if (str(snap.summary).trim()) rows.push({ label: "Сводка", value: str(snap.summary).trim() });
    if (rows.length > 0) {
      sections.push({ key: "snapshot", title: "Снимок периода", rows });
    }
  }

  const empty = sections.length === 0;
  const lastFromIndex = idx?.calculatedAt ? formatDate(idx.calculatedAt) : null;
  const lastFromSnap = snap?.periodEnd ? formatDate(snap.periodEnd) : null;
  const lastUpdatedLabel = lastFromIndex ?? lastFromSnap ?? null;

  return {
    empty,
    headline: empty ? "Hockey ID — пока пусто" : "Hockey ID — профессиональная динамика",
    supportingLine: empty
      ? "После фиксации событий, навыков и отчётов на тренировках здесь появятся сводки."
      : "Сводка по событиям, поведению, навыкам и индексам из записей тренерского штаба.",
    sections,
    lastUpdatedLabel,
  };
}
