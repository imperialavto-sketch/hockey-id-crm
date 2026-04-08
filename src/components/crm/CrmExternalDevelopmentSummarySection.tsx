import type { SchoolExternalDevelopmentSummaryView } from "@/lib/arena/build-school-external-development-summary";

type Props = {
  summary: SchoolExternalDevelopmentSummaryView;
};

/**
 * Read-only: внешний контур развития (Arena), вторично относительно школьных данных.
 */
export function CrmExternalDevelopmentSummarySection({ summary }: Props) {
  if (!summary.hasExternalDevelopment) return null;

  return (
    <section
      className="rounded-xl border border-white/[0.08] bg-white/[0.02] p-4 text-sm"
      aria-label="Дополнительная работа вне школы"
    >
      <h3 className="text-xs font-semibold uppercase tracking-wider text-slate-500">
        {summary.title}
      </h3>
      <p className="mt-2 leading-relaxed text-slate-400">{summary.summary}</p>
      <p className="mt-2 text-[11px] font-medium leading-snug text-slate-600">
        {summary.priorityLabel}
      </p>
      {summary.focusLabel ? (
        <div className="mt-3 border-t border-white/[0.06] pt-3">
          <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-500">
            Внешний фокус
          </p>
          <p className="mt-1 text-slate-300">{summary.focusLabel}</p>
        </div>
      ) : null}
      {summary.latestResultSummary ? (
        <div className="mt-3 border-t border-white/[0.06] pt-3">
          <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-500">
            Краткий итог (внешний контур)
          </p>
          <p className="mt-1 text-slate-400">{summary.latestResultSummary}</p>
        </div>
      ) : null}
      {summary.latestNextStep ? (
        <div className="mt-3 border-t border-white/[0.06] pt-3">
          <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-500">
            Следующий шаг
          </p>
          <p className="mt-1 text-slate-400">{summary.latestNextStep}</p>
        </div>
      ) : null}
    </section>
  );
}
