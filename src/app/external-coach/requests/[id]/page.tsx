"use client";

import { useEffect, useState, useCallback, useMemo } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { useAuth } from "@/contexts/AuthContext";
import { ArrowLeft, ChevronDown, Loader2 } from "lucide-react";

type Detail = {
  id: string;
  playerLabel: string;
  playerAgeLabel: string | null;
  focusSummary: string;
  recommendedFocusAreas: string[];
  status: string;
  proposedDate: string | null;
  proposedLocation: string | null;
  latestReportExists: boolean;
  arenaTask: { title: string; summary: string; checklist: string[] };
  quickCompletionPreset: { suggestedSummary: string; suggestedNextSteps: string[] };
};

export default function ExternalCoachRequestDetailPage() {
  const params = useParams();
  const id = typeof params?.id === "string" ? params.id : "";
  const { logout } = useAuth();
  const [detail, setDetail] = useState<Detail | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [quickSummary, setQuickSummary] = useState("");
  const [selectedNextIdx, setSelectedNextIdx] = useState<Set<number>>(new Set());
  const [quickSaving, setQuickSaving] = useState(false);
  const [quickError, setQuickError] = useState<string | null>(null);
  const [quickOk, setQuickOk] = useState(false);
  const [manualOpen, setManualOpen] = useState(false);
  const [summary, setSummary] = useState("");
  const [focusAreasText, setFocusAreasText] = useState("");
  const [resultNotes, setResultNotes] = useState("");
  const [nextSteps, setNextSteps] = useState("");
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [savedOk, setSavedOk] = useState(false);

  const load = useCallback(async () => {
    if (!id) return;
    setLoadError(null);
    try {
      const res = await fetch(`/api/external-coach/requests/${encodeURIComponent(id)}`, {
        credentials: "include",
        cache: "no-store",
      });
      const data = await res.json().catch(() => null);
      if (!res.ok) {
        setLoadError(typeof data?.error === "string" ? data.error : "Не найдено");
        setDetail(null);
        return;
      }
      setDetail(data as Detail);
      setQuickOk(false);
      setSavedOk(false);
    } catch {
      setLoadError("Ошибка сети");
      setDetail(null);
    }
  }, [id]);

  useEffect(() => {
    void load();
  }, [load]);

  useEffect(() => {
    if (!detail) return;
    const preset = detail.quickCompletionPreset;
    setQuickSummary(preset.suggestedSummary);
    setSelectedNextIdx(new Set(preset.suggestedNextSteps.map((_, i) => i)));
    setSummary(preset.suggestedSummary);
    setFocusAreasText(detail.recommendedFocusAreas.join("\n"));
    setNextSteps(preset.suggestedNextSteps.join("\n"));
  }, [detail?.id]);

  const nextStepsPayload = useMemo(() => {
    if (!detail) return [];
    const steps = detail.quickCompletionPreset.suggestedNextSteps;
    const picked = [...selectedNextIdx]
      .sort((a, b) => a - b)
      .map((i) => steps[i])
      .filter(Boolean);
    return picked.length > 0 ? picked : steps;
  }, [detail, selectedNextIdx]);

  const toggleNext = (i: number) => {
    setSelectedNextIdx((prev) => {
      const n = new Set(prev);
      if (n.has(i)) n.delete(i);
      else n.add(i);
      return n;
    });
  };

  const onQuickComplete = async () => {
    if (!id || !quickSummary.trim() || quickSaving) return;
    setQuickSaving(true);
    setQuickError(null);
    setQuickOk(false);
    try {
      const res = await fetch(
        `/api/external-coach/requests/${encodeURIComponent(id)}/complete-quick`,
        {
          method: "POST",
          credentials: "include",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            summary: quickSummary.trim(),
            nextSteps: nextStepsPayload,
          }),
        }
      );
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setQuickError(typeof data?.error === "string" ? data.error : "Не сохранено");
        return;
      }
      setQuickOk(true);
      await load();
    } catch {
      setQuickError("Ошибка сети");
    } finally {
      setQuickSaving(false);
    }
  };

  const onSubmitManual = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!id || !summary.trim() || saving) return;
    setSaving(true);
    setSaveError(null);
    setSavedOk(false);
    const focusAreas = focusAreasText
      .split("\n")
      .map((s) => s.trim())
      .filter(Boolean);
    try {
      const res = await fetch(
        `/api/external-coach/requests/${encodeURIComponent(id)}/report`,
        {
          method: "POST",
          credentials: "include",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            summary: summary.trim(),
            focusAreas: focusAreas.length ? focusAreas : undefined,
            resultNotes: resultNotes.trim() || undefined,
            nextSteps: nextSteps.trim() || undefined,
          }),
        }
      );
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setSaveError(typeof data?.error === "string" ? data.error : "Не сохранено");
        return;
      }
      setSavedOk(true);
      await load();
    } catch {
      setSaveError("Ошибка сети");
    } finally {
      setSaving(false);
    }
  };

  if (!id) {
    return (
      <div className="px-4 py-10 text-center text-slate-500">
        Некорректная ссылка
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-xl px-4 py-10">
      <div className="mb-6 flex items-center gap-3">
        <Link
          href="/external-coach/requests"
          className="inline-flex items-center gap-1 text-sm text-slate-500 hover:text-slate-300"
        >
          <ArrowLeft className="h-4 w-4" />
          К списку
        </Link>
      </div>

      {loadError ? (
        <p className="rounded-lg border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-200">
          {loadError}
        </p>
      ) : null}

      {!detail && !loadError ? (
        <div className="flex items-center gap-3 py-16 text-slate-500">
          <Loader2 className="h-6 w-6 animate-spin" />
          Загрузка…
        </div>
      ) : null}

      {detail ? (
        <>
          {/* Arena guided task */}
          <div className="mb-5 rounded-xl border border-cyan-500/25 bg-gradient-to-b from-cyan-500/10 to-transparent p-5">
            <p className="text-[10px] font-semibold uppercase tracking-widest text-cyan-400/80">
              Задача Arena
            </p>
            <h1 className="mt-1 font-display text-lg font-semibold text-white">{detail.arenaTask.title}</h1>
            <p className="mt-3 text-sm leading-relaxed text-slate-300">{detail.arenaTask.summary}</p>
            <ul className="mt-4 space-y-2 text-sm text-slate-400">
              {detail.arenaTask.checklist.map((line, i) => (
                <li key={i} className="flex gap-2">
                  <span className="shrink-0 text-cyan-500/80">✓</span>
                  <span>{line}</span>
                </li>
              ))}
            </ul>
            {(detail.proposedDate || detail.proposedLocation) && (
              <div className="mt-4 border-t border-white/10 pt-4 text-xs text-slate-500">
                {detail.proposedDate ? (
                  <p>
                    Слот:{" "}
                    {new Date(detail.proposedDate).toLocaleString("ru-RU", {
                      dateStyle: "medium",
                      timeStyle: "short",
                    })}
                  </p>
                ) : null}
                {detail.proposedLocation ? <p>{detail.proposedLocation}</p> : null}
              </div>
            )}
            <p className="mt-3 text-xs text-slate-600">
              {detail.playerLabel}
              {detail.playerAgeLabel ? ` · ${detail.playerAgeLabel}` : ""} · {detail.status}
            </p>
          </div>

          {/* Quick completion */}
          <div className="mb-6 rounded-xl border border-white/[0.12] bg-white/[0.04] p-5">
            <h2 className="text-sm font-semibold text-white">Быстро зафиксировать результат</h2>
            <p className="mt-1 text-xs text-slate-500">
              Минимум действий: подтвердите итог и следующий фокус — Arena передаст сигнал родителю и школе
              (read-only).
            </p>
            <div className="mt-4">
              <label className="mb-1 block text-xs text-slate-500" htmlFor="quick-summary">
                Краткий итог
              </label>
              <textarea
                id="quick-summary"
                rows={3}
                value={quickSummary}
                onChange={(e) => setQuickSummary(e.target.value)}
                className="w-full rounded-lg border border-white/15 bg-dark-900 px-3 py-2 text-sm text-white placeholder-slate-600 focus:border-cyan-500/50 focus:outline-none"
              />
            </div>
            {detail.quickCompletionPreset.suggestedNextSteps.length > 0 ? (
              <div className="mt-4">
                <p className="mb-2 text-xs text-slate-500">Следующий фокус (можно снять лишнее)</p>
                <div className="flex flex-wrap gap-2">
                  {detail.quickCompletionPreset.suggestedNextSteps.map((label, i) => {
                    const on = selectedNextIdx.has(i);
                    return (
                      <button
                        key={i}
                        type="button"
                        onClick={() => toggleNext(i)}
                        className={`rounded-full border px-3 py-1.5 text-xs font-medium transition-colors ${
                          on
                            ? "border-cyan-500/50 bg-cyan-500/15 text-cyan-100"
                            : "border-white/15 text-slate-500 hover:border-white/25"
                        }`}
                      >
                        {label}
                      </button>
                    );
                  })}
                </div>
              </div>
            ) : null}
            {quickError ? <p className="mt-3 text-sm text-red-300">{quickError}</p> : null}
            {quickOk ? (
              <p className="mt-3 text-sm text-cyan-400/90">Готово. Результат в контуре Arena обновлён.</p>
            ) : null}
            <button
              type="button"
              onClick={() => void onQuickComplete()}
              disabled={quickSaving || !quickSummary.trim()}
              className="mt-4 w-full rounded-lg bg-cyan-600 py-2.5 text-sm font-medium text-white hover:bg-cyan-500 disabled:opacity-50"
            >
              {quickSaving ? "Сохранение…" : "Завершить быстро"}
            </button>
          </div>

          {/* Manual fallback */}
          <div className="rounded-xl border border-dashed border-white/10 bg-white/[0.02]">
            <button
              type="button"
              onClick={() => setManualOpen((v) => !v)}
              className="flex w-full items-center justify-between px-4 py-3 text-left text-sm text-slate-500 hover:bg-white/[0.03]"
            >
              <span>Расширенный ввод</span>
              <ChevronDown
                className={`h-4 w-4 transition-transform ${manualOpen ? "rotate-180" : ""}`}
              />
            </button>
            {manualOpen ? (
              <form
                onSubmit={onSubmitManual}
                className="space-y-4 border-t border-white/10 px-4 pb-5 pt-4"
              >
                <p className="text-xs text-slate-600">
                  Полный ввод: зоны фокуса, заметки и произвольный следующий шаг.
                </p>
                <div>
                  <label className="mb-1 block text-xs text-slate-500" htmlFor="summary">
                    Краткий итог (обязательно)
                  </label>
                  <textarea
                    id="summary"
                    required
                    rows={3}
                    value={summary}
                    onChange={(e) => setSummary(e.target.value)}
                    className="w-full rounded-lg border border-white/15 bg-dark-900 px-3 py-2 text-sm text-white focus:border-cyan-500/50 focus:outline-none"
                  />
                </div>
                <div>
                  <label className="mb-1 block text-xs text-slate-500" htmlFor="focus">
                    Зоны фокуса (по строке)
                  </label>
                  <textarea
                    id="focus"
                    rows={3}
                    value={focusAreasText}
                    onChange={(e) => setFocusAreasText(e.target.value)}
                    className="w-full rounded-lg border border-white/15 bg-dark-900 px-3 py-2 text-sm text-white focus:border-cyan-500/50 focus:outline-none"
                  />
                </div>
                <div>
                  <label className="mb-1 block text-xs text-slate-500" htmlFor="notes">
                    Заметки
                  </label>
                  <textarea
                    id="notes"
                    rows={2}
                    value={resultNotes}
                    onChange={(e) => setResultNotes(e.target.value)}
                    className="w-full rounded-lg border border-white/15 bg-dark-900 px-3 py-2 text-sm text-white focus:border-cyan-500/50 focus:outline-none"
                  />
                </div>
                <div>
                  <label className="mb-1 block text-xs text-slate-500" htmlFor="next">
                    Следующий шаг (текстом)
                  </label>
                  <textarea
                    id="next"
                    rows={2}
                    value={nextSteps}
                    onChange={(e) => setNextSteps(e.target.value)}
                    className="w-full rounded-lg border border-white/15 bg-dark-900 px-3 py-2 text-sm text-white focus:border-cyan-500/50 focus:outline-none"
                  />
                </div>
                {saveError ? <p className="text-sm text-red-300">{saveError}</p> : null}
                {savedOk ? <p className="text-sm text-cyan-400/80">Сохранено.</p> : null}
                <button
                  type="submit"
                  disabled={saving || !summary.trim()}
                  className="w-full rounded-lg border border-white/20 py-2.5 text-sm font-medium text-slate-200 hover:bg-white/5 disabled:opacity-50"
                >
                  {saving ? "Сохранение…" : "Сохранить (расширенно)"}
                </button>
              </form>
            ) : null}
          </div>

          <button
            type="button"
            onClick={() => {
              logout();
              window.location.href = "/";
            }}
            className="mt-8 text-sm text-slate-600 hover:text-slate-400"
          >
            Выйти из аккаунта
          </button>
        </>
      ) : null}
    </div>
  );
}
