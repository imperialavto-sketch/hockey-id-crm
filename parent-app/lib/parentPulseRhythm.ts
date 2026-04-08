import { Easing } from "react-native-reanimated";

/** Один «удар» пульса — совпадает с {@link DevelopmentPulseGraph}. */
export const PULSE_HEARTBEAT_PEAK_MS = 360;
export const PULSE_HEARTBEAT_DECAY_MS = 1980;

export const PULSE_HEARTBEAT_PERIOD_MS =
  PULSE_HEARTBEAT_PEAK_MS + PULSE_HEARTBEAT_DECAY_MS;

/** Лёгкое отставание света карточек; период сохраняем (decay укорочен на эту величину). */
export const PULSE_CARD_LAG_MS = 125;

export const PULSE_HEARTBEAT_DECAY_AFTER_LAG_MS =
  PULSE_HEARTBEAT_DECAY_MS - PULSE_CARD_LAG_MS;

export const pulseEasingPeak = Easing.out(Easing.cubic);
export const pulseEasingDecay = Easing.inOut(Easing.sin);
