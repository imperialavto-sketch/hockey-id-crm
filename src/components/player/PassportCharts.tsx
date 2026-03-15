"use client";

import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  RadarChart,
  PolarGrid,
  PolarAngleAxis,
  PolarRadiusAxis,
  Radar,
  LineChart,
  Line,
} from "recharts";

interface TeamHistory {
  season: string;
  stats: { gamesPlayed?: number; goals?: number; assists?: number; penalties?: number } | null;
}

interface Skills {
  speed: number | null;
  shotAccuracy: number | null;
  dribbling: number | null;
  stamina: number | null;
}

const MOCK_SCHOOL_AVG = { speed: 72, shotAccuracy: 65, dribbling: 68, stamina: 70 };
const MOCK_INTERNATIONAL_AVG = { speed: 85, shotAccuracy: 82, dribbling: 80, stamina: 88 };

export function SeasonProgressChart({ teamHistory }: { teamHistory: TeamHistory[] }) {
  const data = teamHistory.map((h) => ({
    season: h.season,
    Игры: h.stats?.gamesPlayed ?? 0,
    Голы: h.stats?.goals ?? 0,
    Передачи: h.stats?.assists ?? 0,
    Штрафы: h.stats?.penalties ?? 0,
  }));

  if (data.length === 0) return null;

  return (
    <div className="h-64">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={data}>
          <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.1)" />
          <XAxis dataKey="season" stroke="#94a3b8" fontSize={12} />
          <YAxis stroke="#94a3b8" fontSize={12} />
          <Tooltip
            contentStyle={{ backgroundColor: "#12121a", border: "1px solid rgba(0,212,255,0.3)" }}
            labelStyle={{ color: "#e2e8f0" }}
          />
          <Legend />
          <Bar dataKey="Игры" fill="#00d4ff" radius={[4, 4, 0, 0]} />
          <Bar dataKey="Голы" fill="#00ff88" radius={[4, 4, 0, 0]} />
          <Bar dataKey="Передачи" fill="#ff00aa" radius={[4, 4, 0, 0]} />
          <Bar dataKey="Штрафы" fill="#bf00ff" radius={[4, 4, 0, 0]} />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}

export function SkillsComparisonChart({ skills }: { skills: Skills | null }) {
  if (!skills) return null;

  const playerData = [
    { skill: "Скорость", player: skills.speed ?? 0, school: MOCK_SCHOOL_AVG.speed, intl: MOCK_INTERNATIONAL_AVG.speed },
    { skill: "Точность", player: skills.shotAccuracy ?? 0, school: MOCK_SCHOOL_AVG.shotAccuracy, intl: MOCK_INTERNATIONAL_AVG.shotAccuracy },
    { skill: "Дриблинг", player: skills.dribbling ?? 0, school: MOCK_SCHOOL_AVG.dribbling, intl: MOCK_INTERNATIONAL_AVG.dribbling },
    { skill: "Выносливость", player: skills.stamina ?? 0, school: MOCK_SCHOOL_AVG.stamina, intl: MOCK_INTERNATIONAL_AVG.stamina },
  ];

  const radarData = playerData.map(({ skill, player }) => ({ subject: skill, A: player, fullMark: 100 }));

  return (
    <div className="h-64">
      <ResponsiveContainer width="100%" height="100%">
        <RadarChart data={radarData}>
          <PolarGrid stroke="rgba(255,255,255,0.1)" />
          <PolarAngleAxis dataKey="subject" tick={{ fill: "#94a3b8", fontSize: 12 }} />
          <PolarRadiusAxis angle={90} domain={[0, 100]} tick={{ fill: "#64748b" }} />
          <Radar name="Игрок" dataKey="A" stroke="#00d4ff" fill="#00d4ff" fillOpacity={0.5} strokeWidth={2} />
          <Legend />
          <Tooltip contentStyle={{ backgroundColor: "#12121a", border: "1px solid rgba(0,212,255,0.3)" }} />
        </RadarChart>
      </ResponsiveContainer>
    </div>
  );
}

/** Line chart прогресса по сезонам (голы, передачи, очки из PlayerStat или teamHistory) */
interface SeasonStat {
  season: string;
  games?: number;
  goals?: number;
  assists?: number;
  points?: number;
  pim?: number;
}

export function SkillsProgressLineChart({
  stats,
  teamHistory,
}: {
  stats?: SeasonStat[];
  teamHistory?: { season: string; stats?: { gamesPlayed?: number; goals?: number; assists?: number } | null }[];
}) {
  const fromStats = (stats ?? []).map((s) => ({
    season: s.season,
    Голы: s.goals ?? 0,
    Передачи: s.assists ?? 0,
    Очки: (s.points ?? 0) || ((s.goals ?? 0) + (s.assists ?? 0)),
  }));
  const fromHistory = (teamHistory ?? []).map((h) => ({
    season: h.season,
    Голы: h.stats?.goals ?? 0,
    Передачи: h.stats?.assists ?? 0,
    Очки: (h.stats?.goals ?? 0) + (h.stats?.assists ?? 0),
  }));
  const raw = fromStats.length > 0 ? fromStats : fromHistory;
  const data = [...raw].sort((a, b) => a.season.localeCompare(b.season));
  if (data.length === 0) return null;

  return (
    <div className="h-64">
      <ResponsiveContainer width="100%" height="100%">
        <LineChart data={data}>
          <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.1)" />
          <XAxis dataKey="season" stroke="#94a3b8" fontSize={12} />
          <YAxis stroke="#94a3b8" fontSize={12} />
          <Tooltip
            contentStyle={{ backgroundColor: "#12121a", border: "1px solid rgba(0,212,255,0.3)" }}
            labelStyle={{ color: "#e2e8f0" }}
          />
          <Legend />
          <Line type="monotone" dataKey="Голы" stroke="#00ff88" strokeWidth={2} dot={{ fill: "#00ff88" }} />
          <Line type="monotone" dataKey="Передачи" stroke="#00d4ff" strokeWidth={2} dot={{ fill: "#00d4ff" }} />
          <Line type="monotone" dataKey="Очки" stroke="#ff00aa" strokeWidth={2} dot={{ fill: "#ff00aa" }} />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}

export function SkillsComparisonTable({ skills }: { skills: Skills | null }) {
  if (!skills) return null;

  const rows = [
    { label: "Скорость", player: skills.speed ?? 0, school: MOCK_SCHOOL_AVG.speed, intl: MOCK_INTERNATIONAL_AVG.speed },
    { label: "Точность броска", player: skills.shotAccuracy ?? 0, school: MOCK_SCHOOL_AVG.shotAccuracy, intl: MOCK_INTERNATIONAL_AVG.shotAccuracy },
    { label: "Дриблинг", player: skills.dribbling ?? 0, school: MOCK_SCHOOL_AVG.dribbling, intl: MOCK_INTERNATIONAL_AVG.dribbling },
    { label: "Выносливость", player: skills.stamina ?? 0, school: MOCK_SCHOOL_AVG.stamina, intl: MOCK_INTERNATIONAL_AVG.stamina },
  ];

  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-white/10 text-left text-slate-500">
            <th className="py-2 pr-4">Навык</th>
            <th className="py-2 pr-4">Игрок</th>
            <th className="py-2 pr-4">Среднее школы</th>
            <th className="py-2">Международный ур.</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((r) => (
            <tr key={r.label} className="border-b border-white/10">
              <td className="py-2 pr-4 text-slate-300">{r.label}</td>
              <td className="py-2 pr-4 font-medium text-neon-blue">{r.player}</td>
              <td className="py-2 pr-4 text-slate-400">{r.school}</td>
              <td className="py-2 text-slate-400">{r.intl}</td>
            </tr>
          ))}
        </tbody>
      </table>
      <p className="mt-2 text-xs text-slate-500">* Сравнение с mock-данными для демонстрации</p>
    </div>
  );
}
