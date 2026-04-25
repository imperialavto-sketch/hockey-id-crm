import Link from "next/link";

export type DashboardArenaOperationalPreviewRow = {
  teamId: string;
  teamName: string;
  lines: string[];
};

type Props = {
  items: DashboardArenaOperationalPreviewRow[];
  canLinkToTeam: boolean;
};

/**
 * Read-only обзор operational focus по командам (dashboard); без мутаций.
 */
export function DashboardArenaOperationalPreview({ items, canLinkToTeam }: Props) {
  if (items.length === 0) return null;

  return (
    <div className="rounded-xl border border-white/[0.08] bg-white/[0.02] px-4 py-3 sm:px-5">
      <p className="text-[11px] font-semibold uppercase tracking-wider text-slate-500">Арена · фокус сессий</p>
      <p className="mt-1 text-xs leading-relaxed text-slate-600">
        Кратко по последним подтверждённым live-тренировкам доступных команд (только просмотр).
      </p>
      <ul className="mt-3 space-y-3">
        {items.map((row) => (
          <li key={row.teamId} className="border-t border-white/[0.06] pt-3 first:border-t-0 first:pt-0">
            <div className="flex flex-wrap items-baseline justify-between gap-2">
              {canLinkToTeam ? (
                <Link
                  href={`/teams/${row.teamId}`}
                  className="text-sm font-medium text-white transition-colors hover:text-neon-blue"
                >
                  {row.teamName}
                </Link>
              ) : (
                <span className="text-sm font-medium text-white">{row.teamName}</span>
              )}
            </div>
            <ul className="mt-1.5 list-disc space-y-1 pl-4 text-xs leading-relaxed text-slate-400">
              {row.lines.map((line, i) => (
                <li key={i}>{line}</li>
              ))}
            </ul>
          </li>
        ))}
      </ul>
    </div>
  );
}
