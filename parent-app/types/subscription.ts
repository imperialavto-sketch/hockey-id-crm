export type SubscriptionStatus =
  | "inactive"
  | "active"
  | "cancelled"
  | "trial"
  | "past_due";

export type BillingInterval = "monthly" | "yearly";

export type BillingRecordType = "subscription" | "package" | "membership" | "booking";

export type BillingPaymentStatus = "paid" | "pending" | "failed" | "refunded";

export interface FeatureItem {
  id: string;
  label: string;
  included?: boolean;
}

export interface SubscriptionPlan {
  id: string;
  code: "basic" | "pro" | "elite";
  name: string;
  priceMonthly: number;
  priceYearly: number;
  features: FeatureItem[];
  badge?: string;
  popular?: boolean;
}

export interface MembershipPlan {
  id: string;
  code: "development_plus";
  name: string;
  priceMonthly: number;
  description: string;
  features: FeatureItem[];
}

export interface TrainingPackage {
  id: string;
  code: "starter" | "progress" | "elite";
  name: string;
  sessionsCount: number;
  discountPercent: number;
  priceBase: number;
  priceDiscounted: number;
  description: string;
  targetOutcome: string;
  suitableFor: string;
}

export interface BillingRecord {
  id: string;
  date: string;
  productName: string;
  amount: number;
  currency: string;
  status: BillingPaymentStatus;
  type: BillingRecordType;
}

export interface UserSubscription {
  id: string;
  planCode: SubscriptionPlan["code"] | "development_plus";
  status: SubscriptionStatus;
  billingInterval: BillingInterval;
  currentPeriodStart: string;
  currentPeriodEnd: string;
  cancelAtPeriodEnd?: boolean;
}

export interface UserPackage {
  id: string;
  packageCode: TrainingPackage["code"];
  coachId?: string;
  sessionsIncluded: number;
  sessionsUsed: number;
  purchasedAt: string;
  status: "active" | "used" | "expired";
}
