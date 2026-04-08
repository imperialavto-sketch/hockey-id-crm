import type { ReactNode } from "react";
import type {
  ArenaGroupSnapshot,
  ArenaPlayerSnapshot,
  ArenaPlayerTrend,
  ArenaTeamSnapshot,
} from "@/lib/arena/crm/arenaCrmTypes";

/** Упрощённая метка для CRM: без новых полей API. */
function playerArenaStateLabel(t: ArenaPlayerTrend): string {
  return t === "down" ? "Внимание" : "Стабильно";
}

function teamAttentionInsight(snapshot: ArenaTeamSnapshot): string {
  const n = snapshot.attentionZones.length;
  if (n === 0) {
    return "В командном срезе нет выделенных зон внимания по последним сессиям.";
  }
  const domainWord =
    n % 10 === 1 && n % 100 !== 11
      ? "домен внимания"
      : n % 10 >= 2 && n % 10 <= 4 && (n % 100 < 10 || n % 100 >= 20)
        ? "домена внимания"
        : "доменов внимания";
  return `По сигналам команды отмечено ${n} ${domainWord} (срез по составу, не число игроков).`;
}

function groupStateLabel(s: ArenaGroupSnapshot): string {
  if (s.attentionPlayers > 0) return "Внимание";
  if (s.unstablePlayers > 0) return "Смешанно";
  return "Стабильно";
}

/** Read-only: агрегат Arena по последним подтверждённым live-сессиям команды. */
export function CrmArenaPlayerSnapshotSection({ snapshot }: { snapshot: ArenaPlayerSnapshot }) {
  const signalsCountsLine =
    snapshot.positiveCount + snapshot.attentionCount > 0
      ? `Позитивные: ${snapshot.positiveCount} · Внимание: ${snapshot.attentionCount}`
      : "—";
  return (
    <section
      className="mt-6 rounded-xl border border-white/[0.08] bg-white/[0.02] p-4 text-sm"
      aria-label="Arena: сводка по живым тренировкам"
    >
      <h3 className="text-xs font-semibold uppercase tracking-wider text-slate-500">Arena · живые тренировки</h3>
      <p className="mt-1 text-[11px] leading-relaxed text-slate-600">
        Сводка по последним подтверждённым сессиям команды (только просмотр).
      </p>
      <dl className="mt-3 grid gap-2 sm:grid-cols-2">
        <div className="flex justify-between gap-2 border-b border-white/[0.06] py-2 sm:block sm:border-0 sm:py-0">
          <dt className="text-slate-500">Состояние</dt>
          <dd className="font-medium text-white">{playerArenaStateLabel(snapshot.trend)}</dd>
        </div>
        <div className="flex justify-between gap-2 border-b border-white/[0.06] py-2 sm:block sm:border-0 sm:py-0">
          <dt className="text-slate-500">Сигналы</dt>
          <dd className="font-mono text-slate-200">{signalsCountsLine}</dd>
        </div>
        <div className="flex justify-between gap-2 border-b border-white/[0.06] py-2 sm:block sm:border-0 sm:py-0">
          <dt className="text-slate-500">Всего наблюдений</dt>
          <dd className="font-mono text-slate-200">{snapshot.recentSignals}</dd>
        </div>
        <div className="flex justify-between gap-2 py-2 sm:block sm:border-0 sm:py-0">
          <dt className="text-slate-500">Повторы в сессии</dt>
          <dd className="font-mono text-slate-200">{snapshot.repeatedConcerns}</dd>
        </div>
      </dl>
    </section>
  );
}

export function CrmArenaTeamSnapshotSection({ snapshot }: { snapshot: ArenaTeamSnapshot }) {
  return (
    <DetailSectionCardLike
      title="Arena · команда"
      hint="Сводка по последним подтверждённым live-сессиям (без действий)."
    >
      <p className="mb-3 text-xs leading-relaxed text-slate-500">{teamAttentionInsight(snapshot)}</p>
      <dl className="space-y-2 text-sm">
        <div className="flex justify-between gap-4 border-b border-white/[0.06] py-2">
          <dt className="text-slate-500">Игроков в составе</dt>
          <dd className="text-white">{snapshot.totalPlayers}</dd>
        </div>
        <div className="py-2">
          <dt className="text-slate-500">Зоны внимания</dt>
          <dd className="mt-1 text-white">
            {snapshot.attentionZones.length > 0 ? snapshot.attentionZones.join(" · ") : "—"}
          </dd>
        </div>
        <div className="py-2">
          <dt className="text-slate-500">Сильные зоны</dt>
          <dd className="mt-1 text-white">
            {snapshot.dominantStrengths.length > 0 ? snapshot.dominantStrengths.join(" · ") : "—"}
          </dd>
        </div>
      </dl>
    </DetailSectionCardLike>
  );
}

export function CrmArenaGroupSnapshotInline({ snapshot }: { snapshot: ArenaGroupSnapshot }) {
  return (
    <div className="mt-2 rounded-lg border border-white/[0.06] bg-white/[0.02] px-3 py-2 text-xs text-slate-400">
      <div className="font-semibold text-slate-500">
        Состояние группы: <span className="text-slate-300">{groupStateLabel(snapshot)}</span>
      </div>
      <div className="mt-1">
        игроков {snapshot.players} · внимание {snapshot.attentionPlayers} · сильные сигналы{" "}
        {snapshot.strongPlayers} · нестабильный микс {snapshot.unstablePlayers}
      </div>
    </div>
  );
}

function DetailSectionCardLike({
  title,
  hint,
  children,
}: {
  title: string;
  hint?: string;
  children: ReactNode;
}) {
  return (
    <div className="overflow-hidden rounded-2xl border border-white/[0.1] bg-white/[0.02]">
      <div className="border-b border-white/[0.08] px-5 py-4 sm:px-6">
        <h2 className="font-display text-base font-semibold tracking-tight text-white">{title}</h2>
        {hint ? <p className="mt-1 text-xs leading-relaxed text-slate-600">{hint}</p> : null}
      </div>
      <div className="p-5 sm:p-6">{children}</div>
    </div>
  );
}
