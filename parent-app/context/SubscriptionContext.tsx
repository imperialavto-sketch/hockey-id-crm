"use client";

import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
} from "react";
import AsyncStorage from "@react-native-async-storage/async-storage";
import type {
  UserSubscription,
  UserPackage,
  BillingRecord,
  SubscriptionStatus,
} from "@/types/subscription";
import {
  getSubscriptionStatus,
  getBillingHistory,
  cancelSubscription as cancelSubscriptionApi,
} from "@/services/subscriptionService";
import { MOCK_BILLING_HISTORY } from "@/constants/mockBillingHistory";
import { isDev } from "@/config/api";

const STORAGE_KEY = "@hockey_subscription_state";

/** Test modes: "none" | "pro" | "elite" | "membership" | "package" */
export type MockSubscriptionMode = "none" | "pro" | "elite" | "membership" | "package";

interface SubscriptionContextValue {
  subscription: UserSubscription | null;
  packages: UserPackage[];
  billingHistory: BillingRecord[];
  hasProOrAbove: boolean;
  hasElite: boolean;
  hasMembership: boolean;
  hasActivePackage: boolean;
  hasAiReportAccess: boolean;
  hasDevelopmentPlanAccess: boolean;
  hasMarketplaceDiscount: boolean;
  mockMode: MockSubscriptionMode;
  setMockMode: (mode: MockSubscriptionMode) => void;
  activateSubscription: (planCode: UserSubscription["planCode"]) => Promise<void>;
  cancelSubscription: () => Promise<void>;
  addPackage: (packageCode: string, coachId?: string) => Promise<void>;
  refreshSubscription: () => Promise<void>;
}

const SubscriptionContext = createContext<SubscriptionContextValue | null>(null);

const createSubscription = (
  planCode: UserSubscription["planCode"],
  status: SubscriptionStatus = "active"
): UserSubscription => {
  const now = new Date();
  const end = new Date(now);
  end.setMonth(end.getMonth() + 1);
  return {
    id: "sub_" + Date.now(),
    planCode,
    status,
    billingInterval: "monthly",
    currentPeriodStart: now.toISOString().slice(0, 10),
    currentPeriodEnd: end.toISOString().slice(0, 10),
    cancelAtPeriodEnd: false,
  };
};

function initialState(mode: MockSubscriptionMode) {
  let subscription: UserSubscription | null = null;
  let packages: UserPackage[] = [];

  if (mode === "pro") {
    subscription = createSubscription("pro");
  } else if (mode === "elite") {
    subscription = createSubscription("elite");
  } else if (mode === "membership") {
    subscription = createSubscription("development_plus");
  } else if (mode === "package") {
    packages = [
      {
        id: "pkg_1",
        packageCode: "starter",
        coachId: "c1",
        sessionsIncluded: 4,
        sessionsUsed: 1,
        purchasedAt: new Date().toISOString().slice(0, 10),
        status: "active",
      },
    ];
  }

  return { subscription, packages };
}

export function SubscriptionProvider({ children }: { children: React.ReactNode }) {
  const [mockMode, setMockModeState] = useState<MockSubscriptionMode>("none");
  const [subscription, setSubscription] = useState<UserSubscription | null>(null);
  const [packages, setPackages] = useState<UserPackage[]>([]);
  const [billingHistory, setBillingHistory] = useState<BillingRecord[]>([]);

  const setMockMode = useCallback(async (mode: MockSubscriptionMode) => {
    const { subscription: sub, packages: pkgs } = initialState(mode);
    setMockModeState(mode);
    setSubscription(sub);
    setPackages(pkgs);
    await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify({ mode, subscription: sub, packages: pkgs }));
  }, []);

  const loadFromStorage = useCallback(async () => {
    try {
      const raw = await AsyncStorage.getItem(STORAGE_KEY);
      if (raw) {
        const { mode, subscription: sub, packages: pkgs } = JSON.parse(raw);
        if (mode) setMockModeState(mode);
        if (sub) setSubscription(sub);
        if (pkgs?.length) setPackages(pkgs);
      }
    } catch {
      // use defaults
    }
  }, []);

  const fetchFromApi = useCallback(async () => {
    const [status, history] = await Promise.all([
      getSubscriptionStatus(),
      getBillingHistory(),
    ]);
    if (status) setSubscription(status);
    else if (!isDev) setSubscription(null);
    setBillingHistory(history);
  }, []);

  const loadState = useCallback(async () => {
    await loadFromStorage();
    await fetchFromApi();
  }, [loadFromStorage, fetchFromApi]);

  useEffect(() => {
    loadState();
  }, [loadState]);

  const activateSubscription = useCallback(
    async (planCode: UserSubscription["planCode"]) => {
      const sub = createSubscription(planCode);
      setSubscription(sub);
      const mode: MockSubscriptionMode =
        planCode === "development_plus"
          ? "membership"
          : planCode === "elite"
            ? "elite"
            : planCode === "basic"
              ? "pro"
              : "pro";
      setMockModeState(mode);
      await AsyncStorage.setItem(
        STORAGE_KEY,
        JSON.stringify({
          mode,
          subscription: sub,
          packages,
        })
      );
    },
    [packages]
  );

  const cancelSubscription = useCallback(async () => {
    const result = await cancelSubscriptionApi();
    if (result) {
      setSubscription(result);
      await AsyncStorage.setItem(
        STORAGE_KEY,
        JSON.stringify({ mode: mockMode, subscription: result, packages })
      );
    } else if (isDev && subscription) {
      const updated = {
        ...subscription,
        cancelAtPeriodEnd: true,
        status: "cancelled" as const,
      };
      setSubscription(updated);
      await AsyncStorage.setItem(
        STORAGE_KEY,
        JSON.stringify({ mode: mockMode, subscription: updated, packages })
      );
    }
  }, [subscription, packages, mockMode]);

  const addPackage = useCallback(
    async (packageCode: string, coachId?: string) => {
      const sessions =
        packageCode === "starter" ? 4 : packageCode === "progress" ? 8 : 12;
      const pkg: UserPackage = {
        id: "pkg_" + Date.now(),
        packageCode: packageCode as UserPackage["packageCode"],
        coachId,
        sessionsIncluded: sessions,
        sessionsUsed: 0,
        purchasedAt: new Date().toISOString().slice(0, 10),
        status: "active",
      };
      const next = [...packages, pkg];
      setPackages(next);
      await AsyncStorage.setItem(
        STORAGE_KEY,
        JSON.stringify({ mode: mockMode, subscription, packages: next })
      );
    },
    [packages, mockMode, subscription]
  );

  const refreshSubscription = useCallback(async () => {
    await fetchFromApi();
  }, [fetchFromApi]);

  const isActiveOrGrace =
    subscription &&
    (subscription.status === "active" ||
      (subscription.status === "cancelled" && subscription.cancelAtPeriodEnd));
  const hasProOrAbove =
    isActiveOrGrace &&
    (subscription.planCode === "pro" ||
      subscription.planCode === "elite" ||
      subscription.planCode === "development_plus");
  const hasElite =
    isActiveOrGrace &&
    (subscription.planCode === "elite" || subscription.planCode === "development_plus");
  const hasMembership =
    isActiveOrGrace && subscription.planCode === "development_plus";
  const hasActivePackage = packages.some((p) => p.status === "active");
  const hasAiReportAccess = hasProOrAbove || hasMembership;
  const hasDevelopmentPlanAccess = hasProOrAbove || hasMembership;
  const hasMarketplaceDiscount = hasProOrAbove || hasMembership;

  const value: SubscriptionContextValue = {
    subscription,
    packages,
    billingHistory,
    hasProOrAbove: Boolean(hasProOrAbove),
    hasElite: Boolean(hasElite),
    hasMembership: Boolean(hasMembership),
    hasActivePackage: Boolean(hasActivePackage),
    hasAiReportAccess: Boolean(hasAiReportAccess),
    hasDevelopmentPlanAccess: Boolean(hasDevelopmentPlanAccess),
    hasMarketplaceDiscount: Boolean(hasMarketplaceDiscount),
    mockMode,
    setMockMode,
    activateSubscription,
    cancelSubscription,
    addPackage,
    refreshSubscription,
  };

  return (
    <SubscriptionContext.Provider value={value}>
      {children}
    </SubscriptionContext.Provider>
  );
}

export function useSubscription() {
  const ctx = useContext(SubscriptionContext);
  if (!ctx) throw new Error("useSubscription must be used within SubscriptionProvider");
  return ctx;
}
