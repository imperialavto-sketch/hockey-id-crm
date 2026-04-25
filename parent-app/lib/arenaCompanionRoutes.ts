/**
 * Deep links for the Arena AI companion (URL segments remain `coach-mark` for stability).
 * Product UI name: «Арена» / «AI-компаньон Арена» — same conversational surface as `/chat/{ARENA_COMPANION_CHAT_ID}`.
 */

export {
  hrefCoachMarkChat as hrefArenaCompanionChat,
  hrefCoachMarkHub as hrefArenaCompanionHub,
  type CoachMarkRouteParams as ArenaCompanionRouteParams,
} from "@/lib/coachMarkRoutes";
