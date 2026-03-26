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

interface Team {
  id: string;
  name: string;
  ageGroup: string;
  school?: { id: string; name: string } | null;
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

export default function TeamDetailPage() {
  const params = useParams();
  const router = useRouter();
  const id = (params?.id as string) ?? "";
  const [team, setTeam] = useState<Team | null>(null);
  const [loading, setLoading] = useState(true);
  const [fetchError, setFetchError] = useState(false);
  const [reloadKey, setReloadKey] = useState(0);

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
