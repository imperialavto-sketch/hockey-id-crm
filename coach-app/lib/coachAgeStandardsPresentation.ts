/**
 * Russian presentation layer for age-based development standards.
 * Domain keys and framework logic live in repo-root `src/lib/player-development`.
 */

import {
  getAgeGroupByBirthYear,
  getAgeDevelopmentStandard,
  type AgeGroup,
  type DevelopmentDomain,
} from "../../src/lib/player-development/ageDevelopmentFramework";

export type { DevelopmentDomain };

export const DEVELOPMENT_DOMAINS_ORDER: DevelopmentDomain[] = [
  "skating",
  "puck_control",
  "decision_making",
  "discipline",
  "attention",
  "physical",
];

export const DOMAIN_TITLE_RU: Record<DevelopmentDomain, string> = {
  skating: "Катание",
  puck_control: "Владение шайбой",
  decision_making: "Принятие решений",
  discipline: "Дисциплина",
  attention: "Внимание",
  physical: "Физическая подготовка",
};

/** Russian copy keyed by age group × domain (reference norms only; no scoring). */
const RU_ROWS: Record<
  AgeGroup,
  Record<DevelopmentDomain, { description: string; focusHint?: string }>
> = {
  U8: {
    skating: {
      description:
        "Базовый шаг, вставание после падения и остановка с опорой; в приоритете игра и чувство равновесия.",
      focusHint: "Короткие отрезки, много повторений, поощрять усилие, а не идеальную форму.",
    },
    puck_control: {
      description:
        "Клюшка на шайбе на месте и в движении; простое ведение в свободном пространстве.",
      focusHint: "Малые зоны и игровые форматы (догонялки, эстафеты со шайбой).",
    },
    decision_making: {
      description:
        "Простые выборы: пас или катание; подсказки тренера и понятные визуальные ориентиры. В live training сигналы для этого домена сопоставляются с метрикой pace (темп / чтение игры).",
      focusHint: "Ограничивать варианты — один сигнал на повторение.",
    },
    discipline: {
      description:
        "Соблюдение простых правил и остановок; умение слушать в группе.",
      focusHint: "Стабильные ритуалы важнее длинных объяснений.",
    },
    attention: {
      description:
        "Короткие окна концентрации; вовлечение через игру и движение.",
      focusHint: "Менять упражнения до усталости, а не после.",
    },
    physical: {
      description:
        "Общая координация: бег, прыжки, безопасное падение; без «взрослой» нагрузки.",
      focusHint: "Собственный вес, игры и разнообразие — не объём.",
    },
  },
  U11: {
    skating: {
      description:
        "Чище работают канты, появляются кросс-оверы, ускорение на коротких отрезках.",
      focusHint: "Качество поворотов и стартов важнее постоянных гонок на всё поле.",
    },
    puck_control: {
      description:
        "Защита шайбы в открытом льду, простые финты против конусов или лёгкого давления.",
      focusHint: "Руки и ноги синхронно под небольшим стрессом.",
    },
    decision_making: {
      description:
        "Чтение в форматах 2в1 и малых игр; начинать смотреть до приёма шайбы. В live training сигналы для этого домена сопоставляются с метрикой pace (темп / чтение игры).",
      focusHint: "Короткие паузы: «что ты увидел?»",
    },
    discipline: {
      description:
        "Уважение к судьям и партнёрам; принятие ролей в упражнениях и играх.",
      focusHint: "Спокойные коррекции и единый стандарт для всех.",
    },
    attention: {
      description:
        "Держит тему станции; по-прежнему нужны явные контрольные точки.",
      focusHint: "Цель упражнения видна на доске или маркере.",
    },
    physical: {
      description:
        "Ловкость, координация и безопасная подготовка к контакту; возрастные привычки силы.",
      focusHint: "Техника и восстановление — не максимальные веса.",
    },
  },
  U14: {
    skating: {
      description:
        "Мощь в первых шагах, развороты в темпе, смена скорости вместе с игрой.",
      focusHint: "Борьба в упражнениях, где важны ноги и поддержка шайбы.",
    },
    puck_control: {
      description:
        "Приём и ведение под умеренным давлением; выходы и входы в зону с поднятой головой.",
      focusHint: "Привычка смотреть до касания — обязательна в малых играх.",
    },
    decision_making: {
      description:
        "Поддержка треугольником, быстрые отдачи, простые выходы из зоны с вариантами. В live training сигналы для этого домена сопоставляются с метрикой pace (темп / чтение игры).",
      focusHint: "Замечать второе касание, а не только гол.",
    },
    discipline: {
      description:
        "Ответственность за систему; конструктивная реакция на обратную связь и игровое время.",
      focusHint: "Связывать поведение с результатом команды, а не с унижением.",
    },
    attention: {
      description:
        "Устойчивый фокус на сменах; начинают «заходить» разборы и схемы на доске.",
      focusHint: "Одна тактическая тема на неделю тренировок.",
    },
    physical: {
      description:
        "Структурированная работа вне льда: мобильность, кор, базовая скорость; сон и питание.",
      focusHint: "Постепенное увеличение нагрузки под контролем.",
    },
  },
  U17: {
    skating: {
      description:
        "Взрывные переходы, отрыв в плотных зонах, выносливость для спецбригад.",
      focusHint: "Темп тренировки близок к игровому ритму лиги.",
    },
    puck_control: {
      description:
        "Защита шайбы и обман активных клюшек; темп с пониманием цели.",
      focusHint: "Повторения в борьбе, где ошибка — нормальная часть процесса.",
    },
    decision_making: {
      description:
        "Структурированное творчество: триггеры форчека, владение в зоне, выходы под прессинг. В live training сигналы для этого домена сопоставляются с метрикой pace (темп / чтение игры).",
      focusHint: "Решения игроков в рамках системы.",
    },
    discipline: {
      description:
        "Лидерские привычки: пунктуальность, подготовка, профессионализм на льду и вне его.",
      focusHint: "Нормы задаёт и группа капитанов — вовлекать сверстников.",
    },
    attention: {
      description:
        "Самоанализ по видео и слову тренера; гибкая работа над деталями без оборонительной реакции.",
      focusHint: "Один вопрос для самопроверки каждую неделю.",
    },
    physical: {
      description:
        "Подход атлета: сила, мощь, профилактика травм и дисциплина восстановления.",
      focusHint: "Индивидуальные планы при общих командных минимумах.",
    },
  },
};

export type CoachAgeStandardRow = {
  domain: DevelopmentDomain;
  titleRu: string;
  descriptionRu: string;
  focusHintRu?: string;
};

export type CoachAgeStandardsViewModel = {
  ageGroup: AgeGroup;
  rows: CoachAgeStandardRow[];
};

/** Treat missing or implausible years as «no framework row» (hide UI). */
export function isUsableCoachBirthYear(
  birthYear: unknown,
  referenceYear: number = new Date().getFullYear()
): birthYear is number {
  if (typeof birthYear !== "number" || !Number.isFinite(birthYear)) return false;
  if (!Number.isInteger(birthYear)) return false;
  if (birthYear < 1990 || birthYear > referenceYear) return false;
  return true;
}

export function buildCoachAgeStandardsViewModel(
  birthYear: unknown,
  referenceYear: number = new Date().getFullYear()
): CoachAgeStandardsViewModel | null {
  if (!isUsableCoachBirthYear(birthYear, referenceYear)) return null;
  const ageGroup = getAgeGroupByBirthYear(birthYear, referenceYear);
  const rows: CoachAgeStandardRow[] = [];
  for (const domain of DEVELOPMENT_DOMAINS_ORDER) {
    const std = getAgeDevelopmentStandard(ageGroup, domain);
    const ru = RU_ROWS[ageGroup][domain];
    if (!std || !ru) return null;
    rows.push({
      domain,
      titleRu: DOMAIN_TITLE_RU[domain],
      descriptionRu: ru.description,
      focusHintRu: ru.focusHint,
    });
  }
  if (rows.length !== DEVELOPMENT_DOMAINS_ORDER.length) return null;
  return { ageGroup, rows };
}
