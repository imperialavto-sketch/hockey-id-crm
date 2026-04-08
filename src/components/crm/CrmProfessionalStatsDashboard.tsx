"use client";

import { Loader2, RefreshCw } from "lucide-react";
import { Button } from "@/components/Button";
import { Card } from "@/components/Card";
import type { CrmProfessionalStatsViewModel } from "@/lib/crmProfessionalStatsMapper";

type Props = {
  model: CrmProfessionalStatsViewModel | null;
  loading: boolean;
  /** Фоновое обновление после сохранения — не скрываем карточку и форму. */
  refreshing?: boolean;
  error: boolean;
  /** Показывать подсказку про ручной ввод (если у роли есть право на запись). */
  showManualEntryHint?: boolean;
  onRetry: () => void;
};

export function CrmProfessionalStatsDashboard({
  model,
  loading,
  refreshing = false,
  error,
  showManualEntryHint = true,
  onRetry,
}: Props) {
  if (loading && !model) {
    return (
      <Card className="flex min-h-[160px] flex-col items-center justify-center gap-3 rounded-2xl border-white/[0.08] p-8">
        <Loader2 className="h-8 w-8 animate-spin text-neon-blue" aria-hidden />
        <p className="text-sm text-slate-500">Загружаем Hockey ID…</p>
      </Card>
    );
  }

  if (error && !model) {
    return (
      <Card className="space-y-4 rounded-2xl border-white/[0.08] p-6">
        <p className="text-sm text-red-400">
          Не удалось загрузить сводку Hockey ID. Проверьте доступ к игроку и попробуйте снова.
        </p>
        <Button type="button" variant="secondary" onClick={onRetry} className="gap-2">
          <RefreshCw className="h-4 w-4" aria-hidden />
          Повторить
        </Button>
      </Card>
    );
  }

  if (!model) {
    return (
      <Card className="flex min-h-[120px] flex-col items-center justify-center gap-3 rounded-2xl border-white/[0.08] p-8">
        <Loader2 className="h-6 w-6 animate-spin text-neon-blue" aria-hidden />
        <p className="text-sm text-slate-500">Готовим сводку Hockey ID…</p>
      </Card>
    );
  }

  const emptyHint = showManualEntryHint
    ? "Добавьте запись в блоке «Ручная запись» выше — или дождитесь данных из тренировок и голосовых отчётов."
    : "Когда штаб зафиксирует события и наблюдения, сводка появится здесь автоматически.";

  return (
    <div className="relative space-y-4">
      {refreshing ? (
        <div
          className="flex items-center justify-end gap-2 text-xs text-slate-500"
          aria-live="polite"
        >
          <Loader2 className="h-3.5 w-3.5 animate-spin text-neon-blue" aria-hidden />
          Обновляем данные…
        </div>
      ) : null}

      {error ? (
        <Card className="rounded-xl border border-red-500/25 bg-red-500/5 p-4">
          <p className="text-sm text-red-300">
            Не удалось обновить сводку. Ниже показаны последние загруженные данные.
          </p>
          <Button
            type="button"
            variant="secondary"
            size="sm"
            onClick={onRetry}
            className="mt-3 gap-2"
          >
            <RefreshCw className="h-3.5 w-3.5" aria-hidden />
            Повторить
          </Button>
        </Card>
      ) : null}

      <div>
        <h3 className="font-display text-lg font-semibold text-white">{model.headline}</h3>
        <p className="mt-1 text-sm text-slate-500">{model.supportingLine}</p>
        {model.lastUpdatedLabel ? (
          <p className="mt-2 text-xs text-slate-600">
            Обновлено: {model.lastUpdatedLabel}
          </p>
        ) : null}
      </div>

      {model.empty ? (
        <Card className="rounded-2xl border-white/[0.08] p-6">
          <p className="text-sm leading-relaxed text-slate-400">{emptyHint}</p>
        </Card>
      ) : (
        (Array.isArray(model.sections) ? model.sections : []).map((sec) => (
          <Card key={sec.key ?? "section"} className="rounded-2xl border-white/[0.08] p-0">
            <div className="border-b border-white/[0.06] px-5 py-3">
              <h4 className="text-sm font-semibold text-white">{sec.title ?? "—"}</h4>
            </div>
            <dl className="divide-y divide-white/[0.05] px-5 py-2">
              {(Array.isArray(sec.rows) ? sec.rows : []).map((row, i) => (
                <div
                  key={`${sec.key}-${i}`}
                  className="flex flex-col gap-1 py-3 sm:flex-row sm:items-start sm:justify-between sm:gap-4"
                >
                  <dt className="min-w-0 shrink-0 text-xs font-medium uppercase tracking-wide text-slate-500 sm:max-w-[42%]">
                    {row.label ?? "—"}
                  </dt>
                  <dd className="min-w-0 text-sm text-slate-200 sm:text-right">{row.value ?? "—"}</dd>
                </div>
              ))}
            </dl>
          </Card>
        ))
      )}
    </div>
  );
}
