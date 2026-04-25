"use client";

import { useEffect, useState, type ReactNode } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import type { LucideIcon } from "lucide-react";
import {
  ArrowLeft,
  Calendar,
  Pencil,
  Trash2,
  Plus,
  Users,
  BarChart3,
  UserCircle,
  MapPin,
  Clock,
  Loader2,
  ChevronRight,
} from "lucide-react";
import { Card } from "@/components/Card";
import { Button } from "@/components/Button";
import { cn } from "@/lib/utils";
import { CRM_TEAM_DETAIL_COPY } from "@/lib/crmTeamDetailCopy";
import { CRM_TEAMS_LIST_COPY } from "@/lib/crmTeamsListCopy";
import { crmPlayersCountLabel } from "@/lib/crmPlayersListCopy";
import { crmPlayerDetailStatusPillClass } from "@/lib/crmPlayerDetailCopy";
import {
  CrmArenaGroupSnapshotInline,
  CrmArenaSnapshotWireRegion,
  CrmArenaSupercoreOperationalFocusSection,
  CrmArenaTeamSnapshotSection,
} from "@/components/crm/CrmArenaSnapshotSections";
import { CrmTeamPlannedVsObservedSummary } from "@/components/crm/CrmTeamPlannedVsObservedSummary";
import type {
  TeamPlannedVsObservedHistoryRowDto,
  TeamPlannedVsObservedSummaryDto,
} from "@/lib/live-training/arena-planned-vs-observed-live-fact.dto";
import type { TeamPlannedVsObservedContinuityDto } from "@/lib/live-training/arena-planned-vs-observed-continuity";
import { useArenaCrmSupercoreOperationalFocus } from "@/hooks/useArenaCrmSupercoreOperationalFocus";
import { usePermissions } from "@/hooks/usePermissions";

type CrmLiveExecutionStatus = "live" | "review" | "confirmed" | "cancelled";

interface Team {
  id: string;
  name: string;
  ageGroup: string;
  school?: { id: string; name: string } | null;
  /** Ближайший будущий слот TrainingSession (для Arena → schedule). */
  nextScheduledTrainingSession?: {
    id: string;
    startAt: string;
    /** Есть ли непустой `arenaNextTrainingFocus` на этом слоте. */
    hasPlannedFocus?: boolean;
  } | null;
  /** Компактный срез живой тренировки + черновик отчёта (без новых сущностей). */
  crmLiveExecutionVisibility?: {
    latestLiveSessionId: string | null;
    latestLiveStatus: CrmLiveExecutionStatus | null;
    latestLiveConfirmedAt: string | null;
    reportDraftStatus: "draft" | "ready" | null;
  };
  /** Командный слой: `nextTrainingFocus` + `team` из `sessionMeaningNextActionsV1`, до 2 строк. */
  teamNextActions?: string[];
  /** Игроки из `sessionMeaningNextActionsV1.players` (до 3, по 2 action). */
  teamPlayerFollowUp?: Array<{ playerId: string; playerName: string; actions: string[] }>;
  /** Агрегат внимания по составу (триггеры + прогресс), без имён. */
  teamAttentionSummary?: { attentionCount: number; watchCount: number };
  /** Сдвиг команды относительно прошлой live (`sessionMeaningProgressV1.team`), без имён игроков. */
  teamDevelopmentSnapshot?: { headline: string; support?: string };
  /** Последний персистентный факт план vs наблюдения (GET /api/teams/[id], additive). */
  teamPlannedVsObservedSummary?: TeamPlannedVsObservedSummaryDto;
  /** Предыдущие факты (без последнего), до 4 строк — additive. */
  teamPlannedVsObservedHistory?: TeamPlannedVsObservedHistoryRowDto[];
  /** Детерминированная оценка по последним N фактам — additive. */
  teamPlannedVsObservedContinuity?: TeamPlannedVsObservedContinuityDto;
  coach?: { id: string; firstName: string; lastName: string } | null;
  players?: Player[];
  trainings?: Training[];
}

interface Player {
  id: string;
  firstName: string;
  lastName: string;
  birthYear?: number;
  position?: string;
  status?: string;
  photoUrl?: string | null;
}

interface Training {
  id: string;
  title: string;
  startTime: string;
  endTime: string;
  location: string | null;
  notes: string | null;
  attendances?: { status: string; player: { id: string } }[];
}

function buildCrmTeamExecutionCopy(
  vis: NonNullable<Team["crmLiveExecutionVisibility"]>,
  nextSlotHasPlannedFocus: boolean
): { title: string; subtitle: string | null } {
  if (!vis.latestLiveSessionId && !vis.latestLiveStatus) {
    return {
      title: "Живых тренировок по команде ещё не было",
      subtitle: nextSlotHasPlannedFocus
        ? "В ближайшем слоте расписания уже указан фокус тренировки"
        : null,
    };
  }
  const st = vis.latestLiveStatus;
  if (st === "live") {
    return {
      title: "Сейчас идёт живая тренировка",
      subtitle: "После завершения итог появится в coach app",
    };
  }
  if (st === "review") {
    return {
      title: "Тренировка на проверке у тренера",
      subtitle: "Подтвердите сессию в coach app",
    };
  }
  if (st === "cancelled") {
    return {
      title: "Последняя живая сессия отменена",
      subtitle: nextSlotHasPlannedFocus
        ? "В ближайшем слоте расписания указан фокус"
        : null,
    };
  }
  if (st === "confirmed") {
    let subtitle: string;
    if (vis.reportDraftStatus === "ready") {
      subtitle = "Отчёт опубликован — см. слот в расписании CRM";
    } else if (vis.reportDraftStatus === "draft") {
      subtitle = "Есть черновик отчёта в coach app";
    } else {
      subtitle = "Черновик отчёта ещё не создан";
    }
    if (nextSlotHasPlannedFocus && vis.reportDraftStatus !== "ready") {
      subtitle += " · ближайший слот с фокусом в расписании";
    }
    return {
      title: "Последняя живая тренировка подтверждена",
      subtitle,
    };
  }
  return { title: "Статус живой тренировки", subtitle: null };
}

function formatNextScheduledSlotLabel(startAtIso: string): string {
  const d = new Date(startAtIso);
  if (Number.isNaN(d.getTime())) return startAtIso;
  return `${d.toLocaleDateString("ru-RU", {
    weekday: "short",
    day: "numeric",
    month: "short",
    year: "numeric",
  })} · ${d.toLocaleTimeString("ru-RU", { hour: "2-digit", minute: "2-digit" })}`;
}

function DetailSectionCard({
  kicker,
  title,
  hint,
  icon: Icon,
  iconClassName,
  children,
}: {
  kicker: string;
  title: string;
  hint?: string;
  icon: LucideIcon;
  iconClassName: string;
  children: ReactNode;
}) {
  return (
    <Card className="overflow-hidden border-white/[0.1] p-0">
      <div className="flex items-start gap-3 border-b border-white/[0.08] bg-white/[0.02] px-5 py-4 sm:px-6">
        <Icon className={cn("mt-0.5 h-5 w-5 shrink-0", iconClassName)} aria-hidden />
        <div className="min-w-0">
          <p className="text-[11px] font-semibold uppercase tracking-wider text-slate-500">{kicker}</p>
          <h2 className="font-display text-base font-semibold tracking-tight text-white sm:text-lg">{title}</h2>
          {hint ? <p className="mt-1 text-xs leading-relaxed text-slate-600">{hint}</p> : null}
        </div>
      </div>
      <div className="p-5 sm:p-6">{children}</div>
    </Card>
  );
}

function ruApplyCountWord(n: number): string {
  const m10 = n % 10;
  const m100 = n % 100;
  if (m10 === 1 && m100 !== 11) return "раз";
  if (m10 >= 2 && m10 <= 4 && (m100 < 10 || m100 >= 20)) return "раза";
  return "раз";
}

export function TeamDetailPageClient({
  arenaLiveFocusAppliedLast30Days,
}: {
  /** `null` — не показываем блок (ошибка загрузки снимка на сервере). */
  arenaLiveFocusAppliedLast30Days: number | null;
}) {
  const params = useParams();
  const router = useRouter();
  const { canEdit } = usePermissions();
  const id = (params?.id as string) ?? "";
  const [team, setTeam] = useState<Team | null>(null);
  const [loading, setLoading] = useState(true);
  const [fetchError, setFetchError] = useState(false);
  const [reloadKey, setReloadKey] = useState(0);
  const arenaCrmWire = useArenaCrmSupercoreOperationalFocus(
    id ? `/api/teams/${id}/arena-crm-snapshot` : null,
    reloadKey
  );
  const arenaSupercoreFocusLines = arenaCrmWire.supercoreOperationalFocus;
  const [applyFocusBusy, setApplyFocusBusy] = useState(false);
  const [applyFocusError, setApplyFocusError] = useState<string | null>(null);
  const [applyFocusOk, setApplyFocusOk] = useState(false);

  const nextSlot = team?.nextScheduledTrainingSession ?? null;
  const firstFocusLine = arenaSupercoreFocusLines?.[0];
  const executionCopy =
    team?.crmLiveExecutionVisibility != null
      ? buildCrmTeamExecutionCopy(team.crmLiveExecutionVisibility, Boolean(nextSlot?.hasPlannedFocus))
      : null;

  useEffect(() => {
    setApplyFocusOk(false);
    setApplyFocusError(null);
  }, [
    id,
    nextSlot?.id,
    firstFocusLine?.bindingDecisionId,
    firstFocusLine?.liveTrainingSessionId,
  ]);

  useEffect(() => {
    if (!id) {
      setLoading(false);
      setTeam(null);
      setFetchError(false);
      return;
    }
    setLoading(true);
    setFetchError(false);
    fetch(`/api/teams/${id}`)
      .then(async (r) => {
        const data = await r.json().catch(() => ({}));
        if (!r.ok) throw new Error("fetch failed");
        return data;
      })
      .then((data) => {
        if (data?.error || !data?.id) {
          setTeam(null);
          setFetchError(false);
        } else {
          setTeam(data);
          setFetchError(false);
        }
      })
      .catch(() => {
        setFetchError(true);
        setTeam(null);
      })
      .finally(() => setLoading(false));
  }, [id, reloadKey]);

  const handleDelete = async () => {
    if (!confirm(CRM_TEAM_DETAIL_COPY.confirmDelete)) return;
    const res = await fetch(`/api/teams/${id}`, { method: "DELETE" });
    if (res.ok) router.push("/teams");
  };

  const handleApplyArenaFocusToNextTraining = async () => {
    const line = arenaSupercoreFocusLines?.[0];
    const slotId = nextSlot?.id;
    if (!line?.liveTrainingSessionId || !slotId || applyFocusBusy) return;
    const focusLine = [line.title, line.body]
      .map((s) => String(s ?? "").trim())
      .filter(Boolean)
      .join(" — ");
    if (!focusLine) return;
    setApplyFocusBusy(true);
    setApplyFocusError(null);
    setApplyFocusOk(false);
    try {
      const res = await fetch(
        `/api/live-training/sessions/${encodeURIComponent(line.liveTrainingSessionId)}/apply-arena-next-training-focus`,
        {
          method: "POST",
          credentials: "include",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            targetTrainingSessionId: slotId,
            focusLine,
            explicitOverwrite: true,
          }),
        }
      );
      const data = (await res.json().catch(() => ({}))) as { error?: string };
      if (!res.ok) {
        setApplyFocusError(data?.error ?? "Не удалось применить фокус");
        return;
      }
      setApplyFocusOk(true);
      setReloadKey((k) => k + 1);
      router.refresh();
    } catch {
      setApplyFocusError("Ошибка сети");
    } finally {
      setApplyFocusBusy(false);
    }
  };

  if (loading) {
    return (
      <div className="overflow-x-hidden px-4 py-6 sm:px-6 md:px-8">
        <div className="mx-auto max-w-7xl space-y-8">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <Link
              href="/teams"
              className="inline-flex items-center gap-2 text-sm text-slate-400 transition-colors hover:text-neon-blue"
            >
              <ArrowLeft className="h-4 w-4" aria-hidden />
              {CRM_TEAM_DETAIL_COPY.backShort}
            </Link>
            <Link
              href="/schedule"
              className="text-sm font-medium text-slate-500 transition-colors hover:text-neon-blue"
            >
              {CRM_TEAM_DETAIL_COPY.backSchedule}
            </Link>
          </div>
          <Card className="mx-auto max-w-3xl border-white/[0.1]">
            <div className="flex flex-col items-center justify-center gap-4 py-16">
              <Loader2 className="h-10 w-10 animate-spin text-neon-blue" aria-hidden />
              <div className="text-center">
                <p className="font-display text-base font-semibold text-white">{CRM_TEAM_DETAIL_COPY.loadingTitle}</p>
                <p className="mt-1 text-sm text-slate-500">{CRM_TEAM_DETAIL_COPY.loadingHint}</p>
              </div>
            </div>
          </Card>
        </div>
      </div>
    );
  }

  if (fetchError) {
    return (
      <div className="overflow-x-hidden px-4 py-6 sm:px-6 md:px-8">
        <div className="mx-auto max-w-7xl space-y-8">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <Link
              href="/teams"
              className="inline-flex items-center gap-2 text-sm text-slate-400 transition-colors hover:text-neon-blue"
            >
              <ArrowLeft className="h-4 w-4" aria-hidden />
              {CRM_TEAM_DETAIL_COPY.backShort}
            </Link>
            <Link
              href="/schedule"
              className="text-sm font-medium text-slate-500 transition-colors hover:text-neon-blue"
            >
              {CRM_TEAM_DETAIL_COPY.backSchedule}
            </Link>
          </div>
          <div
            className="mx-auto flex max-w-3xl flex-col gap-3 rounded-2xl border border-amber-500/25 bg-amber-500/10 px-4 py-4 sm:flex-row sm:items-center sm:justify-between sm:px-5"
            role="alert"
          >
            <div>
              <p className="font-medium text-amber-100">{CRM_TEAM_DETAIL_COPY.errorTitle}</p>
              <p className="mt-0.5 text-sm text-amber-200/80">{CRM_TEAM_DETAIL_COPY.errorHint}</p>
            </div>
            <button
              type="button"
              onClick={() => setReloadKey((k) => k + 1)}
              className="shrink-0 rounded-xl border border-amber-400/40 bg-white/10 px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-white/15"
            >
              {CRM_TEAM_DETAIL_COPY.retryCta}
            </button>
          </div>
        </div>
      </div>
    );
  }

  if (!team) {
    return (
      <div className="overflow-x-hidden px-4 py-6 sm:px-6 md:px-8">
        <div className="mx-auto max-w-7xl space-y-8">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <Link
              href="/teams"
              className="inline-flex items-center gap-2 text-sm text-slate-400 transition-colors hover:text-neon-blue"
            >
              <ArrowLeft className="h-4 w-4" aria-hidden />
              {CRM_TEAM_DETAIL_COPY.backShort}
            </Link>
            <Link
              href="/schedule"
              className="text-sm font-medium text-slate-500 transition-colors hover:text-neon-blue"
            >
              {CRM_TEAM_DETAIL_COPY.backSchedule}
            </Link>
          </div>
          <div className="mx-auto max-w-2xl">
            <Card className="border-white/[0.1] p-8 text-center">
              <p className="font-display text-lg font-semibold text-white">{CRM_TEAM_DETAIL_COPY.notFoundTitle}</p>
              <p className="mx-auto mt-2 max-w-sm text-sm text-slate-500">{CRM_TEAM_DETAIL_COPY.notFoundHint}</p>
              <div className="mt-8 flex flex-col items-center gap-3 sm:flex-row sm:justify-center">
                <Link
                  href="/teams"
                  className="inline-flex w-full items-center justify-center gap-2 rounded-xl border border-white/15 bg-white/5 px-5 py-2.5 text-sm font-medium text-neon-blue transition-colors hover:border-neon-blue/40 hover:bg-neon-blue/10 sm:w-auto"
                >
                  <ArrowLeft className="h-4 w-4" aria-hidden />
                  {CRM_TEAM_DETAIL_COPY.backToList}
                </Link>
                <Link
                  href="/schedule"
                  className="inline-flex w-full items-center justify-center gap-2 rounded-xl border border-white/15 bg-white/5 px-5 py-2.5 text-sm font-medium text-slate-300 transition-colors hover:border-white/25 hover:text-white sm:w-auto"
                >
                  {CRM_TEAM_DETAIL_COPY.notFoundScheduleCta}
                  <ChevronRight className="h-4 w-4 opacity-60" aria-hidden />
                </Link>
              </div>
            </Card>
          </div>
        </div>
      </div>
    );
  }

  const players = Array.isArray(team.players) ? team.players : [];
  const trainings = Array.isArray(team.trainings) ? team.trainings : [];
  const presentByTraining = trainings.map((t) => ({
    id: t.id,
    present: (t.attendances ?? []).filter((a) => a.status === "PRESENT").length,
  }));
  const avgAttendance =
    trainings.length > 0
      ? Math.round(
          (presentByTraining.reduce((s, x) => s + x.present, 0) /
            (trainings.length * Math.max(1, players.length))) *
            100
        )
      : 0;

  const thisMonth = new Date().getMonth();
  const trainingsThisMonth = trainings.filter(
    (t) => new Date(t.startTime).getMonth() === thisMonth
  ).length;

  const coachLine = team.coach
    ? `${CRM_TEAMS_LIST_COPY.coachPrefix}: ${team.coach.firstName} ${team.coach.lastName}`
    : null;

  return (
    <div className="overflow-x-hidden px-4 py-6 sm:px-6 md:px-8">
      <div className="mx-auto max-w-7xl space-y-8">
        <div className="space-y-4">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <Link
              href="/teams"
              className="inline-flex items-center gap-2 text-sm text-slate-400 transition-colors hover:text-neon-blue"
            >
              <ArrowLeft className="h-4 w-4" aria-hidden />
              {CRM_TEAM_DETAIL_COPY.backShort}
            </Link>
            <Link
              href="/schedule"
              className="text-sm font-medium text-slate-500 transition-colors hover:text-neon-blue"
            >
              {CRM_TEAM_DETAIL_COPY.backSchedule}
            </Link>
          </div>
          <div className="flex flex-wrap gap-2 lg:justify-end">
            <Link href={`/teams/${id}/edit`} className="inline-flex">
              <Button variant="secondary" size="sm" className="gap-2">
                <Pencil className="h-4 w-4" aria-hidden />
                {CRM_TEAM_DETAIL_COPY.editCta}
              </Button>
            </Link>
            <Link href={`/teams/${id}/schedule`} className="inline-flex">
              <Button size="sm" variant="secondary" className="gap-2">
                <Calendar className="h-4 w-4" aria-hidden />
                {CRM_TEAM_DETAIL_COPY.scheduleCta}
                <ChevronRight className="h-4 w-4 opacity-50" aria-hidden />
              </Button>
            </Link>
            <Link href={`/teams/${id}/groups`} className="inline-flex">
              <Button size="sm" variant="secondary" className="gap-2">
                {CRM_TEAM_DETAIL_COPY.groupsCta}
                <ChevronRight className="h-4 w-4 opacity-50" aria-hidden />
              </Button>
            </Link>
            <Link href={`/teams/${id}/assignments`} className="inline-flex">
              <Button size="sm" variant="secondary" className="gap-2">
                {CRM_TEAM_DETAIL_COPY.assignmentsCta}
                <ChevronRight className="h-4 w-4 opacity-50" aria-hidden />
              </Button>
            </Link>
            <Link href={`/trainings/new?teamId=${id}`} className="inline-flex">
              <Button size="sm" className="gap-2">
                <Plus className="h-4 w-4" aria-hidden />
                {CRM_TEAM_DETAIL_COPY.addTrainingCta}
              </Button>
            </Link>
            <Button variant="danger" size="sm" onClick={handleDelete} className="gap-2">
              <Trash2 className="h-4 w-4" aria-hidden />
              {CRM_TEAM_DETAIL_COPY.deleteCta}
            </Button>
          </div>
        </div>

        <Card className="overflow-hidden rounded-2xl border-white/[0.1] bg-gradient-to-br from-white/[0.06] to-transparent">
          <div className="relative flex flex-col gap-6 p-5 sm:flex-row sm:items-center sm:p-6">
            <div
              className="pointer-events-none absolute left-0 top-0 h-full w-1 rounded-l-2xl bg-gradient-to-b from-neon-blue via-neon-cyan/80 to-neon-pink/60"
              aria-hidden
            />
            <div className="relative flex h-20 w-20 shrink-0 items-center justify-center rounded-2xl border border-white/[0.12] bg-gradient-to-br from-neon-blue/20 to-neon-cyan/15">
              <Users className="h-11 w-11 text-neon-blue/90" aria-hidden />
            </div>
            <div className="min-w-0 flex-1 pl-0 sm:pl-2">
              <p className="text-[11px] font-semibold uppercase tracking-wider text-neon-blue/90">
                {CRM_TEAM_DETAIL_COPY.heroEyebrow}
              </p>
              <h1 className="mt-1 font-display text-2xl font-bold tracking-tight text-white sm:text-3xl">{team.name}</h1>
              <p className="mt-2 max-w-2xl text-sm leading-relaxed text-slate-400">
                {CRM_TEAM_DETAIL_COPY.heroSubtitle}
              </p>
              <span className="mt-3 inline-flex rounded-full border border-white/[0.12] bg-white/[0.06] px-2.5 py-0.5 text-xs font-semibold text-slate-200">
                {team.ageGroup}
              </span>
              <p className="mt-2 text-sm text-slate-400">{team.school?.name ?? CRM_TEAM_DETAIL_COPY.schoolFallback}</p>
              {coachLine ? <p className="mt-1 text-sm text-slate-500">{coachLine}</p> : null}
              <p className="mt-2 text-sm font-medium text-slate-400">{crmPlayersCountLabel(players.length)}</p>
            </div>
          </div>
        </Card>

        <div className="grid gap-5 lg:grid-cols-2 lg:gap-6">
          <DetailSectionCard
            kicker={CRM_TEAM_DETAIL_COPY.rosterKicker}
            title={CRM_TEAM_DETAIL_COPY.rosterTitle}
            hint={CRM_TEAM_DETAIL_COPY.rosterHint}
            icon={Users}
            iconClassName="text-slate-400"
          >
            {players.length > 0 ? (
              <div className="space-y-2">
                {players.map((p) => (
                  <Link key={p.id} href={`/players/${p.id}`} className="block">
                    <div className="group flex items-center gap-3 rounded-xl border border-white/[0.08] bg-white/[0.03] p-3 transition-colors hover:border-white/[0.14] hover:bg-white/[0.05]">
                      <div className="relative h-12 w-12 shrink-0 overflow-hidden rounded-xl border border-white/[0.08] bg-neon-blue/10">
                        {p.photoUrl ? (
                          <img
                            src={p.photoUrl}
                            alt={`${p.firstName} ${p.lastName}`}
                            className="h-full w-full object-cover"
                          />
                        ) : (
                          <div className="flex h-full w-full items-center justify-center">
                            <UserCircle className="h-6 w-6 text-neon-blue/70" aria-hidden />
                          </div>
                        )}
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="font-medium text-white">
                          {p.firstName} {p.lastName}
                        </p>
                        <div className="mt-1 flex flex-wrap items-center gap-2 text-sm text-slate-500">
                          <span>
                            {p.birthYear ? `${p.birthYear} г.р.` : ""}
                            {p.birthYear && p.position ? " · " : ""}
                            {p.position ?? ""}
                          </span>
                          {p.status ? (
                            <span
                              className={cn(
                                "inline-flex rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide",
                                crmPlayerDetailStatusPillClass(p.status)
                              )}
                            >
                              {p.status}
                            </span>
                          ) : null}
                        </div>
                      </div>
                      <ChevronRight
                        className="h-4 w-4 shrink-0 text-slate-500 opacity-0 transition-opacity group-hover:opacity-100 group-hover:text-neon-blue"
                        aria-hidden
                      />
                    </div>
                  </Link>
                ))}
              </div>
            ) : (
              <p className="text-sm text-slate-500">{CRM_TEAM_DETAIL_COPY.emptyRoster}</p>
            )}
          </DetailSectionCard>

          <DetailSectionCard
            kicker={CRM_TEAM_DETAIL_COPY.statsKicker}
            title={CRM_TEAM_DETAIL_COPY.statsTitle}
            hint={CRM_TEAM_DETAIL_COPY.statsHint}
            icon={BarChart3}
            iconClassName="text-slate-400"
          >
            <dl className="grid grid-cols-2 gap-3 sm:grid-cols-4 sm:gap-4">
              <div className="rounded-xl border border-white/[0.08] bg-white/[0.03] p-4">
                <dt className="text-xs text-slate-500">{CRM_TEAM_DETAIL_COPY.statPlayers}</dt>
                <dd className="mt-1 text-2xl font-bold tracking-tight text-white">{players.length}</dd>
              </div>
              <div className="rounded-xl border border-white/[0.08] bg-white/[0.03] p-4">
                <dt className="text-xs text-slate-500">{CRM_TEAM_DETAIL_COPY.statAttendance}</dt>
                <dd className="mt-1 text-2xl font-bold tracking-tight text-slate-100">{avgAttendance}%</dd>
              </div>
              <div className="rounded-xl border border-white/[0.08] bg-white/[0.03] p-4">
                <dt className="text-xs text-slate-500">{CRM_TEAM_DETAIL_COPY.statTrainingsMonth}</dt>
                <dd className="mt-1 text-2xl font-bold tracking-tight text-slate-100">{trainingsThisMonth}</dd>
              </div>
              <div className="rounded-xl border border-white/[0.08] bg-white/[0.03] p-4">
                <dt className="text-xs text-slate-500">{CRM_TEAM_DETAIL_COPY.statTrainingsTotal}</dt>
                <dd className="mt-1 text-2xl font-bold tracking-tight text-white">{trainings.length}</dd>
              </div>
            </dl>
          </DetailSectionCard>

          {executionCopy ? (
            <div className="lg:col-span-2">
              <div className="rounded-xl border border-white/[0.08] bg-white/[0.02] px-4 py-3">
                <p className="text-[11px] font-semibold uppercase tracking-wider text-slate-500">
                  Живая тренировка
                </p>
                <p className="mt-1 text-sm font-medium text-slate-200">{executionCopy.title}</p>
                {executionCopy.subtitle ? (
                  <p className="mt-1 text-[11px] leading-relaxed text-slate-500">{executionCopy.subtitle}</p>
                ) : null}
              </div>
            </div>
          ) : null}

          {team.teamNextActions && team.teamNextActions.length > 0 ? (
            <div className="lg:col-span-2">
              <div className="rounded-xl border border-white/[0.08] bg-white/[0.02] px-4 py-3">
                <p className="text-[11px] font-semibold uppercase tracking-wider text-slate-500">
                  Следующий шаг
                </p>
                <ul className="mt-2 list-none space-y-1.5 p-0">
                  {team.teamNextActions.map((line, i) => (
                    <li key={i} className="flex gap-2 text-sm leading-snug text-slate-200">
                      <span className="shrink-0 text-slate-500" aria-hidden>
                        •
                      </span>
                      <span>{line}</span>
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          ) : null}

          {team.teamPlayerFollowUp && team.teamPlayerFollowUp.length > 0 ? (
            <div className="lg:col-span-2">
              <div className="rounded-xl border border-white/[0.08] bg-white/[0.02] px-4 py-3">
                <p className="text-[11px] font-semibold uppercase tracking-wider text-slate-500">
                  Игроки под наблюдением
                </p>
                <div className="mt-3 space-y-3">
                  {team.teamPlayerFollowUp.map((row) => (
                    <div key={row.playerId}>
                      <p className="text-sm font-semibold text-slate-100">{row.playerName}</p>
                      <ul className="mt-1 list-none space-y-1 p-0">
                        {row.actions.map((line, i) => (
                          <li key={i} className="flex gap-2 text-sm leading-snug text-slate-200">
                            <span className="shrink-0 text-slate-500" aria-hidden>
                              •
                            </span>
                            <span>{line}</span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          ) : null}

          {team.teamAttentionSummary ? (
            <div
              className={cn(
                "lg:col-span-2",
                (team.teamNextActions?.length ?? 0) > 0 || (team.teamPlayerFollowUp?.length ?? 0) > 0
                  ? "mt-4"
                  : "mt-6"
              )}
            >
              <div className="rounded-xl border border-white/[0.08] bg-white/[0.02] px-4 py-3">
                <p className="text-[11px] font-semibold uppercase tracking-wider text-slate-500">
                  Внимание
                </p>
                {team.teamAttentionSummary.attentionCount > 0 ? (
                  <p className="mt-2 text-sm leading-snug text-slate-200">
                    Требуют внимания: {team.teamAttentionSummary.attentionCount}
                  </p>
                ) : null}
                {team.teamAttentionSummary.watchCount > 0 ? (
                  <p
                    className={cn(
                      "text-sm leading-snug text-slate-200",
                      team.teamAttentionSummary.attentionCount > 0 ? "mt-1" : "mt-2"
                    )}
                  >
                    Под контролем: {team.teamAttentionSummary.watchCount}
                  </p>
                ) : null}
              </div>
            </div>
          ) : null}

          {team.teamDevelopmentSnapshot ? (
            <div
              className={cn(
                "lg:col-span-2",
                (team.teamNextActions?.length ?? 0) > 0 ||
                  (team.teamPlayerFollowUp?.length ?? 0) > 0 ||
                  team.teamAttentionSummary
                  ? "mt-4"
                  : "mt-6"
              )}
            >
              <div className="rounded-xl border border-white/[0.08] bg-white/[0.02] px-4 py-3">
                <p className="text-[11px] font-semibold uppercase tracking-wider text-slate-500">
                  Развитие команды
                </p>
                <p className="mt-1 text-sm font-medium leading-snug text-slate-200">
                  {team.teamDevelopmentSnapshot.headline}
                </p>
                {team.teamDevelopmentSnapshot.support ? (
                  <p className="mt-2 text-[11px] leading-relaxed text-slate-500">
                    {team.teamDevelopmentSnapshot.support}
                  </p>
                ) : null}
              </div>
            </div>
          ) : null}

          <CrmArenaSnapshotWireRegion
            status={arenaCrmWire.wireStatus}
            className={cn(
              "lg:col-span-2 space-y-4",
              team.teamDevelopmentSnapshot ||
                team.teamAttentionSummary ||
                (team.teamNextActions?.length ?? 0) > 0 ||
                (team.teamPlayerFollowUp?.length ?? 0) > 0
                ? "mt-4"
                : "mt-6"
            )}
          >
            <>
              {arenaCrmWire.teamSnapshot != null ? (
                <CrmArenaTeamSnapshotSection snapshot={arenaCrmWire.teamSnapshot} />
              ) : null}

              {(arenaCrmWire.groupArenaSnapshots?.length ?? 0) > 0 ? (
                <div className="space-y-3">
                  {(arenaCrmWire.groupArenaSnapshots ?? []).map((row) => (
                    <CrmArenaGroupSnapshotInline key={row.groupId} snapshot={row.groupSnapshot} />
                  ))}
                </div>
              ) : null}

              {(arenaSupercoreFocusLines?.length ?? 0) > 0 ? (
                <div className="border-t border-white/[0.08] pt-5">
                  <CrmArenaSupercoreOperationalFocusSection lines={arenaSupercoreFocusLines} />
                  {canEdit("schedule") ? (
                    <div className="mt-4 space-y-2">
                      {nextSlot?.id && nextSlot.startAt ? (
                        <p className="text-xs leading-relaxed text-slate-400">
                          <span className="text-slate-500">Ближайший слот расписания:</span>{" "}
                          {formatNextScheduledSlotLabel(nextSlot.startAt)}
                          {" · "}
                          <Link
                            href={`/schedule/${nextSlot.id}`}
                            className="font-medium text-neon-blue/90 underline-offset-2 hover:text-neon-blue hover:underline"
                          >
                            открыть
                          </Link>
                          <span className="block pt-1 text-[11px] text-slate-600">
                            Тот же алгоритм, что и для «следующего слота» живой тренировки: учитывается привязка
                            последней подтверждённой live-сессии команды к слоту расписания.
                          </span>
                        </p>
                      ) : null}
                      {nextSlot?.id && !firstFocusLine?.liveTrainingSessionId ? (
                        <p className="text-xs text-slate-500">
                          В первой строке фокуса нет привязки к live-сессии — запись в расписание недоступна.
                        </p>
                      ) : null}
                      <Button
                        type="button"
                        size="sm"
                        className="gap-2"
                        aria-busy={applyFocusBusy}
                        title={
                          applyFocusBusy
                            ? "Сохранение…"
                            : !nextSlot?.id
                              ? "Сначала нужен будущий слот TrainingSession в расписании команды"
                              : !firstFocusLine?.liveTrainingSessionId
                                ? "Нужна привязка к подтверждённой live-сессии в строке фокуса"
                                : "Записать текст первой строки фокуса в поле «Фокус тренировки» выбранного слота (существующее значение будет заменено)"
                        }
                        disabled={
                          applyFocusBusy ||
                          !nextSlot?.id ||
                          !firstFocusLine?.liveTrainingSessionId
                        }
                        onClick={() => void handleApplyArenaFocusToNextTraining()}
                      >
                        {applyFocusBusy ? (
                          <Loader2 className="h-4 w-4 animate-spin" aria-hidden />
                        ) : null}
                        Применить к следующей тренировке
                      </Button>
                      {nextSlot?.id && firstFocusLine?.liveTrainingSessionId ? (
                        <p className="text-[11px] leading-relaxed text-slate-600">
                          Повторное нажатие явно разрешает перезапись непустого фокуса в этом слоте (только этот
                          слот). Другие слоты не меняются.
                        </p>
                      ) : null}
                      {!nextSlot?.id ? (
                        <p className="text-xs text-slate-500">
                          Нет будущего слота в расписании (TrainingSession) для этой команды — применять некуда.
                        </p>
                      ) : null}
                      {applyFocusError ? (
                        <p className="text-xs text-amber-200/90" role="alert">
                          {applyFocusError}
                        </p>
                      ) : null}
                      {applyFocusOk && nextSlot?.id ? (
                        <p className="text-xs text-emerald-400/90">
                          Фокус из Арены записан в этот слот (ручная кнопка CRM).{" "}
                          <Link
                            href={`/schedule/${nextSlot.id}`}
                            className="font-medium text-neon-blue underline-offset-2 hover:underline"
                          >
                            Проверить в расписании
                          </Link>
                        </p>
                      ) : null}
                    </div>
                  ) : null}
                </div>
              ) : null}
            </>
          </CrmArenaSnapshotWireRegion>

          {arenaLiveFocusAppliedLast30Days !== null ? (
            <div
              className={cn(
                "lg:col-span-2 rounded-xl border border-white/[0.08] bg-white/[0.02] px-4 py-3",
                arenaCrmWire.wireStatus !== "idle" || arenaCrmWire.teamSnapshot != null ? "mt-4" : "mt-6"
              )}
            >
              <p className="text-[11px] font-semibold uppercase tracking-wider text-slate-500">
                Арена · контур тренировки
              </p>
              {arenaLiveFocusAppliedLast30Days === 0 ? (
                <p className="mt-1.5 text-xs leading-relaxed text-slate-400">
                  За последние 30 дней в данных не зафиксировано применений фокуса из live к тренировочному слоту этой
                  команды. Так бывает, если контур ещё не запускали.
                </p>
              ) : (
                <p className="mt-1.5 text-xs leading-relaxed text-slate-400">
                  За последние 30 дней фокус из live применяли к тренировочному слоту команды:{" "}
                  <span className="font-medium tabular-nums text-slate-200">{arenaLiveFocusAppliedLast30Days}</span>{" "}
                  {ruApplyCountWord(arenaLiveFocusAppliedLast30Days)}. Считаются сохранённые отметки в системе; не
                  отражает, кто инициировал применение. Это не оценка эффективности.
                </p>
              )}
            </div>
          ) : null}

          {team.teamPlannedVsObservedSummary ? (
            <div
              className={cn(
                "lg:col-span-2",
                arenaCrmWire.wireStatus !== "idle" || arenaCrmWire.teamSnapshot != null ? "mt-4" : "mt-6"
              )}
            >
              <CrmTeamPlannedVsObservedSummary
                summary={team.teamPlannedVsObservedSummary}
                continuity={team.teamPlannedVsObservedContinuity ?? null}
                history={team.teamPlannedVsObservedHistory}
              />
            </div>
          ) : null}

          <div className="lg:col-span-2">
            <DetailSectionCard
              kicker={CRM_TEAM_DETAIL_COPY.scheduleKicker}
              title={CRM_TEAM_DETAIL_COPY.scheduleTitle}
              hint={CRM_TEAM_DETAIL_COPY.scheduleHint}
              icon={Calendar}
              iconClassName="text-slate-400"
            >
              {trainings.length > 0 ? (
                <div className="space-y-2">
                  {trainings.slice(0, 15).map((t) => {
                  const start = new Date(t.startTime);
                  const end = new Date(t.endTime);
                  const present = (t.attendances ?? []).filter((a) => a.status === "PRESENT").length;
                  return (
                    <Link key={t.id} href={`/trainings/${t.id}`} className="block">
                      <div className="group flex flex-wrap items-center gap-4 rounded-xl border border-white/[0.08] bg-white/[0.03] p-4 transition-colors hover:border-white/[0.14] hover:bg-white/[0.05]">
                        <div className="rounded-lg border border-white/[0.08] bg-white/[0.05] p-2">
                          <Calendar className="h-5 w-5 text-slate-400" aria-hidden />
                        </div>
                        <div className="min-w-0 flex-1">
                          <p className="font-medium text-white">{t.title}</p>
                          <div className="mt-1 flex flex-wrap gap-3 text-sm text-slate-400">
                            <span className="flex items-center gap-1">
                              <Clock className="h-4 w-4 shrink-0 opacity-70" aria-hidden />
                              {start.toLocaleDateString("ru-RU")}{" "}
                              {start.toLocaleTimeString("ru-RU", {
                                hour: "2-digit",
                                minute: "2-digit",
                              })}
                              –
                              {end.toLocaleTimeString("ru-RU", {
                                hour: "2-digit",
                                minute: "2-digit",
                              })}
                            </span>
                            {t.location ? (
                              <span className="flex items-center gap-1">
                                <MapPin className="h-4 w-4 shrink-0 opacity-70" aria-hidden />
                                {t.location}
                              </span>
                            ) : null}
                          </div>
                          {t.notes ? <p className="mt-1 text-xs text-slate-500">{t.notes}</p> : null}
                        </div>
                        <span className="rounded-full border border-white/[0.1] bg-white/[0.06] px-3 py-1 text-sm font-medium text-slate-300">
                          {present}/{players.length}
                        </span>
                        <ChevronRight
                          className="ml-auto h-4 w-4 shrink-0 text-slate-500 opacity-0 transition-opacity group-hover:opacity-100 group-hover:text-neon-blue lg:ml-0"
                          aria-hidden
                        />
                      </div>
                    </Link>
                  );
                  })}
                </div>
              ) : (
                <p className="text-sm text-slate-500">{CRM_TEAM_DETAIL_COPY.emptySchedule}</p>
              )}
            </DetailSectionCard>
          </div>

          <div className="lg:col-span-2">
            <DetailSectionCard
              kicker={CRM_TEAM_DETAIL_COPY.attendanceKicker}
              title={CRM_TEAM_DETAIL_COPY.attendanceTitle}
              hint={CRM_TEAM_DETAIL_COPY.attendanceHint}
              icon={Users}
              iconClassName="text-slate-400"
            >
              {trainings.length > 0 ? (
                <div className="overflow-x-auto">
                  <table className="w-full min-w-[320px] text-sm">
                  <thead>
                    <tr className="border-b border-white/[0.08] bg-white/[0.02] text-left text-slate-500">
                      <th scope="col" className="px-3 py-3 text-[11px] font-semibold uppercase tracking-wider sm:px-4">
                        {CRM_TEAM_DETAIL_COPY.tableTraining}
                      </th>
                      <th scope="col" className="px-3 py-3 text-[11px] font-semibold uppercase tracking-wider sm:px-4">
                        {CRM_TEAM_DETAIL_COPY.tableDate}
                      </th>
                      <th scope="col" className="px-3 py-3 text-[11px] font-semibold uppercase tracking-wider sm:px-4">
                        {CRM_TEAM_DETAIL_COPY.tablePresent}
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {trainings.slice(0, 10).map((t) => {
                      const present = (t.attendances ?? []).filter((a) => a.status === "PRESENT").length;
                      const absent = players.length - present;
                      return (
                        <tr key={t.id} className="border-b border-white/[0.05] transition-colors hover:bg-white/[0.03]">
                          <td className="px-3 py-3 font-medium text-white sm:px-4">{t.title}</td>
                          <td className="px-3 py-3 text-slate-400 sm:px-4">
                            {new Date(t.startTime).toLocaleDateString("ru-RU")}
                          </td>
                          <td className="px-3 py-3 sm:px-4">
                            <span className="font-medium text-emerald-400/90">{present}</span>
                            <span className="text-slate-500"> / </span>
                            <span className="text-slate-400">{players.length}</span>
                            {absent > 0 ? (
                              <span className="ml-2 text-slate-500">
                                ({absent} {CRM_TEAM_DETAIL_COPY.absentLabel})
                              </span>
                            ) : null}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                  </table>
                </div>
              ) : (
                <p className="text-sm text-slate-500">{CRM_TEAM_DETAIL_COPY.emptyAttendance}</p>
              )}
            </DetailSectionCard>
          </div>
        </div>
      </div>
    </div>
  );
}
