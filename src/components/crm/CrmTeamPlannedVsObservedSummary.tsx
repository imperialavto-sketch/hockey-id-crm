"use client";

import type {
  TeamPlannedVsObservedHistoryRowDto,
  TeamPlannedVsObservedSummaryDto,
} from "@/lib/live-training/arena-planned-vs-observed-live-fact.dto";
import type { TeamPlannedVsObservedContinuityDto } from "@/lib/live-training/arena-planned-vs-observed-continuity";
import { CRM_TEAM_DETAIL_COPY, formatTeamPlannedVsObservedContinuityRu } from "@/lib/crmTeamDetailCopy";

const TEXT_CLIP = 220;

function clip(s: string, max: number): string {
  const t = s.replace(/\s+/gu, " ").trim();
  if (!t) return "";
  return t.length <= max ? t : `${t.slice(0, max - 1)}…`;
}

function normForDedupe(s: string | null | undefined): string {
  return (s ?? "").replace(/\s+/gu, " ").trim().toLowerCase();
}

function formatTopDomains(json: unknown): string | null {
  if (json == null || typeof json !== "object" || Array.isArray(json)) return null;
  const o = json as Record<string, unknown>;
  const entries = Object.entries(o)
    .map(([k, v]) => {
      const n = typeof v === "number" ? v : typeof v === "string" ? Number(v) : NaN;
      return { k: k.trim(), n };
    })
    .filter((x) => x.k && Number.isFinite(x.n) && x.n > 0)
    .sort((a, b) => b.n - a.n)
    .slice(0, 4);
  if (entries.length === 0) return null;
  return entries.map((e) => `${e.k} (${e.n})`).join(" · ");
}

type Props = {
  summary: TeamPlannedVsObservedSummaryDto;
  continuity?: TeamPlannedVsObservedContinuityDto | null;
  history?: TeamPlannedVsObservedHistoryRowDto[];
};

function formatSessionStamp(iso: string | null, fallbackIso: string): string {
  const primary = iso ? new Date(iso) : new Date(fallbackIso);
  if (Number.isNaN(primary.getTime())) return fallbackIso;
  return primary.toLocaleString("ru-RU", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

export function CrmTeamPlannedVsObservedSummary({ summary, continuity, history }: Props) {
  const planned = summary.plannedFocusText?.trim() || null;
  const observed = summary.observedFocusText?.trim() || null;
  const sameText = planned && observed && normForDedupe(planned) === normForDedupe(observed);
  const domainsLine = formatTopDomains(summary.observedDomainsJson);
  const showDomains =
    Boolean(domainsLine) &&
    summary.comparisonStatus !== "insufficient_data" &&
    (summary.positiveSignalCount > 0 || summary.negativeSignalCount > 0);

  const factAt = new Date(summary.factCreatedAt);
  const factAtLabel = Number.isNaN(factAt.getTime())
    ? summary.factCreatedAt
    : factAt.toLocaleString("ru-RU", {
        day: "numeric",
        month: "short",
        year: "numeric",
        hour: "2-digit",
        minute: "2-digit",
      });
  const confirmedAt = summary.liveConfirmedAt ? new Date(summary.liveConfirmedAt) : null;
  const confirmedLabel =
    confirmedAt && !Number.isNaN(confirmedAt.getTime())
      ? confirmedAt.toLocaleString("ru-RU", {
          day: "numeric",
          month: "short",
          year: "numeric",
          hour: "2-digit",
          minute: "2-digit",
        })
      : null;

  const continuityRu = continuity ? formatTeamPlannedVsObservedContinuityRu(continuity) : null;

  return (
    <div className="rounded-xl border border-white/[0.08] bg-white/[0.02] px-4 py-3 sm:px-5">
      <p className="text-[11px] font-semibold uppercase tracking-wider text-slate-500">
        {CRM_TEAM_DETAIL_COPY.plannedVsObservedKicker}
      </p>
      <h3 className="mt-1 font-display text-base font-semibold tracking-tight text-white">
        {CRM_TEAM_DETAIL_COPY.plannedVsObservedTitle}
      </h3>
      <p className="mt-1 text-xs leading-relaxed text-slate-600">{CRM_TEAM_DETAIL_COPY.plannedVsObservedHint}</p>
      <p className="mt-3 text-sm font-medium text-slate-200">{summary.comparisonLabelRu}</p>
      <dl className="mt-3 space-y-2 text-sm">
        {sameText ? (
          <div>
            <dt className="text-slate-500">{CRM_TEAM_DETAIL_COPY.plannedVsObservedUnifiedLabel}</dt>
            <dd className="mt-0.5 leading-snug text-slate-300">{clip(planned!, TEXT_CLIP)}</dd>
          </div>
        ) : (
          <>
            <div>
              <dt className="text-slate-500">{CRM_TEAM_DETAIL_COPY.plannedVsObservedPlannedLabel}</dt>
              <dd className="mt-0.5 leading-snug text-slate-300">
                {planned ? clip(planned, TEXT_CLIP) : CRM_TEAM_DETAIL_COPY.plannedVsObservedNoPlanned}
              </dd>
            </div>
            <div>
              <dt className="text-slate-500">{CRM_TEAM_DETAIL_COPY.plannedVsObservedObservedLabel}</dt>
              <dd className="mt-0.5 leading-snug text-slate-300">
                {observed ? clip(observed, TEXT_CLIP) : CRM_TEAM_DETAIL_COPY.plannedVsObservedNoObserved}
              </dd>
            </div>
          </>
        )}
        <div>
          <dt className="text-slate-500">{CRM_TEAM_DETAIL_COPY.plannedVsObservedSignalsLabel}</dt>
          <dd className="mt-0.5 font-mono text-xs text-slate-300">
            +{summary.positiveSignalCount} / −{summary.negativeSignalCount}
          </dd>
        </div>
        {showDomains && domainsLine ? (
          <div>
            <dt className="text-slate-500">{CRM_TEAM_DETAIL_COPY.plannedVsObservedDomainsLabel}</dt>
            <dd className="mt-0.5 text-xs leading-snug text-slate-400">{domainsLine}</dd>
          </div>
        ) : null}
        <div className="flex flex-wrap gap-x-4 gap-y-1 border-t border-white/[0.06] pt-2 text-[11px] text-slate-500">
          <span>
            {CRM_TEAM_DETAIL_COPY.plannedVsObservedRecordedAt}: {factAtLabel}
          </span>
          {confirmedLabel ? (
            <span>
              {CRM_TEAM_DETAIL_COPY.plannedVsObservedConfirmedAt}: {confirmedLabel}
            </span>
          ) : null}
        </div>
      </dl>

      {continuityRu ? (
        <div className="mt-4 border-t border-white/[0.06] pt-3">
          <p className="text-[11px] font-semibold uppercase tracking-wider text-slate-500">
            {CRM_TEAM_DETAIL_COPY.plannedVsObservedContinuityKicker}
          </p>
          <p className="mt-1.5 text-sm font-medium leading-snug text-slate-200">{continuityRu.headline}</p>
          {continuityRu.support ? (
            <p className="mt-1 text-[11px] leading-relaxed text-slate-500">{continuityRu.support}</p>
          ) : null}
        </div>
      ) : null}

      {history && history.length > 0 ? (
        <div className="mt-4 border-t border-white/[0.06] pt-3">
          <p className="text-[11px] font-semibold uppercase tracking-wider text-slate-500">
            {CRM_TEAM_DETAIL_COPY.plannedVsObservedHistoryKicker}
          </p>
          <ul className="mt-2 space-y-1.5 text-[11px] leading-snug text-slate-400">
            {history.map((row) => {
              const when = formatSessionStamp(row.liveConfirmedAt, row.factCreatedAt);
              const head = `${row.comparisonLabelRu} · +${row.positiveSignalCount}/−${row.negativeSignalCount} · ${when}`;
              let tail: string | null = null;
              if (row.plannedShort && row.observedShort && normForDedupe(row.plannedShort) === normForDedupe(row.observedShort)) {
                tail = clip(row.plannedShort, 80);
              } else if (row.plannedShort || row.observedShort) {
                tail = [
                  row.plannedShort ? `план: ${clip(row.plannedShort, 48)}` : null,
                  row.observedShort ? `набл.: ${clip(row.observedShort, 48)}` : null,
                ]
                  .filter(Boolean)
                  .join(" · ");
              }
              return (
                <li key={row.liveTrainingSessionId} className="border-l border-white/[0.08] pl-2 text-slate-300">
                  {head}
                  {tail ? <span className="text-slate-500"> · {tail}</span> : null}
                </li>
              );
            })}
          </ul>
        </div>
      ) : null}
    </div>
  );
}
