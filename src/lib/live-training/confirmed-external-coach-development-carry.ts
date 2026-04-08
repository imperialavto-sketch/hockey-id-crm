/**
 * STEP 21: перенос подтверждённого внешнего подбора в planningSnapshotJson новой live-сессии
 * (источник — ExternalCoachRecommendation.confirmed, без новых таблиц).
 */

import type { Prisma } from "@prisma/client";
import { LiveTrainingSessionStatus } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { EXTERNAL_COACH_RECOMMENDATION_STATUS } from "@/lib/external-coach/external-coach-recommendation-service";
import {
  parsePlanningObject,
  type LiveTrainingConfirmedExternalDevelopmentCarryDto,
  type LiveTrainingExternalCoachFeedbackCarryDto,
} from "./live-training-planning-snapshot";

const CARRY_LOOKBACK_MS = 90 * 24 * 3600 * 1000;
const SAFE_TRIGGER = "extra_training";
const MAX_CANDIDATES = 24;
const MAX_SKILLS = 12;
const MAX_COACH_NAME = 200;
const MAX_FB_CARRY_SUMMARY = 800;
const MAX_FB_CARRY_FOCUS = 6;

function dedupeKey(externalCoachId: string, playerId: string | null): string {
  return `${externalCoachId.trim()}:${playerId ?? "team"}`;
}

/**
 * Одна компактная строка carry для снимка: приоритет — рекомендация по игроку из focus,
 * иначе team-level, иначе самая свежая; без дубликатов coach+player.
 */
async function buildExternalCoachFeedbackCarryFromRecommendationId(
  recommendationId: string
): Promise<LiveTrainingExternalCoachFeedbackCarryDto | null> {
  const [fb, rec] = await Promise.all([
    prisma.externalCoachFeedback.findUnique({
      where: { recommendationId },
    }),
    prisma.externalCoachRecommendation.findUnique({
      where: { id: recommendationId },
      include: { ExternalCoach: { select: { name: true } } },
    }),
  ]);
  if (!fb || !rec || !fb.summary.trim()) return null;
  const coachName = rec.ExternalCoach.name?.trim().slice(0, MAX_COACH_NAME) ?? "";
  if (!coachName) return null;
  const carry: LiveTrainingExternalCoachFeedbackCarryDto = {
    coachName,
    summary: fb.summary.trim().slice(0, MAX_FB_CARRY_SUMMARY),
    focusAreas: (fb.focusAreas ?? [])
      .filter((x): x is string => typeof x === "string" && x.trim().length > 0)
      .map((x) => x.trim().slice(0, 240))
      .slice(0, MAX_FB_CARRY_FOCUS),
  };
  if (rec.playerId?.trim()) {
    carry.playerId = rec.playerId.trim();
  }
  return carry;
}

export async function fetchConfirmedExternalDevelopmentCarryForTeam(
  teamId: string,
  focusPlayerIds: string[]
): Promise<{
  carry: LiveTrainingConfirmedExternalDevelopmentCarryDto | null;
  recommendationId: string | null;
}> {
  const since = new Date(Date.now() - CARRY_LOOKBACK_MS);
  const rows = await prisma.externalCoachRecommendation.findMany({
    where: {
      status: EXTERNAL_COACH_RECOMMENDATION_STATUS.confirmed,
      triggerType: SAFE_TRIGGER,
      updatedAt: { gte: since },
      LiveTrainingSession: {
        teamId,
        status: LiveTrainingSessionStatus.confirmed,
        confirmedAt: { gte: since },
      },
    },
    include: {
      ExternalCoach: { select: { name: true, skills: true } },
      LiveTrainingSession: { select: { confirmedAt: true } },
    },
    orderBy: { updatedAt: "desc" },
    take: MAX_CANDIDATES,
  });

  const seen = new Set<string>();
  const unique: typeof rows = [];
  for (const r of rows) {
    const k = dedupeKey(r.externalCoachId, r.playerId);
    if (seen.has(k)) continue;
    seen.add(k);
    unique.push(r);
  }

  if (unique.length === 0) return { carry: null, recommendationId: null };

  const focus = new Set(focusPlayerIds.map((id) => id.trim()).filter(Boolean));

  function score(r: (typeof rows)[0]): number {
    let s = 0;
    const pid = r.playerId?.trim() ?? "";
    if (pid && focus.has(pid)) s += 3;
    else if (!pid) s += 1;
    return s;
  }

  unique.sort((a, b) => {
    const ds = score(b) - score(a);
    if (ds !== 0) return ds;
    return b.updatedAt.getTime() - a.updatedAt.getTime();
  });

  const chosen = unique[0]!;
  const name = chosen.ExternalCoach.name?.trim().slice(0, MAX_COACH_NAME) ?? "";
  if (!name) return { carry: null, recommendationId: null };

  const skills = Array.isArray(chosen.ExternalCoach.skills)
    ? chosen.ExternalCoach.skills
        .filter((x): x is string => typeof x === "string" && x.trim().length > 0)
        .map((x) => x.trim().slice(0, 80))
        .slice(0, MAX_SKILLS)
    : [];

  const dto: LiveTrainingConfirmedExternalDevelopmentCarryDto = {
    coachName: name,
    skills,
    source: "external_coach",
  };
  if (chosen.playerId?.trim()) {
    dto.playerId = chosen.playerId.trim();
  }
  return { carry: dto, recommendationId: chosen.id };
}

export function extractFocusPlayerIdsFromPlanningJson(
  baseJson: Prisma.InputJsonValue
): string[] {
  if (!baseJson || typeof baseJson !== "object" || Array.isArray(baseJson)) return [];
  const o = baseJson as Record<string, unknown>;
  const fp = o.focusPlayers;
  if (!Array.isArray(fp)) return [];
  const ids: string[] = [];
  for (const p of fp) {
    if (!p || typeof p !== "object" || Array.isArray(p)) continue;
    const row = p as Record<string, unknown>;
    const pid = row.playerId;
    const id = typeof pid === "string" ? pid.trim() : "";
    if (id) ids.push(id);
  }
  return [...new Set(ids)];
}

/**
 * Серверная фиксация carry; клиентское поле с тем же ключом сбрасывается.
 */
export async function enrichPlanningSnapshotJsonWithConfirmedExternalCoachCarry(
  teamId: string,
  baseJson: Prisma.InputJsonValue,
  focusPlayerIds: string[]
): Promise<Prisma.InputJsonValue> {
  const { carry, recommendationId } = await fetchConfirmedExternalDevelopmentCarryForTeam(
    teamId,
    focusPlayerIds
  );
  const raw =
    baseJson && typeof baseJson === "object" && !Array.isArray(baseJson)
      ? { ...(baseJson as Record<string, unknown>) }
      : {};
  delete raw.confirmedExternalDevelopmentCarry;
  delete raw.externalCoachFeedbackCarry;
  if (carry) {
    raw.confirmedExternalDevelopmentCarry = carry;
  }
  if (recommendationId) {
    const fbCarry = await buildExternalCoachFeedbackCarryFromRecommendationId(recommendationId);
    if (fbCarry) {
      raw.externalCoachFeedbackCarry = fbCarry;
    }
  }
  const parsed = parsePlanningObject(raw as Record<string, unknown>);
  return (parsed ?? raw) as unknown as Prisma.InputJsonValue;
}
