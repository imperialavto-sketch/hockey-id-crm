import type { SubscriptionPlan, MembershipPlan } from "@/types/subscription";

export const SUBSCRIPTION_PLANS: SubscriptionPlan[] = [
  {
    id: "plan_basic",
    code: "basic",
    name: "Basic",
    priceMonthly: 990,
    priceYearly: 9504,
    features: [
      { id: "f1", label: "Player timeline", included: true },
      { id: "f2", label: "Базовая статистика", included: true },
      { id: "f3", label: "Push-уведомления", included: true },
      { id: "f4", label: "1 AI summary в месяц", included: true },
    ],
  },
  {
    id: "plan_pro",
    code: "pro",
    name: "Pro",
    priceMonthly: 1990,
    priceYearly: 19104,
    features: [
      { id: "f1", label: "Всё из Basic", included: true },
      { id: "f2", label: "Полный AI Coach Report", included: true },
      { id: "f3", label: "Персональные рекомендации тренеров", included: true },
      { id: "f4", label: "Monthly development plan", included: true },
      { id: "f5", label: "История прогресса", included: true },
      { id: "f6", label: "Приоритетная аналитика", included: true },
    ],
    badge: "Самый популярный",
    popular: true,
  },
  {
    id: "plan_elite",
    code: "elite",
    name: "Elite",
    priceMonthly: 3490,
    priceYearly: 33408,
    features: [
      { id: "f1", label: "Всё из Pro", included: true },
      { id: "f2", label: "Расширенная аналитика", included: true },
      { id: "f3", label: "Приоритетный доступ к лучшим тренерам", included: true },
      { id: "f4", label: "Premium support", included: true },
      { id: "f5", label: "Сравнительный анализ прогресса", included: true },
      { id: "f6", label: "Персональные insights", included: true },
    ],
    badge: "Для максимального роста",
  },
];

export const MEMBERSHIP_PLANS: MembershipPlan[] = [
  {
    id: "membership_dev_plus",
    code: "development_plus",
    name: "Development Plus",
    priceMonthly: 7990,
    description: "Полный комплект инструментов для системного развития игрока",
    features: [
      { id: "m1", label: "AI Coach Report каждый месяц", included: true },
      { id: "m2", label: "Персональный development plan", included: true },
      { id: "m3", label: "Подбор тренеров под слабые стороны игрока", included: true },
      { id: "m4", label: "Monthly progress review", included: true },
      { id: "m5", label: "Рекомендации по тренировкам", included: true },
      { id: "m6", label: "Скидки на marketplace", included: true },
      { id: "m7", label: "Доступ к premium аналитике", included: true },
    ],
  },
];
