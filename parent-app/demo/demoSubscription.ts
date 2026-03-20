import type { UserSubscription } from "@/types/subscription";
import { SUBSCRIPTION_PLANS } from "@/constants/mockPlans";

/**
 * Demo subscription state for parent app.
 * Uses first mock plan as active subscription.
 */

export function getDemoSubscription(): UserSubscription | null {
  const plan = SUBSCRIPTION_PLANS[0];
  if (!plan) return null;
  const today = new Date();
  const end = new Date(today);
  end.setMonth(end.getMonth() + 1);
  return {
    id: "sub_demo_1",
    planCode: plan.code,
    status: "active",
    billingInterval: "monthly",
    currentPeriodStart: today.toISOString().slice(0, 10),
    currentPeriodEnd: end.toISOString().slice(0, 10),
    cancelAtPeriodEnd: false,
  };
}

