"use client";

import Link from "next/link";
import { Users, ChevronRight } from "lucide-react";
import { Button } from "@/components/Button";
import { cn } from "@/lib/utils";
import { crmPlayersCountLabel } from "@/lib/crmPlayersListCopy";
import { CRM_TEAMS_LIST_COPY, crmTeamTrainingsCountLabel } from "@/lib/crmTeamsListCopy";

interface TeamCardProps {
  id: string;
  name: string;
  ageGroup: string;
  school?: string | null;
  coach?: { firstName: string; lastName: string } | null;
  playersCount?: number;
  trainingsCount?: number;
}

export function TeamCard({ id, name, ageGroup, school, coach, playersCount, trainingsCount }: TeamCardProps) {
  const coachLine = coach
    ? `${CRM_TEAMS_LIST_COPY.coachPrefix}: ${coach.firstName} ${coach.lastName}`
    : `${CRM_TEAMS_LIST_COPY.coachPrefix}: ${CRM_TEAMS_LIST_COPY.noCoach}`;

  return (
    <div
      className={cn(
        "group relative flex h-full flex-col overflow-hidden rounded-2xl border border-white/[0.1] bg-white/[0.04] transition-all duration-300",
        "hover:border-neon-blue/35 hover:shadow-[0_0_28px_rgba(0,212,255,0.12)]"
      )}
    >
      <div
        className="pointer-events-none absolute left-0 top-0 h-full w-1 bg-gradient-to-b from-neon-blue/90 via-neon-cyan/50 to-transparent opacity-60 transition-opacity group-hover:opacity-100"
        aria-hidden
      />
      <div className="flex flex-1 flex-col p-5 pl-5 sm:p-6">
        <div className="flex items-start gap-4">
          <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-xl border border-white/[0.1] bg-gradient-to-br from-neon-blue/20 to-neon-cyan/15">
            <Users className="h-7 w-7 text-neon-blue/90" aria-hidden />
          </div>
          <div className="min-w-0 flex-1">
            <h3 className="font-display text-lg font-semibold tracking-tight text-white">{name}</h3>
            <span className="mt-2 inline-flex rounded-full border border-neon-blue/30 bg-neon-blue/15 px-2.5 py-0.5 text-xs font-semibold text-neon-blue">
              {ageGroup}
            </span>
            {school ? <p className="mt-2 text-sm text-slate-400">{school}</p> : null}
            <p className="mt-1.5 text-sm text-slate-500">{coachLine}</p>
            <div className="mt-3 flex flex-wrap gap-x-4 gap-y-1 text-xs text-slate-500">
              {playersCount != null ? <span>{crmPlayersCountLabel(playersCount)}</span> : null}
              {trainingsCount != null ? <span>{crmTeamTrainingsCountLabel(trainingsCount)}</span> : null}
            </div>
          </div>
        </div>
        <Link href={`/teams/${id}`} className="mt-5 block">
          <Button variant="secondary" size="sm" className="w-full gap-2">
            {CRM_TEAMS_LIST_COPY.openTeamCta}
            <ChevronRight className="h-4 w-4 opacity-70" aria-hidden />
          </Button>
        </Link>
      </div>
    </div>
  );
}
