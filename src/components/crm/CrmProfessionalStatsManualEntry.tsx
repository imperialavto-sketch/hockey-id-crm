"use client";

import { useRef, useState } from "react";
import { Button } from "@/components/Button";
import { Card } from "@/components/Card";

const GAME_EVENTS: Array<{ value: string; label: string }> = [
  { value: "GOAL", label: "Гол" },
  { value: "ASSIST", label: "Передача" },
  { value: "SHOT", label: "Бросок" },
  { value: "TAKEAWAY", label: "Отбор" },
  { value: "TURNOVER", label: "Потеря" },
  { value: "GOOD_DECISION", label: "Верное решение" },
  { value: "BAD_DECISION", label: "Ошибка в решении" },
];

const BEHAVIORS: Array<{ value: string; label: string }> = [
  { value: "GOOD_EFFORT", label: "Хорошая вовлечённость" },
  { value: "LOW_ENGAGEMENT", label: "Низкая вовлечённость" },
  { value: "ACTIVE_PLAY", label: "Активная игра" },
  { value: "PASSIVE_PLAY", label: "Пассивная игра" },
  { value: "GOOD_POSITIONING", label: "Хорошее позиционирование" },
  { value: "LOST_POSITION", label: "Потеря позиции" },
];

type Props = {
  playerId: string;
  onAfterWrite: () => void;
  /** Блокировка на время фонового обновления сводки после сохранения. */
  disabled?: boolean;
};

export function CrmProfessionalStatsManualEntry({
  playerId,
  onAfterWrite,
  disabled = false,
}: Props) {
  const [tab, setTab] = useState<"event" | "behavior">("event");
  const [eventType, setEventType] = useState(GAME_EVENTS[0]!.value);
  const [eventNote, setEventNote] = useState("");
  const [eventValue, setEventValue] = useState("");
  const [behaviorType, setBehaviorType] = useState(BEHAVIORS[0]!.value);
  const [behaviorNote, setBehaviorNote] = useState("");
  const [intensity, setIntensity] = useState<"" | "LOW" | "MEDIUM" | "HIGH">("");
  const [sending, setSending] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const submitLockRef = useRef(false);

  const behaviorNoteOk = behaviorNote.trim().length > 0;
  const canSubmit =
    !disabled &&
    !sending &&
    (tab === "event" ? true : behaviorNoteOk);

  const submit = async () => {
    if (disabled || sending || submitLockRef.current) return;
    if (tab === "behavior" && !behaviorNoteOk) return;
    submitLockRef.current = true;
    setMessage(null);
    setSending(true);
    try {
      const body =
        tab === "event"
          ? {
              kind: "gameEvent",
              eventType,
              note: eventNote.trim() || undefined,
              value: eventValue.trim() === "" ? undefined : eventValue.trim(),
            }
          : {
              kind: "behavior",
              behaviorType,
              note: behaviorNote.trim(),
              intensity: intensity || undefined,
            };

      const res = await fetch(`/api/players/${encodeURIComponent(playerId)}/professional-stats`, {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        let errText = "Не удалось сохранить";
        if (res.status === 401 || res.status === 403) {
          errText = "Недостаточно прав для записи";
        } else if (res.status === 404) {
          errText = "Игрок не найден";
        } else if (typeof data?.error === "string" && data.error.trim()) {
          errText = data.error.trim();
        }
        setMessage(errText);
        return;
      }
      setEventNote("");
      setEventValue("");
      setBehaviorNote("");
      setMessage("Запись добавлена в сводку");
      onAfterWrite();
    } catch {
      setMessage("Не удалось отправить данные. Проверьте соединение.");
    } finally {
      submitLockRef.current = false;
      setSending(false);
    }
  };

  return (
    <Card className="space-y-4 rounded-2xl border-white/[0.08] p-5">
      <div>
        <h3 className="font-display text-base font-semibold text-white">Ручная запись</h3>
        <p className="mt-1 text-xs text-slate-500">
          Быстрая фиксация события на площадке или поведения игрока — данные сразу попадут в сводку
          ниже.
        </p>
      </div>

      <div className="flex gap-2">
        <button
          type="button"
          disabled={disabled || sending}
          onClick={() => setTab("event")}
          className={`rounded-lg px-3 py-1.5 text-sm font-medium transition-colors ${
            tab === "event"
              ? "bg-neon-blue/20 text-neon-blue"
              : "bg-white/5 text-slate-400 hover:text-white"
          } disabled:opacity-50`}
        >
          Событие
        </button>
        <button
          type="button"
          disabled={disabled || sending}
          onClick={() => setTab("behavior")}
          className={`rounded-lg px-3 py-1.5 text-sm font-medium transition-colors ${
            tab === "behavior"
              ? "bg-neon-blue/20 text-neon-blue"
              : "bg-white/5 text-slate-400 hover:text-white"
          } disabled:opacity-50`}
        >
          Поведение
        </button>
      </div>

      {tab === "event" ? (
        <div className="space-y-3">
          <label className="block text-xs font-medium text-slate-400">
            Тип события
            <select
              className="mt-1 w-full rounded-lg border border-white/10 bg-dark-900 px-3 py-2 text-sm text-white"
              value={eventType}
              disabled={disabled || sending}
              onChange={(e) => setEventType(e.target.value)}
            >
              {GAME_EVENTS.map((o) => (
                <option key={o.value} value={o.value}>
                  {o.label}
                </option>
              ))}
            </select>
          </label>
          <label className="block text-xs font-medium text-slate-400">
            Значение (необязательно)
            <input
              className="mt-1 w-full rounded-lg border border-white/10 bg-dark-900 px-3 py-2 text-sm text-white"
              value={eventValue}
              disabled={disabled || sending}
              onChange={(e) => setEventValue(e.target.value)}
              placeholder="Число"
            />
          </label>
          <label className="block text-xs font-medium text-slate-400">
            Заметка
            <input
              className="mt-1 w-full rounded-lg border border-white/10 bg-dark-900 px-3 py-2 text-sm text-white"
              value={eventNote}
              disabled={disabled || sending}
              onChange={(e) => setEventNote(e.target.value)}
              placeholder="Кратко"
            />
          </label>
        </div>
      ) : (
        <div className="space-y-3">
          <label className="block text-xs font-medium text-slate-400">
            Тип
            <select
              className="mt-1 w-full rounded-lg border border-white/10 bg-dark-900 px-3 py-2 text-sm text-white"
              value={behaviorType}
              disabled={disabled || sending}
              onChange={(e) => setBehaviorType(e.target.value)}
            >
              {BEHAVIORS.map((o) => (
                <option key={o.value} value={o.value}>
                  {o.label}
                </option>
              ))}
            </select>
          </label>
          <label className="block text-xs font-medium text-slate-400">
            Интенсивность (необязательно)
            <select
              className="mt-1 w-full rounded-lg border border-white/10 bg-dark-900 px-3 py-2 text-sm text-white"
              value={intensity}
              disabled={disabled || sending}
              onChange={(e) => setIntensity(e.target.value as typeof intensity)}
            >
              <option value="">—</option>
              <option value="LOW">Низкая</option>
              <option value="MEDIUM">Средняя</option>
              <option value="HIGH">Высокая</option>
            </select>
          </label>
          <label className="block text-xs font-medium text-slate-400">
            Наблюдение <span className="text-red-400">*</span>
            <textarea
              className="mt-1 w-full rounded-lg border border-white/10 bg-dark-900 px-3 py-2 text-sm text-white"
              rows={3}
              value={behaviorNote}
              disabled={disabled || sending}
              onChange={(e) => setBehaviorNote(e.target.value)}
              placeholder="Кратко опишите поведение на площадке"
            />
          </label>
        </div>
      )}

      {message ? (
        <p
          className={`text-sm ${
            message.startsWith("Запись добавлена") ? "text-emerald-400" : "text-red-400"
          }`}
          role={message.startsWith("Запись добавлена") ? "status" : "alert"}
        >
          {message}
        </p>
      ) : null}

      <Button type="button" onClick={submit} disabled={!canSubmit}>
        {sending ? "Сохранение…" : disabled ? "Обновление сводки…" : "Сохранить"}
      </Button>
    </Card>
  );
}
