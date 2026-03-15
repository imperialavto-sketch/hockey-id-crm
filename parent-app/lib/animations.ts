/**
 * Shared animation constants and helpers for flagship screens.
 */
import { FadeInUp, type EntryOrExitLayoutType } from "react-native-reanimated";

export const FADE_DUR = 420;
export const STAGGER = 60;

/**
 * Standard screen reveal animation: FadeInUp with spring, configurable delay.
 * Use with Animated.View entering prop.
 */
export function screenReveal(delayMs: number): EntryOrExitLayoutType {
  const anim = FadeInUp.delay(delayMs).duration(FADE_DUR).springify().damping(18);
  return anim as unknown as EntryOrExitLayoutType;
}
