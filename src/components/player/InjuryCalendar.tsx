"use client";

interface Injury {
  type?: string;
  date?: string;
  recoveryDays?: number;
}

export function InjuryCalendar({
  injuries,
  lastCheckup,
}: {
  injuries: Injury[] | null;
  lastCheckup: string | null;
}) {
  if (!injuries || !Array.isArray(injuries) || injuries.length === 0) {
    return (
      <div className="rounded-lg border border-white/10 bg-white/5 p-4">
        <p className="text-sm text-slate-500">Травм не зафиксировано</p>
      </div>
    );
  }

  const formatDate = (s: string) => (s ? new Date(s).toLocaleDateString("ru-RU") : "—");

  return (
    <div className="space-y-3">
      {injuries.map((i, idx) => (
        <div
          key={idx}
          className="flex items-center gap-4 rounded-lg border border-amber-500/30 bg-amber-500/5 p-4"
        >
          <div className="h-2 w-2 shrink-0 rounded-full bg-amber-500" />
          <div className="flex-1">
            <p className="font-medium text-slate-200">{i.type ?? "Травма"}</p>
            <p className="text-sm text-slate-500">
              {formatDate(i.date ?? "")}
              {i.recoveryDays != null ? ` • Восстановление ${i.recoveryDays} дн.` : ""}
            </p>
          </div>
        </div>
      ))}
      {lastCheckup && (
        <p className="text-xs text-slate-500">
          Последний осмотр: {formatDate(lastCheckup)}
        </p>
      )}
      <div className="rounded-lg border border-white/10 bg-white/5 p-3">
        <p className="text-xs font-medium text-slate-400">Рекомендации по нагрузке</p>
        <p className="mt-1 text-sm text-slate-300">
          {injuries.some((i) => i.recoveryDays != null && i.recoveryDays > 0)
            ? "Снизить интенсивность тренировок на 2 недели. Избегать контактных упражнений до полного восстановления."
            : "Стандартная нагрузка. Регулярный осмотр каждые 3 месяца."}
        </p>
      </div>
    </div>
  );
}
