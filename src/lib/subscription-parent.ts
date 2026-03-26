/**
 * Shared parent subscription logic — used by /api/subscription/* and /api/me/subscription/*.
 */

import { prisma } from "./prisma";

export interface ParentSubscriptionStatus {
  id: string;
  planCode: string;
  status: string;
  billingInterval: string;
  currentPeriodStart: string;
  currentPeriodEnd: string;
  cancelAtPeriodEnd: boolean;
}

export interface ParentBillingRecord {
  id: string;
  date: string;
  productName: string;
  amount: number;
  currency: string;
  status: string;
  type: string;
}

/**
 * Get subscription status for parent. Returns null if no subscription.
 * In dev, returns null when Subscription table is missing (migration not applied).
 */
export async function getParentSubscriptionStatus(
  parentId: string
): Promise<ParentSubscriptionStatus | null> {
  try {
    const sub = await prisma.subscription.findFirst({
      where: { parentId },
    });

    if (!sub) return null;

    return {
      id: sub.id,
      planCode: sub.planCode,
      status: sub.status,
      billingInterval: sub.billingInterval,
      currentPeriodStart: sub.currentPeriodStart.toISOString().slice(0, 10),
      currentPeriodEnd: sub.currentPeriodEnd.toISOString().slice(0, 10),
      cancelAtPeriodEnd: sub.cancelAtPeriodEnd,
    };
  } catch (err) {
    console.warn("getParentSubscriptionStatus failed (table may be missing):", err instanceof Error ? err.message : err);
    return null;
  }
}

/**
 * Get billing history for parent.
 * In dev, returns [] when SubscriptionBillingRecord table is missing (migration not applied).
 */
export async function getParentSubscriptionHistory(
  parentId: string
): Promise<ParentBillingRecord[]> {
  try {
    const records = await prisma.subscriptionBillingRecord.findMany({
      where: { parentId },
      orderBy: { date: "desc" },
    });

    return records.map((r) => ({
      id: r.id,
      date: r.date.toISOString(),
      productName: r.productName,
      amount: r.amount,
      currency: r.currency,
      status: r.status,
      type: r.type,
    }));
  } catch (err) {
    console.warn("getParentSubscriptionHistory failed (table may be missing):", err instanceof Error ? err.message : err);
    return [];
  }
}
