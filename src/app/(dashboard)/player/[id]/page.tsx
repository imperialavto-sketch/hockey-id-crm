"use client";

import { useEffect, useState, useRef } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import {
  ArrowLeft,
  UserCircle,
  MapPin,
  Zap,
  Award,
  Video,
  Heart,
  Star,
  Users,
  User,
  BarChart3,
  TrendingUp,
  FileText,
  History,
  Edit3,
  Loader2,
  Brain,
  ThumbsUp,
  AlertTriangle,
  Lightbulb,
  Target,
  Trophy,
  ChevronRight,
} from "lucide-react";
import { Card } from "@/components/Card";
import { Button } from "@/components/Button";
import {
  SkillsComparisonChart,
  SkillsProgressLineChart,
} from "@/components/player/PassportCharts";
import { PassportPDFExport } from "@/components/player/PassportPDFExport";
import { usePermissions } from "@/hooks/usePermissions";
import { CRM_RATING_DETAIL_COPY } from "@/lib/crmRatingDetailCopy";

interface Team {
  id: string;
  name: string;
  ageGroup?: string;
  coach?: { id: string; firstName?: string; lastName?: string } | null;
}

interface PlayerStat {
  id?: string;
  season: string;
  games: number;
  goals: number;
  assists: number;
  points: number;
  pim: number;
}

interface TeamHistory {
  id: string;
  teamName: string;
  season: string;
  league: string;
  coach: string | null;
  stats?: { gamesPlayed?: number; goals?: number; assists?: number; penalties?: number } | null;
}

interface Medical {
  id: string;
  lastCheckup: string | null;
  injuries: Array<{ type?: string; date?: string; recoveryDays?: number }> | null;
  restrictions: string | null;
}

interface Achievement {
  id: string;
  title: string;
  year: number;
  description?: string | null;
}

interface PlayerVideo {
  id: string;
  title: string;
  url: string;
}

interface CoachRating {
  id: string;
  rating: number;
  recommendation: string | null;
  comment?: string | null;
  coach?: { firstName?: string; lastName?: string };
}

interface AIData {
  developmentIndex: number;
  skillsAverage: number;
  attendanceScore: number;
  coachRatingScore: number;
  statsScore: number;
  strengths: string[];
  weaknesses: string[];
  recommendations: string[];
}

interface RankingData {
  rankingScore: number;
  rankOverall: number | null;
  rankInTeam: number | null;
  rankByPosition: number | null;
  rankByBirthYear: number | null;
}

interface Player {
  id: string;
  firstName: string;
  lastName: string;
  birthYear: number;
  birthDate: string | null;
  position: string;
  grip: string;
  height: number | null;
  weight: number | null;
  city: string | null;
  country: string | null;
  photoUrl: string | null;
  team?: Team | null;
  profile?: { height?: number | null; weight?: number | null; shoots?: string | null } | null;
  stats?: PlayerStat[];
  teamHistory: TeamHistory[];
  medical: Medical | null;
  skills: { speed: number | null; shotAccuracy: number | null; dribbling: number | null; stamina: number | null } | null;
  achievements: Achievement[];
  videos: PlayerVideo[];
  coachRatings?: CoachRating[];
}

function formatDate(s: string | null) {
  return s ? new Date(s).toLocaleDateString("ru-RU") : "—";
}

function getYoutubeEmbedUrl(url: string): string | null {
  const m = url.match(/(?:youtube\.com\/watch\?v=|youtu\.be\/)([a-zA-Z0-9_-]{11})/);
  return m ? `https://www.youtube.com/embed/${m[1]}` : null;
}

function isYoutubeUrl(url: string) {
  return /youtube\.com|youtu\.be/.test(url);
}

export default function PlayerCareerPassportPage() {
  const params = useParams();
  const id = params?.id as string;
  const { canEdit } = usePermissions();
  const [player, setPlayer] = useState<Player | null>(null);
  const [aiData, setAiData] = useState<AIData | null>(null);
  const [rankingData, setRankingData] = useState<RankingData | null>(null);
  const [loading, setLoading] = useState(true);
  const [fetchError, setFetchError] = useState(false);
  const [reloadTick, setReloadTick] = useState(0);
  const passportRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!id) {
      setLoading(false);
      return;
    }
    setLoading(true);
    setFetchError(false);
    fetch(`/api/player/${id}`)
      .then(async (r) => {
        const data = await r.json().catch(() => ({}));
        if (!r.ok) throw new Error("fetch failed");
        return data;
      })
      .then((data) => {
        if (data?.id) {
          setPlayer(data);
          setFetchError(false);
        } else {
          setPlayer(null);
          setFetchError(false);
        }
      })
      .catch(() => {
        setPlayer(null);
        setFetchError(true);
      })
      .finally(() => setLoading(false));
  }, [id, reloadTick]);

  useEffect(() => {
    if (!id) return;
    fetch(`/api/player/${id}/ai`)
      .then((r) => r.json())
      .then((data) => (data?.developmentIndex != null ? setAiData(data) : setAiData(null)))
      .catch(() => setAiData(null));
  }, [id]);

  useEffect(() => {
    if (!id) return;
    fetch(`/api/player/${id}/ranking`)
      .then((r) => r.json())
      .then((data) =>
        data?.rankingScore != null ? setRankingData(data) : setRankingData(null)
      )
      .catch(() => setRankingData(null));
  }, [id]);

  if (loading) {
    return (
      <div className="overflow-x-hidden px-4 py-6 sm:px-6 md:px-8">
        <div className="mx-auto max-w-7xl">
          <Card className="rounded-2xl border-white/[0.08] p-0 hover:border-white/[0.08]">
            <div className="flex min-h-[40vh] flex-col items-center justify-center gap-4 py-16">
              <Loader2 className="h-10 w-10 animate-spin text-neon-blue" aria-hidden />
              <div className="text-center">
                <p className="font-display text-base font-semibold text-white">{CRM_RATING_DETAIL_COPY.loadingTitle}</p>
                <p className="mt-1 text-sm text-slate-500">{CRM_RATING_DETAIL_COPY.loadingHint}</p>
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
              href="/ratings"
              className="inline-flex items-center gap-2 text-sm text-slate-400 transition-colors hover:text-neon-blue"
            >
              <ArrowLeft className="h-4 w-4" aria-hidden />
              {CRM_RATING_DETAIL_COPY.backRatings}
            </Link>
            <Link
              href="/dashboard"
              className="text-sm font-medium text-slate-500 transition-colors hover:text-neon-blue"
            >
              {CRM_RATING_DETAIL_COPY.backDashboard}
            </Link>
          </div>
          <div
            className="flex flex-col gap-3 rounded-2xl border border-amber-500/25 bg-amber-500/10 px-4 py-4 sm:flex-row sm:items-center sm:justify-between sm:px-5"
            role="alert"
          >
            <div>
              <p className="font-medium text-amber-100">{CRM_RATING_DETAIL_COPY.errorTitle}</p>
              <p className="mt-0.5 text-sm text-amber-200/80">{CRM_RATING_DETAIL_COPY.errorHint}</p>
            </div>
            <button
              type="button"
              onClick={() => setReloadTick((x) => x + 1)}
              className="shrink-0 rounded-xl border border-amber-400/40 bg-white/10 px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-white/15"
            >
              {CRM_RATING_DETAIL_COPY.retryCta}
            </button>
          </div>
        </div>
      </div>
    );
  }

  if (!player) {
    return (
      <div className="overflow-x-hidden px-4 py-6 sm:px-6 md:px-8">
        <div className="mx-auto max-w-7xl space-y-8">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <Link
              href="/ratings"
              className="inline-flex items-center gap-2 text-sm text-slate-400 transition-colors hover:text-neon-blue"
            >
              <ArrowLeft className="h-4 w-4" aria-hidden />
              {CRM_RATING_DETAIL_COPY.backRatings}
            </Link>
            <Link
              href="/dashboard"
              className="text-sm font-medium text-slate-500 transition-colors hover:text-neon-blue"
            >
              {CRM_RATING_DETAIL_COPY.backDashboard}
            </Link>
          </div>
          <div className="mx-auto max-w-2xl">
            <Card className="border-white/[0.08] p-8 text-center">
              <p className="font-display text-lg font-semibold text-white">{CRM_RATING_DETAIL_COPY.notFoundTitle}</p>
              <p className="mx-auto mt-2 max-w-sm text-sm text-slate-500">{CRM_RATING_DETAIL_COPY.notFoundHint}</p>
              <div className="mt-8 flex flex-col items-center gap-3 sm:flex-row sm:justify-center">
                <Link href="/ratings" className="inline-flex">
                  <Button variant="secondary">{CRM_RATING_DETAIL_COPY.notFoundBackRatings}</Button>
                </Link>
                <Link href="/players" className="inline-flex">
                  <Button>{CRM_RATING_DETAIL_COPY.notFoundBackPlayers}</Button>
                </Link>
              </div>
            </Card>
          </div>
        </div>
      </div>
    );
  }

  const height = player.height ?? player.profile?.height ?? null;
  const weight = player.weight ?? player.profile?.weight ?? null;
  const coachName = player.team?.coach
    ? [player.team.coach.firstName, player.team.coach.lastName].filter(Boolean).join(" ") || "Тренер"
    : null;

  return (
    <div className="overflow-x-hidden px-4 py-6 sm:px-6 md:px-8">
      <div className="mx-auto max-w-7xl space-y-8">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div className="flex flex-wrap items-center gap-3">
        <Link
          href="/ratings"
          className="inline-flex items-center gap-2 text-sm text-slate-400 transition-colors hover:text-neon-blue"
        >
          <ArrowLeft className="h-4 w-4" />
          {CRM_RATING_DETAIL_COPY.backRatings}
        </Link>
        <Link
          href="/players"
          className="inline-flex items-center gap-2 text-sm text-slate-500 transition-colors hover:text-neon-blue"
        >
          <ArrowLeft className="h-4 w-4" />
          {CRM_RATING_DETAIL_COPY.backPlayers}
        </Link>
        <Link
          href="/dashboard"
          className="inline-flex items-center gap-1 text-sm text-slate-500 transition-colors hover:text-neon-blue"
        >
          {CRM_RATING_DETAIL_COPY.backDashboard}
          <ChevronRight className="h-3.5 w-3.5 opacity-60" aria-hidden />
        </Link>
        </div>
        <div className="flex items-center gap-3">
          <PassportPDFExport
            contentRef={passportRef}
            fileName={`career-passport-${player.firstName}-${player.lastName}`}
          />
          {canEdit("players") && (
            <Link href={`/players/${id}/edit`}>
              <Button variant="secondary" size="sm" className="gap-2">
                <Edit3 className="h-4 w-4" />
                Редактировать
              </Button>
            </Link>
          )}
        </div>
      </div>

      <div ref={passportRef} className="space-y-8">
        {/* Профиль игрока — Hero */}
        <Card className="overflow-hidden border-white/[0.08] bg-gradient-to-br from-white/[0.06] to-transparent">
          <div className="flex flex-col gap-6 sm:flex-row sm:items-start">
            <div className="flex shrink-0 justify-center sm:justify-start">
              {player.photoUrl ? (
                <div className="relative h-36 w-36 overflow-hidden rounded-2xl border-2 border-neon-blue/40 shadow-[0_0_30px_rgba(0,212,255,0.3)]">
                  <img
                    src={player.photoUrl}
                    alt={`${player.firstName} ${player.lastName}`}
                    className="h-full w-full object-cover"
                  />
                </div>
              ) : (
                <div className="flex h-36 w-36 items-center justify-center rounded-2xl border-2 border-neon-blue/40 bg-gradient-to-br from-neon-blue/20 to-neon-cyan/20">
                  <UserCircle className="h-20 w-20 text-neon-blue/80" />
                </div>
              )}
            </div>
            <div className="flex-1 space-y-4">
              <p className="text-[11px] font-semibold uppercase tracking-wider text-neon-blue/90">
                {CRM_RATING_DETAIL_COPY.heroEyebrow}
              </p>
              <h1 className="font-display text-3xl font-bold tracking-tight text-white sm:text-4xl">
                {player.firstName} {player.lastName}
              </h1>
              <p className="max-w-2xl text-sm leading-relaxed text-slate-400">{CRM_RATING_DETAIL_COPY.heroSubtitle}</p>
              <div className="flex flex-wrap gap-x-6 gap-y-2 text-slate-400">
                <span className="flex items-center gap-1.5">
                  <Users className="h-4 w-4" />
                  {player.position}
                </span>
                <span>{player.birthYear} г.р.</span>
                <span>{player.grip} хват</span>
                {height != null && <span>{height} см</span>}
                {weight != null && <span>{weight} кг</span>}
                {player.city && (
                  <span className="flex items-center gap-1.5">
                    <MapPin className="h-4 w-4" />
                    {player.city}
                    {player.country && `, ${player.country}`}
                  </span>
                )}
              </div>
              <div className="flex flex-wrap gap-x-6 gap-y-1 text-sm">
                {player.team && (
                  <div className="flex items-center gap-1.5">
                    <Users className="h-4 w-4 text-neon-blue" />
                    <span className="text-slate-300">{player.team.name}</span>
                    {player.team.ageGroup && (
                      <span className="text-slate-500">({player.team.ageGroup})</span>
                    )}
                  </div>
                )}
                {coachName && (
                  <div className="flex items-center gap-1.5">
                    <User className="h-4 w-4 text-neon-blue" />
                    <span className="text-slate-300">{coachName}</span>
                  </div>
                )}
              </div>
            </div>
          </div>
        </Card>

        {/* AI Development Index */}
        {aiData && (
          <Card className="overflow-hidden border-neon-cyan/20 bg-gradient-to-br from-slate-900/50 to-dark-900">
            <div className="border-b border-white/10 px-6 py-4">
              <h2 className="flex items-center gap-2 font-display text-xl font-semibold text-white">
                <Brain className="h-5 w-5 text-neon-cyan" />
                AI Development Index
              </h2>
              <p className="mt-1 text-sm text-slate-400">
                Индекс развития на основе навыков, посещаемости, оценок тренеров и статистики
              </p>
            </div>
            <div className="p-6">
              <div className="mb-8 flex flex-col gap-6 sm:flex-row sm:items-center sm:justify-between">
                <div className="flex items-center gap-4">
                  <div className="flex h-24 w-24 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br from-neon-cyan/30 to-neon-blue/30 shadow-[0_0_30px_rgba(0,212,255,0.2)]">
                    <span className="font-display text-3xl font-bold text-neon-cyan">
                      {aiData.developmentIndex}
                    </span>
                  </div>
                  <div>
                    <p className="text-lg font-medium text-white">Общий индекс</p>
                    <p className="text-sm text-slate-400">из 100</p>
                  </div>
                </div>
                <div className="flex flex-wrap gap-2">
                  {aiData.strengths.length > 0 && (
                    <span className="inline-flex items-center gap-1 rounded-full border border-neon-green/40 bg-neon-green/10 px-3 py-1 text-sm text-neon-green">
                      <ThumbsUp className="h-3.5 w-3.5" />
                      {aiData.strengths.length} сильных сторон
                    </span>
                  )}
                  {aiData.weaknesses.length > 0 && (
                    <span className="inline-flex items-center gap-1 rounded-full border border-amber-500/40 bg-amber-500/10 px-3 py-1 text-sm text-amber-400">
                      <AlertTriangle className="h-3.5 w-3.5" />
                      {aiData.weaknesses.length} зон роста
                    </span>
                  )}
                </div>
              </div>

              <div className="mb-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
                {[
                  {
                    label: "Навыки",
                    value: aiData.skillsAverage,
                    color: "from-neon-blue to-neon-cyan",
                  },
                  {
                    label: "Посещаемость",
                    value: aiData.attendanceScore,
                    color: "from-neon-green to-emerald-400",
                  },
                  {
                    label: "Оценки тренеров",
                    value: aiData.coachRatingScore,
                    color: "from-amber-400 to-orange-400",
                  },
                  {
                    label: "Статистика",
                    value: aiData.statsScore,
                    color: "from-neon-pink to-purple-400",
                  },
                ].map((item) => (
                  <div
                    key={item.label}
                    className="rounded-xl border border-white/10 bg-white/5 p-4"
                  >
                    <p className="mb-2 text-sm text-slate-400">{item.label}</p>
                    <div className="mb-2 h-2 overflow-hidden rounded-full bg-white/10">
                      <div
                        className={`h-full rounded-full bg-gradient-to-r ${item.color} transition-all duration-500`}
                        style={{ width: `${Math.min(100, item.value)}%` }}
                      />
                    </div>
                    <p className="font-mono text-lg font-semibold text-white">
                      {item.value}
                    </p>
                  </div>
                ))}
              </div>

              <div className="grid gap-6 lg:grid-cols-3">
                {aiData.strengths.length > 0 && (
                  <div className="rounded-xl border border-neon-green/20 bg-neon-green/5 p-4">
                    <h3 className="mb-3 flex items-center gap-2 font-medium text-neon-green">
                      <ThumbsUp className="h-4 w-4" />
                      Сильные стороны
                    </h3>
                    <ul className="space-y-2">
                      {aiData.strengths.map((s) => (
                        <li
                          key={s}
                          className="flex items-center gap-2 text-sm text-slate-300"
                        >
                          <span className="h-1.5 w-1.5 rounded-full bg-neon-green" />
                          {s}
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
                {aiData.weaknesses.length > 0 && (
                  <div className="rounded-xl border border-amber-500/20 bg-amber-500/5 p-4">
                    <h3 className="mb-3 flex items-center gap-2 font-medium text-amber-400">
                      <AlertTriangle className="h-4 w-4" />
                      Зоны роста
                    </h3>
                    <ul className="space-y-2">
                      {aiData.weaknesses.map((w) => (
                        <li
                          key={w}
                          className="flex items-center gap-2 text-sm text-slate-300"
                        >
                          <span className="h-1.5 w-1.5 rounded-full bg-amber-400" />
                          {w}
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
                {aiData.recommendations.length > 0 && (
                  <div className="rounded-xl border border-neon-blue/20 bg-neon-blue/5 p-4 lg:col-span-1">
                    <h3 className="mb-3 flex items-center gap-2 font-medium text-neon-blue">
                      <Lightbulb className="h-4 w-4" />
                      Рекомендации
                    </h3>
                    <ul className="space-y-2">
                      {aiData.recommendations.map((r) => (
                        <li
                          key={r}
                          className="flex items-start gap-2 text-sm text-slate-300"
                        >
                          <Target className="mt-0.5 h-3.5 w-3.5 shrink-0 text-neon-blue" />
                          {r}
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>
            </div>
          </Card>
        )}

        {/* Player Ranking */}
        {rankingData && (
          <Card className="overflow-hidden border-white/[0.08] bg-white/[0.02] p-0">
            <div className="border-b border-white/[0.08] bg-white/[0.02] px-5 py-4 sm:px-6">
              <p className="text-[11px] font-semibold uppercase tracking-wider text-slate-500">
                {CRM_RATING_DETAIL_COPY.rankingKicker}
              </p>
              <h2 className="mt-0.5 flex items-center gap-2 font-display text-base font-semibold tracking-tight text-white sm:text-lg">
                <Trophy className="h-4.5 w-4.5 text-slate-400" />
                {CRM_RATING_DETAIL_COPY.rankingTitle}
              </h2>
              <p className="mt-1 text-xs leading-relaxed text-slate-600">{CRM_RATING_DETAIL_COPY.rankingHint}</p>
            </div>
            <div className="p-6">
              <div className="flex flex-col gap-6 sm:flex-row sm:flex-wrap sm:items-center">
                <div className="flex h-20 w-20 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br from-neon-blue/30 to-neon-cyan/30 shadow-[0_0_30px_rgba(0,212,255,0.2)]">
                  <span className="font-display text-2xl font-bold text-neon-cyan">
                    {rankingData.rankingScore}
                  </span>
                </div>
                <div className="flex flex-wrap gap-4">
                  <div className="rounded-xl border border-white/10 bg-white/5 px-4 py-3">
                    <p className="text-xs text-slate-500">Общий рейтинг</p>
                    <p className="font-mono font-semibold text-white">
                      {rankingData.rankOverall ?? "—"}
                    </p>
                  </div>
                  <div className="rounded-xl border border-white/10 bg-white/5 px-4 py-3">
                    <p className="text-xs text-slate-500">Место в команде</p>
                    <p className="font-mono font-semibold text-white">
                      {rankingData.rankInTeam ?? "—"}
                    </p>
                  </div>
                  <div className="rounded-xl border border-white/10 bg-white/5 px-4 py-3">
                    <p className="text-xs text-slate-500">Место по позиции</p>
                    <p className="font-mono font-semibold text-white">
                      {rankingData.rankByPosition ?? "—"}
                    </p>
                  </div>
                  <div className="rounded-xl border border-white/10 bg-white/5 px-4 py-3">
                    <p className="text-xs text-slate-500">Место по возрасту</p>
                    <p className="font-mono font-semibold text-white">
                      {rankingData.rankByBirthYear ?? "—"}
                    </p>
                  </div>
                </div>
              </div>
              <Link href="/ratings" className="mt-4 inline-flex items-center gap-1 text-sm text-slate-400 hover:text-neon-blue">
                {CRM_RATING_DETAIL_COPY.backRatings}
                <ChevronRight className="h-4 w-4 opacity-60" aria-hidden />
              </Link>
            </div>
          </Card>
        )}

        <div className="grid gap-6 lg:grid-cols-2">
          {/* Карьерная история */}
          <Card className="lg:col-span-2">
            <h2 className="mb-4 flex items-center gap-2 font-display text-xl font-semibold text-white">
              <History className="h-5 w-5 text-neon-blue" />
              Карьерная история
            </h2>
            {player.teamHistory.length > 0 ? (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-white/10 text-left text-slate-500">
                      <th className="py-3 pr-4 font-medium">Команда</th>
                      <th className="py-3 pr-4 font-medium">Сезон</th>
                      <th className="py-3 pr-4 font-medium">Лига</th>
                      <th className="py-3 font-medium">Тренер</th>
                    </tr>
                  </thead>
                  <tbody>
                    {player.teamHistory.map((h) => (
                      <tr key={h.id} className="border-b border-white/5">
                        <td className="py-3 pr-4 font-medium text-white">{h.teamName}</td>
                        <td className="py-3 pr-4 text-slate-300">{h.season}</td>
                        <td className="py-3 pr-4 text-slate-300">{h.league}</td>
                        <td className="py-3 text-slate-300">{h.coach ?? "—"}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <p className="text-slate-500">История команд пуста</p>
            )}
          </Card>

          {/* Статистика сезонов */}
          <Card className="lg:col-span-2">
            <h2 className="mb-4 flex items-center gap-2 font-display text-xl font-semibold text-white">
              <BarChart3 className="h-5 w-5 text-neon-blue" />
              Статистика сезонов
            </h2>
            {(player.stats?.length ?? 0) > 0 ? (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-white/10 text-left text-slate-500">
                      <th className="py-3 pr-4 font-medium">Сезон</th>
                      <th className="py-3 pr-4 font-medium">Игры</th>
                      <th className="py-3 pr-4 font-medium">Голы</th>
                      <th className="py-3 pr-4 font-medium">Передачи</th>
                      <th className="py-3 pr-4 font-medium">Очки</th>
                      <th className="py-3 font-medium">Штраф</th>
                    </tr>
                  </thead>
                  <tbody>
                    {(player.stats ?? []).map((s, i) => (
                      <tr key={s.id ?? i} className="border-b border-white/5">
                        <td className="py-3 pr-4 font-medium text-white">{s.season}</td>
                        <td className="py-3 pr-4 text-slate-300">{s.games ?? 0}</td>
                        <td className="py-3 pr-4 text-slate-300">{s.goals ?? 0}</td>
                        <td className="py-3 pr-4 text-slate-300">{s.assists ?? 0}</td>
                        <td className="py-3 pr-4 font-medium text-neon-blue">{s.points ?? 0}</td>
                        <td className="py-3 text-slate-300">{s.pim ?? 0}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <p className="text-slate-500">Статистика не добавлена</p>
            )}
          </Card>

          {/* Навыки — radar chart */}
          <Card>
            <h2 className="mb-4 flex items-center gap-2 font-display text-xl font-semibold text-white">
              <Zap className="h-5 w-5 text-neon-blue" />
              Навыки игрока
            </h2>
            {player.skills ? (
              <SkillsComparisonChart skills={player.skills} />
            ) : (
              <p className="text-slate-500">Навыки не заданы</p>
            )}
          </Card>

          {/* Прогресс навыков / карьеры */}
          <Card>
            <h2 className="mb-4 flex items-center gap-2 font-display text-xl font-semibold text-white">
              <TrendingUp className="h-5 w-5 text-neon-blue" />
              Прогресс по сезонам
            </h2>
            <SkillsProgressLineChart
              stats={player.stats}
              teamHistory={player.teamHistory}
            />
            {(!player.stats?.length && !player.teamHistory?.length) && (
              <p className="text-slate-500">Данных для графика нет</p>
            )}
          </Card>

          {/* Достижения */}
          <Card className="lg:col-span-2">
            <h2 className="mb-4 flex items-center gap-2 font-display text-xl font-semibold text-white">
              <Award className="h-5 w-5 text-neon-blue" />
              Достижения
            </h2>
            {player.achievements.length > 0 ? (
              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                {player.achievements.map((a) => (
                  <div
                    key={a.id}
                    className="rounded-xl border border-white/10 bg-white/5 p-4 transition-colors hover:border-neon-blue/30"
                  >
                    <p className="font-medium text-white">{a.title}</p>
                    <p className="mt-1 text-sm text-slate-400">{a.year}</p>
                    {a.description && (
                      <p className="mt-2 text-sm text-slate-500">{a.description}</p>
                    )}
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-slate-500">Достижений пока нет</p>
            )}
          </Card>

          {/* Видео */}
          <Card className="lg:col-span-2">
            <h2 className="mb-4 flex items-center gap-2 font-display text-xl font-semibold text-white">
              <Video className="h-5 w-5 text-neon-blue" />
              Видео
            </h2>
            {player.videos.length > 0 ? (
              <div className="grid gap-6 sm:grid-cols-2">
                {player.videos.map((v) => {
                  const embedUrl = isYoutubeUrl(v.url) ? getYoutubeEmbedUrl(v.url) : null;
                  return (
                    <div key={v.id} className="overflow-hidden rounded-xl border border-white/10">
                      <p className="border-b border-white/10 bg-white/5 px-4 py-2 font-medium text-white">
                        {v.title}
                      </p>
                      {embedUrl ? (
                        <div className="relative aspect-video">
                          <iframe
                            src={embedUrl}
                            title={v.title}
                            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                            allowFullScreen
                            className="absolute inset-0 h-full w-full"
                          />
                        </div>
                      ) : (
                        <a
                          href={v.url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="block p-4 text-neon-blue hover:underline"
                        >
                          Смотреть видео →
                        </a>
                      )}
                    </div>
                  );
                })}
              </div>
            ) : (
              <p className="text-slate-500">Видео пока нет</p>
            )}
          </Card>

          {/* Медицинская история */}
          <Card>
            <h2 className="mb-4 flex items-center gap-2 font-display text-xl font-semibold text-white">
              <Heart className="h-5 w-5 text-neon-blue" />
              Медицинская история
            </h2>
            {player.medical ? (
              <div className="space-y-4">
                <div>
                  <dt className="text-sm text-slate-500">Последний осмотр</dt>
                  <dd className="text-white">{formatDate(player.medical.lastCheckup)}</dd>
                </div>
                <div>
                  <dt className="text-sm text-slate-500">Ограничения</dt>
                  <dd className="text-slate-300">{player.medical.restrictions ?? "—"}</dd>
                </div>
                <div>
                  <dt className="mb-1 text-sm text-slate-500">Травмы</dt>
                  <dd>
                    {player.medical.injuries &&
                    Array.isArray(player.medical.injuries) &&
                    player.medical.injuries.length > 0 ? (
                      <ul className="space-y-1 text-slate-300">
                        {player.medical.injuries.map((i, idx) => (
                          <li key={idx}>
                            {i.type ?? "Травма"}
                            {i.date && ` — ${formatDate(i.date)}`}
                            {i.recoveryDays != null &&
                              ` (восстановление ${i.recoveryDays} дн.)`}
                          </li>
                        ))}
                      </ul>
                    ) : (
                      <span className="text-slate-500">Нет</span>
                    )}
                  </dd>
                </div>
              </div>
            ) : (
              <p className="text-slate-500">Медицинские данные не добавлены</p>
            )}
          </Card>

          {/* Оценки тренеров */}
          <Card className="overflow-hidden border-white/[0.08] p-0">
            <div className="border-b border-white/[0.08] bg-white/[0.02] px-5 py-4 sm:px-6">
              <p className="text-[11px] font-semibold uppercase tracking-wider text-slate-500">
                {CRM_RATING_DETAIL_COPY.coachRatingsKicker}
              </p>
              <h2 className="mt-0.5 flex items-center gap-2 font-display text-base font-semibold tracking-tight text-white sm:text-lg">
                <Star className="h-4.5 w-4.5 text-slate-400" />
                {CRM_RATING_DETAIL_COPY.coachRatingsTitle}
              </h2>
              <p className="mt-1 text-xs leading-relaxed text-slate-600">{CRM_RATING_DETAIL_COPY.coachRatingsHint}</p>
            </div>
            <div className="p-5 sm:p-6">
            {(player.coachRatings?.length ?? 0) > 0 ? (
              <ul className="space-y-4">
                {player.coachRatings?.map((r) => (
                  <li
                    key={r.id}
                    className="rounded-xl border border-white/10 bg-white/5 p-4"
                  >
                    <div className="flex items-center gap-2">
                      <span className="text-lg font-bold text-neon-green">
                        {r.rating}/5
                      </span>
                      {r.coach && (
                        <span className="text-slate-400">
                          — {r.coach.firstName} {r.coach.lastName}
                        </span>
                      )}
                    </div>
                    {(r.recommendation || r.comment) && (
                      <p className="mt-2 text-sm text-slate-400">
                        {r.recommendation || r.comment}
                      </p>
                    )}
                  </li>
                ))}
              </ul>
            ) : (
              <p className="text-slate-500">Оценок пока нет</p>
            )}
            </div>
          </Card>
        </div>
      </div>
      </div>
    </div>
  );
}
