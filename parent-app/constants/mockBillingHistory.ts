import type { BillingRecord } from "@/types/subscription";

export const MOCK_BILLING_HISTORY: BillingRecord[] = [
  {
    id: "b1",
    date: "2026-03-01",
    productName: "Hockey ID Pro",
    amount: 1990,
    currency: "RUB",
    status: "paid",
    type: "subscription",
  },
  {
    id: "b2",
    date: "2026-02-15",
    productName: "4 Training Pack",
    amount: 13300,
    currency: "RUB",
    status: "paid",
    type: "package",
  },
  {
    id: "b3",
    date: "2026-02-01",
    productName: "Hockey ID Pro",
    amount: 1990,
    currency: "RUB",
    status: "paid",
    type: "subscription",
  },
  {
    id: "b4",
    date: "2026-01-01",
    productName: "Hockey ID Pro",
    amount: 1990,
    currency: "RUB",
    status: "paid",
    type: "subscription",
  },
];
