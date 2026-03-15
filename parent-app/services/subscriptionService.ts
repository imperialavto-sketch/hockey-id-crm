import type {
  UserSubscription,
  BillingRecord,
  SubscriptionPlan,
} from "@/types/subscription";
import { apiFetch } from "@/lib/api";
import { logApiError } from "@/lib/apiErrors";
import { isDev } from "@/config/api";
import { MOCK_BILLING_HISTORY } from "@/constants/mockBillingHistory";
import { SUBSCRIPTION_PLANS } from "@/constants/mockPlans";

/** Map API subscription to UserSubscription */
function mapSubscription(api: unknown): UserSubscription {
  const s = api as Record<string, unknown>;
  return {
    id: String(s.id ?? ""),
    planCode: (s.planCode ?? s.planId ?? "basic") as UserSubscription["planCode"],
    status: (s.status ?? "active") as UserSubscription["status"],
    billingInterval: (s.billingInterval ?? "monthly") as UserSubscription["billingInterval"],
    currentPeriodStart: String(s.currentPeriodStart ?? new Date().toISOString().slice(0, 10)),
    currentPeriodEnd: String(s.currentPeriodEnd ?? new Date().toISOString().slice(0, 10)),
    cancelAtPeriodEnd: Boolean(s.cancelAtPeriodEnd),
  };
}

/** Map API billing record to BillingRecord */
function mapBillingRecord(api: unknown): BillingRecord {
  const r = api as Record<string, unknown>;
  return {
    id: String(r.id ?? ""),
    date: String(r.date ?? r.createdAt ?? ""),
    productName: String(r.productName ?? r.product ?? ""),
    amount: Number(r.amount ?? 0),
    currency: String(r.currency ?? "RUB"),
    status: (r.status ?? "paid") as BillingRecord["status"],
    type: (r.type ?? "subscription") as BillingRecord["type"],
  };
}

/** Map API plan to SubscriptionPlan */
function mapPlan(api: unknown): SubscriptionPlan {
  const p = api as Record<string, unknown>;
  const features = (p.features ?? []) as Array<{ id?: string; label?: string; included?: boolean }>;
  return {
    id: String(p.id ?? ""),
    code: (p.code ?? p.planCode ?? "basic") as SubscriptionPlan["code"],
    name: String(p.name ?? ""),
    priceMonthly: Number(p.priceMonthly ?? p.price ?? 0),
    priceYearly: Number(p.priceYearly ?? p.price * 12 ?? 0),
    features: features.map((f, i) => ({
      id: String(f?.id ?? `f${i}`),
      label: String(f?.label ?? ""),
      included: f?.included !== false,
    })),
    badge: p.badge as string | undefined,
    popular: Boolean(p.popular),
  };
}

/**
 * Get subscription status.
 * Fallback: null in __DEV__ when API fails (keep previous state).
 */
export async function getSubscriptionStatus(): Promise<UserSubscription | null> {
  try {
    const data = await apiFetch<unknown>("/api/subscription/status");
    if (data && typeof data === "object" && "id" in (data as object)) {
      return mapSubscription(data);
    }
    return null;
  } catch (err) {
    logApiError("subscription", err);
    if (isDev) return null; // caller can use mock/fallback
    return null;
  }
}

/**
 * Get billing history.
 * Fallback: MOCK_BILLING_HISTORY only in __DEV__ when API fails.
 */
export async function getBillingHistory(): Promise<BillingRecord[]> {
  try {
    const data = await apiFetch<unknown[]>("/api/subscription/history");
    return Array.isArray(data) ? data.map(mapBillingRecord) : [];
  } catch (err) {
    logApiError("subscription", err);
    if (isDev) return [...MOCK_BILLING_HISTORY];
    return [];
  }
}

/**
 * Get subscription plans.
 * Fallback: SUBSCRIPTION_PLANS only in __DEV__ when API fails.
 */
export async function getSubscriptionPlans(): Promise<SubscriptionPlan[]> {
  try {
    const data = await apiFetch<unknown[]>("/api/subscription/plans");
    return Array.isArray(data) ? data.map(mapPlan) : [];
  } catch (err) {
    logApiError("subscription", err);
    if (isDev) return [...SUBSCRIPTION_PLANS];
    return [];
  }
}

/**
 * Create subscription for plan.
 * Returns subscription or null on failure.
 * Fallback: mock subscription object only in __DEV__ when API fails.
 */
export async function createSubscription(
  planId: string
): Promise<UserSubscription | null> {
  try {
    const data = await apiFetch<unknown>("/api/subscription", {
      method: "POST",
      body: JSON.stringify({ planId }),
    });
    if (data && typeof data === "object" && "id" in (data as object)) {
      return mapSubscription(data);
    }
    return null;
  } catch (err) {
    logApiError("subscription", err);
    if (isDev) {
      const planCode = (planId.startsWith("membership_")
        ? "development_plus"
        : planId.replace(/^plan_/, "")) as UserSubscription["planCode"];
      const now = new Date();
      const end = new Date(now);
      end.setMonth(end.getMonth() + 1);
      return {
        id: "sub_" + Date.now(),
        planCode,
        status: "active",
        billingInterval: "monthly",
        currentPeriodStart: now.toISOString().slice(0, 10),
        currentPeriodEnd: end.toISOString().slice(0, 10),
        cancelAtPeriodEnd: false,
      };
    }
    return null;
  }
}

/**
 * Cancel subscription.
 * Returns updated subscription or null on failure.
 * Fallback: local cancelled state only in __DEV__ when API fails.
 */
export async function cancelSubscription(): Promise<UserSubscription | null> {
  try {
    const data = await apiFetch<unknown>("/api/subscription/cancel", {
      method: "POST",
    });
    if (data && typeof data === "object" && "id" in (data as object)) {
      return mapSubscription(data);
    }
    return null;
  } catch (err) {
    logApiError("subscription", err);
    if (isDev) return null; // caller keeps current sub, marks cancelAtPeriodEnd locally
    return null;
  }
}
