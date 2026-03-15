export type DynamicCardVariant =
  | "season"
  | "elite"
  | "tournament"
  | "future_star";

export interface PlayerAttributes {
  skating: number;
  shot: number;
  passing: number;
  hockeyIQ: number;
  discipline: number;
  physical: number;
}

export interface DynamicPlayerData {
  id: string;
  name: string;
  number: string;
  position: string;
  team: string;
  age: number;
  city: string;
  image: string;
  ovr: number;
  attributes: PlayerAttributes;
  aiSummary: string;
}

export interface CardHistoryItem {
  id: string;
  label: string;
  ovr: number;
  variant: DynamicCardVariant;
}

export interface UpgradeStatus {
  lastUpdated: string;
  ovrChange: string;
  bestGrowth: string;
  nextTarget: string;
}

import { DEMO_PLAYER } from "./demoPlayer";

export const DYNAMIC_PLAYER: DynamicPlayerData = {
  id: DEMO_PLAYER.id,
  name: DEMO_PLAYER.name,
  number: DEMO_PLAYER.number,
  position: DEMO_PLAYER.position,
  team: DEMO_PLAYER.team,
  age: DEMO_PLAYER.age,
  city: DEMO_PLAYER.city,
  image: DEMO_PLAYER.image,
  ovr: DEMO_PLAYER.ovr,
  attributes: { ...DEMO_PLAYER.attributes },
  aiSummary:
    "Голыш Марк показывает сильный hockey IQ и хорошее развитие катания. Главный фокус: скорость выпуска броска и первый шаг.",
};

export const ATTRIBUTE_LABELS: Record<keyof PlayerAttributes, string> = {
  skating: "SKT",
  shot: "SHT",
  passing: "PAS",
  hockeyIQ: "IQ",
  discipline: "DST",
  physical: "PHY",
};

export const DYNAMIC_CARD_VARIANTS: {
  id: DynamicCardVariant;
  label: string;
}[] = [
  { id: "season", label: "Season" },
  { id: "elite", label: "Elite" },
  { id: "tournament", label: "Tournament" },
  { id: "future_star", label: "Future Star" },
];

export const CARD_HISTORY: CardHistoryItem[] = [
  { id: "1", label: "January Card", ovr: 84, variant: "season" },
  { id: "2", label: "February Card", ovr: 86, variant: "season" },
  { id: "3", label: "Tournament Card", ovr: 88, variant: "tournament" },
  { id: "4", label: "Current Card", ovr: 89, variant: "season" },
];

export const UPGRADE_STATUS: UpgradeStatus = {
  lastUpdated: "After Kazan Winter Cup",
  ovrChange: "+2 this season",
  bestGrowth: "Skating +7",
  nextTarget: "Shot Power 80+",
};
