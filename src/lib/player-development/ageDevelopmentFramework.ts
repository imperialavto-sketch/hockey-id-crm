/**
 * Age-based development standards — **reference norms only** (MVP).
 *
 * - This module defines static copy and age bands (U8 / U11 / U14 / U17) × six domains.
 * - It does **not** compute scores or persist analytics.
 * - **Binding confirmed Live Training signals → development domains** is implemented in the
 *   coach app: `coach-app/lib/coachPlayerDevelopmentEvidence.ts` (aggregates
 *   `recentEvidenceSlices` from the coach players API into per-domain evidence for the UI).
 *
 * @packageDocumentation
 */

export type AgeGroup = "U8" | "U11" | "U14" | "U17";

export type DevelopmentDomain =
  | "skating"
  | "puck_control"
  | "decision_making"
  | "discipline"
  | "attention"
  | "physical";

/** Tier label for the standard row; MVP uses "expected" as the age-appropriate norm for every cell. */
export type DevelopmentLevel = "below" | "expected" | "above";

export type AgeDevelopmentStandard = {
  ageGroup: AgeGroup;
  domain: DevelopmentDomain;
  expectedLevel: DevelopmentLevel;
  description: string;
  focusHint?: string;
};

/**
 * Reference ages (years): U8 ≈ 6–8, U11 ≈ 9–11, U14 ≈ 12–14, U17 ≈ 15–17.
 * Outside range: clamp to nearest group (younger → U8, older → U17).
 */
export function getAgeGroupByBirthYear(
  birthYear: number,
  referenceYear: number = new Date().getFullYear()
): AgeGroup {
  const age = referenceYear - birthYear;
  if (!Number.isFinite(age)) return "U8";
  if (age < 6) return "U8";
  if (age <= 8) return "U8";
  if (age <= 11) return "U11";
  if (age <= 14) return "U14";
  if (age <= 17) return "U17";
  return "U17";
}

export function getAgeDevelopmentStandard(
  ageGroup: AgeGroup,
  domain: DevelopmentDomain
): AgeDevelopmentStandard | null {
  const row = AGE_DEVELOPMENT_FRAMEWORK.find(
    (s) => s.ageGroup === ageGroup && s.domain === domain
  );
  return row ?? null;
}

export function getAllStandardsForAgeGroup(
  ageGroup: AgeGroup
): AgeDevelopmentStandard[] {
  return AGE_DEVELOPMENT_FRAMEWORK.filter((s) => s.ageGroup === ageGroup);
}

const E = "expected" as const;

/**
 * Full matrix: 4 age groups × 6 domains = **24** rows. Kept in sync with
 * `DevelopmentDomain` and `AgeGroup` unions (see `getAllStandardsForAgeGroup`).
 */
export const AGE_DEVELOPMENT_FRAMEWORK: AgeDevelopmentStandard[] = [
  // —— U8 (6–8) ——
  {
    ageGroup: "U8",
    domain: "skating",
    expectedLevel: E,
    description: "Basic stride, getting up from ice, and stopping with support; fun and balance first.",
    focusHint: "Short bouts, lots of repetitions, praise effort over perfect form.",
  },
  {
    ageGroup: "U8",
    domain: "puck_control",
    expectedLevel: E,
    description: "Stick on puck in place and while gliding; simple carry in open space.",
    focusHint: "Keep drills small-area and game-like (tag, races with puck).",
  },
  {
    ageGroup: "U8",
    domain: "decision_making",
    expectedLevel: E,
    description:
      "Binary choices: pass or skate; coach prompts and clear visual targets. Live Training signals for this domain are mapped from the pace metric (tempo / reading the play).",
    focusHint: "Limit options; one cue per rep.",
  },
  {
    ageGroup: "U8",
    domain: "discipline",
    expectedLevel: E,
    description: "Follow simple rules and stoppages; learning to listen in a group setting.",
    focusHint: "Consistent routines beat long speeches.",
  },
  {
    ageGroup: "U8",
    domain: "attention",
    expectedLevel: E,
    description: "Short focus windows; engagement through play and movement.",
    focusHint: "Rotate activities before fatigue, not after.",
  },
  {
    ageGroup: "U8",
    domain: "physical",
    expectedLevel: E,
    description: "Overall movement literacy: run, hop, fall safely; no adult-style conditioning.",
    focusHint: "Bodyweight, games, and variety—not volume.",
  },

  // —— U11 (9–11) ——
  {
    ageGroup: "U11",
    domain: "skating",
    expectedLevel: E,
    description: "Cleaner edges, crossovers introduced, acceleration over short distances.",
    focusHint: "Quality turns and starts beat racing full ice every drill.",
  },
  {
    ageGroup: "U11",
    domain: "puck_control",
    expectedLevel: E,
    description: "Open-ice protection, basic dekes vs cones or passive pressure.",
    focusHint: "Hands and feet together under light stress.",
  },
  {
    ageGroup: "U11",
    domain: "decision_making",
    expectedLevel: E,
    description:
      "2v1 and small-sided reads; begin to look before receiving. Live Training signals for this domain are mapped from the pace metric (tempo / reading the play).",
    focusHint: "Freeze-film moments: “what did you see?”",
  },
  {
    ageGroup: "U11",
    domain: "discipline",
    expectedLevel: E,
    description: "Respect officials and teammates; accept roles in drills and games.",
    focusHint: "Model calm corrections; one standard for everyone.",
  },
  {
    ageGroup: "U11",
    domain: "attention",
    expectedLevel: E,
    description: "Can hold a theme for a station; still needs clear checkpoints.",
    focusHint: "Visible objectives on each drill board.",
  },
  {
    ageGroup: "U11",
    domain: "physical",
    expectedLevel: E,
    description: "Agility, coordination, and safe contact prep; age-appropriate strength habits.",
    focusHint: "Technique and recovery—not max lifts.",
  },

  // —— U14 (12–14) ——
  {
    ageGroup: "U14",
    domain: "skating",
    expectedLevel: E,
    description: "Power in first steps, pivots under timing, pace changes with the play.",
    focusHint: "Battle drills that demand foot speed with puck support.",
  },
  {
    ageGroup: "U14",
    domain: "puck_control",
    expectedLevel: E,
    description: "Handling under moderate pressure; exits and entries with head up.",
    focusHint: "Scan habit before touch—non-negotiable in small games.",
  },
  {
    ageGroup: "U14",
    domain: "decision_making",
    expectedLevel: E,
    description:
      "Support layers, quick give-and-gos, simple D-zone breakouts with options. Live Training signals for this domain are mapped from the pace metric (tempo / reading the play).",
    focusHint: "Reward the second touch, not only the goal.",
  },
  {
    ageGroup: "U14",
    domain: "discipline",
    expectedLevel: E,
    description: "Accountable to systems; constructive response to feedback and ice time.",
    focusHint: "Connect behavior to team outcomes, not shame.",
  },
  {
    ageGroup: "U14",
    domain: "attention",
    expectedLevel: E,
    description: "Sustained focus through shifts; video and chalkboard start to land.",
    focusHint: "One tactical theme per practice week.",
  },
  {
    ageGroup: "U14",
    domain: "physical",
    expectedLevel: E,
    description: "Structured off-ice: mobility, core, speed basics; sleep and fuel awareness.",
    focusHint: "Progressive loading with supervision.",
  },

  // —— U17 (15–17) ——
  {
    ageGroup: "U17",
    domain: "skating",
    expectedLevel: E,
    description: "Explosive transitions, tight-space separation, endurance for special teams.",
    focusHint: "Track league tempo—practice should mimic game density.",
  },
  {
    ageGroup: "U17",
    domain: "puck_control",
    expectedLevel: E,
    description: "Protection and deception vs active sticks; pace with purpose.",
    focusHint: "Fail-forward reps in contested areas.",
  },
  {
    ageGroup: "U17",
    domain: "decision_making",
    expectedLevel: E,
    description:
      "Structured creativity: forecheck triggers, OZ possession, DZ exits under forecheck. Live Training signals for this domain are mapped from the pace metric (tempo / reading the play).",
    focusHint: "Player-led solutions within the system.",
  },
  {
    ageGroup: "U17",
    domain: "discipline",
    expectedLevel: E,
    description: "Leadership habits: punctuality, preparation, and professionalism on and off ice.",
    focusHint: "Peer standards matter—involve captains in culture.",
  },
  {
    ageGroup: "U17",
    domain: "attention",
    expectedLevel: E,
    description: "Self-scouting awareness; adjusts detail from coach and video without defensiveness.",
    focusHint: "Assign one self-review question per week.",
  },
  {
    ageGroup: "U17",
    domain: "physical",
    expectedLevel: E,
    description: "Train like an athlete: strength, power, injury prevention, and recovery discipline.",
    focusHint: "Individual plans within team minimums.",
  },
];
