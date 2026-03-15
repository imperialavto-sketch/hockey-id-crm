"use client";

/**
 * Future Parent App view — parent-facing interface.
 * In production: this UI will live in hockey-id-parent-app (mobile).
 * CRM staff: use Players → player card for full management.
 */
import { useEffect, useState } from "react";
import {
  UserCircle,
  FileText,
  Zap,
  Award,
  Video,
  Calendar,
  BarChart3,
  Wallet,
  MessageCircle,
  ChevronDown,
  Bell,
  CreditCard,
  ChevronUp,
  TrendingUp,
} from "lucide-react";
import { Card } from "@/components/Card";
import { Button } from "@/components/Button";
import {
  ResponsiveContainer,
  RadarChart,
  PolarGrid,
  PolarAngleAxis,
  PolarRadiusAxis,
  Radar,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
} from "recharts";

interface Passport {
  id: string;
  passportNumber: string;
  issueDate: string;
  expiryDate: string;
  issuedBy: string;
  internationalID: string | null;
}

interface Skills {
  id: string;
  speed: number | null;
  shotAccuracy: number | null;
  dribbling: number | null;
  stamina: number | null;
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

interface Payment {
  id: string;
  month: number;
  year: number;
  amount: number;
  status: string;
  paidAt: string | null;
  stripeCheckoutUrl?: string | null;
}

interface TeamHistory {
  id: string;
  season: string;
  teamName: string;
  stats: { goals?: number; assists?: number; gamesPlayed?: number; penalties?: number } | null;
}

interface PlayerStat {
  id?: string;
  season: string;
  games: number;
  goals: number;
  assists: number;
  points: number;
  pim?: number;
}

interface Attendance {
  id: string;
  status: string;
  training: { id: string; title: string; startTime: string };
}

interface Training {
  id: string;
  title: string;
  startTime: string;
  endTime: string;
  location: string | null;
}

interface Player {
  id: string;
  parentId?: string | null;
  firstName: string;
  lastName: string;
  birthYear: number;
  birthDate: string | null;
  position: string;
  grip: string;
  status: string;
  team?: { name: string; ageGroup: string } | null;
  passport?: Passport | null;
  skills?: Skills | null;
  achievements?: Achievement[];
  videos?: PlayerVideo[];
  payments?: Payment[];
  teamHistory?: TeamHistory[];
  attendances?: Attendance[];
  upcomingTrainings?: Training[];
  stats?: PlayerStat[];
}

interface Notification {
  id: string;
  type: string;
  title: string;
  body: string | null;
  link: string | null;
  read: boolean;
  createdAt: string;
}

export default function ParentPage() {
  const [players, setPlayers] = useState<Player[]>([]);
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [payingId, setPayingId] = useState<string | null>(null);

  useEffect(() => {
    fetch("/api/parent/players")
      .then((r) => r.json())
      .then((data) => (Array.isArray(data) ? data : []))
      .then((pls) => {
        setPlayers(pls);
        const parentId = pls.find((p: Player) => p.parentId)?.parentId;
        if (parentId) {
          fetch(`/api/notifications?parentId=${parentId}`)
            .then((r) => r.json())
            .then((n) => (Array.isArray(n) ? n : []))
            .then(setNotifications)
            .catch(() => setNotifications([]));
        }
      })
      .catch(() => setPlayers([]))
      .finally(() => setLoading(false));
  }, []);

  const handleStripePay = async (paymentId: string) => {
    setPayingId(paymentId);
    try {
      const res = await fetch("/api/payments/stripe/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ paymentId }),
      });
      const data = await res.json().catch(() => ({}));
      if (data.url) window.location.href = data.url;
      else if (data.error) alert(data.error);
    } finally {
      setPayingId(null);
    }
  };

  const handleFeedback = (player: Player) => {
    alert(
      `Обратная связь тренеру по игроку: ${player.firstName} ${player.lastName}\n\n(Имитация. В продакшене здесь будет форма или модальное окно.)`
    );
  };

  const formatDate = (s: string | null) =>
    s ? new Date(s).toLocaleDateString("ru-RU") : "—";
  const monthNames = ["Янв", "Фев", "Мар", "Апр", "Май", "Июн", "Июл", "Авг", "Сен", "Окт", "Ноя", "Дек"];

  const TOOLTIP_STYLE = {
    backgroundColor: "#12121a",
    border: "1px solid rgba(0,212,255,0.3)",
    borderRadius: "12px",
  };

  if (loading) {
    return (
      <div className="flex min-h-[50vh] items-center justify-center">
        <div className="h-12 w-12 animate-spin rounded-full border-2 border-neon-blue border-t-transparent" />
      </div>
    );
  }

  if (players.length === 0) {
    return (
      <div className="p-4 sm:p-6 lg:p-8">
        <h1 className="font-display text-2xl font-bold text-white sm:text-3xl">
          Интерфейс родителя
        </h1>
        <p className="mt-1 text-slate-400">Просмотр профилей детей</p>
        <Card className="mt-8">
          <p className="text-slate-500">
            Нет игроков для отображения. Для теста запустите:{" "}
            <code className="rounded bg-dark-500 px-2 py-1">node scripts/seed-full.js</code>
          </p>
        </Card>
      </div>
    );
  }

  return (
    <div className="p-4 sm:p-6 lg:p-8 space-y-4">
      <div className="rounded-xl border border-amber-500/40 bg-amber-500/10 px-4 py-3 text-sm text-amber-200">
        <strong>Future Parent App.</strong> Прототип приложения для родителей. В CRM используйте <a href="/players" className="underline hover:text-amber-100">Игроки</a> для управления.
      </div>
      <div className="mb-6 sm:mb-8">
        <h1 className="font-display text-2xl font-bold tracking-wide text-white sm:text-3xl">
          Интерфейс родителя
        </h1>
        <p className="mt-1 text-slate-400">
          Паспорт, навыки, достижения, расписание и оплата
        </p>
      </div>

      {notifications.length > 0 && (
        <Card className="mb-6 border-neon-pink/20">
          <h2 className="mb-4 flex items-center gap-2 font-display font-semibold text-white">
            <Bell className="h-5 w-5 text-neon-pink" />
            Уведомления
          </h2>
          <ul className="space-y-2">
            {notifications.slice(0, 10).map((n) => (
              <li
                key={n.id}
                className={`rounded-xl border px-4 py-3 ${
                  n.read ? "border-white/5 bg-white/5" : "border-neon-pink/20 bg-neon-pink/5"
                }`}
              >
                <p className="font-medium text-white">{n.title}</p>
                {n.body && <p className="mt-1 text-sm text-slate-400">{n.body}</p>}
                <p className="mt-1 text-xs text-slate-500">
                  {new Date(n.createdAt).toLocaleString("ru-RU")}
                </p>
              </li>
            ))}
          </ul>
        </Card>
      )}

      <div className="space-y-4 sm:space-y-6">
        {players.map((player) => {
          const expanded = expandedId === player.id;
          const skills = player.skills;
          const skillData = skills
            ? [
                { subject: "Скорость", value: skills.speed ?? 0, fullMark: 100 },
                { subject: "Точность", value: skills.shotAccuracy ?? 0, fullMark: 100 },
                { subject: "Дриблинг", value: skills.dribbling ?? 0, fullMark: 100 },
                { subject: "Выносливость", value: skills.stamina ?? 0, fullMark: 100 },
              ]
            : [];
          const progressData = (player.teamHistory ?? []).map((h) => ({
            season: h.season,
            goals: (h.stats as { goals?: number })?.goals ?? 0,
            assists: (h.stats as { assists?: number })?.assists ?? 0,
          }));

          return (
            <Card
              key={player.id}
              className={`overflow-hidden border-neon-blue/20 transition-all ${
                expanded ? "ring-2 ring-neon-blue/40 shadow-[0_0_30px_rgba(0,212,255,0.15)]" : ""
              }`}
            >
              <button
                type="button"
                onClick={() => setExpandedId(expanded ? null : player.id)}
                className="flex w-full flex-col gap-4 p-4 text-left sm:flex-row sm:items-center sm:justify-between"
              >
                <div className="flex items-center gap-3 sm:gap-4">
                  <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br from-neon-blue/20 to-neon-pink/20 border border-neon-blue/30">
                    <UserCircle className="h-8 w-8 text-neon-blue" />
                  </div>
                  <div>
                    <h2 className="font-display text-xl font-semibold text-white">
                      {player.firstName} {player.lastName}
                    </h2>
                    <p className="text-sm text-slate-400">
                      {player.position} • {player.grip} • {player.birthYear} г.р.
                      {player.team && ` • ${player.team.name}`}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <Button
                    variant="secondary"
                    size="sm"
                    onClick={(e) => {
                      e.stopPropagation();
                      handleFeedback(player);
                    }}
                    className="gap-2 shrink-0"
                  >
                    <MessageCircle className="h-4 w-4" />
                    <span className="hidden sm:inline">Обратная связь с тренером</span>
                  </Button>
                  {expanded ? (
                    <ChevronUp className="h-5 w-5 text-neon-blue" />
                  ) : (
                    <ChevronDown className="h-5 w-5 text-slate-500" />
                  )}
                </div>
              </button>

              {expanded && (
                <div className="border-t border-white/10 p-4 sm:p-6">
                  <div className="grid gap-6 lg:grid-cols-2">
                    {/* Паспорт */}
                    <Card className="border-neon-blue/20 p-4">
                      <h3 className="mb-4 flex items-center gap-2 font-display font-semibold text-white">
                        <FileText className="h-5 w-5 text-neon-blue" />
                        Паспорт
                      </h3>
                      {player.passport ? (
                        <dl className="space-y-2 text-sm">
                          <div>
                            <dt className="text-slate-500">Номер</dt>
                            <dd className="text-slate-300">{player.passport.passportNumber}</dd>
                          </div>
                          <div>
                            <dt className="text-slate-500">Выдан / Срок</dt>
                            <dd className="text-slate-300">
                              {formatDate(player.passport.issueDate)} — {formatDate(player.passport.expiryDate)}
                            </dd>
                          </div>
                          <div>
                            <dt className="text-slate-500">Кем выдан</dt>
                            <dd className="text-slate-300">{player.passport.issuedBy}</dd>
                          </div>
                        </dl>
                      ) : (
                        <p className="text-slate-500">Паспорт не добавлен</p>
                      )}
                    </Card>

                    {/* Навыки */}
                    <Card className="border-neon-pink/20 p-4">
                      <h3 className="mb-4 flex items-center gap-2 font-display font-semibold text-white">
                        <Zap className="h-5 w-5 text-neon-pink" />
                        Навыки
                      </h3>
                      {skillData.length > 0 ? (
                        <div className="h-48">
                          <ResponsiveContainer width="100%" height="100%">
                            <RadarChart data={skillData}>
                              <PolarGrid stroke="rgba(255,255,255,0.1)" />
                              <PolarAngleAxis dataKey="subject" tick={{ fill: "#94a3b8", fontSize: 11 }} />
                              <PolarRadiusAxis domain={[0, 100]} tick={{ fill: "#94a3b8", fontSize: 10 }} />
                              <Radar dataKey="value" stroke="#ff00aa" fill="#ff00aa" fillOpacity={0.4} />
                              <Tooltip contentStyle={TOOLTIP_STYLE} />
                            </RadarChart>
                          </ResponsiveContainer>
                        </div>
                      ) : (
                        <p className="text-slate-500">Навыки не оценены</p>
                      )}
                    </Card>

                    {/* Достижения */}
                    <Card className="border-neon-green/20 p-4">
                      <h3 className="mb-4 flex items-center gap-2 font-display font-semibold text-white">
                        <Award className="h-5 w-5 text-neon-green" />
                        Достижения
                      </h3>
                      {(player.achievements?.length ?? 0) > 0 ? (
                        <ul className="space-y-2">
                          {player.achievements?.map((a) => (
                            <li
                              key={a.id}
                              className="rounded-lg border border-white/10 bg-white/5 px-4 py-2 text-sm text-slate-300"
                            >
                              {a.title}
                              <span className="ml-2 text-slate-500">{a.year}</span>
                            </li>
                          ))}
                        </ul>
                      ) : (
                        <p className="text-slate-500">Достижений пока нет</p>
                      )}
                    </Card>

                    {/* Видео */}
                    <Card className="border-neon-cyan/20 p-4">
                      <h3 className="mb-4 flex items-center gap-2 font-display font-semibold text-white">
                        <Video className="h-5 w-5 text-neon-cyan" />
                        Видео
                      </h3>
                      {(player.videos?.length ?? 0) > 0 ? (
                        <ul className="space-y-2">
                          {player.videos?.map((v) => (
                            <li key={v.id}>
                              <a
                                href={v.url}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="block rounded-lg border border-white/10 bg-white/5 px-4 py-2 text-sm text-neon-cyan transition-colors hover:bg-neon-cyan/10"
                              >
                                {v.title}
                              </a>
                            </li>
                          ))}
                        </ul>
                      ) : (
                        <p className="text-slate-500">Видео пока нет</p>
                      )}
                    </Card>

                    {/* Расписание тренировок */}
                    <Card className="border-neon-blue/20 p-4 lg:col-span-2">
                      <h3 className="mb-4 flex items-center gap-2 font-display font-semibold text-white">
                        <Calendar className="h-5 w-5 text-neon-blue" />
                        Расписание тренировок
                      </h3>
                      {(player.upcomingTrainings?.length ?? 0) > 0 ? (
                        <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
                          {player.upcomingTrainings?.slice(0, 9).map((t) => (
                            <div
                              key={t.id}
                              className="rounded-xl border border-white/10 bg-white/5 px-4 py-3"
                            >
                              <p className="font-medium text-white">{t.title}</p>
                              <p className="text-sm text-slate-400">
                                {new Date(t.startTime).toLocaleDateString("ru-RU", {
                                  day: "numeric",
                                  month: "short",
                                  weekday: "short",
                                })}{" "}
                                {new Date(t.startTime).toLocaleTimeString("ru-RU", {
                                  hour: "2-digit",
                                  minute: "2-digit",
                                })}
                              </p>
                              {t.location && (
                                <p className="mt-1 text-xs text-slate-500">{t.location}</p>
                              )}
                            </div>
                          ))}
                        </div>
                      ) : (
                        <p className="text-slate-500">Расписание не загружено</p>
                      )}
                    </Card>

                    {/* Прогресс */}
                    <Card className="border-neon-purple/20 p-4 lg:col-span-2">
                      <h3 className="mb-4 flex items-center gap-2 font-display font-semibold text-white">
                        <TrendingUp className="h-5 w-5 text-neon-purple" />
                        Прогресс по сезонам
                      </h3>
                      {progressData.length > 0 ? (
                        <div className="h-48 sm:h-56">
                          <ResponsiveContainer width="100%" height="100%">
                            <BarChart data={progressData}>
                              <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.1)" />
                              <XAxis dataKey="season" stroke="#94a3b8" fontSize={12} />
                              <YAxis stroke="#94a3b8" fontSize={12} />
                              <Tooltip contentStyle={TOOLTIP_STYLE} />
                              <Bar dataKey="goals" name="Голы" fill="#00d4ff" radius={[4, 4, 0, 0]} />
                              <Bar dataKey="assists" name="Передачи" fill="#00ff88" radius={[4, 4, 0, 0]} />
                            </BarChart>
                          </ResponsiveContainer>
                        </div>
                      ) : (
                        <div className="rounded-xl border border-white/10 bg-white/5 p-4">
                          <p className="text-sm text-slate-400">Статистика</p>
                          {player.stats?.[0] && (
                            <div className="mt-2 grid grid-cols-4 gap-2 text-center">
                              <div>
                                <p className="text-xl font-bold text-neon-blue">{player.stats[0]?.games ?? 0}</p>
                                <p className="text-xs text-slate-500">Игры</p>
                              </div>
                              <div>
                                <p className="text-xl font-bold text-neon-green">{player.stats[0]?.goals ?? 0}</p>
                                <p className="text-xs text-slate-500">Голы</p>
                              </div>
                              <div>
                                <p className="text-xl font-bold text-neon-pink">{player.stats[0]?.assists ?? 0}</p>
                                <p className="text-xs text-slate-500">Передачи</p>
                              </div>
                              <div>
                                <p className="text-xl font-bold text-white">{player.stats[0]?.points ?? 0}</p>
                                <p className="text-xs text-slate-500">Очки</p>
                              </div>
                            </div>
                          )}
                          {!player.stats?.length && <p className="mt-2 text-slate-500">Нет данных</p>}
                        </div>
                      )}
                    </Card>

                    {/* Оплата */}
                    <Card className="border-neon-green/20 p-4 lg:col-span-2">
                      <h3 className="mb-4 flex items-center gap-2 font-display font-semibold text-white">
                        <Wallet className="h-5 w-5 text-neon-green" />
                        Оплата
                      </h3>
                      {(player.payments?.length ?? 0) > 0 ? (
                        <div className="overflow-x-auto">
                          <table className="w-full text-sm">
                            <thead>
                              <tr className="border-b border-white/10 text-left text-slate-500">
                                <th className="py-2 pr-4">Месяц</th>
                                <th className="py-2 pr-4">Сумма</th>
                                <th className="py-2">Статус</th>
                              </tr>
                            </thead>
                            <tbody>
                              {player.payments?.map((p) => (
                                <tr key={p.id} className="border-b border-white/5">
                                  <td className="py-3 pr-4 text-slate-300">
                                    {monthNames[p.month - 1]} {p.year}
                                  </td>
                                  <td className="py-3 pr-4 text-slate-300">{p.amount} ₽</td>
                                  <td className="py-3">
                                    <span
                                      className={
                                        p.status === "Оплачено"
                                          ? "text-neon-green"
                                          : "text-neon-pink"
                                      }
                                    >
                                      {p.status}
                                    </span>
                                    {p.status !== "Оплачено" && (
                                      <Button
                                        variant="secondary"
                                        size="sm"
                                        className="mt-2 gap-1"
                                        disabled={!!payingId}
                                        onClick={() => handleStripePay(p.id)}
                                      >
                                        <CreditCard className="h-4 w-4" />
                                        Оплатить через Stripe
                                      </Button>
                                    )}
                                  </td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>
                      ) : (
                        <p className="text-slate-500">Платежи не добавлены</p>
                      )}
                    </Card>
                  </div>
                </div>
              )}
            </Card>
          );
        })}
      </div>
    </div>
  );
}
