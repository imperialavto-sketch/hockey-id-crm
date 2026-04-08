// PHASE 3: `NON_CORE_EXTERNAL_FLOW` — `docs/PHASE_3_APP_FLOW_LOCK.md`, `appFlowContours.ts`.
// PHASE 2: `NON_CORE_EXTERNAL_API` — `docs/PHASE_2_API_ROUTE_LOCK.md`, repo `src/lib/architecture/apiContours.ts`.
// PHASE 1: `NON_CORE_EXTERNAL_CONTOUR` — `docs/PHASE_1_DATA_ARCHITECTURE_LOCK.md` (`ExternalTraining*`, не `TrainingSession`).
// PHASE 6: ❗ NOT CORE SCHOOL SSOT — клиент внешнего контура родителя (`/api/arena/*`). Не coach live Arena, не voice-draft слота.
// Persisted: request/report. «Autonomous» match UX = ⚠ MOCK MATCHING (in-memory stub на сервере), не автономный агент.
// Не вызывать root `GET /api/arena/external-training` из продукта (см. PHASE 3).
import { apiFetch } from "@/lib/api";

export type ExternalTrainingTimelineStep = {
  key: "confirmed" | "focus_sent" | "awaiting_next_step";
  title: string;
  description: string;
  state: "done" | "current" | "upcoming";
};

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
  timeline: ExternalTrainingTimelineStep[];
  sourceLayer: {
    type: "external_training";
    priority: "low";
    label: string;
    description: string;
  };
};

export async function getLatestArenaExternalTrainingRequest(
  playerId: string
): Promise<ExternalTrainingRequestView | null> {
  const q = new URLSearchParams({ playerId });
  return apiFetch<ExternalTrainingRequestView | null>(
    `/api/arena/external-training/request?${q.toString()}`
  );
}

export type ExternalTrainingReportView = {
  id: string;
  createdAt: string;
  summary: string;
  resultNotes: string | null;
  nextSteps: string | null;
  focusAreas: string[];
  sourceLayer: {
    type: "external_training_report";
    priority: "low";
    label: string;
    description: string;
  };
};

export async function getLatestArenaExternalTrainingReport(
  playerId: string
): Promise<ExternalTrainingReportView | null> {
  const q = new URLSearchParams({ playerId });
  return apiFetch<ExternalTrainingReportView | null>(
    `/api/arena/external-training/report?${q.toString()}`
  );
}

export type ExternalDevelopmentNarrativeView = {
  hasExternalSupport: boolean;
  title: string;
  summary: string;
  emphasis: "subtle" | "active";
  sourcePriorityLabel: string;
  keyPoints: string[];
};

export type TrainerCandidateView = {
  coachId: string;
  coachName: string;
  shortDescription: string;
};

export type ExternalFollowUpRecommendationView = {
  type:
    | "follow_up_training"
    | "monitor_only"
    | "focus_closed"
    | "stop_recommended"
    | "defer_due_to_load";
  title: string;
  summary: string;
  actionLabel: string | null;
  deferLabel: string | null;
  sourceNote: string;
  /** Фаза развития по горизонту допконтура (опционально для клиентов). */
  phaseLabel?: string;
  explanationPoints: string[];
  trainerCandidate?: TrainerCandidateView;
  trainerPickExplanation?: string;
};

export type ArenaAutonomousMatchView = {
  id: string;
  coachId: string;
  coachName: string;
  status: string;
  displayPhase: "contacting" | "scheduled" | "completed";
  statusLine: string;
  proposedSlotStub: string | null;
  externalRequestId: string | null;
};

export async function getArenaAutonomousMatch(
  playerId: string
): Promise<ArenaAutonomousMatchView | null> {
  const q = new URLSearchParams({ playerId });
  return apiFetch<ArenaAutonomousMatchView | null>(
    `/api/arena/external-training/autonomous-match?${q.toString()}`
  );
}

export type ConfirmArenaAutonomousMatchResult = {
  request: ExternalTrainingRequestView;
  match: ArenaAutonomousMatchView | null;
};

export async function confirmArenaAutonomousMatch(
  playerId: string
): Promise<ConfirmArenaAutonomousMatchResult> {
  return apiFetch<ConfirmArenaAutonomousMatchResult>(
    "/api/arena/external-training/confirm-match",
    {
      method: "POST",
      body: JSON.stringify({ playerId }),
    }
  );
}

export async function getArenaExternalDevelopmentNarrative(
  playerId: string
): Promise<ExternalDevelopmentNarrativeView | null> {
  const q = new URLSearchParams({ playerId });
  return apiFetch<ExternalDevelopmentNarrativeView | null>(
    `/api/arena/external-training/narrative?${q.toString()}`
  );
}

export async function getArenaExternalFollowUpRecommendation(
  playerId: string
): Promise<ExternalFollowUpRecommendationView | null> {
  const q = new URLSearchParams({ playerId });
  return apiFetch<ExternalFollowUpRecommendationView | null>(
    `/api/arena/external-training/follow-up?${q.toString()}`
  );
}

export type PlayerDevelopmentOverviewView = {
  phase: "active_focus" | "consolidation" | "passive";
  phaseLabel: string;
  summary: string;
  signals: string[];
  explanationPoints: string[];
};

export type ArenaSummarySurfaceView = {
  title: string;
  stateLabel: string;
  stateTone: "active" | "calm" | "watchful";
  summary: string;
  nextStepLabel: string | null;
  explanationPoints: string[];
};

export async function getArenaSummarySurface(
  playerId: string
): Promise<ArenaSummarySurfaceView> {
  const q = new URLSearchParams({ playerId });
  return apiFetch<ArenaSummarySurfaceView>(
    `/api/arena/summary-surface?${q.toString()}`
  );
}

export async function getArenaPlayerDevelopmentOverview(
  playerId: string
): Promise<PlayerDevelopmentOverviewView> {
  const q = new URLSearchParams({ playerId });
  return apiFetch<PlayerDevelopmentOverviewView>(
    `/api/arena/development-overview?${q.toString()}`
  );
}

/** Следующий цикл внешнего контура по подсказке Арены (POST follow-up-create). */
export async function createArenaExternalFollowUpRequest(
  playerId: string
): Promise<ExternalTrainingRequestView> {
  return apiFetch<ExternalTrainingRequestView>(
    "/api/arena/external-training/follow-up-create",
    {
      method: "POST",
      body: JSON.stringify({ playerId }),
    }
  );
}

/** MVP: фиксирует mock-отчёт по последнему активному запросу (только dev / тест). */
export async function mockSubmitArenaExternalTrainingReport(
  playerId: string
): Promise<ExternalTrainingReportView> {
  return apiFetch<ExternalTrainingReportView>(
    "/api/arena/external-training/report/mock-submit",
    {
      method: "POST",
      body: JSON.stringify({ playerId }),
    }
  );
}
