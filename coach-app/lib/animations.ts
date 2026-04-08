/**
 * Coach flagship motion: soft fade + short stagger (aligned with parent-app language).
 */
import { Easing, FadeIn, type EntryOrExitLayoutType } from "react-native-reanimated";

export const FADE_DUR = 200;
export const STAGGER = 28;
export const LIST_ROW_MS = 24;

const EASE_PREMIUM = Easing.bezier(0.25, 0.1, 0.25, 1);

export function screenReveal(delayMs: number): EntryOrExitLayoutType {
  const anim = FadeIn.delay(delayMs)
    .duration(FADE_DUR)
    .easing(EASE_PREMIUM)
    .withInitialValues({
      opacity: 0,
      transform: [{ translateY: 4 }],
    });
  return anim as unknown as EntryOrExitLayoutType;
}

export function entryAfterHero(layer: number): EntryOrExitLayoutType {
  const n = Math.max(0, Math.floor(layer));
  return screenReveal(STAGGER * n);
}

export function listItemReveal(index: number, baseMs: number = STAGGER): EntryOrExitLayoutType {
  return screenReveal(baseMs + index * LIST_ROW_MS);
}
