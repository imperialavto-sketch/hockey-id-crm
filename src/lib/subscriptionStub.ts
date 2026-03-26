/** Server-side stub plan shape. Aligned with parent-app SubscriptionPlan conceptually. */
export interface SubscriptionPlan {
  id: string;
  code: string;
  name: string;
  priceMonthly: number;
  priceYearly: number;
  features: { id: string; label: string; included?: boolean }[];
  badge?: string;
  popular?: boolean;
}

// Server-side stub plans. Keep in sync with parent-app mock plans conceptually, but defined locally.
export const SUBSCRIPTION_STUB_PLANS: SubscriptionPlan[] = [
  {
    id: "plan_basic",
    code: "basic",
    name: "Базовый доступ",
    priceMonthly: 0,
    priceYearly: 0,
    features: [
      { id: "f1", label: "Просмотр профиля игрока", included: true },
      { id: "f2", label: "Базовая статистика", included: true },
    ],
    badge: "Free",
    popular: false,
  },
  {
    id: "plan_pro",
    code: "pro",
    name: "Pro подписка",
    priceMonthly: 590,
    priceYearly: 5900,
    features: [
      { id: "f1", label: "Расширенная статистика", included: true },
      { id: "f2", label: "Видеоаналитика", included: true },
      { id: "f3", label: "Приоритетная поддержка", included: true },
    ],
    badge: "Популярно",
    popular: true,
  },
  {
    id: "plan_elite",
    code: "elite",
    name: "Elite подписка",
    priceMonthly: 1290,
    priceYearly: 12900,
    features: [
      { id: "f1", label: "Все из Pro", included: true },
      { id: "f2", label: "Персональные рекомендации тренера", included: true },
      { id: "f3", label: "Экстра-отчёты и аналитика", included: true },
    ],
    badge: "Лучшее предложение",
    popular: false,
  },
  {
    id: "membership_dev_plus",
    code: "development_plus",
    name: "Development Plus",
    priceMonthly: 7990,
    priceYearly: 95880,
    features: [
      { id: "m1", label: "AI Coach Report каждый месяц", included: true },
      { id: "m2", label: "Персональный development plan", included: true },
    ],
    badge: "Membership",
    popular: false,
  },
];

export function getPlans(): SubscriptionPlan[] {
  return SUBSCRIPTION_STUB_PLANS;
}

