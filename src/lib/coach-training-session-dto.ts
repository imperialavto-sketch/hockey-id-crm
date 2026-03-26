/**
 * Unified JSON shape for coach weekly schedule + session detail (TrainingSession only).
 */

import { prisma } from "./prisma";

export type CoachTrainingSessionJson = {
  id: string;
  type: string;
  subType: string | null;
  startAt: string;
  endAt: string;
  status: string;
  sessionStatus: string;
  locationName: string | null;
  locationAddress: string | null;
  notes: string | null;
  teamId: string;
  teamName: string;
  groupId: string;
  groupName: string;
  team: { id: string; name: string };
  group: { id: string; name: string; level: number };
  coachId: string;
  coach: { id: string; firstName: string; lastName: string };
};

/** Row from Prisma findMany with sessionWeekInclude */
export type TrainingSessionWeekRow = {
  id: string;
  teamId: string;
  groupId: string;
  coachId: string;
  type: string;
  subType: string | null;
  startAt: Date;
  endAt: Date;
  locationName: string | null;
  locationAddress: string | null;
  notes: string | null;
  status: string;
  sessionStatus: string;
  team: { id: string; name: string };
  group: { id: string; name: string; level: number };
  coach: { id: string; firstName: string; lastName: string };
};

export const sessionWeekInclude = {
  team: { select: { id: true, name: true } },
  group: { select: { id: true, name: true, level: true } },
  coach: { select: { id: true, firstName: true, lastName: true } },
} as const;

/** Для GET/PATCH по id: + schoolId для проверки доступа */
export const sessionDetailInclude = {
  team: { select: { id: true, name: true, schoolId: true } },
  group: { select: { id: true, name: true, level: true } },
  coach: { select: { id: true, firstName: true, lastName: true } },
} as const;

export type TrainingSessionDetailRow = Omit<TrainingSessionWeekRow, "team"> & {
  team: { id: string; name: string; schoolId: string };
};

export function detailRowToWeekRow(s: TrainingSessionDetailRow): TrainingSessionWeekRow {
  return {
    id: s.id,
    teamId: s.teamId,
    groupId: s.groupId,
    coachId: s.coachId,
    type: s.type,
    subType: s.subType,
    startAt: s.startAt,
    endAt: s.endAt,
    locationName: s.locationName,
    locationAddress: s.locationAddress,
    notes: s.notes,
    status: s.status,
    sessionStatus: s.sessionStatus,
    team: { id: s.team.id, name: s.team.name },
    group: s.group,
    coach: s.coach,
  };
}

export function toCoachTrainingSessionDto(
  s: TrainingSessionWeekRow
): CoachTrainingSessionJson {
  return {
    id: s.id,
    type: s.type,
    subType: s.subType,
    startAt: s.startAt.toISOString(),
    endAt: s.endAt.toISOString(),
    status: s.status,
    sessionStatus: s.sessionStatus,
    locationName: s.locationName,
    locationAddress: s.locationAddress,
    notes: s.notes,
    teamId: s.teamId,
    teamName: s.team.name,
    groupId: s.groupId,
    groupName: s.group.name,
    team: { id: s.team.id, name: s.team.name },
    group: {
      id: s.group.id,
      name: s.group.name,
      level: s.group.level,
    },
    coachId: s.coachId,
    coach: s.coach,
  };
}

export async function findTrainingSessionsForTeamWeek(
  teamId: string,
  rangeStart: Date,
  rangeEnd: Date
): Promise<TrainingSessionWeekRow[]> {
  const rows = await prisma.trainingSession.findMany({
    where: {
      teamId,
      status: { not: "cancelled" },
      startAt: { gte: rangeStart, lt: rangeEnd },
    },
    include: sessionWeekInclude,
    orderBy: { startAt: "asc" },
  });
  return rows as TrainingSessionWeekRow[];
}
