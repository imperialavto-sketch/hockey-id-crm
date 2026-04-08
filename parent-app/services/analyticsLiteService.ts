import AsyncStorage from "@react-native-async-storage/async-storage";

const STORAGE_KEY = "analytics-lite-events-v1";
const MAX_EVENTS = 100;

export type AnalyticsLiteEventName =
  | "coach_mark_entry_impression"
  | "coach_mark_entry_click"
  | "coach_mark_quick_action_click"
  | "arena_home_analytics_open"
  | "arena_home_summary_entry_open";

export type AnalyticsLiteEvent = {
  name: AnalyticsLiteEventName;
  payload: Record<string, unknown>;
  ts: string;
};

export async function trackEvent(
  name: AnalyticsLiteEventName,
  payload: Record<string, unknown>
): Promise<void> {
  const evt: AnalyticsLiteEvent = {
    name,
    payload,
    ts: new Date().toISOString(),
  };
  try {
    const prevRaw = await AsyncStorage.getItem(STORAGE_KEY);
    const prev = prevRaw ? (JSON.parse(prevRaw) as AnalyticsLiteEvent[]) : [];
    const next = [...prev, evt].slice(-MAX_EVENTS);
    await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(next));
  } catch {
    // ignore storage failures
  }
  if (__DEV__) {
    console.log("[analytics-lite]", evt.name, evt.payload, evt.ts);
  }
}

export async function getAnalyticsEvents(): Promise<AnalyticsLiteEvent[]> {
  try {
    const raw = await AsyncStorage.getItem(STORAGE_KEY);
    const items = raw ? (JSON.parse(raw) as AnalyticsLiteEvent[]) : [];
    if (__DEV__) {
      const tail = items.slice(-10);
      console.log("[analytics-lite] last events", tail);
    }
    return items;
  } catch {
    return [];
  }
}

export async function getRecentAnalyticsEvents(
  limit = 20
): Promise<AnalyticsLiteEvent[]> {
  const all = await getAnalyticsEvents();
  const safeLimit = Number.isFinite(limit) ? Math.max(1, Math.floor(limit)) : 20;
  const recent = all.slice(-safeLimit);
  if (__DEV__) {
    console.log("[analytics-lite] recent", recent);
  }
  return recent;
}

export async function clearAnalyticsEvents(): Promise<void> {
  try {
    await AsyncStorage.removeItem(STORAGE_KEY);
  } catch {
    // ignore
  }
  if (__DEV__) {
    console.log("[analytics-lite] cleared");
  }
}

declare global {
  // eslint-disable-next-line no-var
  var __analyticsLite:
    | undefined
    | {
        getRecent: (limit?: number) => Promise<AnalyticsLiteEvent[]>;
        clear: () => Promise<void>;
      };
}

if (__DEV__) {
  globalThis.__analyticsLite = {
    getRecent: getRecentAnalyticsEvents,
    clear: clearAnalyticsEvents,
  };
  console.log(
    "[analytics-lite] helper ready: __analyticsLite.getRecent(20), __analyticsLite.clear()"
  );
}

