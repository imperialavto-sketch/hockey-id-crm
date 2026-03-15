"use client";

import { useParams } from "next/navigation";
import Link from "next/link";
import { useState, useEffect } from "react";
import {
  ArrowLeft,
  Pencil,
  UserCircle,
  FileText,
  Zap,
  Heart,
  BarChart3,
  History,
  Award,
  Video,
  Wallet,
  Calendar,
  Star,
  Loader2,
  UserPlus,
  Phone,
  Brain,
  RefreshCw,
  TrendingUp,
} from "lucide-react";
import { Card } from "@/components/Card";
import { Button } from "@/components/Button";
import { useAuth } from "@/contexts/AuthContext";
import { usePermissions } from "@/hooks/usePermissions";
import { cn } from "@/lib/utils";

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
  status: string;
  comment: string | null;
  photoUrl: string | null;
  team?: { name: string } | null;
  passport?: {
    passportNumber: string;
    internationalID: string | null;
    issueDate: string;
    expiryDate: string;
    issuedBy: string;
  } | null;
  skills?: { speed: number | null; shotAccuracy: number | null; dribbling: number | null; stamina: number | null } | null;
  medical?: { lastCheckup: string | null; injuries: unknown; restrictions: string | null } | null;
  stats?: { season: string; games: number; goals: number; assists: number; points: number; pim: number }[];
  teamHistory?: { teamName: string; season: string; league: string; coach: string | null; stats: unknown }[];
  achievements?: { id: string; title: string; year: number; description?: string | null }[];
  videos?: { id: string; title: string; url: string }[];
  payments?: { id: string; month: number; year: number; amount: number; status: string; paidAt: string | null }[];
  coachRatings?: { id: string; rating: number; recommendation: string | null; comment?: string | null; coach: { firstName: string; lastName: string } }[];
  parent?: { id: string; firstName: string; lastName: string; phone: string | null } | null;
  parentPlayers?: { id: string; parent: { id: string; firstName: string; lastName: string; phone: string | null } }[];
  parentInvites?: { id: string; phone: string; status: string; createdAt: string }[];
}

interface TrainingAtt {
  id: string;
  title: string;
  startTime: string;
  location: string | null;
  attendance?: { status: string; comment: string | null } | null;
}

const monthNames = ["Янв", "Фев", "Мар", "Апр", "Май", "Июн", "Июл", "Авг", "Сен", "Окт", "Ноя", "Дек"];

interface PlayerAIAnalysis {
  summary: string;
  strengths: string[];
  growthAreas: string[];
  recommendations: string[];
  coachFocus: string;
  motivation: string;
}

interface ProgressSnapshot {
  id: string;
  month: number;
  year: number;
  games: number;
  goals: number;
  assists: number;
  points: number;
  attendancePercent?: number;
  coachComment?: string;
  focusArea?: string;
  trend?: "up" | "stable" | "down";
}

const TABS = [
  { id: "general", label: "Общее", icon: UserCircle },
  { id: "parents", label: "Родители", icon: UserPlus },
  { id: "aiAnalysis", label: "AI Анализ", icon: Brain },
  { id: "progressHistory", label: "История прогресса", icon: TrendingUp },
  { id: "passport", label: "Паспорт", icon: FileText },
  { id: "skills", label: "Навыки", icon: Zap },
  { id: "stats", label: "Статистика", icon: BarChart3 },
  { id: "medical", label: "Медицина", icon: Heart },
  { id: "videos", label: "Видео", icon: Video },
  { id: "achievements", label: "Достижения", icon: Award },
  { id: "attendance", label: "Посещаемость", icon: Calendar },
  { id: "finance", label: "Финансы", icon: Wallet },
  { id: "ratings", label: "Оценки тренера", icon: Star },
] as const;

function SkillBar({ label, value }: { label: string; value: number }) {
  const pct = Math.min(100, Math.max(0, value));
  return (
    <div>
      <div className="mb-1 flex justify-between text-sm">
        <span className="text-slate-400">{label}</span>
        <span className="font-mono text-neon-blue">{pct}/100</span>
      </div>
      <div className="h-2 overflow-hidden rounded-full bg-white/10">
        <div
          className="h-full rounded-full bg-gradient-to-r from-neon-blue to-neon-cyan transition-all duration-500 shadow-[0_0_10px_rgba(0,212,255,0.5)]"
          style={{ width: `${pct}%` }}
        />
      </div>
    </div>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between gap-4 border-b border-white/5 py-2 last:border-0">
      <dt className="text-slate-500">{label}</dt>
      <dd className="text-right text-white">{value}</dd>
    </div>
  );
}

export default function PlayerCardPage() {
  const params = useParams();
  const id = (params?.id as string) ?? "";
  const { user } = useAuth();
  const { canEdit } = usePermissions();
  const [tab, setTab] = useState<(typeof TABS)[number]["id"]>("general");
  const [player, setPlayer] = useState<Player | null>(null);
  const [trainings, setTrainings] = useState<TrainingAtt[]>([]);
  const [loading, setLoading] = useState(true);
  const [invitePhone, setInvitePhone] = useState("");
  const [inviteSending, setInviteSending] = useState(false);
  const [inviteSent, setInviteSent] = useState(false);
  const [aiAnalysis, setAiAnalysis] = useState<PlayerAIAnalysis | null>(null);
  const [aiLoading, setAiLoading] = useState(false);
  const [aiError, setAiError] = useState<string | null>(null);
  const [progressHistory, setProgressHistory] = useState<ProgressSnapshot[]>([]);
  const [achievementsData, setAchievementsData] = useState<{
    unlocked: Array<{ id: string; code: string; title: string; description: string; icon: string; category: string; unlockedAt: string }>;
    locked: Array<{ id: string; code: string; title: string; description: string; icon: string; category: string; progressValue?: number; conditionValue?: number }>;
  } | null>(null);
  const [achievementsLoading, setAchievementsLoading] = useState(false);
  const [manualTitle, setManualTitle] = useState("");
  const [manualDesc, setManualDesc] = useState("");
  const [manualSending, setManualSending] = useState(false);
  const [manualError, setManualError] = useState<string | null>(null);

  const canViewFinance =
    user?.role === "SCHOOL_ADMIN" || user?.role === "SCHOOL_MANAGER";

  const visibleTabs = TABS.filter((t) => t.id !== "finance" || canViewFinance);

  useEffect(() => {
    if (!id) return;
    fetch(`/api/player/${id}`)
      .then((r) => r.json())
      .then((d) => (d?.id ? setPlayer(d) : setPlayer(null)))
      .catch(() => setPlayer(null))
      .finally(() => setLoading(false));
  }, [id]);

  useEffect(() => {
    if (!id) return;
    fetch(`/api/player/${id}/trainings`)
      .then((r) => r.json())
      .then((d) => (Array.isArray(d) ? d : []))
      .then(setTrainings)
      .catch(() => setTrainings([]));
  }, [id]);

  useEffect(() => {
    if (!id) return;
    fetch(`/api/player/${id}/progress-history`, { credentials: "include" })
      .then((r) => r.json())
      .then((d) => (Array.isArray(d) ? d : []))
      .then(setProgressHistory)
      .catch(() => setProgressHistory([]));
  }, [id]);

  const fetchAchievements = async () => {
    if (!id) return;
    setAchievementsLoading(true);
    try {
      const res = await fetch(`/api/player/${id}/achievements`, { credentials: "include" });
      const data = await res.json();
      if (res.ok && data && Array.isArray(data.unlocked) && Array.isArray(data.locked)) {
        setAchievementsData(data);
      } else {
        setAchievementsData(null);
      }
    } catch {
      setAchievementsData(null);
    } finally {
      setAchievementsLoading(false);
    }
  };

  useEffect(() => {
    if (!id || tab !== "achievements") return;
    fetchAchievements();
  }, [id, tab]);

  const handleManualAchievement = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!id || !manualTitle.trim() || manualSending) return;
    setManualSending(true);
    setManualError(null);
    try {
      const res = await fetch(`/api/player/${id}/achievements/manual`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ title: manualTitle.trim(), description: manualDesc.trim() || undefined }),
      });
      const data = await res.json();
      if (!res.ok) {
        setManualError(data?.error ?? "Ошибка выдачи достижения");
        return;
      }
      setManualTitle("");
      setManualDesc("");
      fetchAchievements();
    } catch {
      setManualError("Ошибка сети");
    } finally {
      setManualSending(false);
    }
  };

  const fetchAIAnalysis = async () => {
    if (!id) return;
    setAiLoading(true);
    setAiError(null);
    try {
      const res = await fetch(`/api/player/${id}/ai-analysis`, {
        credentials: "include",
      });
      if (!res.ok) throw new Error("Ошибка загрузки");
      const data = await res.json();
      setAiAnalysis(data);
    } catch {
      setAiError("Не удалось загрузить анализ");
    } finally {
      setAiLoading(false);
    }
  };

  const handleInviteParent = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!id || !invitePhone.trim() || inviteSending) return;
    setInviteSending(true);
    setInviteSent(false);
    try {
      const res = await fetch("/api/coach/invite-parent", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ phone: invitePhone.trim(), playerId: id }),
        credentials: "include",
      });
      if (res.ok) {
        setInviteSent(true);
        setInvitePhone("");
        fetch(`/api/player/${id}`)
          .then((r) => r.json())
          .then((d) => (d?.id ? setPlayer(d) : null))
          .catch(() => {});
      }
    } finally {
      setInviteSending(false);
    }
  };

  if (loading) {
    return (
      <div className="flex min-h-[50vh] items-center justify-center">
        <Loader2 className="h-12 w-12 animate-spin text-neon-blue" />
      </div>
    );
  }

  if (!player) {
    return (
      <div className="p-8">
        <p className="text-slate-400">Игрок не найден</p>
        <Link href="/players" className="mt-4 inline-flex items-center gap-2 text-neon-blue hover:underline">
          <ArrowLeft className="h-4 w-4" />
          Назад к списку
        </Link>
      </div>
    );
  }

  const fullName = `${player.firstName ?? ""} ${player.lastName ?? ""}`;
  const birthDate = player.birthDate ? new Date(player.birthDate) : null;
  const age = birthDate
    ? Math.floor((Date.now() - birthDate.getTime()) / (365.25 * 24 * 60 * 60 * 1000))
    : player.birthYear
      ? new Date().getFullYear() - player.birthYear
      : null;

  return (
    <div className="min-h-screen p-6 sm:p-8">
      <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <Link
          href="/players"
          className="inline-flex items-center gap-2 text-sm text-slate-400 transition-colors hover:text-neon-blue"
        >
          <ArrowLeft className="h-4 w-4" />
          Назад к игрокам
        </Link>
        <div className="flex flex-wrap gap-2">
          <Link href={`/player/${id}`}>
            <Button variant="secondary" className="gap-2">
              <FileText className="h-4 w-4" />
              Карьерный паспорт
            </Button>
          </Link>
          {canEdit("players") && (
            <Link href={`/players/${id}/edit`}>
              <Button className="gap-2">
                <Pencil className="h-4 w-4" />
                Редактировать
              </Button>
            </Link>
          )}
        </div>
      </div>

      <Card className="mb-6 overflow-hidden border-neon-blue/30 bg-gradient-to-br from-white/5 to-transparent shadow-[0_0_40px_rgba(0,212,255,0.15)]">
        <div className="flex flex-col gap-6 p-6 sm:flex-row sm:items-center">
          <div className="relative h-28 w-28 shrink-0 overflow-hidden rounded-2xl border-2 border-neon-blue/40 bg-gradient-to-br from-neon-blue/20 to-neon-pink/20 shadow-[0_0_30px_rgba(0,212,255,0.3)]">
            {player.photoUrl ? (
              <img src={player.photoUrl} alt={fullName} className="h-full w-full object-cover" />
            ) : (
              <div className="flex h-full w-full items-center justify-center">
                <UserCircle className="h-16 w-16 text-neon-blue/70" />
              </div>
            )}
          </div>
          <div className="flex-1 min-w-0">
            <h1 className="font-display text-2xl font-bold tracking-wide text-white sm:text-3xl">{fullName}</h1>
            <p className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-slate-400">
              <span>{player.position}</span> • <span>{player.grip}</span> • <span>{player.birthYear} г.р.</span>
              {age != null && <span>• {age} лет</span>}
            </p>
            <p className="mt-1 text-sm text-slate-500">
              {player.team?.name ?? "Без команды"}
              {player.city && ` • ${player.city}`}
              {player.country && `, ${player.country}`}
            </p>
            <div className="mt-3">
              <span
                className={`inline-flex rounded-full px-3 py-1 text-sm font-medium ${
                  player.status === "Активен"
                    ? "border border-neon-green/40 bg-neon-green/20 text-neon-green"
                    : "border border-white/20 bg-white/10 text-slate-400"
                }`}
              >
                {player.status}
              </span>
            </div>
          </div>
        </div>
      </Card>

      <div className="mb-6 flex flex-wrap gap-1 overflow-x-auto border-b border-white/10">
        {visibleTabs.map((t) => {
          const Icon = t.icon;
          return (
            <button
              key={t.id}
              onClick={() => setTab(t.id)}
              className={cn(
                "flex items-center gap-2 rounded-t-xl border px-4 py-2.5 text-sm font-medium transition-all",
                tab === t.id
                  ? "border-neon-blue/40 border-b-transparent bg-neon-blue/10 text-neon-blue"
                  : "border-transparent text-slate-400 hover:bg-white/5 hover:text-white"
              )}
            >
              <Icon className="h-4 w-4" />
              {t.label}
            </button>
          );
        })}
      </div>

      <Card className="border-neon-blue/20 p-6">
        {tab === "general" && (
          <dl className="space-y-2 text-sm">
            <Row label="ФИО" value={fullName} />
            <Row label="ID игрока" value={player.id} />
            <Row label="Дата рождения" value={birthDate ? birthDate.toLocaleDateString("ru-RU") : player.birthYear ? `${player.birthYear}` : "—"} />
            <Row label="Возраст" value={age != null ? `${age} лет` : "—"} />
            <Row label="Позиция" value={player.position} />
            <Row label="Хват" value={player.grip} />
            <Row label="Рост" value={player.height != null ? `${player.height} см` : "—"} />
            <Row label="Вес" value={player.weight != null ? `${player.weight} кг` : "—"} />
            <Row label="Город" value={player.city ?? "—"} />
            <Row label="Страна" value={player.country ?? "—"} />
            <Row label="Команда" value={player.team?.name ?? "—"} />
            <Row label="Статус" value={player.status} />
            {player.comment && (
              <div>
                <dt className="text-slate-500">Комментарий</dt>
                <dd className="mt-0.5 text-white">{player.comment}</dd>
              </div>
            )}
          </dl>
        )}

        {tab === "parents" && (
          <div>
            <h3 className="mb-4 text-lg font-medium text-white">Родители</h3>
            <div className="space-y-4">
              {(player.parent || (player.parentPlayers && player.parentPlayers.length > 0)) && (
                <div>
                  <p className="mb-2 text-sm text-slate-500">Связанные родители</p>
                  <ul className="space-y-1">
                    {player.parent && (
                      <li className="rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-sm text-white">
                        {player.parent.firstName} {player.parent.lastName}
                        {player.parent.phone && (
                          <span className="ml-2 text-slate-400">+{player.parent.phone}</span>
                        )}
                      </li>
                    )}
                    {player.parentPlayers
                      ?.filter((pp) => pp.parent.id !== player.parent?.id)
                      .map((pp) => (
                        <li
                          key={pp.id}
                          className="rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-sm text-white"
                        >
                          {pp.parent.firstName} {pp.parent.lastName}
                          {pp.parent.phone && (
                            <span className="ml-2 text-slate-400">+{pp.parent.phone}</span>
                          )}
                        </li>
                      ))}
                  </ul>
                </div>
              )}
              {player.parentInvites && player.parentInvites.length > 0 && (
                <div>
                  <p className="mb-2 text-sm text-slate-500">Ожидающие приглашения</p>
                  <ul className="space-y-1">
                    {player.parentInvites.map((inv) => (
                      <li
                        key={inv.id}
                        className="rounded-lg border border-amber-500/20 bg-amber-500/5 px-3 py-2 text-sm text-amber-200"
                      >
                        +{inv.phone}
                      </li>
                    ))}
                  </ul>
                </div>
              )}
              {canEdit("players") && (
                <div>
                  <p className="mb-2 text-sm text-slate-500">Пригласить родителя</p>
                  <form onSubmit={handleInviteParent} className="flex flex-wrap items-end gap-2">
                    <div>
                      <label htmlFor="invite-phone" className="mb-1 block text-xs text-slate-400">
                        Номер телефона
                      </label>
                      <input
                        id="invite-phone"
                        type="tel"
                        value={invitePhone}
                        onChange={(e) => setInvitePhone(e.target.value)}
                        placeholder="79991234567"
                        className="rounded-lg border border-white/20 bg-white/5 px-3 py-2 text-white placeholder-slate-500 focus:border-neon-blue focus:outline-none"
                        disabled={inviteSending}
                      />
                    </div>
                    <button
                      type="submit"
                      disabled={!invitePhone.trim() || inviteSending}
                      className="inline-flex items-center gap-2 rounded-lg bg-neon-blue px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-neon-blue/90 disabled:opacity-50"
                    >
                      {inviteSending ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      ) : (
                        <Phone className="h-4 w-4" />
                      )}
                      Отправить приглашение
                    </button>
                  </form>
                  {inviteSent && (
                    <p className="mt-2 text-sm text-neon-green">Приглашение отправлено</p>
                  )}
                </div>
              )}
            </div>
          </div>
        )}

        {tab === "aiAnalysis" && (
          <div>
            <h3 className="mb-4 text-lg font-medium text-white">AI Анализ игрока</h3>
            {aiLoading ? (
              <div className="flex items-center gap-3 py-8">
                <Loader2 className="h-6 w-6 animate-spin text-neon-blue" />
                <span className="text-slate-400">Загрузка анализа...</span>
              </div>
            ) : aiError ? (
              <div>
                <p className="mb-4 text-slate-400">{aiError}</p>
                <Button
                  variant="secondary"
                  size="sm"
                  onClick={fetchAIAnalysis}
                  className="gap-2"
                >
                  <RefreshCw className="h-4 w-4" />
                  Повторить
                </Button>
              </div>
            ) : aiAnalysis ? (
              <div className="space-y-6">
                {aiAnalysis.summary && (
                  <div>
                    <h4 className="mb-2 text-sm font-medium text-slate-500">Краткий вывод</h4>
                    <p className="text-slate-300">{aiAnalysis.summary}</p>
                  </div>
                )}
                {aiAnalysis.strengths?.length > 0 && (
                  <div>
                    <h4 className="mb-2 text-sm font-medium text-slate-500">Сильные стороны</h4>
                    <ul className="space-y-1">
                      {aiAnalysis.strengths.map((s, i) => (
                        <li key={i} className="flex items-start gap-2 text-slate-300">
                          <span className="text-neon-green">•</span>
                          <span>{s}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
                {aiAnalysis.growthAreas?.length > 0 && (
                  <div>
                    <h4 className="mb-2 text-sm font-medium text-slate-500">Зоны роста</h4>
                    <ul className="space-y-1">
                      {aiAnalysis.growthAreas.map((s, i) => (
                        <li key={i} className="flex items-start gap-2 text-slate-300">
                          <span className="text-amber-400">•</span>
                          <span>{s}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
                {aiAnalysis.recommendations?.length > 0 && (
                  <div>
                    <h4 className="mb-2 text-sm font-medium text-slate-500">Рекомендации</h4>
                    <ul className="space-y-1">
                      {aiAnalysis.recommendations.map((s, i) => (
                        <li key={i} className="flex items-start gap-2 text-slate-300">
                          <span className="text-neon-blue">•</span>
                          <span>{s}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
                {aiAnalysis.coachFocus && (
                  <div>
                    <h4 className="mb-2 text-sm font-medium text-slate-500">Фокус тренера</h4>
                    <p className="text-slate-300">{aiAnalysis.coachFocus}</p>
                  </div>
                )}
                {aiAnalysis.motivation && (
                  <div>
                    <h4 className="mb-2 text-sm font-medium text-slate-500">Мотивация</h4>
                    <p className="text-slate-300 font-medium">{aiAnalysis.motivation}</p>
                  </div>
                )}
                <Button
                  variant="secondary"
                  size="sm"
                  onClick={fetchAIAnalysis}
                  className="gap-2"
                >
                  <RefreshCw className="h-4 w-4" />
                  Обновить анализ
                </Button>
              </div>
            ) : (
              <Button variant="secondary" size="sm" onClick={fetchAIAnalysis} className="gap-2">
                <Brain className="h-4 w-4" />
                Загрузить анализ
              </Button>
            )}
          </div>
        )}

        {tab === "progressHistory" && (
          <div>
            <h3 className="mb-4 text-lg font-medium text-white">История прогресса</h3>
            {progressHistory.length === 0 ? (
              <p className="text-slate-500">История прогресса пока недоступна</p>
            ) : (
              <div className="space-y-4">
                {progressHistory.map((s) => (
                  <div
                    key={s.id}
                    className="rounded-xl border border-white/10 bg-white/5 p-4"
                  >
                    <div className="mb-3 flex items-center justify-between">
                      <span className="font-medium text-white">
                        {monthNames[s.month - 1]} {s.year}
                      </span>
                      {s.trend && (
                        <span
                          className={`rounded-full px-2 py-0.5 text-xs font-medium ${
                            s.trend === "up"
                              ? "bg-neon-green/20 text-neon-green"
                              : s.trend === "stable"
                                ? "bg-amber-500/20 text-amber-400"
                                : "bg-red-500/20 text-red-400"
                          }`}
                        >
                          {s.trend === "up" ? "Рост" : s.trend === "stable" ? "Стабильно" : "Спад"}
                        </span>
                      )}
                    </div>
                    <div className="mb-2 flex flex-wrap gap-x-6 gap-y-1 text-sm text-slate-300">
                      <span>Игры: {s.games}</span>
                      <span>Голы: {s.goals}</span>
                      <span>Передачи: {s.assists}</span>
                      <span className="text-neon-blue">Очки: {s.points}</span>
                    </div>
                    {s.attendancePercent != null && (
                      <p className="mb-2 text-sm text-slate-400">
                        Посещаемость: {s.attendancePercent}%
                      </p>
                    )}
                    {s.coachComment && (
                      <p className="mb-2 text-sm text-slate-300">{s.coachComment}</p>
                    )}
                    {s.focusArea && (
                      <p className="text-xs text-slate-500">Фокус: {s.focusArea}</p>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {tab === "passport" && (
          <div>
            {player.passport ? (
              <dl className="space-y-2 text-sm">
                <Row label="ID игрока" value={player.id} />
                <Row label="Номер паспорта" value={player.passport.passportNumber} />
                <Row label="Дата выдачи" value={new Date(player.passport.issueDate).toLocaleDateString("ru-RU")} />
                <Row label="Кем выдан" value={player.passport.issuedBy} />
                <Row label="Срок действия" value={new Date(player.passport.expiryDate).toLocaleDateString("ru-RU")} />
                <Row label="Международный ID" value={player.passport.internationalID ?? "—"} />
              </dl>
            ) : (
              <p className="text-slate-500">Паспорт не заполнен</p>
            )}
          </div>
        )}

        {tab === "skills" && (
          <div>
            {player.skills &&
            (player.skills.speed != null ||
              player.skills.shotAccuracy != null ||
              player.skills.dribbling != null ||
              player.skills.stamina != null) ? (
              <div className="space-y-4 max-w-md">
                <SkillBar label="Скорость (speed)" value={player.skills.speed ?? 0} />
                <SkillBar label="Точность броска (shotAccuracy)" value={player.skills.shotAccuracy ?? 0} />
                <SkillBar label="Дриблинг (dribbling)" value={player.skills.dribbling ?? 0} />
                <SkillBar label="Выносливость (stamina)" value={player.skills.stamina ?? 0} />
              </div>
            ) : (
              <p className="text-slate-500">Навыки не оценены</p>
            )}
          </div>
        )}

        {tab === "stats" && (
          <div>
            {player.stats && player.stats.length > 0 ? (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-white/10 text-left text-slate-500">
                      <th className="py-2 pr-4">Сезон</th>
                      <th className="py-2 pr-4">Игры</th>
                      <th className="py-2 pr-4">Голы</th>
                      <th className="py-2 pr-4">Передачи</th>
                      <th className="py-2 pr-4">Очки</th>
                      <th className="py-2">Штрафы</th>
                    </tr>
                  </thead>
                  <tbody>
                    {player.stats.map((s, i) => (
                      <tr key={i} className="border-b border-white/5">
                        <td className="py-3 pr-4 font-medium text-white">{s.season}</td>
                        <td className="py-3 pr-4 text-slate-300">{s.games}</td>
                        <td className="py-3 pr-4 text-slate-300">{s.goals}</td>
                        <td className="py-3 pr-4 text-slate-300">{s.assists}</td>
                        <td className="py-3 pr-4 text-neon-blue">{s.points}</td>
                        <td className="py-3 text-slate-300">{s.pim}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <p className="text-slate-500">Статистика отсутствует</p>
            )}
          </div>
        )}

        {tab === "medical" && (
          <div>
            {player.medical ? (
              <dl className="space-y-2 text-sm">
                <Row
                  label="Последний осмотр"
                  value={player.medical.lastCheckup ? new Date(player.medical.lastCheckup).toLocaleDateString("ru-RU") : "—"}
                />
                <Row
                  label="Травмы"
                  value={
                    typeof player.medical.injuries === "string"
                      ? player.medical.injuries
                      : Array.isArray(player.medical.injuries) && player.medical.injuries.length
                        ? player.medical.injuries
                            .map((i: { type?: string; description?: string }) => i.type || i.description || "")
                            .filter(Boolean)
                            .join(", ") || "—"
                        : "—"
                  }
                />
                <Row label="Ограничения" value={player.medical.restrictions ?? "Нет"} />
              </dl>
            ) : (
              <p className="text-slate-500">Медицинские данные не заполнены</p>
            )}
          </div>
        )}

        {tab === "videos" && (
          <div>
            {player.videos && player.videos.length > 0 ? (
              <ul className="space-y-2">
                {player.videos.map((v) => (
                  <li key={v.id}>
                    <a href={v.url} target="_blank" rel="noopener noreferrer" className="text-neon-cyan hover:underline">
                      {v.title}
                    </a>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="text-slate-500">Видео нет</p>
            )}
          </div>
        )}

        {tab === "achievements" && (
          <div>
            <h3 className="mb-4 text-lg font-medium text-white">Достижения игрока</h3>
            {achievementsLoading ? (
              <div className="flex items-center gap-3 py-8">
                <Loader2 className="h-6 w-6 animate-spin text-neon-blue" />
                <span className="text-slate-400">Загрузка достижений...</span>
              </div>
            ) : achievementsData ? (
              <div className="space-y-6">
                {achievementsData.unlocked.length > 0 && (
                  <div>
                    <h4 className="mb-3 text-sm font-medium text-slate-500">Получено</h4>
                    <div className="flex flex-wrap gap-3">
                      {achievementsData.unlocked.map((a) => (
                        <div
                          key={a.id}
                          className="flex items-center gap-3 rounded-xl border border-neon-green/30 bg-neon-green/10 px-4 py-3"
                        >
                          <span className="text-2xl">🏅</span>
                          <div>
                            <p className="font-medium text-white">{a.title}</p>
                            <p className="text-sm text-slate-400">{a.description}</p>
                            <p className="text-xs text-slate-500">
                              {new Date(a.unlockedAt).toLocaleDateString("ru-RU")}
                            </p>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
                {achievementsData.locked.length > 0 && (
                  <div>
                    <h4 className="mb-3 text-sm font-medium text-slate-500">Следующие цели</h4>
                    <div className="flex flex-wrap gap-3">
                      {achievementsData.locked.map((a) => (
                        <div
                          key={a.id}
                          className="flex items-center gap-3 rounded-xl border border-white/10 bg-white/5 px-4 py-3 opacity-80"
                        >
                          <span className="text-xl">🔒</span>
                          <div>
                            <p className="font-medium text-slate-300">{a.title}</p>
                            <p className="text-sm text-slate-500">{a.description}</p>
                            {a.progressValue != null && a.conditionValue != null && (
                              <p className="text-xs text-neon-blue">
                                {a.progressValue} из {a.conditionValue}
                              </p>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
                {achievementsData.unlocked.length === 0 && achievementsData.locked.length === 0 && (
                  <p className="text-slate-500">У игрока пока нет достижений</p>
                )}
                {canEdit("players") && (
                  <div className="border-t border-white/10 pt-6">
                    <h4 className="mb-3 text-sm font-medium text-slate-500">Выдать достижение</h4>
                    <form onSubmit={handleManualAchievement} className="flex flex-col gap-3 max-w-md">
                      <input
                        type="text"
                        value={manualTitle}
                        onChange={(e) => setManualTitle(e.target.value)}
                        placeholder="Название (напр. Лидер тренировки)"
                        className="rounded-lg border border-white/20 bg-white/5 px-3 py-2 text-white placeholder-slate-500 focus:border-neon-blue focus:outline-none"
                        disabled={manualSending}
                      />
                      <input
                        type="text"
                        value={manualDesc}
                        onChange={(e) => setManualDesc(e.target.value)}
                        placeholder="Описание (необязательно)"
                        className="rounded-lg border border-white/20 bg-white/5 px-3 py-2 text-white placeholder-slate-500 focus:border-neon-blue focus:outline-none"
                        disabled={manualSending}
                      />
                      {manualError && (
                        <p className="text-sm text-red-400">{manualError}</p>
                      )}
                      <Button
                        type="submit"
                        disabled={!manualTitle.trim() || manualSending}
                        className="gap-2"
                      >
                        {manualSending ? (
                          <Loader2 className="h-4 w-4 animate-spin" />
                        ) : (
                          <Award className="h-4 w-4" />
                        )}
                        Выдать достижение
                      </Button>
                    </form>
                  </div>
                )}
              </div>
            ) : (
              <p className="text-slate-500">Не удалось загрузить достижения</p>
            )}
          </div>
        )}

        {tab === "attendance" && (
          <div>
            {trainings.length > 0 ? (
              <ul className="space-y-2">
                {trainings.slice(0, 20).map((t) => {
                  const att = t.attendance;
                  const statusLabel =
                    att?.status === "PRESENT"
                      ? "Присутствовал"
                      : att?.status === "ABSENT"
                        ? "Отсутствовал"
                        : att?.status === "LATE"
                          ? "Опоздал"
                          : att?.status === "EXCUSED"
                            ? "Уваж. причина"
                            : "—";
                  return (
                    <li
                      key={t.id}
                      className="flex items-center justify-between rounded-xl border border-white/10 bg-white/5 px-4 py-2 text-sm"
                    >
                      <span className="text-white">{t.title}</span>
                      <span className="text-slate-400">
                        {new Date(t.startTime).toLocaleDateString("ru-RU")}
                        {t.location && ` • ${t.location}`}
                      </span>
                      <span className={att?.status === "PRESENT" ? "text-neon-green" : "text-slate-500"}>
                        {statusLabel}
                      </span>
                    </li>
                  );
                })}
              </ul>
            ) : (
              <p className="text-slate-500">Нет данных о посещаемости</p>
            )}
          </div>
        )}

        {tab === "finance" && canViewFinance && (
          <div>
            {player.payments && player.payments.length > 0 ? (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-white/10 text-left text-slate-500">
                      <th className="py-2 pr-4">Месяц</th>
                      <th className="py-2 pr-4">Сумма</th>
                      <th className="py-2 pr-4">Статус</th>
                      <th className="py-2">Дата оплаты</th>
                    </tr>
                  </thead>
                  <tbody>
                    {player.payments.map((p) => (
                      <tr key={p.id} className="border-b border-white/5">
                        <td className="py-3 pr-4 text-slate-300">
                          {monthNames[p.month - 1]} {p.year}
                        </td>
                        <td className="py-3 pr-4 text-white">{p.amount} ₽</td>
                        <td className="py-3 pr-4">
                          <span className={p.status === "Оплачено" ? "text-neon-green" : "text-slate-400"}>{p.status}</span>
                        </td>
                        <td className="py-3 text-slate-400">
                          {p.paidAt ? new Date(p.paidAt).toLocaleDateString("ru-RU") : "—"}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <p className="text-slate-500">Оплаты не добавлены</p>
            )}
          </div>
        )}

        {tab === "ratings" && (
          <div>
            {player.coachRatings && player.coachRatings.length > 0 ? (
              <ul className="space-y-4">
                {player.coachRatings.map((r) => (
                  <li key={r.id} className="rounded-xl border border-white/10 bg-white/5 p-4">
                    <div className="flex items-center gap-2">
                      <span className="font-medium text-white">
                        {r.coach.firstName} {r.coach.lastName}
                      </span>
                      <span className="rounded-full bg-neon-blue/20 px-2 py-0.5 text-sm text-neon-blue">
                        {r.rating}/5
                      </span>
                    </div>
                    {r.recommendation && <p className="mt-2 text-sm text-slate-300">Рекомендация: {r.recommendation}</p>}
                    {r.comment && <p className="mt-1 text-sm text-slate-400">Комментарий: {r.comment}</p>}
                  </li>
                ))}
              </ul>
            ) : (
              <p className="text-slate-500">Оценок тренеров нет</p>
            )}
          </div>
        )}
      </Card>
    </div>
  );
}
