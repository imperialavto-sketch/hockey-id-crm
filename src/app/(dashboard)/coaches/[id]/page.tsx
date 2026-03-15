"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import {
  ArrowLeft,
  GraduationCap,
  Users,
  Calendar,
  MapPin,
  Loader2,
  Pencil,
  Star,
  BookOpen,
  ChevronRight,
  X,
} from "lucide-react";
import { Button } from "@/components/Button";
import { Card } from "@/components/Card";

interface Coach {
  id: string;
  firstName: string;
  lastName: string;
  phone: string | null;
  email: string | null;
  specialization: string | null;
  photoUrl?: string | null;
  teams: { id: string; name: string; ageGroup: string; school?: { name: string } | null; _count?: { players: number; trainings: number } }[];
}

interface Training {
  id: string;
  title: string;
  startTime: string;
  endTime: string;
  location: string | null;
  team: { id: string; name: string };
  journal?: { id: string; topic: string | null; goals: string | null; notes: string | null; teamComment: string | null }[];
  _count?: { attendances: number };
}

interface Rating {
  id: string;
  rating: number;
  recommendation: string | null;
  comment: string | null;
  createdAt: string;
  player: { id: string; firstName: string; lastName: string; team?: { name: string } | null };
}

export default function CoachDetailPage() {
  const params = useParams();
  const id = (params?.id as string) ?? "";
  const [coach, setCoach] = useState<Coach | null>(null);
  const [trainings, setTrainings] = useState<Training[]>([]);
  const [ratings, setRatings] = useState<Rating[]>([]);
  const [players, setPlayers] = useState<{ id: string; firstName: string; lastName: string; teamId: string | null }[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<"teams" | "trainings" | "ratings" | "recommendations">("teams");
  const [journalModal, setJournalModal] = useState<{ training: Training } | null>(null);
  const [journalForm, setJournalForm] = useState({ topic: "", goals: "", notes: "", teamComment: "" });
  const [ratingModal, setRatingModal] = useState(false);
  const [ratingForm, setRatingForm] = useState({
    playerId: "",
    rating: 5,
    recommendation: "",
    comment: "",
  });
  const [saving, setSaving] = useState(false);

  const fetchCoach = () => {
    if (!id) return;
    fetch(`/api/coaches/${id}`)
      .then((r) => r.json())
      .then((data) => {
        if (data?.error || !data?.id) setCoach(null);
        else setCoach(data);
      })
      .catch(() => setCoach(null));
  };

  const fetchAll = () => {
    if (!id) return;
    Promise.all([
      fetch(`/api/coaches/${id}`).then((r) => r.json()),
      fetch(`/api/coaches/${id}/trainings`).then((r) => r.json()),
      fetch(`/api/coaches/${id}/ratings`).then((r) => r.json()),
      fetch("/api/players").then((r) => r.json()),
    ])
      .then(([c, t, r, p]) => {
        if (c?.id) setCoach(c);
        setTrainings(Array.isArray(t) ? t : []);
        setRatings(Array.isArray(r) ? r : []);
        setPlayers(Array.isArray(p) ? p : p?.players ?? []);
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    fetchAll();
  }, [id]);

  const openJournal = (t: Training) => {
    const j = t.journal?.[0];
    setJournalForm({
      topic: j?.topic ?? "",
      goals: j?.goals ?? "",
      notes: j?.notes ?? "",
      teamComment: j?.teamComment ?? "",
    });
    setJournalModal({ training: t });
  };

  const saveJournal = async () => {
    if (!journalModal || !id || !journalModal.training.id) return;
    setSaving(true);
    const res = await fetch("/api/training-journal", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        trainingId: journalModal.training.id,
        coachId: id,
        ...journalForm,
      }),
    });
    if (res.ok) {
      setJournalModal(null);
      fetch(`/api/coaches/${id}/trainings`).then((r) => r.json()).then((t) => setTrainings(Array.isArray(t) ? t : []));
    }
    setSaving(false);
  };

  const saveRating = async () => {
    if (!ratingForm.playerId || !id) return;
    setSaving(true);
    const res = await fetch("/api/ratings", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        coachId: id,
        playerId: ratingForm.playerId,
        rating: ratingForm.rating,
        recommendation: ratingForm.recommendation || null,
        comment: ratingForm.comment || null,
      }),
    });
    if (res.ok) {
      setRatingModal(false);
      setRatingForm({ playerId: "", rating: 5, recommendation: "", comment: "" });
      fetch(`/api/coaches/${id}/ratings`).then((r) => r.json()).then((r) => setRatings(Array.isArray(r) ? r : []));
    }
    setSaving(false);
  };

  const teamIds = coach?.teams?.map((t) => t.id) ?? [];
  const filteredPlayers = players.filter((p) => p.teamId && teamIds.includes(p.teamId));
  const withRecs = ratings.filter((r) => r.recommendation);
  const byPlayer = ratings.reduce<Record<string, Rating[]>>((acc, r) => {
    const key = r.player.id;
    if (!acc[key]) acc[key] = [];
    acc[key].push(r);
    return acc;
  }, {});

  if (loading) {
    return (
      <div className="flex min-h-[50vh] items-center justify-center">
        <Loader2 className="h-12 w-12 animate-spin text-neon-blue" />
      </div>
    );
  }

  if (!coach) {
    return (
      <div className="flex min-h-[50vh] flex-col items-center justify-center gap-4 p-8">
        <p className="text-slate-400">Тренер не найден</p>
        <Link href="/coaches" className="text-sm text-neon-blue hover:underline">
          ← Назад к тренерам
        </Link>
      </div>
    );
  }

  const fullName = `${coach.firstName ?? ""} ${coach.lastName ?? ""}`;
  const trainingsCount = coach.teams?.reduce((s, t) => s + (t._count?.trainings ?? 0), 0) ?? 0;

  return (
    <div className="p-6 sm:p-8">
      <Link
        href="/coaches"
        className="mb-6 inline-flex items-center gap-2 text-sm text-slate-400 transition-colors hover:text-white"
      >
        <ArrowLeft className="h-4 w-4" />
        Назад к тренерам
      </Link>

      {/* Профиль */}
      <div className="mb-8 flex flex-col gap-6 sm:flex-row sm:items-start">
        <div className="flex h-24 w-24 shrink-0 items-center justify-center overflow-hidden rounded-2xl bg-gradient-to-br from-neon-pink/20 to-neon-purple/20">
          {coach.photoUrl ? (
            <img src={coach.photoUrl} alt={fullName} className="h-full w-full object-cover" />
          ) : (
            <GraduationCap className="h-12 w-12 text-neon-blue" />
          )}
        </div>
        <div>
          <h1 className="font-display text-2xl font-bold text-white sm:text-3xl">{fullName}</h1>
          <p className="mt-1 text-slate-400">{coach.specialization ?? "Тренер"}</p>
          <div className="mt-4 flex flex-wrap gap-4 text-sm">
            {coach.email && (
              <span className="flex items-center gap-1 text-slate-400">
                {coach.email}
              </span>
            )}
            {coach.phone && (
              <span className="flex items-center gap-1 text-slate-400">
                {coach.phone}
              </span>
            )}
          </div>
          <div className="mt-4 flex gap-4 text-sm text-slate-500">
            <span className="flex items-center gap-1">
              <Users className="h-4 w-4" />
              {coach.teams?.length ?? 0} команд
            </span>
            <span className="flex items-center gap-1 text-neon-cyan">
              <Calendar className="h-4 w-4" />
              {trainingsCount} тренировок
            </span>
          </div>
          <Link href={`/coaches/${id}/edit`} className="mt-4 inline-flex">
            <Button variant="secondary" size="sm" className="gap-1">
              <Pencil className="h-4 w-4" />
              Редактировать
            </Button>
          </Link>
        </div>
      </div>

      {/* Табы */}
      <div className="mb-6 flex flex-wrap gap-2 border-b border-white/10 pb-4">
        {(["teams", "trainings", "ratings", "recommendations"] as const).map((tab) => (
          <button
            key={tab}
            type="button"
            onClick={() => setActiveTab(tab)}
            className={`rounded-xl px-4 py-2 text-sm font-medium transition-colors ${
              activeTab === tab
                ? "bg-neon-blue/20 text-neon-blue border border-neon-blue/40"
                : "text-slate-400 hover:bg-white/5 hover:text-white"
            }`}
          >
            {tab === "teams" && "Команды"}
            {tab === "trainings" && "Тренировки"}
            {tab === "ratings" && "Оценки"}
            {tab === "recommendations" && "Рекомендации"}
          </button>
        ))}
      </div>

      {/* Команды */}
      {activeTab === "teams" && (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {coach.teams?.length ? (
            coach.teams.map((t) => (
              <Link key={t.id} href={`/teams/${t.id}`}>
                <Card className="transition-all hover:border-neon-blue/40">
                  <div className="flex items-center justify-between">
                    <div>
                      <h3 className="font-medium text-white">{t.name}</h3>
                      <p className="text-sm text-slate-500">
                        {t._count?.players ?? 0} игроков • {t._count?.trainings ?? 0} тренировок
                      </p>
                    </div>
                    <ChevronRight className="h-5 w-5 text-slate-500" />
                  </div>
                </Card>
              </Link>
            ))
          ) : (
            <Card>
              <p className="text-slate-500">Тренер пока не назначен на команды</p>
            </Card>
          )}
        </div>
      )}

      {/* Тренировки */}
      {activeTab === "trainings" && (
        <Card>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-white/10 text-left text-slate-400">
                  <th className="px-4 py-3">Дата / Время</th>
                  <th className="px-4 py-3">Название</th>
                  <th className="px-4 py-3">Команда</th>
                  <th className="px-4 py-3">Место</th>
                  <th className="px-4 py-3">Журнал</th>
                </tr>
              </thead>
              <tbody>
                {trainings.map((t) => (
                  <tr key={t.id} className="border-b border-white/5">
                    <td className="px-4 py-3 text-slate-300">
                      {new Date(t.startTime).toLocaleString("ru-RU", {
                        day: "2-digit",
                        month: "short",
                        year: "numeric",
                        hour: "2-digit",
                        minute: "2-digit",
                      })}
                    </td>
                    <td className="px-4 py-3 font-medium text-white">{t.title}</td>
                    <td className="px-4 py-3 text-slate-400">{t.team?.name ?? "—"}</td>
                    <td className="px-4 py-3 text-slate-500">{t.location ?? "—"}</td>
                    <td className="px-4 py-3">
                      <Button variant="ghost" size="sm" onClick={() => openJournal(t)}>
                        <BookOpen className="mr-1 h-4 w-4" />
                        Журнал
                      </Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {trainings.length === 0 && (
            <p className="py-12 text-center text-slate-500">Тренировок нет</p>
          )}
        </Card>
      )}

      {/* Оценки */}
      {activeTab === "ratings" && (
        <Card>
          <div className="mb-4 flex justify-end">
            <Button size="sm" onClick={() => setRatingModal(true)}>
              Поставить оценку
            </Button>
          </div>
          <div className="space-y-4">
            {Object.entries(byPlayer).map(([playerId, list]) => {
              const p = list[0]?.player;
              if (!p) return null;
              return (
                <div key={playerId} className="rounded-xl border border-white/10 bg-white/5 p-4">
                  <Link href={`/players/${p.id}`} className="font-medium text-neon-blue hover:underline">
                    {p.firstName} {p.lastName}
                  </Link>
                  <p className="text-xs text-slate-500">{p.team?.name ?? "—"}</p>
                  <div className="mt-3 space-y-2">
                    {list.map((r) => (
                      <div key={r.id} className="rounded-lg bg-black/20 p-3 text-sm">
                        <div className="flex items-center gap-2">
                          <span className="flex gap-0.5">
                            {[1, 2, 3, 4, 5].map((i) => (
                              <Star
                                key={i}
                                className={`h-4 w-4 ${i <= r.rating ? "fill-amber-400 text-amber-400" : "text-slate-600"}`}
                              />
                            ))}
                          </span>
                          <span className="text-slate-500">
                            {new Date(r.createdAt).toLocaleDateString("ru-RU")}
                          </span>
                        </div>
                        {r.recommendation && <p className="mt-1 text-slate-300">{r.recommendation}</p>}
                        {r.comment && <p className="mt-1 text-slate-500">{r.comment}</p>}
                      </div>
                    ))}
                  </div>
                </div>
              );
            })}
          </div>
          {ratings.length === 0 && (
            <p className="py-12 text-center text-slate-500">Оценок пока нет</p>
          )}
        </Card>
      )}

      {/* Рекомендации */}
      {activeTab === "recommendations" && (
        <Card>
          <div className="space-y-4">
            {withRecs.length > 0 ? (
              withRecs.map((r) => (
                <div key={r.id} className="rounded-xl border border-white/10 bg-white/5 p-4">
                  <Link href={`/players/${r.player.id}`} className="font-medium text-neon-blue hover:underline">
                    {r.player.firstName} {r.player.lastName}
                  </Link>
                  <p className="text-xs text-slate-500">{r.player.team?.name ?? "—"}</p>
                  <p className="mt-2 text-slate-300">{r.recommendation}</p>
                  <div className="mt-2 flex items-center gap-2">
                    <Star className="h-4 w-4 fill-amber-400 text-amber-400" />
                    <span>{r.rating}/5</span>
                    <span className="text-slate-500">
                      {new Date(r.createdAt).toLocaleDateString("ru-RU")}
                    </span>
                  </div>
                </div>
              ))
            ) : (
              <p className="py-12 text-center text-slate-500">Рекомендаций пока нет</p>
            )}
          </div>
        </Card>
      )}

      {/* Модалка журнала */}
      {journalModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4 backdrop-blur-sm">
          <Card className="w-full max-w-2xl border-neon-blue/30">
            <div className="mb-4 flex items-center justify-between">
              <h3 className="font-display text-lg font-semibold text-white">
                Журнал: {journalModal.training.title}
              </h3>
              <button
                type="button"
                onClick={() => setJournalModal(null)}
                className="rounded-lg p-2 text-slate-400 hover:bg-white/10 hover:text-white"
              >
                <X className="h-5 w-5" />
              </button>
            </div>
            <div className="space-y-4">
              <div>
                <label className="mb-1 block text-sm text-slate-400">Тема тренировки</label>
                <input
                  type="text"
                  value={journalForm.topic}
                  onChange={(e) => setJournalForm({ ...journalForm, topic: e.target.value })}
                  className="w-full rounded-xl border border-white/20 bg-white/5 px-4 py-2.5 text-white"
                />
              </div>
              <div>
                <label className="mb-1 block text-sm text-slate-400">Цели тренировки</label>
                <textarea
                  value={journalForm.goals}
                  onChange={(e) => setJournalForm({ ...journalForm, goals: e.target.value })}
                  rows={2}
                  className="w-full rounded-xl border border-white/20 bg-white/5 px-4 py-2.5 text-white"
                />
              </div>
              <div>
                <label className="mb-1 block text-sm text-slate-400">Заметки</label>
                <textarea
                  value={journalForm.notes}
                  onChange={(e) => setJournalForm({ ...journalForm, notes: e.target.value })}
                  rows={3}
                  className="w-full rounded-xl border border-white/20 bg-white/5 px-4 py-2.5 text-white"
                />
              </div>
              <div>
                <label className="mb-1 block text-sm text-slate-400">Комментарий по команде</label>
                <textarea
                  value={journalForm.teamComment}
                  onChange={(e) => setJournalForm({ ...journalForm, teamComment: e.target.value })}
                  rows={2}
                  className="w-full rounded-xl border border-white/20 bg-white/5 px-4 py-2.5 text-white"
                />
              </div>
              <div className="flex gap-2">
                <Button onClick={saveJournal} disabled={saving}>
                  {saving ? "Сохранение…" : "Сохранить"}
                </Button>
                <Button variant="secondary" onClick={() => setJournalModal(null)}>
                  Отмена
                </Button>
              </div>
            </div>
          </Card>
        </div>
      )}

      {/* Модалка оценки */}
      {ratingModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4 backdrop-blur-sm">
          <Card className="w-full max-w-md border-neon-blue/30">
            <div className="mb-4 flex items-center justify-between">
              <h3 className="font-display text-lg font-semibold text-white">Поставить оценку</h3>
              <button
                type="button"
                onClick={() => setRatingModal(false)}
                className="rounded-lg p-2 text-slate-400 hover:bg-white/10 hover:text-white"
              >
                <X className="h-5 w-5" />
              </button>
            </div>
            <div className="space-y-4">
              <div>
                <label className="mb-1 block text-sm text-slate-400">Игрок *</label>
                <select
                  value={ratingForm.playerId}
                  onChange={(e) => setRatingForm({ ...ratingForm, playerId: e.target.value })}
                  className="w-full rounded-xl border border-white/20 bg-white/5 px-4 py-2.5 text-white"
                >
                  <option value="">Выберите игрока</option>
                  {filteredPlayers.length ? filteredPlayers.map((p) => (
                    <option key={p.id} value={p.id}>{p.firstName} {p.lastName}</option>
                  )) : players.map((p) => (
                    <option key={p.id} value={p.id}>{p.firstName} {p.lastName}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="mb-1 block text-sm text-slate-400">Оценка (1–5)</label>
                <div className="flex gap-1">
                  {[1, 2, 3, 4, 5].map((i) => (
                    <button
                      key={i}
                      type="button"
                      onClick={() => setRatingForm({ ...ratingForm, rating: i })}
                      className={`rounded-lg p-2 transition-colors ${
                        i <= ratingForm.rating
                          ? "bg-amber-500/30 text-amber-400"
                          : "bg-white/5 text-slate-500 hover:bg-white/10"
                      }`}
                    >
                      <Star className={`h-6 w-6 ${i <= ratingForm.rating ? "fill-current" : ""}`} />
                    </button>
                  ))}
                </div>
              </div>
              <div>
                <label className="mb-1 block text-sm text-slate-400">Рекомендация</label>
                <textarea
                  value={ratingForm.recommendation}
                  onChange={(e) => setRatingForm({ ...ratingForm, recommendation: e.target.value })}
                  rows={3}
                  className="w-full rounded-xl border border-white/20 bg-white/5 px-4 py-2.5 text-white"
                  placeholder="Отличный прогресс. Рекомендую для перевода в старшую группу."
                />
              </div>
              <div>
                <label className="mb-1 block text-sm text-slate-400">Комментарий</label>
                <textarea
                  value={ratingForm.comment}
                  onChange={(e) => setRatingForm({ ...ratingForm, comment: e.target.value })}
                  rows={2}
                  className="w-full rounded-xl border border-white/20 bg-white/5 px-4 py-2.5 text-white"
                />
              </div>
              <div className="flex gap-2">
                <Button onClick={saveRating} disabled={saving || !ratingForm.playerId}>
                  {saving ? "Сохранение…" : "Сохранить"}
                </Button>
                <Button variant="secondary" onClick={() => setRatingModal(false)}>
                  Отмена
                </Button>
              </div>
            </div>
          </Card>
        </div>
      )}
    </div>
  );
}
