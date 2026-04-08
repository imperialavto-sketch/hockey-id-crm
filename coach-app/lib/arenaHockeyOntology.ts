/**
 * Нормализованная таксономия хоккейных наблюдений для «Арены» (MVP: словарь + regex).
 * domain.skill + русские синонимы/фразы.
 */

export type HockeyDomainId =
  | "skating"
  | "puck_control"
  | "passing"
  | "shooting"
  | "positioning"
  | "decision_making"
  | "discipline"
  | "focus"
  | "physical"
  | "goalie";

export type HockeyOntologyHit = {
  domain: HockeyDomainId;
  skill: string;
  /** 0..1, относительная уверенность совпадения по словарю */
  weight: number;
};

/** Длинные / специфичные шаблоны первыми */
const ONTOLOGY_RULES: Array<{
  re: RegExp;
  domain: HockeyDomainId;
  skill: string;
  weight: number;
}> = [
  {
    re: /сидит\s+низко|высокая\s+посадк|низкая\s+посадк|посадк\w*\s+высок|сел\s+низко|держит\s+посадк/,
    domain: "skating",
    skill: "posture",
    weight: 0.91,
  },
  {
    re: /плохо\s+держит\s+позици|держит\s+позици|игра\s+в\s+позици|позиционк/,
    domain: "positioning",
    skill: "defensive_position",
    weight: 0.92,
  },
  {
    re: /поздно\s+возвращ|не\s+добегает\s+назад|не\s+догоняет\s+назад|не\s+возвраща(?:ется|ются)|медленн\w*\s+возвращ|бэкчек|back\s*check/,
    domain: "positioning",
    skill: "backcheck",
    weight: 0.9,
  },
  {
    re: /плохо\s+выходит\s+из\s+зон|выходим\s+из\s+зон\s+плох|выход\s+из\s+зоны\s+слаб|слабый\s+выход\s+из/,
    domain: "passing",
    skill: "first_pass",
    weight: 0.87,
  },
  {
    re: /открылся|не\s+открывается|не\s+открывается\s+под|плохо\s+открыва|открыван/,
    domain: "positioning",
    skill: "defensive_position",
    weight: 0.84,
  },
  {
    re: /отдал\s+пас|отдать\s+пас|не\s+отдает\s+пас|пас\s+не\s+тот|передач\w*\s+плох/,
    domain: "passing",
    skill: "first_pass",
    weight: 0.83,
  },
  {
    re: /темп\s+низк|низкий\s+темп|играем\s+медленн|темп\s+вял|вяло\s+идет/,
    domain: "discipline",
    skill: "compete_level",
    weight: 0.8,
  },
  {
    re: /единоборств|доработк|борьб\w*\s+у\s+борт|борьб\w*\s+в\s+угол/,
    domain: "physical",
    skill: "body_control",
    weight: 0.83,
  },
  {
    re: /посадк|стойк(а|у|е|и)|корпус(?!ной)|стоит\s+сгорб/,
    domain: "skating",
    skill: "posture",
    weight: 0.88,
  },
  {
    re: /рёбра|ребра|кромк|edge|кант/,
    domain: "skating",
    skill: "edge_work",
    weight: 0.85,
  },
  {
    re: /разгон|ускорен|первые\s+два\s+шаг|accelerat/,
    domain: "skating",
    skill: "acceleration",
    weight: 0.84,
  },
  {
    re: /баланс|устойчив|стабильн\w*\s+на\s+коньк/,
    domain: "skating",
    skill: "balance",
    weight: 0.82,
  },
  {
    re: /приём\s+шайб|прием\s+шайб|приём\s+пас|плохо\s+принимает|puck\s*reception/,
    domain: "puck_control",
    skill: "puck_reception",
    weight: 0.88,
  },
  {
    re: /владен\w*\s+шайб|катани\w*\s+с\s+шайб|ручк/,
    domain: "puck_control",
    skill: "puck_reception",
    weight: 0.8,
  },
  {
    re: /первый\s+пас|разгоняющ|выход\s+из\s+зон|выходят\s+из\s+зон/,
    domain: "passing",
    skill: "first_pass",
    weight: 0.86,
  },
  {
    re: /хорош\w*\s+пас|точн\w*\s+передач|пас\s+получил|раздач/,
    domain: "passing",
    skill: "first_pass",
    weight: 0.8,
  },
  {
    re: /бросок|броск|релиз|release|щелчок/,
    domain: "shooting",
    skill: "shot_release",
    weight: 0.85,
  },
  {
    re: /чита(ет|ют)\s+игр|видит\s+площад|осознан|хоккейн\w*\s+ iq|принятие\s+реш/,
    domain: "decision_making",
    skill: "awareness",
    weight: 0.82,
  },
  {
    re: /дисциплин|соблюден\w*\s+план|нарушен\w*\s+схем/,
    domain: "discipline",
    skill: "compete_level",
    weight: 0.78,
  },
  {
    re: /внимани|концентрац|отвлека|фокус|слаб\w*\s+вниман|выключается|не\s+в\s+игр|вылетел\s+из\s+игр/,
    domain: "focus",
    skill: "concentration",
    weight: 0.85,
  },
  {
    re: /борьб|силов|силовой|телесн|колот|physical/,
    domain: "physical",
    skill: "body_control",
    weight: 0.8,
  },
  {
    re: /вратар|голкипер|ребро\s+вратар|угол|штанг/,
    domain: "goalie",
    skill: "positioning",
    weight: 0.78,
  },
  {
    re: /борьб\w*\s+за\s+шайб|компет|готов\s+бороться|характер/,
    domain: "discipline",
    skill: "compete_level",
    weight: 0.76,
  },
];

/**
 * Лучшее совпадение по нормализованному тексту (нижний регистр, ё→е).
 */
export function matchHockeyOntology(normalizedText: string): {
  domain: HockeyDomainId | null;
  skill: string | null;
  confidence: number;
} {
  let best: HockeyOntologyHit | null = null;
  for (const r of ONTOLOGY_RULES) {
    if (r.re.test(normalizedText)) {
      if (!best || r.weight > best.weight) {
        best = { domain: r.domain, skill: r.skill, weight: r.weight };
      }
    }
  }
  if (!best) return { domain: null, skill: null, confidence: 0 };
  return { domain: best.domain, skill: best.skill, confidence: best.weight };
}

export function formatArenaCategoryTag(
  target: "player" | "team" | "session",
  domain: string | null,
  skill: string | null
): string {
  const core = domain && skill ? `${domain}.${skill}` : domain ?? skill ?? "";
  if (target === "player") return core || "general";
  if (!core) return `arena:${target}`;
  return `arena:${target}|${core}`;
}
