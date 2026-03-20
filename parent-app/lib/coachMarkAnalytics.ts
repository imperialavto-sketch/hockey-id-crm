/**
 * Lightweight product signals for Coach Mark.
 * No external SDK. In dev: console.log. Safe data only (counts, flags, action).
 */

export type CoachMarkEventName =
  | "coachmark_hub_open"
  | "coachmark_chat_open"
  | "coachmark_chat_open_from_list"
  | "coachmark_message_send"
  | "coachmark_message_success"
  | "coachmark_message_error"
  | "coachmark_starter_prompt_tap"
  | "coachmark_weekly_plan_tap"
  | "coachmark_memory_save"
  | "coachmark_memory_delete"
  | "coachmark_chat_load_error"
  | "coachmark_hub_load_error";

export type CoachMarkEventData = {
  /** Safe: index, not text */
  promptIndex?: number;
  /** Safe: memory category key */
  memoryKey?: string;
  /** Safe: success/fail */
  success?: boolean;
  /** Safe: source hint */
  source?: string;
};

export function trackCoachMarkEvent(
  name: CoachMarkEventName,
  data?: CoachMarkEventData
): void {
  if (__DEV__) {
    const payload = data ? { ...data } : {};
    console.log(`[CoachMark] ${name}`, Object.keys(payload).length > 0 ? payload : "");
  }
  // Future: send to analytics backend, no-op for now
}
