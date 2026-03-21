import { PLAYER_MARK_GOLYSH } from "@/constants/mockPlayerMarkGolysh";
import { DEMO_PLAYER } from "@/constants/demoPlayer";
import type { Player, PlayerStats } from "@/types";

export function isDemoPlayer(player: Player | null): boolean {
  return player != null && (player.id === "1" || player.id === PLAYER_MARK_GOLYSH.id);
}

export function getHeroProps(
  player: Player,
  stats: PlayerStats | null,
  isDemo: boolean
): {
  name: string;
  team: string;
  number: string | number;
  position: string;
  photo: { uri: string } | null;
  stats: { games: string; goals: string; assists: string; points: string };
  age?: number;
  height?: number;
  weight?: number;
  shoots?: string;
  city?: string;
  overall?: number;
  badges?: string[];
} {
  const base = {
    name: player.name ?? "Игрок",
    team: player.team ?? "—",
    number: player.number ?? "—",
    position: player.position ?? "—",
    photo: (() => {
      const url = player.avatarUrl?.trim();
      if (url) return { uri: url };
      if (isDemo) return { uri: DEMO_PLAYER.image };
      return null;
    })(),
    stats: {
      games: stats?.games?.toString() ?? "—",
      goals: stats?.goals?.toString() ?? "—",
      assists: stats?.assists?.toString() ?? "—",
      points: stats?.points?.toString() ?? "—",
    },
  };
  if (isDemo) {
    const p = PLAYER_MARK_GOLYSH.profile;
    return {
      ...base,
      age: player.age ?? DEMO_PLAYER.age,
      height: p.height,
      weight: p.weight,
      shoots: p.shoots,
      city: DEMO_PLAYER.city,
      overall: DEMO_PLAYER.ovr,
      badges: PLAYER_MARK_GOLYSH.achievements?.map((a) => a.title) ?? [],
    };
  }
  return {
    ...base,
    age: player.age,
  };
}

export function getQuickStats(
  stats: PlayerStats | null,
  isDemo: boolean
): { value: string; label: string; accent?: boolean }[] {
  const items: { value: string; label: string; accent?: boolean }[] = [
    { value: String(stats?.games ?? "—"), label: "Игры" },
    { value: String(stats?.goals ?? "—"), label: "Голы" },
    { value: String(stats?.assists ?? "—"), label: "Передачи" },
    { value: String(stats?.points ?? "—"), label: "Очки", accent: true },
  ];
  // Extended stats only for canonical demo (API has no plusMinus/ppg)
  if (isDemo && DEMO_PLAYER.extendedStats) {
    items.push(
      { value: DEMO_PLAYER.extendedStats.plusMinus, label: "+/−" },
      { value: String(DEMO_PLAYER.extendedStats.pointsPerGame), label: "О/И" }
    );
  }
  return items;
}
