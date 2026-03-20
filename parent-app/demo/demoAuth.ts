import type { ParentUser } from "@/types/auth";
import { PLAYER_MARK_GOLYSH } from "@/constants/mockPlayerMarkGolysh";

/**
 * Demo auth models for parent app.
 * Single demo parent tied to demo player Голыш Марк.
 */

export const DEMO_PARENT_ID = "parent_demo_1";
export const DEMO_PARENT_EMAIL = "parent.demo@hockey.id";

export const demoParentUser: ParentUser = {
  id: DEMO_PARENT_ID,
  name: "Юрий Голыш",
  role: "Родитель",
  email: DEMO_PARENT_EMAIL,
};

/** Optional demo token used only to keep API signatures consistent. */
export const DEMO_AUTH_TOKEN = "demo-token-parent-" + PLAYER_MARK_GOLYSH.id;

