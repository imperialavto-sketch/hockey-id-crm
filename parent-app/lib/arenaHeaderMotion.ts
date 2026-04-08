/**
 * Лёгкий stagger для блоков шапки Арены — без «пересборки» spring-рывков.
 */
import { Easing, FadeIn, FadeInDown } from "react-native-reanimated";

const DURATION_MS = 300;
const STAGGER_MS = 50;
const SHIFT_PX = 7;

/** Плавное easing: быстрый старт, мягкая остановка */
export const ARENA_MOTION_EASING = Easing.bezier(0.25, 0.1, 0.25, 1);

export function arenaHeaderStaggerEnter(step: number) {
  const s = Math.max(0, step);
  return FadeInDown.delay(s * STAGGER_MS)
    .duration(DURATION_MS)
    .easing(ARENA_MOTION_EASING)
    .withInitialValues({ opacity: 0, transform: [{ translateY: SHIFT_PX }] });
}

/** Микро-строка «дня» внутри Today — только fade, без сдвига всего блока */
export function arenaDailyMicroEnter() {
  return FadeIn.duration(220).easing(ARENA_MOTION_EASING);
}
