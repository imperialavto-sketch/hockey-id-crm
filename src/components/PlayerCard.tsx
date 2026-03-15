"use client";

import Link from "next/link";
import { UserCircle, Star, ChevronRight } from "lucide-react";
import { Button } from "@/components/Button";

interface Skills {
  speed?: number | null;
  shotAccuracy?: number | null;
  dribbling?: number | null;
  stamina?: number | null;
}

interface PlayerCardProps {
  id: string;
  firstName: string;
  lastName: string;
  birthYear?: number;
  photoUrl?: string | null;
  position?: string;
  grip?: string;
  team?: string | null;
  status?: string;
  internationalRating?: number | null;
  height?: number | null;
  weight?: number | null;
  city?: string | null;
  country?: string | null;
  skills?: Skills | null;
}

const skillColors = [
  "from-neon-blue to-neon-cyan",
  "from-neon-pink to-neon-purple",
  "from-neon-green to-emerald-400",
  "from-neon-cyan to-neon-blue",
];

export function PlayerCard({
  id,
  firstName,
  lastName,
  birthYear,
  photoUrl,
  position,
  grip,
  team,
  status,
  internationalRating,
  height,
  weight,
  city,
  country,
  skills,
}: PlayerCardProps) {
  const skillBars = skills
    ? [
        { label: "Скорость", val: skills.speed ?? 0, color: skillColors[0] },
        { label: "Точность", val: skills.shotAccuracy ?? 0, color: skillColors[1] },
        { label: "Дриблинг", val: skills.dribbling ?? 0, color: skillColors[2] },
        { label: "Выносливость", val: skills.stamina ?? 0, color: skillColors[3] },
      ]
    : [];

  return (
    <div className="group overflow-hidden rounded-2xl border border-white/10 bg-white/5 backdrop-blur transition-all duration-300 hover:border-neon-blue/50 hover:shadow-[0_0_30px_rgba(0,212,255,0.2)]">
      <div className="p-6">
        <div className="flex items-start gap-4">
          <div className="relative h-16 w-16 shrink-0 overflow-hidden rounded-2xl border border-neon-blue/30 bg-gradient-to-br from-neon-blue/20 to-neon-pink/20">
            {photoUrl ? (
              <img src={photoUrl} alt={`${firstName} ${lastName}`} className="h-full w-full object-cover" />
            ) : (
              <div className="flex h-full w-full items-center justify-center">
                <UserCircle className="h-10 w-10 text-neon-blue/80" />
              </div>
            )}
          </div>
          <div className="min-w-0 flex-1">
            <h3 className="font-display text-lg font-semibold text-white">
              {firstName} {lastName}
            </h3>
            <p className="mt-0.5 text-sm text-slate-400">
              {position ?? "—"}
              {grip ? ` • ${grip}` : ""}
              {birthYear ? ` • ${birthYear} г.р.` : ""}
            </p>
            {(height != null || weight != null) && (
              <p className="text-xs text-slate-500">
                {height ?? "—"} см / {weight ?? "—"} кг
              </p>
            )}
            {(city || country) && (
              <p className="text-xs text-slate-500">{[city, country].filter(Boolean).join(", ")}</p>
            )}
            <p className="text-xs text-slate-500">{team ?? "Без команды"}</p>
            <div className="mt-3 flex flex-wrap items-center gap-2">
              {internationalRating != null && (
                <span className="inline-flex items-center gap-1 rounded-full bg-neon-green/20 px-2.5 py-0.5 text-xs font-medium text-neon-green border border-neon-green/30">
                  <Star className="h-3.5 w-3.5" />
                  {internationalRating}
                </span>
              )}
              {status && (
                <span
                  className={`rounded-full px-2.5 py-0.5 text-xs font-medium border ${
                    status === "Активен" ? "bg-neon-green/20 text-neon-green border-neon-green/30" : "bg-white/10 text-slate-400 border-white/10"
                  }`}
                >
                  {status}
                </span>
              )}
            </div>
          </div>
        </div>

        {skillBars.length > 0 && (
          <div className="mt-4 space-y-2">
            {skillBars.map(({ label, val, color }, i) => (
              <div key={label} className="group/bar">
                <div className="mb-0.5 flex justify-between text-xs">
                  <span className="text-slate-500">{label}</span>
                  <span className="font-medium text-slate-300">{val}/100</span>
                </div>
                <div className="h-1.5 overflow-hidden rounded-full bg-dark-500">
                  <div
                    className={`h-full rounded-full bg-gradient-to-r ${color} transition-all duration-500 ease-out shadow-[0_0_10px_rgba(0,212,255,0.5)]`}
                    style={{ width: `${Math.min(100, Math.max(0, val))}%` }}
                  />
                </div>
              </div>
            ))}
          </div>
        )}

        <Link href={`/players/${id}`} className="mt-4 block">
          <Button variant="secondary" size="sm" className="w-full gap-2 group-hover:border-neon-blue/60">
            <ChevronRight className="h-4 w-4" />
            Открыть карточку
          </Button>
        </Link>
      </div>
    </div>
  );
}
