/**
 * Вход opening scene (главная parent).
 *
 * `HOME_OPENING_MOTION_DEBUG === true` — временно усиленная анимация для проверки
 * на устройстве (entering виден явно). Перед релизом выставить `false`.
 */
import { Easing, FadeIn, FadeInDown } from "react-native-reanimated";
import type { EntryOrExitLayoutType } from "react-native-reanimated";

export const HOME_OPENING_MOTION_DEBUG = true;

export const HOME_OPENING_EASING = Easing.bezier(0.25, 0.1, 0.25, 1);

const D = HOME_OPENING_MOTION_DEBUG;

/** Премиум (D=false) / отладка (D=true) */
const HERO_MS = D ? 450 : 325;
const ARENA_MS = D ? 460 : 345;
const INNER_MS = D ? 380 : 280;
const ARENA_AFTER_HERO_MS = D ? 120 : 68;
const SWITCH_AFTER_HERO_MS = D ? 64 : 38;
const BRIDGE_DELAY_MS = D ? ARENA_AFTER_HERO_MS - 24 : ARENA_AFTER_HERO_MS - 12;
const BRIDGE_MS = D ? 360 : 260;
/** Компактный Arena entry между переключателем детей и мостом */
const ARENA_ENTRY_DELAY_MS = D ? SWITCH_AFTER_HERO_MS + 72 : SWITCH_AFTER_HERO_MS + 44;
const ARENA_ENTRY_MS = D ? 380 : 260;

const SHIFT_HERO = D ? 18 : 6;
const SHIFT_ARENA = D ? 16 : 5;
const SHIFT_SWITCH = D ? 10 : 4;

/** Ступень между слоями героя (мс) */
const INNER_STAGGER_STEP = D ? 85 : 30;

const PHOTO_DELAY_MS = D ? 140 : 48;
const PHOTO_MS = D ? 400 : 275;

function asEntry(a: object): EntryOrExitLayoutType {
  return a as EntryOrExitLayoutType;
}

/** Карточка героя целиком */
export function homeOpeningHeroEnter(): EntryOrExitLayoutType {
  return asEntry(
    FadeInDown.duration(HERO_MS)
      .easing(HOME_OPENING_EASING)
      .withInitialValues({
        opacity: 0,
        transform: [{ translateY: SHIFT_HERO }],
      })
  );
}

/** Переключатель детей */
export function homeOpeningSwitcherEnter(): EntryOrExitLayoutType {
  return asEntry(
    FadeInDown.delay(SWITCH_AFTER_HERO_MS)
      .duration(D ? 420 : HERO_MS - 10)
      .easing(HOME_OPENING_EASING)
      .withInitialValues({
        opacity: 0,
        transform: [{ translateY: SHIFT_SWITCH }],
      })
  );
}

/** Компактная точка входа Арены (summary surface → профиль игрока) */
export function homeOpeningArenaEntryEnter(): EntryOrExitLayoutType {
  return asEntry(
    FadeInDown.delay(ARENA_ENTRY_DELAY_MS)
      .duration(ARENA_ENTRY_MS)
      .easing(HOME_OPENING_EASING)
      .withInitialValues({
        opacity: 0,
        transform: [{ translateY: SHIFT_ARENA }],
      })
  );
}

/** Мост света */
export function homeOpeningBridgeEnter(): EntryOrExitLayoutType {
  return asEntry(
    FadeIn.delay(BRIDGE_DELAY_MS)
      .duration(BRIDGE_MS)
      .easing(HOME_OPENING_EASING)
      .withInitialValues({ opacity: 0 })
  );
}

/** Блок Арены (карточка SectionCard) */
export function homeOpeningArenaEnter(): EntryOrExitLayoutType {
  return asEntry(
    FadeInDown.delay(ARENA_AFTER_HERO_MS)
      .duration(ARENA_MS)
      .easing(HOME_OPENING_EASING)
      .withInitialValues({
        opacity: 0,
        transform: [{ translateY: SHIFT_ARENA }],
      })
  );
}

/** Слои героя: только opacity, ступень по шагам */
export function homeOpeningHeroBandEnter(step: 0 | 1 | 2): EntryOrExitLayoutType {
  const delay = step * INNER_STAGGER_STEP;
  return asEntry(
    FadeIn.delay(delay)
      .duration(INNER_MS)
      .easing(HOME_OPENING_EASING)
      .withInitialValues({ opacity: 0 })
  );
}

/** Фото: только fade */
export function homeOpeningHeroPhotoEnter(): EntryOrExitLayoutType {
  return asEntry(
    FadeIn.delay(PHOTO_DELAY_MS)
      .duration(PHOTO_MS)
      .easing(HOME_OPENING_EASING)
      .withInitialValues({ opacity: 0 })
  );
}
