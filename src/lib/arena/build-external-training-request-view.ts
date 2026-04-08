import type { ExternalTrainingRequestRecord } from "@/lib/arena/external-training-requests";

export type ExternalTrainingRequestView = {
  id: string;
  status: string;
  createdAt: string;
  coachName: string | null;
  skillKey: string | null;
  severity: number | null;
  reasonSummary: string | null;
  proposedDate: string | null;
  proposedLocation: string | null;

  timeline: Array<{
    key: "confirmed" | "focus_sent" | "awaiting_next_step";
    title: string;
    description: string;
    state: "done" | "current" | "upcoming";
  }>;

  sourceLayer: {
    type: "external_training";
    priority: "low";
    label: string;
    description: string;
  };
};

const SOURCE_LAYER: ExternalTrainingRequestView["sourceLayer"] = {
  type: "external_training",
  priority: "low",
  label: "Дополнительная работа",
  description:
    "Арена ведёт дополнительный контур развития; эти сведения дополняют основной контур подготовки и учитываются с меньшим приоритетом относительно данных школы.",
};

function timelineForStatus(status: string): ExternalTrainingRequestView["timeline"] {
  const base = [
    {
      key: "confirmed" as const,
      title: "Запрос подтверждён",
      description:
        "Вы подтвердили запрос; Арена фиксирует дополнительный контур развития и ведёт его дальше.",
    },
    {
      key: "focus_sent" as const,
      title: "Фокус тренировки передан",
      description:
        "Фокус и контекст переданы в контур: координатор опирается на них при следующем шаге.",
    },
    {
      key: "awaiting_next_step" as const,
      title: "Ожидается следующий шаг",
      description:
        "Следующий шаг в этом контуре ещё в работе; Арена ведёт процесс и обновит состояние по мере готовности.",
    },
  ];

  let confirmed: "done" | "current" | "upcoming" = "upcoming";
  let focusSent: "done" | "current" | "upcoming" = "upcoming";
  let awaiting: "done" | "current" | "upcoming" = "upcoming";

  if (status === "in_progress") {
    confirmed = "done";
    focusSent = "done";
    awaiting = "current";
  } else {
    // confirmed_by_parent и прочие активные статусы — как ранняя стадия контура
    confirmed = "done";
    focusSent = "current";
    awaiting = "upcoming";
  }

  return [
    { ...base[0], state: confirmed },
    { ...base[1], state: focusSent },
    { ...base[2], state: awaiting },
  ];
}

export function buildExternalTrainingRequestView(
  record: ExternalTrainingRequestRecord
): ExternalTrainingRequestView {
  return {
    id: record.id,
    status: record.status,
    createdAt: record.createdAt,
    coachName: record.coachDisplayName?.trim() || null,
    skillKey: record.skillKey,
    severity: record.severity,
    reasonSummary: record.reasonSummary,
    proposedDate: record.proposedDate,
    proposedLocation: record.proposedLocation,
    timeline: timelineForStatus(record.status),
    sourceLayer: { ...SOURCE_LAYER },
  };
}
