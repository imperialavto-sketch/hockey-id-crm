export type CardVariant = "base" | "elite" | "tournament" | "future_star";

export interface PlayerAttributes {
  skating: number;
  shot: number;
  passing: number;
  hockeyIQ: number;
  discipline: number;
  physical: number;
}

export interface PlayerCardData {
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

import { PLAYER_MARK_GOLYSH } from "./mockPlayerMarkGolysh";
import { DEMO_PLAYER } from "./demoPlayer";

export const PLAYER_CARD: PlayerCardData = {
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
  aiSummary: PLAYER_MARK_GOLYSH.aiCoachReport.recommendation,
};

export const ATTRIBUTE_LABELS: Record<keyof PlayerAttributes, string> = {
  skating: "SKT",
  shot: "SHT",
  passing: "PAS",
  hockeyIQ: "IQ",
  discipline: "DST",
  physical: "PHY",
};

export const CARD_VARIANTS: { id: CardVariant; label: string }[] = [
  { id: "base", label: "Base" },
  { id: "elite", label: "Elite" },
  { id: "tournament", label: "Tournament" },
  { id: "future_star", label: "Future Star" },
];
