import type { ExternalTrainingRequest } from "@prisma/client";

export type ExternalCoachRequestView = {
  id: string;
  playerLabel: string;
  playerAgeLabel: string | null;
  focusSummary: string;
  recommendedFocusAreas: string[];
  status: string;
  proposedDate: string | null;
  proposedLocation: string | null;
  latestReportExists: boolean;
  arenaTask: {
    title: string;
    summary: string;
    checklist: string[];
  };
  quickCompletionPreset: {
    suggestedSummary: string;
    suggestedNextSteps: string[];
  };
};

type PlayerMini = {
  firstName: string;
  lastName: string;
  birthYear: number | null;
  birthDate: Date | null;
};

function safePlayerLabel(p: PlayerMini): string {
  const f = p.firstName.trim();
  const l = p.lastName.trim();
  if (!f && !l) return "Игрок";
  if (!l) return f;
  return `${f} ${l.charAt(0).toUpperCase()}.`;
}

function ageLabel(p: PlayerMini): string | null {
  if (p.birthDate) {
    const d = new Date(p.birthDate);
    if (!Number.isNaN(d.getTime())) {
      const today = new Date();
      let age = today.getFullYear() - d.getFullYear();
      const m = today.getMonth() - d.getMonth();
      if (m < 0 || (m === 0 && today.getDate() < d.getDate())) age--;
      if (age >= 0 && age < 25) return `${age} лет`;
    }
  }
  if (p.birthYear != null && p.birthYear > 1900 && p.birthYear <= new Date().getFullYear()) {
    const approx = new Date().getFullYear() - p.birthYear;
    if (approx >= 0 && approx < 30) return `~${approx} лет (по году)`;
  }
  return null;
}

function truncate(text: string, max: number): string {
  const t = text.replace(/\s+/g, " ").trim();
  if (t.length <= max) return t;
  return `${t.slice(0, max - 1).trimEnd()}…`;
}

function focusSummaryFromRequest(req: Pick<ExternalTrainingRequest, "skillKey" | "reasonSummary">): string {
  if (req.reasonSummary?.trim()) {
    return truncate(req.reasonSummary.trim(), 160);
  }
  if (req.skillKey?.trim()) {
    return `Фокус: ${req.skillKey.trim()}`;
  }
  return "Фокус уточняется в материалах Arena";
}

function recommendedAreas(
  req: Pick<ExternalTrainingRequest, "skillKey" | "reasonSummary">,
  reportFocusAreas?: string[]
): string[] {
  const out: string[] = [];
  if (req.skillKey?.trim()) out.push(req.skillKey.trim());
  if (reportFocusAreas?.length) {
    for (const x of reportFocusAreas) {
      const t = x.trim();
      if (t && !out.includes(t)) out.push(t);
      if (out.length >= 3) return out;
    }
  }
  const reason = req.reasonSummary?.trim();
  if (reason && out.length < 3) {
    const parts = reason.split(/[.!?\n]+/).map((s) => s.trim()).filter(Boolean);
    for (const p of parts) {
      const line = truncate(p, 100);
      if (line && !out.some((o) => o.includes(line) || line.includes(o))) out.push(line);
      if (out.length >= 3) break;
    }
  }
  return out.slice(0, 3);
}

function buildArenaTask(
  request: Pick<ExternalTrainingRequest, "skillKey" | "reasonSummary">,
  focusSummary: string,
  recommended: string[]
): ExternalCoachRequestView["arenaTask"] {
  const title = "Фокус внешней тренировки";
  const base =
    request.skillKey?.trim()
      ? `Arena передала внешний фокус «${truncate(request.skillKey.trim(), 80)}». Проведите сессию в рамках дополнительного контура и зафиксируйте итог здесь.`
      : `Arena согласовала дополнительный контур работы. Ориентируйтесь на краткий бриф ниже, проведите сессию и отметьте результат.`;
  const summary = truncate(base + " " + truncate(focusSummary, 120), 320);

  const checklist: string[] = [
    "Ознакомиться с брифом Arena и провести запланированную работу с игроком",
  ];
  for (const r of recommended.slice(0, 2)) {
    checklist.push(`Держать в фокусе: ${truncate(r, 72)}`);
  }
  return {
    title,
    summary,
    checklist: checklist.slice(0, 3),
  };
}

function buildQuickCompletionPreset(
  request: Pick<ExternalTrainingRequest, "skillKey" | "reasonSummary">,
  recommended: string[],
  existingReport?: { summary: string | null; nextSteps: string | null } | null
): ExternalCoachRequestView["quickCompletionPreset"] {
  let suggestedSummary: string;
  if (existingReport?.summary?.trim()) {
    suggestedSummary = truncate(existingReport.summary.trim(), 400);
  } else if (request.skillKey?.trim()) {
    suggestedSummary = `Проведена внешняя сессия с акцентом на «${truncate(request.skillKey.trim(), 80)}». Задачи отработаны в рамках контура Arena; краткая обратная связь передана в систему.`;
  } else if (request.reasonSummary?.trim()) {
    suggestedSummary = `Проведена внешняя сессия по согласованному фокусу. ${truncate(request.reasonSummary.trim(), 200)}`;
  } else {
    suggestedSummary =
      "Проведена внешняя сессия по запросу Arena. Итог зафиксирован для дополнительного контура развития.";
  }

  const steps: string[] = [];
  if (request.skillKey?.trim()) {
    steps.push(`Закрепить «${truncate(request.skillKey.trim(), 48)}» на следующей встрече`);
  }
  steps.push("Добавить лёгкую темповую нагрузку к текущему фокусу");
  steps.push("Перенести навык в короткое игровое упражнение");
  if (existingReport?.nextSteps?.trim()) {
    const lines = existingReport.nextSteps
      .split(/\n+/)
      .map((s) => s.trim())
      .filter(Boolean)
      .slice(0, 2);
    for (const line of lines) {
      if (!steps.includes(line)) steps.unshift(truncate(line, 100));
    }
  }
  return {
    suggestedSummary,
    suggestedNextSteps: steps.slice(0, 3),
  };
}

export function buildExternalCoachRequestView(
  request: ExternalTrainingRequest,
  player: PlayerMini,
  options: {
    latestReportExists: boolean;
    reportFocusAreas?: string[];
    existingReport?: { summary: string | null; nextSteps: string | null } | null;
  }
): ExternalCoachRequestView {
  const focusSummary = focusSummaryFromRequest(request);
  const recommendedFocusAreas = recommendedAreas(request, options.reportFocusAreas);
  const arenaTask = buildArenaTask(request, focusSummary, recommendedFocusAreas);
  const quickCompletionPreset = buildQuickCompletionPreset(
    request,
    recommendedFocusAreas,
    options.existingReport
  );

  return {
    id: request.id,
    playerLabel: safePlayerLabel(player),
    playerAgeLabel: ageLabel(player),
    focusSummary,
    recommendedFocusAreas,
    status: request.status,
    proposedDate: request.proposedDate?.toISOString() ?? null,
    proposedLocation: request.proposedLocation,
    latestReportExists: options.latestReportExists,
    arenaTask,
    quickCompletionPreset,
  };
}
