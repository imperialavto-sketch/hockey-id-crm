import type { TrainingPackage } from "@/types/subscription";

const BASE_PRICE_PER_SESSION = 3500;

export const TRAINING_PACKAGES: TrainingPackage[] = [
  {
    id: "pkg_starter",
    code: "starter",
    name: "Starter Pack",
    sessionsCount: 4,
    discountPercent: 5,
    priceBase: BASE_PRICE_PER_SESSION * 4,
    priceDiscounted: Math.round(BASE_PRICE_PER_SESSION * 4 * 0.95),
    description: "Отличный старт для целевой работы над навыками",
    targetOutcome: "Заметное улучшение одного навыка за 4–6 недель",
    suitableFor: "Подходит для заметного улучшения броска или катания",
  },
  {
    id: "pkg_progress",
    code: "progress",
    name: "Progress Pack",
    sessionsCount: 8,
    discountPercent: 10,
    priceBase: BASE_PRICE_PER_SESSION * 8,
    priceDiscounted: Math.round(BASE_PRICE_PER_SESSION * 8 * 0.9),
    description: "Системная работа над зонами роста",
    targetOutcome: "Прогресс по 2–3 слабым сторонам за 2–3 месяца",
    suitableFor: "Подходит для комплексного развития слабых сторон",
  },
  {
    id: "pkg_elite",
    code: "elite",
    name: "Elite Pack",
    sessionsCount: 12,
    discountPercent: 15,
    priceBase: BASE_PRICE_PER_SESSION * 12,
    priceDiscounted: Math.round(BASE_PRICE_PER_SESSION * 12 * 0.85),
    description: "Максимальный результат за сезон",
    targetOutcome: "Значительный рост по всем зонам роста",
    suitableFor: "Для серьёзной работы над развитием в сезоне",
  },
];
