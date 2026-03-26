"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Plus, Search, Pencil, FileText, Loader2, ChevronRight, ArrowLeft, User, Users } from "lucide-react";
import { Button } from "@/components/Button";
import { Card } from "@/components/Card";
import { usePermissions } from "@/hooks/usePermissions";
import { cn } from "@/lib/utils";
import { CRM_PLAYERS_LIST_COPY, crmPlayersCountLabel } from "@/lib/crmPlayersListCopy";
import { crmPlayerDetailStatusPillClass } from "@/lib/crmPlayerDetailCopy";

interface Player {
  id: string;
  firstName: string;
  lastName: string;
  birthYear?: number;
  birthDate?: string | null;
  position?: string;
  team?: { name: string; ageGroup?: string; coach?: { firstName: string; lastName: string } | null } | null;
  status?: string;
}

interface Team {
  id: string;
  name: string;
  ageGroup?: string;
}

const AGE_GROUPS = ["10-12 лет", "12-14 лет", "14-16 лет", "16-18 лет", "8-10 лет", "6-8 лет"];

export default function PlayersPage() {
  const { canCreate, canEdit } = usePermissions();
  const [players, setPlayers] = useState<Player[]>([]);
  const [teams, setTeams] = useState<Team[]>([]);
  const [loading, setLoading] = useState(true);
  const [fetchError, setFetchError] = useState(false);
  const [loadTick, setLoadTick] = useState(0);
  const [search, setSearch] = useState("");
  const [teamId, setTeamId] = useState("");
  const [ageGroup, setAgeGroup] = useState("");
  const [position, setPosition] = useState("");
  const [status, setStatus] = useState("");

  useEffect(() => {
    fetch("/api/teams")
      .then((r) => r.json())
      .then((d) => (Array.isArray(d) ? d : d?.teams ?? []))
      .then(setTeams)
      .catch(() => setTeams([]));
  }, []);

  useEffect(() => {
    setLoading(true);
    setFetchError(false);
    const params = new URLSearchParams();
    if (search.trim()) params.set("search", search.trim());
    if (teamId) params.set("teamId", teamId);
    if (ageGroup) params.set("ageGroup", ageGroup);
    if (position) params.set("position", position);
    if (status) params.set("status", status);
    const t = setTimeout(() => {
      fetch(`/api/players?${params}`)
        .then(async (r) => {
          const data = await r.json().catch(() => null);
          if (!r.ok) throw new Error("fetch failed");
          if (Array.isArray(data)) return data;
          if (Array.isArray(data?.data)) return data.data;
          if (Array.isArray(data?.players)) return data.players;
          return [];
        })
        .then((list) => {
          setPlayers(list);
          setFetchError(false);
        })
        .catch(() => {
          setFetchError(true);
          setPlayers([]);
        })
        .finally(() => setLoading(false));
    }, 200);
    return () => clearTimeout(t);
  }, [search, teamId, ageGroup, position, status, loadTick]);

  const safePlayers = Array.isArray(players) ? players : [];
  const hasFilters = Boolean(search || teamId || ageGroup || position || status);

  return (
    <div className="overflow-x-hidden px-4 py-6 sm:px-6 md:px-8">
      <div className="mx-auto max-w-7xl space-y-8">
        {fetchError ? (
          <div
            className="flex flex-col gap-3 rounded-2xl border border-amber-500/25 bg-amber-500/10 px-4 py-4 sm:flex-row sm:items-center sm:justify-between sm:px-5"
            role="alert"
          >
            <div>
              <p className="font-medium text-amber-100">{CRM_PLAYERS_LIST_COPY.errorTitle}</p>
              <p className="mt-0.5 text-sm text-amber-200/80">{CRM_PLAYERS_LIST_COPY.errorHint}</p>
            </div>
            <button
              type="button"
              onClick={() => setLoadTick((x) => x + 1)}
              className="shrink-0 rounded-xl border border-amber-400/40 bg-white/10 px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-white/15"
            >
              {CRM_PLAYERS_LIST_COPY.retryCta}
            </button>
          </div>
        ) : null}

        <div className="space-y-6">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <Link
              href="/schedule"
              className="inline-flex items-center gap-2 text-sm text-slate-400 transition-colors hover:text-neon-blue"
            >
              <ArrowLeft className="h-4 w-4" aria-hidden />
              {CRM_PLAYERS_LIST_COPY.scheduleLink}
            </Link>
          </div>
          <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between sm:gap-6">
            <div className="min-w-0 flex-1">
              <p className="text-[11px] font-semibold uppercase tracking-wider text-neon-blue/90">
                {CRM_PLAYERS_LIST_COPY.heroEyebrow}
              </p>
              <h1 className="mt-1 font-display text-2xl font-bold tracking-tight text-white sm:text-3xl lg:text-4xl">
                {CRM_PLAYERS_LIST_COPY.heroTitle}
              </h1>
              <p className="mt-2 max-w-xl text-sm leading-relaxed text-slate-400 sm:text-base">
                {CRM_PLAYERS_LIST_COPY.heroSubtitle}
              </p>
            </div>
            {canCreate("players") && (
              <Link href="/players/new" className="shrink-0">
                <Button className="gap-2">
                  <Plus className="h-4 w-4" aria-hidden />
                  {CRM_PLAYERS_LIST_COPY.addPlayerCta}
                </Button>
              </Link>
            )}
          </div>
        </div>

        <Card className="rounded-2xl border-white/[0.08] p-0">
          <div className="border-b border-white/[0.08] bg-white/[0.02] px-4 py-3 sm:px-5">
            <p className="text-[11px] font-semibold uppercase tracking-wider text-slate-500">
              {CRM_PLAYERS_LIST_COPY.filtersKicker}
            </p>
            <p className="mt-0.5 text-xs text-slate-600">{CRM_PLAYERS_LIST_COPY.filtersHint}</p>
          </div>
          <div className="flex flex-col gap-3 p-4 sm:flex-row sm:flex-wrap sm:items-end sm:gap-3">
            <div className="relative min-w-[200px] max-w-md flex-1">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-500" aria-hidden />
              <input
                type="search"
                placeholder={CRM_PLAYERS_LIST_COPY.searchPlaceholder}
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="w-full rounded-xl border border-white/[0.08] bg-white/[0.05] py-2.5 pl-9 pr-4 text-sm text-white placeholder:text-slate-500 focus:border-white/20 focus:outline-none focus:ring-1 focus:ring-white/15"
                aria-label={CRM_PLAYERS_LIST_COPY.searchPlaceholder}
              />
            </div>
            <select
              value={teamId}
              onChange={(e) => setTeamId(e.target.value)}
              className="min-w-[160px] rounded-xl border border-white/[0.08] bg-white/[0.05] px-4 py-2.5 text-sm text-white focus:border-white/20 focus:outline-none focus:ring-1 focus:ring-white/15"
              aria-label={CRM_PLAYERS_LIST_COPY.filterTeamAll}
            >
              <option value="">{CRM_PLAYERS_LIST_COPY.filterTeamAll}</option>
              {teams.map((t) => (
                <option key={t.id} value={t.id}>
                  {t.name}
                </option>
              ))}
            </select>
            <select
              value={ageGroup}
              onChange={(e) => setAgeGroup(e.target.value)}
              className="min-w-[140px] rounded-xl border border-white/[0.08] bg-white/[0.05] px-4 py-2.5 text-sm text-white focus:border-white/20 focus:outline-none focus:ring-1 focus:ring-white/15"
              aria-label={CRM_PLAYERS_LIST_COPY.filterAgeAll}
            >
              <option value="">{CRM_PLAYERS_LIST_COPY.filterAgeAll}</option>
              {AGE_GROUPS.map((ag) => (
                <option key={ag} value={ag}>
                  {ag}
                </option>
              ))}
            </select>
            <select
              value={position}
              onChange={(e) => setPosition(e.target.value)}
              className="min-w-[150px] rounded-xl border border-white/[0.08] bg-white/[0.05] px-4 py-2.5 text-sm text-white focus:border-white/20 focus:outline-none focus:ring-1 focus:ring-white/15"
              aria-label={CRM_PLAYERS_LIST_COPY.filterPositionAll}
            >
              <option value="">{CRM_PLAYERS_LIST_COPY.filterPositionAll}</option>
              <option value="Нападающий">Нападающий</option>
              <option value="Защитник">Защитник</option>
              <option value="Вратарь">Вратарь</option>
            </select>
            <select
              value={status}
              onChange={(e) => setStatus(e.target.value)}
              className="min-w-[150px] rounded-xl border border-white/[0.08] bg-white/[0.05] px-4 py-2.5 text-sm text-white focus:border-white/20 focus:outline-none focus:ring-1 focus:ring-white/15"
              aria-label={CRM_PLAYERS_LIST_COPY.filterStatusAll}
            >
              <option value="">{CRM_PLAYERS_LIST_COPY.filterStatusAll}</option>
              <option value="Активен">Активен</option>
              <option value="На паузе">На паузе</option>
              <option value="Травма">Травма</option>
              <option value="Выпускник">Выпускник</option>
            </select>
          </div>
        </Card>

        {loading ? (
          <Card className="rounded-2xl border-white/[0.08] p-0">
            <div className="flex min-h-[40vh] flex-col items-center justify-center gap-4 py-16">
              <Loader2 className="h-10 w-10 animate-spin text-neon-blue" aria-hidden />
              <div className="text-center">
                <p className="font-display text-base font-semibold text-white">{CRM_PLAYERS_LIST_COPY.loadingTitle}</p>
                <p className="mt-1 text-sm text-slate-500">{CRM_PLAYERS_LIST_COPY.loadingHint}</p>
              </div>
            </div>
          </Card>
        ) : fetchError ? null : safePlayers.length === 0 ? (
          <Card className="rounded-2xl border-white/[0.08] p-0">
            <div className="px-6 py-16 text-center sm:px-10">
              <Users className="mx-auto h-12 w-12 text-slate-600" aria-hidden />
              <p className="mt-4 text-lg font-semibold text-slate-200">
                {hasFilters ? CRM_PLAYERS_LIST_COPY.emptyFilteredTitle : CRM_PLAYERS_LIST_COPY.emptyNoPlayersTitle}
              </p>
              <p className="mx-auto mt-2 max-w-md text-sm leading-relaxed text-slate-500">
                {hasFilters ? CRM_PLAYERS_LIST_COPY.emptyFilteredHint : CRM_PLAYERS_LIST_COPY.emptyNoPlayersHint}
              </p>
              {!hasFilters && canCreate("players") && (
                <Link href="/players/new" className="mt-8 inline-block">
                  <Button className="gap-2">
                    <Plus className="h-4 w-4" aria-hidden />
                    {CRM_PLAYERS_LIST_COPY.emptyAddCta}
                  </Button>
                </Link>
              )}
            </div>
          </Card>
        ) : (
          <Card className="overflow-hidden rounded-2xl border-white/[0.08] p-0">
            <div className="border-b border-white/[0.08] bg-white/[0.02] px-4 py-3 sm:px-6">
              <p className="text-[11px] font-semibold uppercase tracking-wider text-slate-500">
                {CRM_PLAYERS_LIST_COPY.listKicker}
              </p>
              <div className="mt-0.5 flex flex-col gap-1 sm:flex-row sm:items-baseline sm:justify-between">
                <h2 className="font-display text-base font-semibold tracking-tight text-white sm:text-lg">
                  {CRM_PLAYERS_LIST_COPY.listTitle}
                </h2>
                <p className="text-sm text-slate-500">{crmPlayersCountLabel(safePlayers.length)}</p>
              </div>
            </div>
            <div className="divide-y divide-white/[0.08]">
              {safePlayers.map((player) => {
                const birthDate = player.birthDate ? new Date(player.birthDate) : null;
                const age = birthDate
                  ? Math.floor((Date.now() - birthDate.getTime()) / (365.25 * 24 * 60 * 60 * 1000))
                  : player.birthYear
                    ? new Date().getFullYear() - player.birthYear
                    : null;
                const ageLine =
                  age != null ? `${age} лет` : player.birthYear ? `${player.birthYear} г.р.` : "—";
                const coachName = player.team?.coach
                  ? `${player.team.coach.firstName} ${player.team.coach.lastName}`
                  : null;
                const teamLabel = player.team?.name ?? "—";
                const ageGroupSuffix = player.team?.ageGroup ? ` · ${player.team.ageGroup}` : "";

                return (
                  <div
                    key={player.id}
                    className="group flex flex-col sm:flex-row sm:items-stretch"
                  >
                    <Link
                      href={`/players/${player.id}`}
                      className="flex min-w-0 flex-1 items-start gap-3 px-4 py-4 transition-colors hover:bg-white/[0.03] sm:items-center sm:gap-4 sm:px-6 sm:py-4"
                    >
                      <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-white/[0.08] bg-white/[0.04]">
                        <User className="h-5 w-5 text-slate-500" aria-hidden />
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="flex flex-wrap items-center gap-2 gap-y-1">
                          <span className="font-display text-base font-semibold tracking-tight text-white transition-colors group-hover:text-neon-blue">
                            {player.firstName} {player.lastName}
                          </span>
                          <span
                            className={cn(
                              "inline-flex rounded-full px-2.5 py-0.5 text-xs font-semibold uppercase tracking-wide",
                              crmPlayerDetailStatusPillClass(player.status ?? "")
                            )}
                          >
                            {player.status ?? "—"}
                          </span>
                        </div>
                        <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1.5 text-sm text-slate-400">
                          <span className="inline-flex min-w-0 items-center gap-1.5">
                            <Users className="h-4 w-4 shrink-0 opacity-60" aria-hidden />
                            <span className="truncate">
                              {teamLabel}
                              {ageGroupSuffix}
                            </span>
                          </span>
                          <span className="text-slate-500">{ageLine}</span>
                          <span>{player.position ?? "—"}</span>
                          {coachName ? (
                            <span className="inline-flex min-w-0 items-center gap-1.5 text-slate-500">
                              <User className="h-3.5 w-3.5 shrink-0 opacity-60" aria-hidden />
                              <span className="truncate">{coachName}</span>
                            </span>
                          ) : null}
                        </div>
                      </div>
                      <ChevronRight
                        className="mt-0.5 h-5 w-5 shrink-0 self-start text-slate-500 opacity-40 transition-opacity group-hover:text-neon-blue group-hover:opacity-100 sm:mt-0 sm:self-center"
                        aria-hidden
                      />
                    </Link>
                    <div className="flex items-center justify-end gap-1 border-t border-white/[0.08] px-4 py-2 sm:w-auto sm:border-l sm:border-t-0 sm:px-3 sm:py-0">
                      <Link
                        href={`/player/${player.id}`}
                        className="inline-flex rounded-lg p-2 text-slate-500 transition-colors hover:bg-white/[0.05] hover:text-slate-200"
                        aria-label={CRM_PLAYERS_LIST_COPY.passportAria}
                      >
                        <FileText className="h-4 w-4" aria-hidden />
                      </Link>
                      {canEdit("players") && (
                        <Link
                          href={`/players/${player.id}/edit`}
                          className="inline-flex rounded-lg p-2 text-slate-500 transition-colors hover:bg-white/[0.05] hover:text-slate-200"
                          aria-label={CRM_PLAYERS_LIST_COPY.editAria}
                        >
                          <Pencil className="h-4 w-4" aria-hidden />
                        </Link>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </Card>
        )}
      </div>
    </div>
  );
}
