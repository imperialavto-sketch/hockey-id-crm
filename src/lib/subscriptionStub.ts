import type { SubscriptionPlan } from "@/parent-app/types/subscription";

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
];

export function getPlans(): SubscriptionPlan[] {
  return SUBSCRIPTION_STUB_PLANS;
}

