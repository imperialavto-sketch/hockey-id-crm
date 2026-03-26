"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Trophy, Medal, Users, Loader2, ChevronRight } from "lucide-react";
import { Card } from "@/components/Card";
import { CRM_REPORTS_COPY } from "@/lib/crmReportsCopy";

interface RatingItem {
  id: string;
  name: string;
  team: { id: string; name: string } | null;
  position: string;
  birthYear: number;
  rankingScore: number;
  developmentIndex: number;
  attendanceScore: number;
  coachRatingScore: number;
}

interface Team {
  id: string;
  name: string;
  ageGroup?: string;
}

const POSITIONS = ["Нападающий", "Защитник", "Вратарь", "Центр", "Центральный нападающий"];

function getRankBadge(rank: number) {
  if (rank === 1) return "🥇";
  if (rank === 2) return "🥈";
  if (rank === 3) return "🥉";
  return null;
}

export default function RatingsPage() {
  const [items, setItems] = useState<RatingItem[]>([]);
  const [teams, setTeams] = useState<Team[]>([]);
  const [loading, setLoading] = useState(true);
  const [fetchError, setFetchError] = useState(false);
  const [reloadTick, setReloadTick] = useState(0);
  const [teamId, setTeamId] = useState("");
  const [position, setPosition] = useState("");
  const [birthYear, setBirthYear] = useState("");

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
    if (teamId) params.set("teamId", teamId);
    if (position) params.set("position", position);
    if (birthYear) params.set("birthYear", birthYear);
    fetch(`/api/ratings?${params}`)
      .then(async (r) => {
        const data = await r.json().catch(() => []);
        if (!r.ok) throw new Error("fetch failed");
        return data;
      })
      .then((data) => (Array.isArray(data) ? data : []))
      .then((list) => {
        setItems(list);
        setFetchError(false);
      })
      .catch(() => {
        setItems([]);
        setFetchError(true);
      })
      .finally(() => setLoading(false));
  }, [teamId, position, birthYear, reloadTick]);

  const birthYears = Array.from({ length: 18 }, (_, k) => 2016 - k);
  const leader = items[0]?.name ?? "—";
  const topTenThreshold = items[9]?.rankingScore ?? items[items.length - 1]?.rankingScore ?? 0;
  const averageScore =
    items.length > 0 ? Math.round(items.reduce((acc, item) => acc + item.rankingScore, 0) / items.length) : 0;

  if (loading) {
    return (
      <div className="overflow-x-hidden px-4 py-6 sm:px-6 md:px-8">
        <div className="mx-auto max-w-7xl">
          <Card className="rounded-2xl border-white/[0.08] p-0 hover:border-white/[0.08]">
            <div className="flex min-h-[40vh] flex-col items-center justify-center gap-4 py-16">
              <Loader2 className="h-10 w-10 animate-spin text-neon-blue" aria-hidden />
              <div className="text-center">
                <p className="font-display text-base font-semibold text-white">{CRM_REPORTS_COPY.loadingTitle}</p>
                <p className="mt-1 text-sm text-slate-500">{CRM_REPORTS_COPY.loadingHint}</p>
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
          <div
            className="flex flex-col gap-3 rounded-2xl border border-amber-500/25 bg-amber-500/10 px-4 py-4 sm:flex-row sm:items-center sm:justify-between sm:px-5"
            role="alert"
          >
            <div>
              <p className="font-medium text-amber-100">{CRM_REPORTS_COPY.errorTitle}</p>
              <p className="mt-0.5 text-sm text-amber-200/80">{CRM_REPORTS_COPY.errorHint}</p>
            </div>
            <button
              type="button"
              onClick={() => setReloadTick((x) => x + 1)}
              className="shrink-0 rounded-xl border border-amber-400/40 bg-white/10 px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-white/15"
            >
              {CRM_REPORTS_COPY.retryCta}
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="overflow-x-hidden px-4 py-6 sm:px-6 md:px-8">
      <div className="mx-auto max-w-7xl space-y-8">
        <div className="space-y-6">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <Link
              href="/dashboard"
              className="inline-flex items-center gap-2 text-sm text-slate-400 transition-colors hover:text-neon-blue"
            >
              <ChevronRight className="h-4 w-4 rotate-180" aria-hidden />
              {CRM_REPORTS_COPY.navDashboard}
            </Link>
          </div>
          <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between sm:gap-6">
            <div className="min-w-0 flex-1">
              <p className="text-[11px] font-semibold uppercase tracking-wider text-neon-blue/90">
                {CRM_REPORTS_COPY.heroEyebrow}
              </p>
              <h1 className="mt-1 font-display text-2xl font-bold tracking-tight text-white sm:text-3xl lg:text-4xl">
                {CRM_REPORTS_COPY.heroTitle}
              </h1>
              <p className="mt-2 max-w-xl text-sm leading-relaxed text-slate-400 sm:text-base">
                {CRM_REPORTS_COPY.heroSubtitle}
              </p>
            </div>
            <div className="inline-flex h-11 w-11 items-center justify-center rounded-xl border border-white/[0.08] bg-white/[0.03] text-slate-400">
              <Trophy className="h-5 w-5" aria-hidden />
            </div>
          </div>
        </div>

        <Card className="rounded-2xl border-white/[0.08] p-0 hover:border-white/[0.12]">
          <div className="border-b border-white/[0.08] bg-white/[0.02] px-4 py-3 sm:px-5">
            <p className="text-[11px] font-semibold uppercase tracking-wider text-slate-500">
              {CRM_REPORTS_COPY.filtersKicker}
            </p>
            <h2 className="font-display text-base font-semibold tracking-tight text-white sm:text-lg">
              {CRM_REPORTS_COPY.filtersTitle}
            </h2>
            <p className="mt-1 text-xs leading-relaxed text-slate-600">{CRM_REPORTS_COPY.filtersHint}</p>
          </div>
          <div className="flex flex-wrap gap-3 p-4 sm:p-5">
            <select
              value={teamId}
              onChange={(e) => setTeamId(e.target.value)}
              className="rounded-xl border border-white/[0.08] bg-white/[0.05] px-4 py-2.5 text-sm text-white focus:border-white/20 focus:outline-none"
            >
              <option value="">{CRM_REPORTS_COPY.allTeams}</option>
              {teams.map((t) => (
                <option key={t.id} value={t.id}>
                  {t.name}
                </option>
              ))}
            </select>
            <select
              value={position}
              onChange={(e) => setPosition(e.target.value)}
              className="rounded-xl border border-white/[0.08] bg-white/[0.05] px-4 py-2.5 text-sm text-white focus:border-white/20 focus:outline-none"
            >
              <option value="">{CRM_REPORTS_COPY.allPositions}</option>
              {POSITIONS.map((p) => (
                <option key={p} value={p}>
                  {p}
                </option>
              ))}
            </select>
            <select
              value={birthYear}
              onChange={(e) => setBirthYear(e.target.value)}
              className="rounded-xl border border-white/[0.08] bg-white/[0.05] px-4 py-2.5 text-sm text-white focus:border-white/20 focus:outline-none"
            >
              <option value="">{CRM_REPORTS_COPY.allBirthYears}</option>
              {birthYears.map((y) => (
                <option key={y} value={y}>
                  {y} г.р.
                </option>
              ))}
            </select>
          </div>
        </Card>

        <Card className="rounded-2xl border-white/[0.08] p-0 hover:border-white/[0.12]">
          <div className="border-b border-white/[0.08] bg-white/[0.02] px-4 py-3 sm:px-5">
            <p className="text-[11px] font-semibold uppercase tracking-wider text-slate-500">
              {CRM_REPORTS_COPY.summaryKicker}
            </p>
            <h2 className="font-display text-base font-semibold tracking-tight text-white sm:text-lg">
              {CRM_REPORTS_COPY.summaryTitle}
            </h2>
            <p className="mt-1 text-xs leading-relaxed text-slate-600">{CRM_REPORTS_COPY.summaryHint}</p>
          </div>
          <div className="grid gap-3 p-4 sm:grid-cols-2 lg:grid-cols-4 sm:p-5">
            <div className="rounded-xl border border-white/[0.08] bg-white/[0.03] p-4">
              <p className="text-sm text-slate-500">{CRM_REPORTS_COPY.statInRating}</p>
              <p className="mt-1 text-2xl font-semibold text-white">{items.length}</p>
            </div>
            <div className="rounded-xl border border-white/[0.08] bg-white/[0.03] p-4">
              <p className="text-sm text-slate-500">{CRM_REPORTS_COPY.statTop1}</p>
              <p className="mt-1 truncate text-lg font-semibold text-white">{leader}</p>
            </div>
            <div className="rounded-xl border border-white/[0.08] bg-white/[0.03] p-4">
              <p className="text-sm text-slate-500">{CRM_REPORTS_COPY.statTop10}</p>
              <p className="mt-1 text-2xl font-semibold text-white">{topTenThreshold}</p>
            </div>
            <div className="rounded-xl border border-white/[0.08] bg-white/[0.03] p-4">
              <p className="text-sm text-slate-500">{CRM_REPORTS_COPY.statAvg}</p>
              <p className="mt-1 text-2xl font-semibold text-white">{averageScore}</p>
            </div>
          </div>
        </Card>

        <Card className="overflow-hidden rounded-2xl border-white/[0.08] p-0 hover:border-white/[0.12]">
          <div className="border-b border-white/[0.08] bg-white/[0.02] px-4 py-3 sm:px-5">
            <p className="text-[11px] font-semibold uppercase tracking-wider text-slate-500">
              {CRM_REPORTS_COPY.tableKicker}
            </p>
            <h2 className="flex items-center gap-2 font-display text-base font-semibold tracking-tight text-white sm:text-lg">
              <Medal className="h-4 w-4 text-slate-400" aria-hidden />
              {CRM_REPORTS_COPY.tableTitle}
            </h2>
            <p className="mt-1 text-xs leading-relaxed text-slate-600">{CRM_REPORTS_COPY.tableHint}</p>
          </div>
          {items.length === 0 ? (
            <div className="flex min-h-[220px] flex-col items-center justify-center gap-2 px-4 py-12 text-center">
              <Users className="h-11 w-11 text-slate-600" aria-hidden />
              <p className="text-sm font-medium text-slate-400">{CRM_REPORTS_COPY.emptyTitle}</p>
              <p className="max-w-sm text-xs text-slate-600">{CRM_REPORTS_COPY.emptyHint}</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full min-w-[860px] text-sm">
                <thead>
                  <tr className="border-b border-white/[0.08] bg-white/[0.02] text-left text-slate-400">
                    <th className="px-4 py-3 text-[11px] font-semibold uppercase tracking-wider sm:px-5">{CRM_REPORTS_COPY.colRank}</th>
                    <th className="px-4 py-3 text-[11px] font-semibold uppercase tracking-wider sm:px-5">{CRM_REPORTS_COPY.colName}</th>
                    <th className="px-4 py-3 text-[11px] font-semibold uppercase tracking-wider sm:px-5">{CRM_REPORTS_COPY.colTeam}</th>
                    <th className="px-4 py-3 text-[11px] font-semibold uppercase tracking-wider sm:px-5">{CRM_REPORTS_COPY.colAge}</th>
                    <th className="px-4 py-3 text-[11px] font-semibold uppercase tracking-wider sm:px-5">{CRM_REPORTS_COPY.colPosition}</th>
                    <th className="px-4 py-3 text-right text-[11px] font-semibold uppercase tracking-wider sm:px-5">{CRM_REPORTS_COPY.colRating}</th>
                  </tr>
                </thead>
                <tbody>
                  {items.map((item, idx) => {
                    const rank = idx + 1;
                    const badge = getRankBadge(rank);
                    return (
                      <tr
                        key={item.id}
                        className="group border-b border-white/[0.06] transition-colors hover:bg-white/[0.03]"
                      >
                        <td className="px-4 py-3.5 sm:px-5">
                          <span className="flex items-center gap-2 font-display font-semibold text-white">
                            {badge ?? (
                              <span className="flex h-8 w-8 items-center justify-center rounded-lg border border-white/[0.08] bg-white/[0.04] text-slate-400 transition-colors group-hover:border-white/[0.12] group-hover:text-slate-300">
                                {rank}
                              </span>
                            )}
                          </span>
                        </td>
                        <td className="px-4 py-3.5 sm:px-5">
                          <Link
                            href={`/player/${item.id}`}
                            className="inline-flex items-center gap-1 font-medium text-white transition-colors hover:text-neon-blue"
                          >
                            {item.name}
                            <ChevronRight className="h-3.5 w-3.5 opacity-40" aria-hidden />
                          </Link>
                        </td>
                        <td className="px-4 py-3.5 text-slate-400 sm:px-5">{item.team?.name ?? "—"}</td>
                        <td className="px-4 py-3.5 text-slate-400 sm:px-5">{item.birthYear} г.р.</td>
                        <td className="px-4 py-3.5 sm:px-5">
                          <span className="rounded-full border border-white/[0.08] bg-white/[0.03] px-2.5 py-1 text-xs font-medium text-slate-300">
                            {item.position}
                          </span>
                        </td>
                        <td className="px-4 py-3.5 text-right sm:px-5">
                          <span className="font-mono text-base font-semibold text-slate-200">{item.rankingScore}</span>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </Card>
      </div>
    </div>
  );
}
