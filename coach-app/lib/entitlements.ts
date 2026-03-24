/**
 * Local entitlements / feature flags for premium features.
 * No backend, no payments. Stored in AsyncStorage.
 * Easy to extend for Coach Insight, Dev Plan, etc.
 *
 * Testing: tap "Открыть полный отчет" on report → "Активировать Pro" on subscription.
 * Or call setAiReportAccess(true) / enableAllEntitlements() for quick unlock.
 */

import AsyncStorage from "@react-native-async-storage/async-storage";

const STORAGE_KEY = "@hockey_entitlements";

export type EntitlementKey = "aiReport" | "coachInsight" | "devPlan";

export interface EntitlementsState {
  aiReport: boolean;
  coachInsight: boolean;
  devPlan: boolean;
}

const DEFAULT_STATE: EntitlementsState = {
  aiReport: false,
  coachInsight: false,
  devPlan: false,
};

let cached: EntitlementsState | null = null;

async function load(): Promise<EntitlementsState> {
  if (cached) return cached;
  try {
    const json = await AsyncStorage.getItem(STORAGE_KEY);
    if (!json) {
      cached = { ...DEFAULT_STATE };
      return cached;
    }
    const raw = JSON.parse(json) as unknown;
    if (!raw || typeof raw !== "object") {
      cached = { ...DEFAULT_STATE };
      return cached;
    }
    const obj = raw as Record<string, unknown>;
    cached = {
      aiReport: obj.aiReport === true,
      coachInsight: obj.coachInsight === true,
      devPlan: obj.devPlan === true,
    };
    return cached;
  } catch {
    cached = { ...DEFAULT_STATE };
    return cached;
  }
}

async function save(state: EntitlementsState): Promise<void> {
  cached = state;
  try {
    await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  } catch {
    // ignore
  }
}

/** Check if AI Report is unlocked. Default: false. */
export async function hasAiReportAccess(): Promise<boolean> {
  const state = await load();
  return state.aiReport;
}

/** Set AI Report access. Use for activation / testing. */
export async function setAiReportAccess(value: boolean): Promise<void> {
  const state = await load();
  await save({ ...state, aiReport: value });
}

/** For testing: enable all entitlements. */
export async function enableAllEntitlements(): Promise<void> {
  await save({
    aiReport: true,
    coachInsight: true,
    devPlan: true,
  });
}

/** For testing: reset to defaults. */
export async function resetEntitlements(): Promise<void> {
  cached = null;
  await save({ ...DEFAULT_STATE });
}

/** Get full state (for future use). */
export async function getEntitlements(): Promise<EntitlementsState> {
  return load();
}
