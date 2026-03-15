"use client";

import Link from "next/link";
import { Users, ChevronRight } from "lucide-react";
import { Button } from "@/components/Button";

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
  return (
    <div className="group overflow-hidden rounded-2xl border border-white/10 bg-white/5 p-6 transition-all duration-300 hover:border-neon-blue/40 hover:shadow-[0_0_30px_rgba(0,212,255,0.15)]">
      <div className="flex items-start gap-4">
        <div className="flex h-16 w-16 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br from-neon-blue/30 to-neon-cyan/30 border border-neon-blue/30">
          <Users className="h-10 w-10 text-neon-blue" />
        </div>
        <div className="min-w-0 flex-1">
          <h3 className="font-display text-lg font-semibold text-white">
            {name}
          </h3>
          <span className="mt-1 inline-block rounded-full bg-neon-blue/20 px-2.5 py-0.5 text-xs font-medium text-neon-blue border border-neon-blue/30">
            {ageGroup}
          </span>
          {school && <p className="mt-2 text-sm text-slate-400">{school}</p>}
          {coach && (
            <p className="mt-1 text-sm text-slate-500">
              Тренер: {coach.firstName} {coach.lastName}
            </p>
          )}
          <div className="mt-2 flex flex-wrap gap-3 text-xs text-slate-500">
            {playersCount != null && <span>{playersCount} игроков</span>}
            {trainingsCount != null && <span>{trainingsCount} тренировок</span>}
          </div>
        </div>
      </div>
      <Link href={`/teams/${id}`} className="mt-4 block">
        <Button variant="secondary" size="sm" className="w-full gap-2">
          <ChevronRight className="h-4 w-4" />
          Открыть команду
        </Button>
      </Link>
    </div>
  );
}
