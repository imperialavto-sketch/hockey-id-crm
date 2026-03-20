import type {
  UserSubscription,
  BillingRecord,
  SubscriptionPlan,
} from "@/types/subscription";
import { apiFetch } from "@/lib/api";
import { logApiError } from "@/lib/apiErrors";
import { isDemoMode } from "@/config/api";
import { MOCK_BILLING_HISTORY } from "@/constants/mockBillingHistory";
import { SUBSCRIPTION_PLANS } from "@/constants/mockPlans";
import { getDemoSubscription } from "@/demo/demoSubscription";

/** Map API subscription to UserSubscription */
function mapSubscription(api: unknown): UserSubscription {
  const s = api as Record<string, unknown>;
  const rawInterval = String(s.billingInterval ?? "monthly");
  const billingInterval =
    rawInterval === "year" || rawInterval === "yearly" ? "yearly" : "monthly";
  return {
    id: String(s.id ?? ""),
    planCode: (s.planCode ?? s.planId ?? "basic") as UserSubscription["planCode"],
    status: (s.status ?? "active") as UserSubscription["status"],
    billingInterval,
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
    date: String(r.billedAt ?? r.date ?? r.createdAt ?? ""),
    productName: String(r.productName ?? r.product ?? "Подписка"),
    amount: Number(r.amount ?? 0),
    currency: String(r.currency ?? "RUB"),
    status: (r.status ?? "paid") as BillingRecord["status"],
    type: (r.type ?? "subscription") as BillingRecord["type"],
  };
}

interface MeProfileResponse {
  id: string | number;
}

function normalizePlanCode(planId: string): UserSubscription["planCode"] {
  if (planId === "development_plus" || planId === "membership") {
    return "development_plus";
  }

  if (planId.startsWith("plan_")) {
    return planId.replace(/^plan_/, "") as UserSubscription["planCode"];
  }

  if (planId.startsWith("membership_")) {
    return "development_plus";
  }

  return planId as UserSubscription["planCode"];
}

function getCurrentPeriodBounds(): { start: string; end: string } {
  const start = new Date();
  const end = new Date(start);
  end.setMonth(end.getMonth() + 1);
  return {
    start: start.toISOString().slice(0, 10),
    end: end.toISOString().slice(0, 10),
  };
}

async function getCurrentParentId(): Promise<string> {
  const me = await apiFetch<MeProfileResponse>("/api/me");
  return String(me.id);
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
 * Get subscription status from backend.
 * Demo mode stays explicit; live mode does not fabricate data on API failure.
 */
export async function getSubscriptionStatus(
  options?: { allowDemo?: boolean }
): Promise<UserSubscription | null> {
  const allowDemo = options?.allowDemo !== false;

  if (isDemoMode && allowDemo) {
    return getDemoSubscription();
  }

  try {
    const data = await apiFetch<unknown>("/api/me/subscription/status");
    if (data && typeof data === "object" && "id" in (data as object)) {
      return mapSubscription(data);
    }
    return null;
  } catch (err) {
    logApiError("subscription", err);
    throw err;
  }
}

/**
 * Get billing history from backend.
 * Demo mode stays explicit; live mode does not fabricate history on API failure.
 */
export async function getBillingHistory(
  options?: { allowDemo?: boolean }
): Promise<BillingRecord[]> {
  const allowDemo = options?.allowDemo !== false;

  if (isDemoMode && allowDemo) {
    return [...MOCK_BILLING_HISTORY];
  }

  try {
    const data = await apiFetch<unknown[]>("/api/me/subscription/history");
    return Array.isArray(data) ? data.map(mapBillingRecord) : [];
  } catch (err) {
    logApiError("subscription", err);
    throw err;
  }
}

/**
 * Get subscription plans from backend.
 * Demo mode stays explicit; live mode does not fabricate plans on API failure.
 */
export async function getSubscriptionPlans(): Promise<SubscriptionPlan[]> {
  if (isDemoMode) {
    return [...SUBSCRIPTION_PLANS];
  }

  try {
    const data = await apiFetch<unknown[]>("/api/subscription/plans");
    return Array.isArray(data) ? data.map(mapPlan) : [];
  } catch (err) {
    logApiError("subscription", err);
    throw err;
  }
}

/**
 * Create subscription for plan.
 * Returns subscription or null on failure.
 * Demo mode stays explicit; live mode does not fabricate success on API failure.
 */
export async function createSubscription(
  planId: string
): Promise<UserSubscription | null> {
  if (isDemoMode) {
    const planCode = normalizePlanCode(planId);
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

  try {
    const parentId = await getCurrentParentId();
    const planCode = normalizePlanCode(planId);
    const { start, end } = getCurrentPeriodBounds();
    const data = await apiFetch<unknown>("/api/subscription", {
      method: "POST",
      body: JSON.stringify({
        parentId,
        planCode,
        status: "active",
        billingInterval: "monthly",
        currentPeriodStart: start,
        currentPeriodEnd: end,
        cancelAtPeriodEnd: false,
      }),
    });
    if (data && typeof data === "object" && "id" in (data as object)) {
      return mapSubscription(data);
    }
    return null;
  } catch (err) {
    logApiError("subscription", err);
    throw err;
  }
}

/**
 * Cancel subscription.
 * Returns updated subscription or null on failure.
 * Live mode does not fabricate cancelled state on API failure.
 */
export async function cancelSubscription(): Promise<UserSubscription | null> {
  if (isDemoMode) {
    return null;
  }

  try {
    const parentId = await getCurrentParentId();
    const data = await apiFetch<unknown>("/api/subscription/cancel", {
      method: "POST",
      body: JSON.stringify({ parentId }),
    });
    const payload =
      data && typeof data === "object" && "subscription" in (data as object)
        ? (data as { subscription?: unknown }).subscription
        : data;
    if (payload && typeof payload === "object" && "id" in (payload as object)) {
      return mapSubscription(payload);
    }
    if (data && typeof data === "object" && "id" in (data as object)) {
      return mapSubscription(data);
    }
    return null;
  } catch (err) {
    logApiError("subscription", err);
    throw err;
  }
}
