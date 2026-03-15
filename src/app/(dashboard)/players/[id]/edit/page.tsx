"use client";

import { useParams } from "next/navigation";
import Link from "next/link";
import { useState, useEffect } from "react";
import {
  ArrowLeft,
  FileText,
  Zap,
  Heart,
  Award,
  Video,
  Plus,
  Trash2,
  Save,
  UserCircle,
  Loader2,
  Calendar,
  Wallet,
  X,
} from "lucide-react";
import { Card } from "@/components/Card";
import { Button } from "@/components/Button";

interface Passport {
  id: string;
  passportNumber: string;
  issueDate: string;
  expiryDate: string;
  issuedBy: string;
  internationalID: string | null;
}

interface Medical {
  id: string;
  lastCheckup: string | null;
  injuries: Array<{ type?: string; date?: string; recoveryDays?: number }> | null;
  restrictions: string | null;
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
  internationalRating: number | null;
  status: string;
  comment: string | null;
  passport: Passport | null;
  medical: Medical | null;
  skills: Skills | null;
  achievements: Achievement[];
  videos: PlayerVideo[];
  payments?: Payment[];
  team?: { name: string } | null;
}

interface Payment {
  id: string;
  month: number;
  year: number;
  amount: number;
  status: string;
  paidAt: string | null;
}

interface TrainingWithAttendance {
  id: string;
  title: string;
  startTime: string;
  endTime: string;
  location: string | null;
  attendance: { id: string; status: string; comment: string | null } | null;
}

const INPUT_CLASS =
  "w-full rounded-xl border border-white/20 bg-white/5 px-4 py-3 text-white placeholder-slate-500 transition-all focus:border-neon-blue focus:outline-none focus:ring-2 focus:ring-neon-blue/30";
const LABEL_CLASS = "mb-2 block text-sm font-medium text-slate-400";

export default function PlayerEditPage() {
  const params = useParams();
  const id = (params?.id as string) ?? "";

  const [player, setPlayer] = useState<Player | null>(null);
  const [trainings, setTrainings] = useState<TrainingWithAttendance[]>([]);
  const [payments, setPayments] = useState<Payment[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState<string | null>(null);
  const [error, setError] = useState("");

  const [formPlayer, setFormPlayer] = useState({
    firstName: "",
    lastName: "",
    birthYear: new Date().getFullYear(),
    birthDate: "",
    position: "Нападающий",
    grip: "Правый",
    height: "" as number | "",
    weight: "" as number | "",
    city: "",
    country: "Россия",
    internationalRating: "" as number | "",
    status: "Активен",
    comment: "",
  });

  const [formPassport, setFormPassport] = useState({
    passportNumber: "",
    issueDate: "",
    expiryDate: "",
    issuedBy: "",
    internationalID: "",
  });

  const [formSkills, setFormSkills] = useState({
    speed: 0,
    shotAccuracy: 0,
    dribbling: 0,
    stamina: 0,
  });

  const [formMedical, setFormMedical] = useState({
    lastCheckup: "",
    restrictions: "",
    injuries: [] as Array<{ type: string; date: string; recoveryDays: number | "" }>,
  });

  const [formAchievement, setFormAchievement] = useState({
    title: "",
    year: new Date().getFullYear(),
    description: "",
  });
  const [formVideo, setFormVideo] = useState({ title: "", url: "" });
  const [formPayment, setFormPayment] = useState({
    month: new Date().getMonth() + 1,
    year: new Date().getFullYear(),
    amount: 5000,
    status: "Не оплачено",
    paidAt: "",
  });
  const [attendanceComments, setAttendanceComments] = useState<Record<string, string>>({});

  const fetchPlayer = () => {
    if (!id) return;
    fetch(`/api/player/${id}`)
      .then((r) => r.json())
      .then((data) => {
        if (data?.id) {
          setPlayer(data);
          setFormPlayer({
            firstName: data.firstName ?? "",
            lastName: data.lastName ?? "",
            birthYear: data.birthYear ?? new Date().getFullYear(),
            birthDate: data.birthDate ? data.birthDate.slice(0, 10) : "",
            position: data.position ?? "Нападающий",
            grip: data.grip ?? "Правый",
            height: data.height ?? "",
            weight: data.weight ?? "",
            city: data.city ?? "",
            country: data.country ?? "Россия",
            internationalRating: data.internationalRating ?? "",
            status: data.status ?? "Активен",
            comment: data.comment ?? "",
          });
          if (data.passport) {
            setFormPassport({
              passportNumber: data.passport.passportNumber ?? "",
              issueDate: data.passport.issueDate ? data.passport.issueDate.slice(0, 10) : "",
              expiryDate: data.passport.expiryDate ? data.passport.expiryDate.slice(0, 10) : "",
              issuedBy: data.passport.issuedBy ?? "",
              internationalID: data.passport.internationalID ?? "",
            });
          }
          if (data.skills) {
            setFormSkills({
              speed: data.skills.speed ?? 0,
              shotAccuracy: data.skills.shotAccuracy ?? 0,
              dribbling: data.skills.dribbling ?? 0,
              stamina: data.skills.stamina ?? 0,
            });
          }
          if (data.medical) {
            const injuries = Array.isArray(data.medical.injuries)
              ? data.medical.injuries.map((i: { type?: string; date?: string; recoveryDays?: number }) => ({
                  type: i.type ?? "",
                  date: i.date ? String(i.date).slice(0, 10) : "",
                  recoveryDays: i.recoveryDays ?? "",
                }))
              : [];
            setFormMedical({
              lastCheckup: data.medical.lastCheckup ? data.medical.lastCheckup.slice(0, 10) : "",
              restrictions: data.medical.restrictions ?? "",
              injuries,
            });
          }
        } else setPlayer(null);
        if (Array.isArray(data?.payments)) setPayments(data.payments);
      })
      .catch(() => setPlayer(null))
      .finally(() => setLoading(false));
  };

  const fetchTrainings = () => {
    if (!id) return;
    fetch(`/api/player/${id}/trainings`)
      .then((r) => r.json())
      .then((data) => {
        const arr = Array.isArray(data) ? data : [];
        setTrainings(arr);
        const comments: Record<string, string> = {};
        arr.forEach((t: TrainingWithAttendance) => {
          if (t.attendance?.comment) comments[t.id] = t.attendance.comment;
        });
        setAttendanceComments((prev) => ({ ...prev, ...comments }));
      })
      .catch(() => setTrainings([]));
  };

  const fetchPayments = () => {
    if (!id) return;
    fetch(`/api/player/${id}/payments`)
      .then((r) => r.json())
      .then((data) => setPayments(Array.isArray(data) ? data : []))
      .catch(() => setPayments([]));
  };

  useEffect(() => {
    fetchPlayer();
    fetchTrainings();
    fetchPayments();
  }, [id]);

  const handleSavePlayer = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setSaving("player");
    try {
      const res = await fetch(`/api/players/${id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...formPlayer,
          birthDate: formPlayer.birthDate || null,
          height: formPlayer.height === "" ? null : Number(formPlayer.height),
          weight: formPlayer.weight === "" ? null : Number(formPlayer.weight),
          internationalRating: formPlayer.internationalRating === "" ? null : Number(formPlayer.internationalRating),
        }),
      });
      if (res.ok) {
        fetchPlayer();
      } else {
        const d = await res.json().catch(() => ({}));
        setError((d.error as string) ?? "Ошибка сохранения");
      }
    } finally {
      setSaving(null);
    }
  };

  const handleSavePassport = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setSaving("passport");
    try {
      const res = await fetch(`/api/player/${id}/passport`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(formPassport),
      });
      if (res.ok) {
        fetchPlayer();
      } else {
        const d = await res.json().catch(() => ({}));
        setError((d.error as string) ?? "Ошибка сохранения паспорта");
      }
    } finally {
      setSaving(null);
    }
  };

  const handleSaveSkills = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setSaving("skills");
    try {
      const res = await fetch(`/api/player/${id}/skills`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(formSkills),
      });
      if (res.ok) {
        fetchPlayer();
      } else {
        const d = await res.json().catch(() => ({}));
        setError((d.error as string) ?? "Ошибка сохранения навыков");
      }
    } finally {
      setSaving(null);
    }
  };

  const handleSaveMedical = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setSaving("medical");
    try {
      const injuries = formMedical.injuries.map((i) => ({
        type: i.type || undefined,
        date: i.date || undefined,
        recoveryDays: i.recoveryDays === "" ? undefined : Number(i.recoveryDays),
      }));
      const res = await fetch(`/api/player/${id}/medical`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          lastCheckup: formMedical.lastCheckup || null,
          restrictions: formMedical.restrictions || null,
          injuries,
        }),
      });
      if (res.ok) {
        fetchPlayer();
      } else {
        const d = await res.json().catch(() => ({}));
        setError((d.error as string) ?? "Ошибка сохранения медкарты");
      }
    } finally {
      setSaving(null);
    }
  };

  const handleAddAchievement = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setSaving("achievement");
    try {
      const res = await fetch(`/api/player/${id}/achievement`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
        ...formAchievement,
        description: formAchievement.description || undefined,
      }),
      });
      if (res.ok) {
        setFormAchievement({ title: "", year: new Date().getFullYear(), description: "" });
        fetchPlayer();
      } else {
        const d = await res.json().catch(() => ({}));
        setError((d.error as string) ?? "Ошибка добавления достижения");
      }
    } finally {
      setSaving(null);
    }
  };

  const handleDeleteAchievement = async (aid: string) => {
    setError("");
    try {
      const res = await fetch(`/api/player/${id}/achievement/${aid}`, { method: "DELETE" });
      if (res.ok) fetchPlayer();
      else {
        const d = await res.json().catch(() => ({}));
        setError((d.error as string) ?? "Ошибка удаления");
      }
    } catch {}
  };

  const handleAddVideo = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setSaving("video");
    try {
      const res = await fetch(`/api/player/${id}/video`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(formVideo),
      });
      if (res.ok) {
        setFormVideo({ title: "", url: "" });
        fetchPlayer();
      } else {
        const d = await res.json().catch(() => ({}));
        setError((d.error as string) ?? "Ошибка добавления видео");
      }
    } finally {
      setSaving(null);
    }
  };

  const handleDeleteVideo = async (vid: string) => {
    setError("");
    try {
      const res = await fetch(`/api/player/${id}/video/${vid}`, { method: "DELETE" });
      if (res.ok) fetchPlayer();
      else {
        const d = await res.json().catch(() => ({}));
        setError((d.error as string) ?? "Ошибка удаления");
      }
    } catch {}
  };

  const addInjury = () => {
    setFormMedical({
      ...formMedical,
      injuries: [...formMedical.injuries, { type: "", date: "", recoveryDays: "" }],
    });
  };

  const removeInjury = (idx: number) => {
    setFormMedical({
      ...formMedical,
      injuries: formMedical.injuries.filter((_, i) => i !== idx),
    });
  };

  const updateInjury = (idx: number, field: "type" | "date" | "recoveryDays", value: string | number) => {
    const next = [...formMedical.injuries];
    next[idx] = { ...next[idx], [field]: value };
    setFormMedical({ ...formMedical, injuries: next });
  };

  const handleSaveAttendance = async (trainingId: string, status: string, comment?: string) => {
    setError("");
    try {
      const res = await fetch(`/api/trainings/${trainingId}/attendance`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ playerId: id, status, comment: comment ?? "" }),
      });
      if (res.ok) {
        fetchTrainings();
      } else {
        const d = await res.json().catch(() => ({}));
        setError((d.error as string) ?? "Ошибка сохранения посещаемости");
      }
    } catch {}
  };

  const handleAddPayment = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setSaving("payment");
    try {
      const res = await fetch(`/api/player/${id}/payments`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...formPayment,
          paidAt: formPayment.paidAt || undefined,
        }),
      });
      if (res.ok) {
        setFormPayment({
          month: new Date().getMonth() + 1,
          year: new Date().getFullYear(),
          amount: 5000,
          status: "Не оплачено",
          paidAt: "",
        });
        fetchPayments();
        fetchPlayer();
      } else {
        const d = await res.json().catch(() => ({}));
        setError((d.error as string) ?? "Ошибка добавления платежа");
      }
    } finally {
      setSaving(null);
    }
  };

  const handleUpdatePaymentStatus = async (pid: string, status: string, paidAt?: string) => {
    setError("");
    try {
      const res = await fetch(`/api/player/${id}/payments/${pid}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status, paidAt: paidAt || undefined }),
      });
      if (res.ok) fetchPayments();
      else {
        const d = await res.json().catch(() => ({}));
        setError((d.error as string) ?? "Ошибка обновления");
      }
    } catch {}
  };

  const formatDate = (s: string) => new Date(s).toLocaleDateString("ru-RU", { day: "numeric", month: "short", year: "numeric" });
  const monthNames = ["Янв", "Фев", "Мар", "Апр", "Май", "Июн", "Июл", "Авг", "Сен", "Окт", "Ноя", "Дек"];

  if (loading) {
    return (
      <div className="flex min-h-[50vh] items-center justify-center">
        <div className="h-12 w-12 animate-spin rounded-full border-2 border-neon-blue border-t-transparent" />
      </div>
    );
  }

  if (!player) {
    return (
      <div className="p-8">
        <p className="text-slate-400">Игрок не найден</p>
        <Link href="/players" className="mt-4 inline-block text-neon-blue hover:text-neon-cyan">
          ← Назад к игрокам
        </Link>
      </div>
    );
  }

  return (
    <div className="p-6 sm:p-8">
      <Link
        href={`/players/${id}`}
        className="mb-6 inline-flex items-center gap-2 text-sm text-slate-400 transition-colors hover:text-neon-blue"
      >
        <ArrowLeft className="h-4 w-4" />
        Назад к профилю
      </Link>

      {/* Карточка игрока */}
        <Card className="overflow-hidden border-neon-blue/30 shadow-[0_0_40px_rgba(0,212,255,0.15)]">
          <div className="flex flex-col sm:flex-row sm:items-center gap-6 p-6">
            <div className="flex h-24 w-24 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br from-neon-blue/30 to-neon-pink/30 border border-neon-blue/40 shadow-[0_0_30px_rgba(0,212,255,0.3)]">
              <UserCircle className="h-14 w-14 text-neon-blue" />
            </div>
            <div className="flex-1 min-w-0">
              <h1 className="font-display text-2xl font-bold text-white sm:text-3xl">
                {player.firstName} {player.lastName}
              </h1>
              <p className="mt-1 text-slate-400">
                {player.position} • {player.grip} • {player.birthYear} г.р.
              </p>
              <p className="mt-0.5 text-sm text-slate-500">
                {player.team?.name ?? "Без команды"}
                {player.birthDate && ` • ${new Date(player.birthDate).toLocaleDateString("ru-RU")}`}
              </p>
            </div>
            <div className="flex flex-wrap gap-2">
              <Link href={`/players/${id}`}>
                <Button variant="secondary" size="sm" className="gap-1">
                  <X className="h-4 w-4" />
                  Отмена
                </Button>
              </Link>
            </div>
          </div>
        </Card>

      {error && (
        <div className="mb-6 rounded-xl border border-neon-pink/40 bg-neon-pink/10 px-4 py-3 text-neon-pink">
          {error}
        </div>
      )}

      <div className="space-y-8">
        {/* Основные данные */}
        <Card className="border-neon-blue/20 shadow-[0_0_30px_rgba(0,212,255,0.08)]">
          <h2 className="mb-6 flex items-center gap-2 font-display text-lg font-semibold text-white">
            <UserCircle className="h-5 w-5 text-neon-blue" />
            Основные данные
          </h2>
          <form onSubmit={handleSavePlayer} className="grid gap-6 sm:grid-cols-2">
            <div>
              <label className={LABEL_CLASS}>Имя *</label>
              <input
                type="text"
                value={formPlayer.firstName}
                onChange={(e) => setFormPlayer({ ...formPlayer, firstName: e.target.value })}
                className={INPUT_CLASS}
                required
              />
            </div>
            <div>
              <label className={LABEL_CLASS}>Фамилия *</label>
              <input
                type="text"
                value={formPlayer.lastName}
                onChange={(e) => setFormPlayer({ ...formPlayer, lastName: e.target.value })}
                className={INPUT_CLASS}
                required
              />
            </div>
            <div>
              <label className={LABEL_CLASS}>Год рождения *</label>
              <input
                type="number"
                min={1990}
                max={2025}
                value={formPlayer.birthYear || ""}
                onChange={(e) => setFormPlayer({ ...formPlayer, birthYear: Number(e.target.value) || 0 })}
                className={INPUT_CLASS}
              />
            </div>
            <div>
              <label className={LABEL_CLASS}>Дата рождения</label>
              <input
                type="date"
                value={formPlayer.birthDate}
                onChange={(e) => setFormPlayer({ ...formPlayer, birthDate: e.target.value })}
                className={INPUT_CLASS}
              />
            </div>
            <div>
              <label className={LABEL_CLASS}>Позиция</label>
              <select
                value={formPlayer.position}
                onChange={(e) => setFormPlayer({ ...formPlayer, position: e.target.value })}
                className={INPUT_CLASS}
              >
                <option value="Нападающий">Нападающий</option>
                <option value="Защитник">Защитник</option>
                <option value="Вратарь">Вратарь</option>
                <option value="Центральный">Центральный</option>
                <option value="Левый край">Левый край</option>
                <option value="Правый край">Правый край</option>
              </select>
            </div>
            <div>
              <label className={LABEL_CLASS}>Хват</label>
              <select
                value={formPlayer.grip}
                onChange={(e) => setFormPlayer({ ...formPlayer, grip: e.target.value })}
                className={INPUT_CLASS}
              >
                <option value="Правый">Правый</option>
                <option value="Левый">Левый</option>
              </select>
            </div>
            <div>
              <label className={LABEL_CLASS}>Рост (см)</label>
              <input
                type="number"
                min={100}
                max={250}
                value={formPlayer.height === "" ? "" : formPlayer.height}
                onChange={(e) => setFormPlayer({ ...formPlayer, height: e.target.value === "" ? "" : Number(e.target.value) })}
                className={INPUT_CLASS}
                placeholder="—"
              />
            </div>
            <div>
              <label className={LABEL_CLASS}>Вес (кг)</label>
              <input
                type="number"
                min={20}
                max={150}
                value={formPlayer.weight === "" ? "" : formPlayer.weight}
                onChange={(e) => setFormPlayer({ ...formPlayer, weight: e.target.value === "" ? "" : Number(e.target.value) })}
                className={INPUT_CLASS}
                placeholder="—"
              />
            </div>
            <div>
              <label className={LABEL_CLASS}>Город</label>
              <input
                type="text"
                value={formPlayer.city}
                onChange={(e) => setFormPlayer({ ...formPlayer, city: e.target.value })}
                className={INPUT_CLASS}
              />
            </div>
            <div>
              <label className={LABEL_CLASS}>Страна</label>
              <input
                type="text"
                value={formPlayer.country}
                onChange={(e) => setFormPlayer({ ...formPlayer, country: e.target.value })}
                className={INPUT_CLASS}
              />
            </div>
            <div>
              <label className={LABEL_CLASS}>Статус</label>
              <select
                value={formPlayer.status}
                onChange={(e) => setFormPlayer({ ...formPlayer, status: e.target.value })}
                className={INPUT_CLASS}
              >
                <option value="Активен">Активен</option>
                <option value="Неактивен">Неактивен</option>
                <option value="Выпускник">Выпускник</option>
              </select>
            </div>
            <div className="sm:col-span-2">
              <label className={LABEL_CLASS}>Комментарий</label>
              <textarea
                value={formPlayer.comment}
                onChange={(e) => setFormPlayer({ ...formPlayer, comment: e.target.value })}
                className={`${INPUT_CLASS} min-h-[100px]`}
                rows={3}
              />
            </div>
            <div className="sm:col-span-2">
              <Button type="submit" disabled={saving === "player"} className="gap-2">
                {saving === "player" ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
                Сохранить основные данные
              </Button>
            </div>
          </form>
        </Card>

        {/* Паспорт */}
        <Card className="border-neon-blue/20 shadow-[0_0_30px_rgba(0,212,255,0.08)]">
          <h2 className="mb-6 flex items-center gap-2 font-display text-lg font-semibold text-white">
            <FileText className="h-5 w-5 text-neon-blue" />
            Паспорт
          </h2>
          <form onSubmit={handleSavePassport} className="grid gap-6 sm:grid-cols-2">
            <div>
              <label className={LABEL_CLASS}>Номер паспорта *</label>
              <input
                type="text"
                value={formPassport.passportNumber}
                onChange={(e) => setFormPassport({ ...formPassport, passportNumber: e.target.value })}
                className={INPUT_CLASS}
                required
              />
            </div>
            <div>
              <label className={LABEL_CLASS}>Дата выдачи *</label>
              <input
                type="date"
                value={formPassport.issueDate}
                onChange={(e) => setFormPassport({ ...formPassport, issueDate: e.target.value })}
                className={INPUT_CLASS}
                required
              />
            </div>
            <div>
              <label className={LABEL_CLASS}>Срок действия *</label>
              <input
                type="date"
                value={formPassport.expiryDate}
                onChange={(e) => setFormPassport({ ...formPassport, expiryDate: e.target.value })}
                className={INPUT_CLASS}
                required
              />
            </div>
            <div>
              <label className={LABEL_CLASS}>Кем выдан *</label>
              <input
                type="text"
                value={formPassport.issuedBy}
                onChange={(e) => setFormPassport({ ...formPassport, issuedBy: e.target.value })}
                className={INPUT_CLASS}
                required
              />
            </div>
            <div className="sm:col-span-2">
              <label className={LABEL_CLASS}>Международный ID</label>
              <input
                type="text"
                value={formPassport.internationalID}
                onChange={(e) => setFormPassport({ ...formPassport, internationalID: e.target.value })}
                className={INPUT_CLASS}
              />
            </div>
            <div>
              <Button type="submit" disabled={saving === "passport"} className="gap-2">
                {saving === "passport" ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
                Сохранить паспорт
              </Button>
            </div>
          </form>
        </Card>

        {/* Навыки */}
        <Card className="border-neon-blue/20 shadow-[0_0_30px_rgba(0,212,255,0.08)]">
          <h2 className="mb-6 flex items-center gap-2 font-display text-lg font-semibold text-white">
            <Zap className="h-5 w-5 text-neon-blue" />
            Навыки (0–100)
          </h2>
          <form onSubmit={handleSaveSkills} className="space-y-6">
            {[
              { key: "speed", label: "Скорость", value: formSkills.speed },
              { key: "shotAccuracy", label: "Точность броска", value: formSkills.shotAccuracy },
              { key: "dribbling", label: "Дриблинг", value: formSkills.dribbling },
              { key: "stamina", label: "Выносливость", value: formSkills.stamina },
            ].map(({ key, label, value }) => (
              <div key={key}>
                <div className="mb-2 flex justify-between">
                  <label className={LABEL_CLASS}>{label}</label>
                  <span className="text-neon-cyan font-mono">{value}</span>
                </div>
                <input
                  type="range"
                  min={0}
                  max={100}
                  value={value}
                  onChange={(e) =>
                    setFormSkills({ ...formSkills, [key]: Number(e.target.value) })
                  }
                  className="h-3 w-full appearance-none rounded-full bg-dark-500 [&::-webkit-slider-thumb]:h-5 [&::-webkit-slider-thumb]:w-5 [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:bg-neon-blue [&::-webkit-slider-thumb]:shadow-[0_0_15px_rgba(0,212,255,0.6)]"
                />
              </div>
            ))}
            <Button type="submit" disabled={saving === "skills"} className="gap-2">
              {saving === "skills" ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
              Сохранить навыки
            </Button>
          </form>
        </Card>

        {/* Медицинская карта */}
        <Card className="border-neon-pink/20 shadow-[0_0_30px_rgba(255,0,170,0.06)]">
          <h2 className="mb-6 flex items-center gap-2 font-display text-lg font-semibold text-white">
            <Heart className="h-5 w-5 text-neon-pink" />
            Медицинская карта
          </h2>
          <form onSubmit={handleSaveMedical} className="space-y-6">
            <div>
              <label className={LABEL_CLASS}>Последний осмотр</label>
              <input
                type="date"
                value={formMedical.lastCheckup}
                onChange={(e) => setFormMedical({ ...formMedical, lastCheckup: e.target.value })}
                className={INPUT_CLASS}
              />
            </div>
            <div>
              <label className={LABEL_CLASS}>Ограничения и рекомендации</label>
              <textarea
                value={formMedical.restrictions}
                onChange={(e) => setFormMedical({ ...formMedical, restrictions: e.target.value })}
                className={`${INPUT_CLASS} min-h-[80px]`}
                rows={2}
              />
            </div>
            <div>
              <div className="mb-3 flex items-center justify-between">
                <label className={LABEL_CLASS}>Травмы</label>
                <Button type="button" size="sm" variant="secondary" onClick={addInjury} className="gap-1">
                  <Plus className="h-4 w-4" />
                  Добавить
                </Button>
              </div>
              <div className="space-y-3">
                {formMedical.injuries.map((inj, idx) => (
                  <div
                    key={idx}
                    className="flex flex-wrap items-end gap-3 rounded-xl border border-white/10 bg-white/5 p-4"
                  >
                    <input
                      type="text"
                      placeholder="Тип травмы"
                      value={inj.type}
                      onChange={(e) => updateInjury(idx, "type", e.target.value)}
                      className={`${INPUT_CLASS} flex-1 min-w-[120px]`}
                    />
                    <input
                      type="date"
                      placeholder="Дата"
                      value={inj.date}
                      onChange={(e) => updateInjury(idx, "date", e.target.value)}
                      className={`${INPUT_CLASS} w-36`}
                    />
                    <input
                      type="number"
                      placeholder="Дней восстановления"
                      min={0}
                      value={inj.recoveryDays === "" ? "" : inj.recoveryDays}
                      onChange={(e) =>
                        updateInjury(idx, "recoveryDays", e.target.value === "" ? "" : Number(e.target.value))
                      }
                      className={`${INPUT_CLASS} w-36`}
                    />
                    <Button
                      type="button"
                      variant="danger"
                      size="sm"
                      onClick={() => removeInjury(idx)}
                      className="shrink-0"
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                ))}
              </div>
            </div>
            <Button type="submit" disabled={saving === "medical"} className="gap-2">
              {saving === "medical" ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
              Сохранить медкарту
            </Button>
          </form>
        </Card>

        {/* Достижения */}
        <Card className="border-neon-green/20 shadow-[0_0_30px_rgba(0,255,136,0.06)]">
          <h2 className="mb-6 flex items-center gap-2 font-display text-lg font-semibold text-white">
            <Award className="h-5 w-5 text-neon-green" />
            Достижения
          </h2>
          <form onSubmit={handleAddAchievement} className="mb-6 space-y-4">
            <div className="flex flex-wrap gap-3">
              <input
                type="text"
                placeholder="Название *"
                value={formAchievement.title}
                onChange={(e) => setFormAchievement({ ...formAchievement, title: e.target.value })}
                className={`${INPUT_CLASS} flex-1 min-w-[200px]`}
                required
              />
              <input
                type="number"
                min={1990}
                max={2030}
                value={formAchievement.year}
                onChange={(e) =>
                  setFormAchievement({ ...formAchievement, year: Number(e.target.value) || new Date().getFullYear() })
                }
                className={`${INPUT_CLASS} w-24`}
              />
              <Button type="submit" disabled={saving === "achievement"} className="gap-1">
                {saving === "achievement" ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />}
                Добавить достижение
              </Button>
            </div>
            <input
              type="text"
              placeholder="Описание"
              value={formAchievement.description}
              onChange={(e) => setFormAchievement({ ...formAchievement, description: e.target.value })}
              className={INPUT_CLASS}
            />
          </form>
          {player.achievements.length > 0 ? (
            <ul className="space-y-2">
              {player.achievements.map((a) => (
                <li
                  key={a.id}
                  className="rounded-xl border border-white/10 bg-white/5 px-4 py-3"
                >
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-slate-300 font-medium">{a.title}</span>
                    <span className="text-slate-500 text-sm">{a.year}</span>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => handleDeleteAchievement(a.id)}
                    className="text-neon-pink hover:bg-neon-pink/10 hover:text-neon-pink shrink-0"
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                  </div>
                  {a.description && <p className="mt-2 text-sm text-slate-400">{a.description}</p>}
                </li>
              ))}
            </ul>
          ) : (
            <p className="text-slate-500">Достижений пока нет</p>
          )}
        </Card>

        {/* Видео */}
        <Card className="border-neon-purple/20 shadow-[0_0_30px_rgba(191,0,255,0.06)]">
          <h2 className="mb-6 flex items-center gap-2 font-display text-lg font-semibold text-white">
            <Video className="h-5 w-5 text-neon-purple" />
            Видео
          </h2>
          <form onSubmit={handleAddVideo} className="mb-6 space-y-4">
            <div className="flex flex-wrap gap-3">
              <input
                type="text"
                placeholder="Название"
                value={formVideo.title}
                onChange={(e) => setFormVideo({ ...formVideo, title: e.target.value })}
                className={`${INPUT_CLASS} flex-1 min-w-[200px]`}
                required
              />
              <input
                type="url"
                placeholder="https://..."
                value={formVideo.url}
                onChange={(e) => setFormVideo({ ...formVideo, url: e.target.value })}
                className={`${INPUT_CLASS} flex-1 min-w-[200px]`}
                required
              />
              <Button type="submit" disabled={saving === "video"} className="gap-1">
                {saving === "video" ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />}
                Добавить видео
              </Button>
            </div>
          </form>
          {player.videos.length > 0 ? (
            <ul className="space-y-2">
              {player.videos.map((v) => (
                <li
                  key={v.id}
                  className="flex items-center justify-between rounded-xl border border-white/10 bg-white/5 px-4 py-3"
                >
                  <a
                    href={v.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-neon-cyan hover:underline"
                  >
                    {v.title}
                  </a>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => handleDeleteVideo(v.id)}
                    className="text-neon-pink hover:bg-neon-pink/10 hover:text-neon-pink"
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </li>
              ))}
            </ul>
          ) : (
            <p className="text-slate-500">Видео пока нет</p>
          )}
        </Card>

        {/* Посещаемость */}
        <Card className="border-neon-cyan/20 shadow-[0_0_30px_rgba(0,245,255,0.06)]">
          <h2 className="mb-6 flex items-center gap-2 font-display text-lg font-semibold text-white">
            <Calendar className="h-5 w-5 text-neon-cyan" />
            Посещаемость
          </h2>
          {trainings.length > 0 ? (
            <div className="space-y-4">
              {trainings.slice(0, 15).map((t) => {
                const att = t.attendance;
                const status = att?.status ?? null;
                return (
                  <div
                    key={t.id}
                    className="flex flex-col gap-3 rounded-xl border border-white/10 bg-white/5 p-4 sm:flex-row sm:items-center"
                  >
                    <div className="min-w-0 flex-1">
                      <p className="font-medium text-white">{t.title}</p>
                      <p className="text-sm text-slate-500">
                        {formatDate(t.startTime)}
                        {t.location && ` • ${t.location}`}
                      </p>
                    </div>
                    <div className="flex flex-wrap items-center gap-2">
                      {["PRESENT", "ABSENT", "LATE", "EXCUSED"].map((s) => (
                        <button
                          key={s}
                          type="button"
                          onClick={() => handleSaveAttendance(t.id, s, attendanceComments[t.id])}
                          className={`rounded-lg px-3 py-1.5 text-sm transition-all ${
                            status === s
                              ? s === "PRESENT"
                                ? "bg-neon-green/20 text-neon-green border border-neon-green/40"
                                : s === "ABSENT"
                                  ? "bg-neon-pink/20 text-neon-pink border border-neon-pink/40"
                                  : "bg-neon-blue/20 text-neon-blue border border-neon-blue/40"
                              : "border border-white/20 bg-white/5 text-slate-400 hover:border-neon-blue/50"
                          }`}
                        >
                          {s === "PRESENT" ? "Присутствовал" : s === "ABSENT" ? "Отсутствовал" : s === "LATE" ? "Опоздал" : "Уваж. причина"}
                        </button>
                      ))}
                    </div>
                    <input
                      type="text"
                      placeholder="Комментарий по посещению"
                      value={attendanceComments[t.id] ?? att?.comment ?? ""}
                      onChange={(e) =>
                        setAttendanceComments((prev) => ({ ...prev, [t.id]: e.target.value }))
                      }
                      onBlur={() => {
                        const v = attendanceComments[t.id] ?? att?.comment;
                        if (v && status) handleSaveAttendance(t.id, status, v);
                      }}
                      className={`${INPUT_CLASS} sm:min-w-[200px]`}
                    />
                  </div>
                );
              })}
              {trainings.length > 15 && (
                <p className="text-sm text-slate-500">Показаны последние 15 тренировок</p>
              )}
            </div>
          ) : (
            <p className="text-slate-500">Нет тренировок команды игрока</p>
          )}
        </Card>

        {/* Оплаты */}
        <Card className="border-neon-green/20 shadow-[0_0_30px_rgba(0,255,136,0.06)]">
          <h2 className="mb-6 flex items-center gap-2 font-display text-lg font-semibold text-white">
            <Wallet className="h-5 w-5 text-neon-green" />
            Оплаты
          </h2>
          <form onSubmit={handleAddPayment} className="mb-6 space-y-4">
            <div className="flex flex-wrap gap-3">
              <select
                value={formPayment.month}
                onChange={(e) => setFormPayment({ ...formPayment, month: Number(e.target.value) })}
                className={`${INPUT_CLASS} w-32`}
              >
                {monthNames.map((m, i) => (
                  <option key={i} value={i + 1}>{m}</option>
                ))}
              </select>
              <input
                type="number"
                min={2020}
                max={2030}
                value={formPayment.year}
                onChange={(e) => setFormPayment({ ...formPayment, year: Number(e.target.value) })}
                className={`${INPUT_CLASS} w-24`}
              />
              <input
                type="number"
                min={0}
                placeholder="Сумма"
                value={formPayment.amount || ""}
                onChange={(e) => setFormPayment({ ...formPayment, amount: Number(e.target.value) || 0 })}
                className={`${INPUT_CLASS} w-28`}
              />
              <select
                value={formPayment.status}
                onChange={(e) => setFormPayment({ ...formPayment, status: e.target.value })}
                className={`${INPUT_CLASS} w-36`}
              >
                <option value="Не оплачено">Не оплачено</option>
                <option value="Оплачено">Оплачено</option>
              </select>
              <input
                type="date"
                placeholder="Дата оплаты"
                value={formPayment.paidAt}
                onChange={(e) => setFormPayment({ ...formPayment, paidAt: e.target.value })}
                className={`${INPUT_CLASS} w-40`}
              />
              <Button type="submit" disabled={saving === "payment"} className="gap-1">
                {saving === "payment" ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />}
                Добавить оплату
              </Button>
            </div>
          </form>
          {payments.length > 0 ? (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-white/10 text-left text-slate-500">
                    <th className="py-2 pr-4">Месяц / Год</th>
                    <th className="py-2 pr-4">Сумма</th>
                    <th className="py-2 pr-4">Статус</th>
                    <th className="py-2 pr-4">Дата оплаты</th>
                    <th className="py-2">Действия</th>
                  </tr>
                </thead>
                <tbody>
                  {payments.map((p) => (
                    <tr key={p.id} className="border-b border-white/5">
                      <td className="py-3 pr-4 text-slate-300">
                        {monthNames[p.month - 1]} {p.year}
                      </td>
                      <td className="py-3 pr-4 text-slate-300">{p.amount} ₽</td>
                      <td className="py-3 pr-4">
                        <select
                          value={p.status}
                          onChange={(e) => handleUpdatePaymentStatus(p.id, e.target.value)}
                          className="rounded-lg border border-white/20 bg-white/5 px-2 py-1 text-sm text-white"
                        >
                          <option value="Не оплачено">Не оплачено</option>
                          <option value="Оплачено">Оплачено</option>
                        </select>
                      </td>
                      <td className="py-3 pr-4 text-slate-400">
                        {p.paidAt ? new Date(p.paidAt).toLocaleDateString("ru-RU") : "—"}
                      </td>
                      <td className="py-3"></td>
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

      <div className="mt-8">
        <Link href={`/players/${id}`}>
          <Button variant="secondary" className="gap-2">
            <ArrowLeft className="h-4 w-4" />
            К карточке игрока
          </Button>
        </Link>
      </div>
    </div>
  );
}
