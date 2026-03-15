/**
 * Card Rarity System
 * Silver = blue glow
 * Gold = gold glow
 * Elite = purple glow
 * Legend = orange flame glow
 */

export type CardRarity = "silver" | "gold" | "elite" | "legend";

export interface RarityStyle {
  glow: string;
  glowGradient: readonly [string, string, string];
  border: string;
  particle: string;
  label: string;
}

export const CARD_RARITY_STYLES: Record<CardRarity, RarityStyle> = {
  silver: {
    glow: "rgba(46,167,255,0.45)",
    glowGradient: [
      "rgba(30,64,175,0.5)",
      "rgba(15,23,42,0.6)",
      "transparent",
    ],
    border: "rgba(46,167,255,0.4)",
    particle: "rgba(46,167,255,0.8)",
    label: "SILVER",
  },
  gold: {
    glow: "rgba(251,191,36,0.5)",
    glowGradient: [
      "rgba(245,158,11,0.45)",
      "rgba(15,23,42,0.5)",
      "transparent",
    ],
    border: "rgba(251,191,36,0.5)",
    particle: "rgba(251,191,36,0.9)",
    label: "GOLD",
  },
  elite: {
    glow: "rgba(139,92,246,0.5)",
    glowGradient: [
      "rgba(124,58,237,0.45)",
      "rgba(15,23,42,0.5)",
      "transparent",
    ],
    border: "rgba(167,139,250,0.5)",
    particle: "rgba(167,139,250,0.9)",
    label: "ELITE",
  },
  legend: {
    glow: "rgba(249,115,22,0.55)",
    glowGradient: [
      "rgba(234,88,12,0.5)",
      "rgba(15,23,42,0.5)",
      "transparent",
    ],
    border: "rgba(249,115,22,0.6)",
    particle: "rgba(251,146,60,0.95)",
    label: "LEGEND",
  },
};
