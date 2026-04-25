"use client";
// PHASE 1 — CRM SCHEDULE TRUTH: only `TrainingSession` + `/api/trainings/*` (+ roster GET). No legacy training detail/attendance in active CRM flow.

import { useEffect, useState, type ReactNode } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import type { LucideIcon } from "lucide-react";
import {
  ArrowLeft,
  Calendar,
  UserCircle,
  MapPin,
  Clock,
  Users,
  Check,
  X,
  Loader2,
  User,
  ChevronRight,
  Sparkles,
  ClipboardList,
} from "lucide-react";
import { Card } from "@/components/Card";
import { Button } from "@/components/Button";
import { usePermissions } from "@/hooks/usePermissions";
import { cn } from "@/lib/utils";
import { CRM_TRAINING_DETAIL_COPY } from "@/lib/crmTrainingDetailCopy";
import { CRM_PLAYER_DETAIL_COPY } from "@/lib/crmPlayerDetailCopy";
import { CRM_TEAMS_LIST_COPY } from "@/lib/crmTeamsListCopy";
import {
  fetchScheduleTrainingDetailResource,
  fetchSessionAttendanceRosterPayload,
} from "@/features/schedule/scheduleDetailTrainingFetch";
import {
  buildLiveExplainabilityEvalContextBody,
  type BehavioralExplainabilityAxes,
} from "@/lib/trainingBehavioralExplainabilityText";

/** Stored attendance (TrainingAttendance): only these two after normalize. */
type StoredAttendanceStatus = "PRESENT" | "ABSENT";
type TargetAttendanceStatus = "present" | "absent";

interface Training {
  id: string;
  title: string;
  startTime: string;
  endTime: string;
  location: string | null;
  notes: string | null;
  /** TrainingSession: фокус из Arena / CRM execution. */
  arenaNextTrainingFocus?: string | null;
  team?: {
    id: string;
    name: string;
    ageGroup: string;
    coach?: { id: string; firstName?: string; lastName?: string } | null;
  } | null;
}

interface Attendance {
  playerId: string;
  status: StoredAttendanceStatus;
  player?: { id: string; firstName: string; lastName: string } | null;
}

interface Player {
  id: string;
  firstName: string;
  lastName: string;
}

const STATUS_CONFIG: Record<
  StoredAttendanceStatus,
  { label: string; icon: typeof Check; className: string }
> = {
  PRESENT: {
    label: "Присутствовал",
    icon: Check,
    className: "border-neon-green/40 bg-neon-green/20 text-neon-green hover:bg-neon-green/30",
  },
  ABSENT: {
    label: "Отсутствовал",
    icon: X,
    className: "border-red-500/40 bg-red-500/20 text-red-400 hover:bg-red-500/30",
  },
};

const STORED_ATTENDANCE_STATUSES: StoredAttendanceStatus[] = ["PRESENT", "ABSENT"];

/** Map API / legacy strings to the two states persisted in TrainingAttendance. */
function normalizeUiStatus(status: unknown): StoredAttendanceStatus | "" {
  const normalized = String(status ?? "").toUpperCase();
  if (normalized === "PRESENT" || normalized === "LATE") return "PRESENT";
  if (normalized === "ABSENT" || normalized === "EXCUSED") return "ABSENT";
  const lower = String(status ?? "").toLowerCase();
  if (lower === "present") return "PRESENT";
  if (lower === "absent") return "ABSENT";
  return "";
}

function splitPlayerName(name: string): { firstName: string; lastName: string } {
  const parts = String(name ?? "").trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return { firstName: "", lastName: "" };
  if (parts.length === 1) return { firstName: parts[0], lastName: "" };
  return { firstName: parts[0], lastName: parts.slice(1).join(" ") };
}

function normalizeTrainingText(value: string | null | undefined): string | null {
  const t = String(value ?? "").trim();
  return t.length ? t : null;
}

const NOTE_PREVIEW_LEN = 120;

function trimNotePreview(note: string, expanded: boolean): { text: string; truncated: boolean } {
  const t = note.trim();
  if (expanded || t.length <= NOTE_PREVIEW_LEN) return { text: t, truncated: false };
  return { text: `${t.slice(0, NOTE_PREVIEW_LEN - 1).trimEnd()}…`, truncated: true };
}

interface TrainingSessionReportDto {
  trainingId: string;
  summary: string | null;
  focusAreas: string | null;
  coachNote: string | null;
  parentMessage: string | null;
  updatedAt: string | null;
}

interface SessionEvaluationPlayerRow {
  playerId: string;
  name: string;
  evaluation: {
    effort?: number;
    focus?: number;
    discipline?: number;
    note?: string;
  } | null;
}

interface BehavioralSuggestionsPlayerRow {
  playerId: string;
  behavioral?: { focus?: number; discipline?: number };
  explainability?: BehavioralExplainabilityAxes;
}

function evaluationHasContent(
  ev: NonNullable<SessionEvaluationPlayerRow["evaluation"]>
): boolean {
  return (
    ev.effort != null ||
    ev.focus != null ||
    ev.discipline != null ||
    !!(ev.note && ev.note.trim())
  );
}

function DetailSectionCard({
  kicker,
  title,
  icon: Icon,
  iconClassName,
  action,
  children,
}: {
  kicker: string;
  title: string;
  icon: LucideIcon;
  iconClassName: string;
  action?: ReactNode;
  children: ReactNode;
}) {
  return (
    <Card className="overflow-hidden border-white/[0.1] p-0">
      <div className="flex flex-col gap-3 border-b border-white/[0.08] bg-white/[0.02] px-5 py-4 sm:flex-row sm:items-center sm:justify-between sm:px-6">
        <div className="flex items-start gap-3">
          <Icon className={cn("mt-0.5 h-5 w-5 shrink-0", iconClassName)} aria-hidden />
          <div className="min-w-0">
            <p className="text-[11px] font-semibold uppercase tracking-wider text-slate-500">{kicker}</p>
            <h2 className="font-display text-base font-semibold tracking-tight text-white sm:text-lg">{title}</h2>
          </div>
        </div>
        {action ? <div className="shrink-0 sm:pl-4">{action}</div> : null}
      </div>
      <div className="p-0">{children}</div>
    </Card>
  );
}

export default function ScheduleDetailPage() {
  const params = useParams();
  const id = (params?.id as string) ?? "";
  const { canEdit } = usePermissions();
  const canEditTraining = canEdit("schedule");

  const [training, setTraining] = useState<Training | null>(null);
  const [players, setPlayers] = useState<Player[]>([]);
  const [attendances, setAttendances] = useState<Attendance[]>([]);
  const [comments, setComments] = useState<Record<string, string>>({});
  const [ratings, setRatings] = useState<Record<string, number>>({});
  const [saving, setSaving] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [fetchError, setFetchError] = useState(false);
  const [reloadKey, setReloadKey] = useState(0);
  const quickStatuses = STORED_ATTENDANCE_STATUSES;

  const [reportLoading, setReportLoading] = useState(false);
  const [reportError, setReportError] = useState(false);
  const [reportData, setReportData] = useState<TrainingSessionReportDto | null>(null);
  const [reportRetryKey, setReportRetryKey] = useState(0);
  const [evaluationsLoading, setEvaluationsLoading] = useState(false);
  const [evaluationsError, setEvaluationsError] = useState(false);
  const [evaluationsPlayers, setEvaluationsPlayers] = useState<SessionEvaluationPlayerRow[]>([]);
  const [evaluationsRetryKey, setEvaluationsRetryKey] = useState(0);
  /** playerId → тело строки explainability (без префикса), из GET .../behavioral-suggestions */
  const [evalLiveContextByPlayer, setEvalLiveContextByPlayer] = useState<
    Record<string, string>
  >({});
  const [coachNoteExpanded, setCoachNoteExpanded] = useState(false);
  const [evalNoteExpanded, setEvalNoteExpanded] = useState<Record<string, boolean>>({});

  const showCanonicalVoiceBlocks = Boolean(id && training);

  useEffect(() => {
    if (!id) {
      setLoading(false);
      setTraining(null);
      setPlayers([]);
      setAttendances([]);
      setFetchError(false);
      return;
    }
    setLoading(true);
    setFetchError(false);
    fetchScheduleTrainingDetailResource(id)
      .then(async ({ data: raw }) => {
        const data = raw as Training & {
          error?: unknown;
          attendances?: Attendance[];
        };
        if (data.error || !data.id) {
          setTraining(null);
          setPlayers([]);
          setAttendances([]);
          setFetchError(false);
          return;
        }
        setTraining({
          ...data,
          arenaNextTrainingFocus:
            typeof (data as { arenaNextTrainingFocus?: unknown }).arenaNextTrainingFocus === "string"
              ? (data as { arenaNextTrainingFocus: string }).arenaNextTrainingFocus
              : null,
        });
        setComments({});
        setRatings({});
        const attsRaw = Array.isArray(data.attendances) ? data.attendances : [];
        const atts = attsRaw
          .map((a: Attendance) => {
            const status = normalizeUiStatus(a?.status);
            if (!status) return null;
            return { ...a, status };
          })
          .filter(Boolean) as Attendance[];
        setAttendances(atts);

        try {
          const attendanceData = (await fetchSessionAttendanceRosterPayload(
            id
          )) as Record<string, unknown>;
          const attendancePlayers = Array.isArray(attendanceData?.players)
            ? attendanceData.players
            : [];
          const roster: Player[] = attendancePlayers.map(
            (p: { playerId?: string; name?: string }) => {
              const name = splitPlayerName(String(p?.name ?? ""));
              return {
                id: String(p?.playerId ?? ""),
                firstName: name.firstName,
                lastName: name.lastName,
              };
            }
          );
          const targetAttendances: Attendance[] = attendancePlayers
            .map((p: { playerId?: string; status?: string | null }) => {
              const status = normalizeUiStatus(p?.status);
              if (!status) return null;
              return {
                playerId: String(p?.playerId ?? ""),
                status,
                player: null,
              };
            })
            .filter(Boolean) as Attendance[];
          setPlayers(roster.filter((p) => p.id));
          setAttendances(targetAttendances);
        } catch {
          setPlayers([]);
        }

        if (data.team?.coach?.id) {
          try {
            const ratingsRes = await fetch(
              `/api/coaches/${data.team.coach.id}/ratings`,
              { credentials: "include" }
            );
            const ratingsList = await ratingsRes.json().catch(() => []);
            const ratingsMap: Record<string, number> = {};
            const recommendationByPlayer: Record<string, string> = {};
            (Array.isArray(ratingsList) ? ratingsList : []).forEach(
              (r: { playerId?: string; rating?: number; recommendation?: string | null }) => {
                if (r?.playerId && r?.rating != null) ratingsMap[r.playerId] = r.rating;
                const rec = r?.recommendation != null ? String(r.recommendation).trim() : "";
                if (r?.playerId && rec) recommendationByPlayer[r.playerId] = rec;
              }
            );
            setRatings(ratingsMap);
            setComments(recommendationByPlayer);
          } catch {
            // ignore
          }
        }
      })
      .catch(() => {
        setFetchError(true);
        setTraining(null);
        setPlayers([]);
        setAttendances([]);
      })
      .finally(() => setLoading(false));
  }, [id, reloadKey]);

  useEffect(() => {
    if (!id || !training) {
      setReportLoading(false);
      setReportError(false);
      setReportData(null);
      setCoachNoteExpanded(false);
      return;
    }
    let cancelled = false;
    setReportLoading(true);
    setReportError(false);
    fetch(`/api/trainings/${encodeURIComponent(id)}/report`, {
      credentials: "include",
    })
      .then(async (r) => {
        if (!r.ok) throw new Error("report");
        return r.json() as Promise<TrainingSessionReportDto>;
      })
      .then((data) => {
        if (!cancelled) {
          setReportData(data);
          setReportError(false);
        }
      })
      .catch(() => {
        if (!cancelled) {
          setReportData(null);
          setReportError(true);
        }
      })
      .finally(() => {
        if (!cancelled) setReportLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [id, training?.id, reportRetryKey]);

  useEffect(() => {
    if (!id || !training) {
      setEvaluationsLoading(false);
      setEvaluationsError(false);
      setEvaluationsPlayers([]);
      setEvalNoteExpanded({});
      return;
    }
    let cancelled = false;
    setEvaluationsLoading(true);
    setEvaluationsError(false);
    fetch(`/api/trainings/${encodeURIComponent(id)}/evaluations`, {
      credentials: "include",
    })
      .then(async (r) => {
        if (!r.ok) throw new Error("eval");
        return r.json() as Promise<{ players?: SessionEvaluationPlayerRow[] }>;
      })
      .then((data) => {
        if (!cancelled) {
          setEvaluationsPlayers(Array.isArray(data.players) ? data.players : []);
          setEvaluationsError(false);
        }
      })
      .catch(() => {
        if (!cancelled) {
          setEvaluationsPlayers([]);
          setEvaluationsError(true);
        }
      })
      .finally(() => {
        if (!cancelled) setEvaluationsLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [id, training?.id, evaluationsRetryKey]);

  useEffect(() => {
    if (!id || !training) {
      setEvalLiveContextByPlayer({});
      return;
    }
    let cancelled = false;
    fetch(`/api/trainings/${encodeURIComponent(id)}/behavioral-suggestions`, {
      credentials: "include",
    })
      .then(async (r) => {
        if (!r.ok) return null;
        return r.json() as Promise<{ players?: BehavioralSuggestionsPlayerRow[] }>;
      })
      .then((data) => {
        if (cancelled || !data) return;
        const next: Record<string, string> = {};
        for (const p of Array.isArray(data.players) ? data.players : []) {
          if (!p?.playerId) continue;
          const body = buildLiveExplainabilityEvalContextBody(p.explainability);
          if (body) next[p.playerId] = body;
        }
        setEvalLiveContextByPlayer(next);
      })
      .catch(() => {
        if (!cancelled) setEvalLiveContextByPlayer({});
      });
    return () => {
      cancelled = true;
    };
  }, [id, training?.id, evaluationsRetryKey]);

  const getStatusForPlayer = (playerId: string): StoredAttendanceStatus | "" => {
    const a = attendances.find((x) => String(x.playerId) === String(playerId));
    return normalizeUiStatus(a?.status);
  };

  const updateAttendance = async (playerId: string, status: StoredAttendanceStatus) => {
    if (!canEditTraining) return;
    if (status !== "PRESENT" && status !== "ABSENT") return;
    setSaving(playerId);
    try {
      const statusPayload: TargetAttendanceStatus =
        status === "PRESENT" ? "present" : "absent";
      const res = await fetch(`/api/trainings/${id}/attendance`, {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          playerId,
          status: statusPayload,
        }),
      });
      const data = await res.json().catch(() => ({}));
      if (res.ok && data) {
        setAttendances((prev) => {
          const filtered = prev.filter((x) => String(x.playerId) !== String(playerId));
          return [...filtered, { playerId, status, player: null }];
        });
      }
    } catch {
      // ignore
    } finally {
      setSaving(null);
    }
  };

  const markAllPresent = async () => {
    if (!canEditTraining || players.length === 0) return;
    setSaving("bulk");
    try {
      const res = await fetch(`/api/trainings/${id}/attendance/bulk`, {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: "present" }),
      });
      const data = await res.json().catch(() => ({}));
      if (res.ok) {
        setAttendances((prev) => {
          const byPlayer = new Map(prev.map((a) => [String(a.playerId), a]));
          players.forEach((p) => byPlayer.set(p.id, { playerId: p.id, status: "PRESENT" as const, player: null }));
          return Array.from(byPlayer.values());
        });
      }
    } catch {
      // ignore
    } finally {
      setSaving(null);
    }
  };

  const saveRating = async (playerId: string, rating: number, recommendation?: string) => {
    const coachId = training?.team?.coach?.id;
    if (!coachId || rating < 1 || rating > 5) return;
    setSaving(`rating-${playerId}`);
    try {
      const res = await fetch(`/api/player/${playerId}/rating`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          coachId,
          rating,
          recommendation: recommendation ?? comments[playerId] ?? "",
        }),
      });
      if (res.ok) {
        setRatings((prev) => ({ ...prev, [playerId]: rating }));
      }
    } catch {
      // ignore
    } finally {
      setSaving(null);
    }
  };

  const coachName = training?.team?.coach
    ? [training.team.coach.firstName, training.team.coach.lastName].filter(Boolean).join(" ") || "Тренер"
    : null;

  const duration =
    training?.startTime && training?.endTime
      ? Math.round(
          (new Date(training.endTime).getTime() - new Date(training.startTime).getTime()) / 60000
        )
      : null;

  if (loading) {
    return (
      <div className="flex min-h-[50vh] flex-col items-center justify-center gap-4 px-4">
        <Loader2 className="h-10 w-10 animate-spin text-neon-blue" aria-hidden />
        <div className="text-center">
          <p className="font-display text-base font-semibold text-white">{CRM_TRAINING_DETAIL_COPY.loadingTitle}</p>
          <p className="mt-1 text-sm text-slate-500">{CRM_TRAINING_DETAIL_COPY.loadingHint}</p>
        </div>
      </div>
    );
  }

  if (fetchError) {
    return (
      <div className="overflow-x-hidden px-4 py-6 sm:px-6 md:px-8">
        <div className="mx-auto max-w-7xl space-y-6">
          <Link
            href="/schedule"
            className="inline-flex items-center gap-2 text-sm text-slate-400 transition-colors hover:text-neon-blue"
          >
            <ArrowLeft className="h-4 w-4" aria-hidden />
            {CRM_TRAINING_DETAIL_COPY.backSchedule}
          </Link>
          <div
            className="flex flex-col gap-3 rounded-2xl border border-amber-500/25 bg-amber-500/10 px-4 py-4 sm:flex-row sm:items-center sm:justify-between sm:px-5"
            role="alert"
          >
            <div>
              <p className="font-medium text-amber-100">{CRM_TRAINING_DETAIL_COPY.errorTitle}</p>
              <p className="mt-0.5 text-sm text-amber-200/80">{CRM_TRAINING_DETAIL_COPY.errorHint}</p>
            </div>
            <button
              type="button"
              onClick={() => setReloadKey((k) => k + 1)}
              className="shrink-0 rounded-xl border border-amber-400/40 bg-white/10 px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-white/15"
            >
              {CRM_TRAINING_DETAIL_COPY.retryCta}
            </button>
          </div>
        </div>
      </div>
    );
  }

  if (!training) {
    return (
      <div className="overflow-x-hidden px-4 py-6 sm:px-6 md:px-8">
        <div className="mx-auto max-w-2xl">
          <Card className="border-white/[0.1] p-8 text-center">
            <p className="font-display text-lg font-semibold text-white">{CRM_TRAINING_DETAIL_COPY.notFoundTitle}</p>
            <p className="mx-auto mt-2 max-w-sm text-sm text-slate-500">{CRM_TRAINING_DETAIL_COPY.notFoundHint}</p>
            <div className="mt-8 flex flex-col items-center gap-3 sm:flex-row sm:justify-center">
              <Link
                href="/schedule"
                className="inline-flex w-full items-center justify-center gap-2 rounded-xl border border-white/15 bg-white/5 px-5 py-2.5 text-sm font-medium text-neon-blue transition-colors hover:border-neon-blue/40 hover:bg-neon-blue/10 sm:w-auto"
              >
                <ArrowLeft className="h-4 w-4" aria-hidden />
                {CRM_TRAINING_DETAIL_COPY.backToScheduleCta}
              </Link>
              <Link
                href="/schedule"
                className="inline-flex w-full items-center justify-center gap-2 rounded-xl border border-white/15 bg-white/5 px-5 py-2.5 text-sm font-medium text-slate-300 transition-colors hover:border-white/25 hover:text-white sm:w-auto"
              >
                {CRM_TRAINING_DETAIL_COPY.backTrainingsCta}
                <ChevronRight className="h-4 w-4 opacity-60" aria-hidden />
              </Link>
            </div>
          </Card>
        </div>
      </div>
    );
  }

  const safePlayers = Array.isArray(players) ? players : [];
  const teamLabel = training.team?.name ?? CRM_PLAYER_DETAIL_COPY.noTeam;
  const agePart = training.team?.ageGroup ? ` · ${training.team.ageGroup}` : "";

  const arenaFocusScheduleText = normalizeTrainingText(training.arenaNextTrainingFocus);

  const reportSummaryText = normalizeTrainingText(reportData?.summary);
  const reportCoachNoteText = normalizeTrainingText(reportData?.coachNote);
  const reportFocusAreasText = normalizeTrainingText(reportData?.focusAreas);
  const reportParentMessageText = normalizeTrainingText(reportData?.parentMessage);

  type ReportPrimaryKind = "summary" | "coach" | "parent" | "focus";
  let reportPrimaryKind: ReportPrimaryKind | null = null;
  let reportPrimaryText: string | null = null;
  if (reportSummaryText) {
    reportPrimaryKind = "summary";
    reportPrimaryText = reportSummaryText;
  } else if (reportCoachNoteText) {
    reportPrimaryKind = "coach";
    reportPrimaryText = reportCoachNoteText;
  } else if (reportParentMessageText) {
    reportPrimaryKind = "parent";
    reportPrimaryText = reportParentMessageText;
  } else if (reportFocusAreasText) {
    reportPrimaryKind = "focus";
    reportPrimaryText = reportFocusAreasText;
  }

  const hasReportContent = Boolean(reportPrimaryText);
  const showSecondaryCoachNote =
    reportPrimaryKind === "summary" &&
    reportCoachNoteText &&
    reportCoachNoteText !== reportSummaryText;
  const showReportFocusLine =
    Boolean(reportFocusAreasText) &&
    reportFocusAreasText !== reportPrimaryText &&
    reportPrimaryKind !== "focus";
  const showReportParentLine =
    Boolean(reportParentMessageText) &&
    reportPrimaryKind !== "parent" &&
    reportParentMessageText !== reportPrimaryText;

  const formattedReportUpdated =
    reportData?.updatedAt && hasReportContent
      ? new Date(reportData.updatedAt).toLocaleString("ru-RU", {
          day: "numeric",
          month: "short",
          year: "numeric",
          hour: "2-digit",
          minute: "2-digit",
        })
      : null;

  const evalRowsWithData = evaluationsPlayers.filter(
    (row) => row.evaluation && evaluationHasContent(row.evaluation)
  );

  const formatEvalScore = (n: number | undefined) => {
    if (n == null || n < 1 || n > 5) return "—";
    return `${n}/5`;
  };

  const secondaryCoachPreview = showSecondaryCoachNote
    ? trimNotePreview(reportCoachNoteText!, coachNoteExpanded)
    : { text: "", truncated: false };

  return (
    <div className="overflow-x-hidden px-4 py-6 sm:px-6 md:px-8">
      <div className="mx-auto max-w-7xl space-y-6">
        <div className="flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-center sm:justify-between">
          <Link
            href="/schedule"
            className="inline-flex items-center gap-2 text-sm text-slate-400 transition-colors hover:text-neon-blue"
          >
            <ArrowLeft className="h-4 w-4" aria-hidden />
            {CRM_TRAINING_DETAIL_COPY.backSchedule}
          </Link>
          <Link
            href="/schedule"
            className="inline-flex items-center gap-1 text-sm font-medium text-slate-500 transition-colors hover:text-neon-blue"
          >
            {CRM_TRAINING_DETAIL_COPY.backTrainingsCta}
            <ChevronRight className="h-4 w-4 opacity-60" aria-hidden />
          </Link>
        </div>

        <Card className="overflow-hidden rounded-2xl border-white/[0.1] bg-gradient-to-br from-white/[0.06] to-transparent shadow-[0_0_32px_rgba(0,212,255,0.08)]">
          <div className="relative flex flex-col gap-5 p-5 sm:p-6">
            <div
              className="pointer-events-none absolute left-0 top-0 h-full w-1 rounded-l-2xl bg-gradient-to-b from-neon-blue via-neon-cyan/80 to-neon-pink/60"
              aria-hidden
            />
            <div className="pl-1 sm:pl-2">
              <p className="text-[11px] font-semibold uppercase tracking-wider text-neon-blue/90">
                {CRM_TRAINING_DETAIL_COPY.heroEyebrow}
              </p>
              <h1 className="mt-1 font-display text-2xl font-bold tracking-tight text-white sm:text-3xl">{training.title}</h1>
              <div className="mt-4 flex flex-wrap gap-x-5 gap-y-2 text-sm text-slate-400">
                <span className="inline-flex items-center gap-1.5">
                  <Users className="h-4 w-4 shrink-0 opacity-70" aria-hidden />
                  {training.team?.id ? (
                    <Link
                      href={`/teams/${training.team.id}`}
                      className="group inline-flex max-w-full items-center gap-1 font-medium text-white transition-colors hover:text-neon-blue"
                    >
                      <span className="truncate">
                        {teamLabel}
                        {agePart}
                      </span>
                      <ChevronRight className="h-4 w-4 shrink-0 opacity-50 transition-opacity group-hover:opacity-100" aria-hidden />
                    </Link>
                  ) : (
                    <span>
                      {teamLabel}
                      {agePart}
                    </span>
                  )}
                </span>
                {coachName ? (
                  <span className="inline-flex items-center gap-1.5">
                    <User className="h-4 w-4 shrink-0 opacity-70" aria-hidden />
                    {CRM_TEAMS_LIST_COPY.coachPrefix}: {coachName}
                  </span>
                ) : null}
                <span className="inline-flex items-center gap-1.5">
                  <Calendar className="h-4 w-4 shrink-0 opacity-70" aria-hidden />
                  {training.startTime
                    ? new Date(training.startTime).toLocaleDateString("ru-RU", {
                        weekday: "short",
                        day: "numeric",
                        month: "short",
                        year: "numeric",
                      })
                    : "—"}
                </span>
                <span className="inline-flex items-center gap-1.5">
                  <Clock className="h-4 w-4 shrink-0 opacity-70" aria-hidden />
                  {training.startTime
                    ? new Date(training.startTime).toLocaleTimeString("ru-RU", {
                        hour: "2-digit",
                        minute: "2-digit",
                      })
                    : "—"}
                  —
                  {training.endTime
                    ? new Date(training.endTime).toLocaleTimeString("ru-RU", {
                        hour: "2-digit",
                        minute: "2-digit",
                      })
                    : "—"}
                  {duration != null ? ` (${duration} ${CRM_TRAINING_DETAIL_COPY.minutesShort})` : ""}
                </span>
                {training.location ? (
                  <span className="inline-flex min-w-0 items-center gap-1.5">
                    <MapPin className="h-4 w-4 shrink-0 opacity-70" aria-hidden />
                    <span className="truncate">{training.location}</span>
                  </span>
                ) : null}
              </div>
              {training.notes ? <p className="mt-4 border-t border-white/[0.08] pt-4 text-sm leading-relaxed text-slate-500">{training.notes}</p> : null}
            </div>
          </div>
        </Card>

        {arenaFocusScheduleText ? (
          <div className="rounded-xl border border-white/[0.08] bg-white/[0.02] px-4 py-3">
            <p className="text-[11px] font-semibold uppercase tracking-wider text-slate-500">
              Фокус тренировки
            </p>
            <p className="mt-1.5 text-sm leading-relaxed text-slate-200">{arenaFocusScheduleText}</p>
            <p className="mt-2 text-[11px] leading-relaxed text-slate-600">
              Источник в базе не размечен: текст мог быть введён вручную или записан из Arena (CRM).
            </p>
          </div>
        ) : null}

        {showCanonicalVoiceBlocks ? (
          <>
            <DetailSectionCard
              kicker={CRM_TRAINING_DETAIL_COPY.voiceOutcomeKicker}
              title={CRM_TRAINING_DETAIL_COPY.voiceOutcomeTitle}
              icon={Sparkles}
              iconClassName="text-neon-cyan"
            >
              {reportLoading ? (
                <div className="space-y-3 px-5 py-6 sm:px-6">
                  <div className="h-4 w-full max-w-xl animate-pulse rounded-md bg-white/[0.08]" />
                  <div className="h-4 w-full max-w-lg animate-pulse rounded-md bg-white/[0.06]" />
                  <div className="h-3 w-40 animate-pulse rounded-md bg-white/[0.05]" />
                </div>
              ) : reportError ? (
                <div className="flex flex-col gap-3 px-5 py-6 sm:flex-row sm:items-center sm:justify-between sm:px-6">
                  <p className="text-sm text-amber-200/90">{CRM_TRAINING_DETAIL_COPY.voiceOutcomeError}</p>
                  <Button
                    variant="secondary"
                    size="sm"
                    type="button"
                    onClick={() => setReportRetryKey((k) => k + 1)}
                  >
                    {CRM_TRAINING_DETAIL_COPY.voiceOutcomeRetry}
                  </Button>
                </div>
              ) : !hasReportContent ? (
                <p className="px-5 py-8 text-center text-sm text-slate-500 sm:px-6">
                  {CRM_TRAINING_DETAIL_COPY.voiceOutcomeEmpty}
                </p>
              ) : (
                <div className="space-y-4 px-5 py-6 sm:px-6">
                  <p className="text-[15px] leading-relaxed text-slate-200">{reportPrimaryText}</p>
                  {showReportFocusLine ? (
                    <p className="text-sm text-slate-400">
                      <span className="font-medium text-slate-500">
                        {CRM_TRAINING_DETAIL_COPY.voiceOutcomeFocusLabel}:{" "}
                      </span>
                      {reportFocusAreasText}
                    </p>
                  ) : null}
                  {showReportParentLine ? (
                    <p className="text-sm leading-relaxed text-slate-400">
                      <span className="font-medium text-slate-500">
                        {CRM_TRAINING_DETAIL_COPY.voiceOutcomeForParents}:{" "}
                      </span>
                      {reportParentMessageText}
                    </p>
                  ) : null}
                  {showSecondaryCoachNote ? (
                    <div className="rounded-xl border border-white/[0.08] bg-white/[0.03] px-4 py-3">
                      <p className="text-[11px] font-semibold uppercase tracking-wider text-slate-500">
                        {CRM_TRAINING_DETAIL_COPY.voiceOutcomeCoachNotes}
                      </p>
                      <p className="mt-2 whitespace-pre-wrap text-sm leading-relaxed text-slate-400">
                        {secondaryCoachPreview.text}
                      </p>
                      {secondaryCoachPreview.truncated || coachNoteExpanded ? (
                        <button
                          type="button"
                          onClick={() => setCoachNoteExpanded((e) => !e)}
                          className="mt-2 text-xs font-medium text-neon-blue hover:text-neon-cyan"
                        >
                          {coachNoteExpanded
                            ? CRM_TRAINING_DETAIL_COPY.voiceOutcomeCollapse
                            : CRM_TRAINING_DETAIL_COPY.voiceOutcomeExpand}
                        </button>
                      ) : null}
                    </div>
                  ) : null}
                  {formattedReportUpdated ? (
                    <p className="text-[11px] text-slate-600">
                      {CRM_TRAINING_DETAIL_COPY.voiceOutcomeUpdated}: {formattedReportUpdated}
                    </p>
                  ) : null}
                </div>
              )}
            </DetailSectionCard>

            <DetailSectionCard
              kicker={CRM_TRAINING_DETAIL_COPY.sessionEvalKicker}
              title={CRM_TRAINING_DETAIL_COPY.sessionEvalTitle}
              icon={ClipboardList}
              iconClassName="text-neon-pink/90"
            >
              {evaluationsLoading ? (
                <div className="space-y-2 px-5 py-6 sm:px-6">
                  <div className="h-9 w-full animate-pulse rounded-lg bg-white/[0.06]" />
                  <div className="h-9 w-full animate-pulse rounded-lg bg-white/[0.05]" />
                  <div className="h-9 max-w-md animate-pulse rounded-lg bg-white/[0.04]" />
                </div>
              ) : evaluationsError ? (
                <div className="flex flex-col gap-3 px-5 py-6 sm:flex-row sm:items-center sm:justify-between sm:px-6">
                  <p className="text-sm text-amber-200/90">{CRM_TRAINING_DETAIL_COPY.sessionEvalError}</p>
                  <Button
                    variant="secondary"
                    size="sm"
                    type="button"
                    onClick={() => setEvaluationsRetryKey((k) => k + 1)}
                  >
                    {CRM_TRAINING_DETAIL_COPY.sessionEvalRetry}
                  </Button>
                </div>
              ) : evalRowsWithData.length === 0 ? (
                <p className="px-5 py-8 text-center text-sm text-slate-500 sm:px-6">
                  {CRM_TRAINING_DETAIL_COPY.sessionEvalEmpty}
                </p>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full min-w-[560px] text-sm">
                    <thead>
                      <tr className="border-b border-white/[0.08] bg-white/[0.02] text-left text-slate-500">
                        <th
                          scope="col"
                          className="px-4 py-3 text-[11px] font-semibold uppercase tracking-wider sm:px-5"
                        >
                          {CRM_TRAINING_DETAIL_COPY.colPlayer}
                        </th>
                        <th
                          scope="col"
                          className="px-4 py-3 text-center text-[11px] font-semibold uppercase tracking-wider sm:px-5"
                        >
                          {CRM_TRAINING_DETAIL_COPY.sessionEvalColEffort}
                        </th>
                        <th
                          scope="col"
                          className="px-4 py-3 text-center text-[11px] font-semibold uppercase tracking-wider sm:px-5"
                        >
                          {CRM_TRAINING_DETAIL_COPY.sessionEvalColFocus}
                        </th>
                        <th
                          scope="col"
                          className="px-4 py-3 text-center text-[11px] font-semibold uppercase tracking-wider sm:px-5"
                        >
                          {CRM_TRAINING_DETAIL_COPY.sessionEvalColDiscipline}
                        </th>
                        <th
                          scope="col"
                          className="px-4 py-3 text-[11px] font-semibold uppercase tracking-wider sm:px-5"
                        >
                          {CRM_TRAINING_DETAIL_COPY.sessionEvalColNote}
                        </th>
                      </tr>
                    </thead>
                    <tbody>
                      {evalRowsWithData.map((row) => {
                        const ev = row.evaluation!;
                        const noteRaw = ev.note?.trim() ?? "";
                        const expanded = evalNoteExpanded[row.playerId] ?? false;
                        const notePrev = trimNotePreview(noteRaw, expanded);
                        return (
                          <tr
                            key={row.playerId}
                            className="border-b border-white/[0.05] transition-colors hover:bg-white/[0.03]"
                          >
                            <td className="px-4 py-3 align-top sm:px-5">
                              <div className="font-medium text-white">{row.name}</div>
                              {evalLiveContextByPlayer[row.playerId] ? (
                                <p
                                  className="mt-1 max-w-[min(100%,280px)] text-[10px] leading-snug text-slate-500"
                                  title={`${CRM_TRAINING_DETAIL_COPY.evalLiveContextPrefix} ${evalLiveContextByPlayer[row.playerId]}`}
                                >
                                  {CRM_TRAINING_DETAIL_COPY.evalLiveContextPrefix}{" "}
                                  {evalLiveContextByPlayer[row.playerId]}
                                </p>
                              ) : null}
                            </td>
                            <td className="px-4 py-3 text-center align-top text-slate-300 sm:px-5">
                              {formatEvalScore(ev.effort)}
                            </td>
                            <td className="px-4 py-3 text-center align-top text-slate-300 sm:px-5">
                              {formatEvalScore(ev.focus)}
                            </td>
                            <td className="px-4 py-3 text-center align-top text-slate-300 sm:px-5">
                              {formatEvalScore(ev.discipline)}
                            </td>
                            <td className="max-w-[220px] px-4 py-3 align-top text-slate-400 sm:px-5">
                              {noteRaw ? (
                                <>
                                  <span className="text-sm leading-snug">{notePrev.text}</span>
                                  {notePrev.truncated || expanded ? (
                                    <button
                                      type="button"
                                      onClick={() =>
                                        setEvalNoteExpanded((prev) => ({
                                          ...prev,
                                          [row.playerId]: !expanded,
                                        }))
                                      }
                                      className="mt-1 block text-left text-xs font-medium text-neon-blue hover:text-neon-cyan"
                                    >
                                      {expanded
                                        ? CRM_TRAINING_DETAIL_COPY.voiceOutcomeCollapse
                                        : CRM_TRAINING_DETAIL_COPY.voiceOutcomeExpand}
                                    </button>
                                  ) : null}
                                </>
                              ) : (
                                <span className="text-slate-600">—</span>
                              )}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              )}
            </DetailSectionCard>
          </>
        ) : null}

        <DetailSectionCard
          kicker={CRM_TRAINING_DETAIL_COPY.attendanceKicker}
          title={CRM_TRAINING_DETAIL_COPY.attendanceTitle}
          icon={Users}
          iconClassName="text-neon-blue"
          action={
            canEditTraining && safePlayers.length > 0 ? (
              <Button
                variant="secondary"
                size="sm"
                onClick={markAllPresent}
                disabled={saving === "bulk"}
                className="gap-2"
              >
                {saving === "bulk" ? (
                  <Loader2 className="h-4 w-4 animate-spin" aria-hidden />
                ) : (
                  <Check className="h-4 w-4" aria-hidden />
                )}
                {CRM_TRAINING_DETAIL_COPY.markAllPresent}
              </Button>
            ) : undefined
          }
        >
          {safePlayers.length === 0 ? (
            <p className="px-5 py-8 text-center text-sm text-slate-500 sm:px-6">{CRM_TRAINING_DETAIL_COPY.emptyRoster}</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full min-w-[640px] text-sm">
                <thead>
                  <tr className="border-b border-white/[0.08] bg-white/[0.02] text-left text-slate-500">
                    <th scope="col" className="px-4 py-3.5 text-[11px] font-semibold uppercase tracking-wider sm:px-5">
                      {CRM_TRAINING_DETAIL_COPY.colPlayer}
                    </th>
                    <th scope="col" className="px-4 py-3.5 text-[11px] font-semibold uppercase tracking-wider sm:px-5">
                      {CRM_TRAINING_DETAIL_COPY.colStatus}
                    </th>
                    <th scope="col" className="px-4 py-3.5 text-[11px] font-semibold uppercase tracking-wider sm:px-5">
                      {CRM_TRAINING_DETAIL_COPY.colRating}
                    </th>
                    <th scope="col" className="px-4 py-3.5 text-[11px] font-semibold uppercase tracking-wider sm:px-5">
                      {CRM_TRAINING_DETAIL_COPY.colComment}
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {safePlayers.map((p) => {
                    const current = getStatusForPlayer(p.id);
                    const rating = ratings[p.id] ?? 0;
                    const isSaving = saving === p.id || saving === `rating-${p.id}`;

                    return (
                      <tr
                        key={p.id}
                        className="border-b border-white/[0.05] transition-colors hover:bg-white/[0.03]"
                      >
                        <td className="px-4 py-3.5 sm:px-5">
                          <div className="flex items-center gap-3">
                            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border border-white/[0.08] bg-neon-blue/15">
                              <UserCircle className="h-4 w-4 text-neon-blue" aria-hidden />
                            </div>
                            <span className="font-medium text-white">
                              {p.firstName} {p.lastName}
                            </span>
                          </div>
                        </td>
                        <td className="px-4 py-3.5 sm:px-5">
                          {canEditTraining ? (
                            <div className="flex flex-wrap items-center gap-1">
                              {quickStatuses.map((status) => {
                                const cfg = STATUS_CONFIG[status];
                                const Icon = cfg.icon;
                                return (
                                  <button
                                    key={status}
                                    type="button"
                                    onClick={() => updateAttendance(p.id, status)}
                                    disabled={isSaving}
                                    className={cn(
                                      "inline-flex items-center gap-1 rounded-lg border px-2.5 py-1 text-xs font-medium transition-all disabled:opacity-50",
                                      cfg.className,
                                      current === status ? "ring-2 ring-white/30" : "opacity-80"
                                    )}
                                    title={cfg.label}
                                  >
                                    <Icon className="h-3.5 w-3.5" aria-hidden />
                                    {status === "PRESENT" ? "✓" : "✕"}
                                  </button>
                                );
                              })}
                              {current ? (
                                <span className="ml-1 text-xs text-slate-500">
                                  {STATUS_CONFIG[current]?.label ?? current}
                                </span>
                              ) : null}
                            </div>
                          ) : (
                            <span className="text-slate-400">
                              {current ? STATUS_CONFIG[current]?.label ?? current : "—"}
                            </span>
                          )}
                        </td>
                        <td className="px-4 py-3.5 sm:px-5">
                          {training.team?.coach?.id ? (
                            canEditTraining ? (
                              <select
                                value={rating || ""}
                                onChange={(e) => {
                                  const v = parseInt(e.target.value, 10);
                                  if (!isNaN(v) && v >= 1 && v <= 5) {
                                    setRatings((prev) => ({ ...prev, [p.id]: v }));
                                    saveRating(p.id, v);
                                  }
                                }}
                                disabled={isSaving}
                                className="rounded-xl border border-white/[0.12] bg-white/[0.05] px-2 py-1.5 text-sm text-white focus:border-neon-blue focus:outline-none focus:ring-1 focus:ring-neon-blue disabled:opacity-50"
                              >
                                <option value="">—</option>
                                {[1, 2, 3, 4, 5].map((n) => (
                                  <option key={n} value={n}>
                                    {n} ★
                                  </option>
                                ))}
                              </select>
                            ) : (
                              <span className="text-slate-400">{rating ? `${rating} ★` : "—"}</span>
                            )
                          ) : (
                            <span className="text-xs text-slate-500">{CRM_TRAINING_DETAIL_COPY.noCoachRating}</span>
                          )}
                        </td>
                        <td className="px-4 py-3.5 sm:px-5">
                          {canEditTraining ? (
                            <input
                              type="text"
                              placeholder={CRM_TRAINING_DETAIL_COPY.commentPlaceholder}
                              value={comments[p.id] ?? ""}
                              onChange={(e) =>
                                setComments((prev) => ({ ...prev, [p.id]: e.target.value }))
                              }
                              onBlur={() => {
                                if (current) {
                                  updateAttendance(p.id, current);
                                }
                                if (rating && training.team?.coach?.id) {
                                  saveRating(p.id, rating, comments[p.id]);
                                }
                              }}
                              className="min-w-[140px] max-w-[220px] rounded-xl border border-white/[0.12] bg-white/[0.05] px-3 py-1.5 text-sm text-white placeholder:text-slate-500 focus:border-neon-blue focus:outline-none focus:ring-1 focus:ring-neon-blue"
                            />
                          ) : (
                            <span className="text-sm text-slate-400">{comments[p.id] || "—"}</span>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </DetailSectionCard>
      </div>
    </div>
  );
}
