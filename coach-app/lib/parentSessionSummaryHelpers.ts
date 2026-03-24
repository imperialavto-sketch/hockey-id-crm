/**
 * Parent Session Summary — deterministic draft generation from completed session data.
 * No AI. No network. Parent-friendly wording.
 */

import type { SessionObservation } from "@/models/sessionObservation";
import type { SkillType } from "@/models/playerDevelopment";

export interface ParentPlayerSummaryDraft {
  playerId: string;
  playerName: string;
  headline: string;
  positives: string[];
  improvementAreas: string[];
  focusSkills: SkillType[];
  parentMessage: string;
}

const PARENT_SKILL_LABELS: Record<SkillType, string> = {
  skating: "skating",
  shooting: "shooting",
  passing: "passing",
  positioning: "positioning",
  defense: "defensive play",
  effort: "effort",
  confidence: "confidence",
  communication: "communication",
};

/** Convert SkillType to parent-friendly label */
export function parentFriendlySkillLabel(skill: SkillType): string {
  return PARENT_SKILL_LABELS[skill] ?? skill;
}

/** Build parent-friendly draft for a single player from their observations */
export function buildParentPlayerSummary(
  playerId: string,
  playerName: string,
  observations: SessionObservation[]
): ParentPlayerSummaryDraft {
  const positives: string[] = [];
  const improvementAreas: string[] = [];
  const focusSkillSet = new Set<SkillType>();

  const posObs = observations.filter((o) => o.impact === "positive");
  const negObs = observations.filter((o) => o.impact === "negative");
  const neuObs = observations.filter((o) => o.impact === "neutral");

  for (const obs of observations) {
    focusSkillSet.add(obs.skillType);
  }
  const focusSkills = [...focusSkillSet];

  const skillLabel = (s: SkillType) => parentFriendlySkillLabel(s);
  const skillList = (skills: SkillType[]) =>
    skills.length === 0
      ? ""
      : skills.length === 1
        ? skillLabel(skills[0]!)
        : skills.length === 2
          ? `${skillLabel(skills[0]!)} and ${skillLabel(skills[1]!)}`
          : `${skills.slice(0, -1).map(skillLabel).join(", ")}, and ${skillLabel(skills[skills.length - 1]!)}`;

  if (posObs.length > 0) {
    const skills = [...new Set(posObs.map((o) => o.skillType))];
    if (skills.length >= 2) {
      positives.push(`Positive work in ${skillList(skills)}`);
    } else if (skills.length === 1) {
      positives.push(`Good progress in ${skillLabel(skills[0]!)}`);
    }
    const hasEffort = posObs.some((o) => o.skillType === "effort");
    if (hasEffort) {
      positives.push("Showed good effort during practice");
    } else if (posObs.length >= 2) {
      positives.push("Strong effort today");
    }
  }

  if (negObs.length > 0) {
    const skills = [...new Set(negObs.map((o) => o.skillType))];
    for (const s of skills) {
      improvementAreas.push(`Can keep improving ${skillLabel(s)}`);
    }
  }

  if (neuObs.length > 0 && posObs.length === 0 && negObs.length === 0) {
    const skills = [...new Set(neuObs.map((o) => o.skillType))];
    positives.push(`Worked on ${skillList(skills)} today`);
  }

  const headline = buildHeadline(posObs.length, negObs.length, neuObs.length, focusSkills);
  const parentMessage = buildParentMessage(
    playerName,
    positives,
    improvementAreas,
    posObs.length,
    negObs.length,
    neuObs.length,
    focusSkills
  );

  return {
    playerId,
    playerName,
    headline,
    positives: positives.length > 0 ? positives : ["Participated in practice"],
    improvementAreas,
    focusSkills,
    parentMessage,
  };
}

function buildHeadline(
  posCount: number,
  negCount: number,
  neuCount: number,
  focusSkills: SkillType[]
): string {
  const skills = focusSkills.length > 0 ? skillListShort(focusSkills) : "";

  if (posCount > 0 && negCount === 0) {
    return skills ? `Good session focus on ${skills}` : "Good session today";
  }
  if (posCount > 0 && negCount > 0) {
    return skills ? `Solid session with focus on ${skills}` : "Solid session today";
  }
  if (negCount > 0 && posCount === 0) {
    return skills ? `Session with focus on ${skills}` : "Practice session";
  }
  if (neuCount > 0 && posCount === 0 && negCount === 0) {
    return skills ? `Worked on ${skills}` : "Practice session";
  }
  return skills ? `Session focus on ${skills}` : "Practice session";
}

function skillListShort(skills: SkillType[]): string {
  const labels = skills.map(parentFriendlySkillLabel);
  if (labels.length <= 2) return labels.join(" and ");
  return `${labels.slice(0, -1).join(", ")}, and ${labels[labels.length - 1]}`;
}

function buildParentMessage(
  playerName: string,
  positives: string[],
  improvementAreas: string[],
  posCount: number,
  negCount: number,
  neuCount: number,
  focusSkills: SkillType[]
): string {
  const skillLabel = (s: SkillType) => parentFriendlySkillLabel(s);
  const skillList = (skills: SkillType[]) =>
    skills.length === 0
      ? ""
      : skills.length === 1
        ? skillLabel(skills[0]!)
        : skills.slice(0, -1).map(skillLabel).join(", ") + " and " + skillLabel(skills[skills.length - 1]!);

  if (posCount > 0 && negCount === 0) {
    const first = positives[0] ?? "showed good effort";
    return `Today ${playerName} ${first.charAt(0).toLowerCase() + first.slice(1)}. Great work.`;
  }

  if (posCount > 0 && negCount > 0) {
    const first = positives[0] ?? "showed good effort";
    let msg = `Today ${playerName} ${first.charAt(0).toLowerCase() + first.slice(1)}.`;
    const impPart = improvementAreas[0];
    if (impPart) {
      const area = impPart.replace(/^Can keep improving /, "").replace(/\.$/, "");
      msg += ` A good next focus is ${area}.`;
    }
    return msg;
  }

  if (negCount > 0 && posCount === 0) {
    const impPart = improvementAreas[0];
    if (impPart) {
      const area = impPart.replace(/^Can keep improving /, "").replace(/\.$/, "");
      return `Today we focused on ${skillList(focusSkills) || "practice"}. A good area to work on together is ${area}.`;
    }
    return `Today we worked on ${skillList(focusSkills) || "practice"}. Keep encouraging them at home.`;
  }

  if (neuCount > 0 && posCount === 0 && negCount === 0) {
    const focusPart = focusSkills.length > 0 ? skillList(focusSkills) : "practice";
    return `Today ${playerName} worked on ${focusPart}.`;
  }

  return `Today ${playerName} participated in practice.`;
}

/** Generate parent drafts for all players in a completed session */
export function buildParentSummariesForSession(
  observations: SessionObservation[]
): ParentPlayerSummaryDraft[] {
  const byPlayer = new Map<string, SessionObservation[]>();
  for (const obs of observations) {
    const list = byPlayer.get(obs.playerId) ?? [];
    list.push(obs);
    byPlayer.set(obs.playerId, list);
  }

  return Array.from(byPlayer.entries()).map(([playerId, obsList]) => {
    const first = obsList[0]!;
    return buildParentPlayerSummary(playerId, first.playerName, obsList);
  });
}
