import { prisma } from "@/lib/prisma";
import type { CoachAvailability } from "@prisma/client";

export const AVAILABILITY_TYPES = ["ice", "gym", "private"] as const;
export type AvailabilityType = (typeof AVAILABILITY_TYPES)[number];

const TIME_RE = /^([01]?\d|2[0-3]):([0-5]\d)$/;

export function parseTimeToMinutes(hhmm: string): number | null {
  const t = hhmm.trim();
  if (!TIME_RE.test(t)) return null;
  const [h, m] = t.split(":").map((x) => parseInt(x, 10));
  return h * 60 + m;
}

export function isValidAvailabilityType(v: string): v is AvailabilityType {
  return (AVAILABILITY_TYPES as readonly string[]).includes(v);
}

export function normalizeAvailabilityDate(isoDate: string): Date | null {
  const s = isoDate.trim();
  if (!/^\d{4}-\d{2}-\d{2}$/.test(s)) return null;
  const d = new Date(`${s}T00:00:00.000Z`);
  if (Number.isNaN(d.getTime())) return null;
  return d;
}

export function sameUtcDay(a: Date, b: Date): boolean {
  return a.toISOString().slice(0, 10) === b.toISOString().slice(0, 10);
}

export function intervalsOverlap(
  startA: number,
  endA: number,
  startB: number,
  endB: number
): boolean {
  return startA < endB && startB < endA;
}

export async function getMarketplaceCoachById(coachId: string) {
  return prisma.coach.findFirst({
    where: { id: coachId, isMarketplaceIndependent: true },
    select: { id: true },
  });
}

export async function getLinkedIndependentCoachForUser(userId: string) {
  return prisma.coach.findFirst({
    where: {
      linkedUserId: userId,
      isMarketplaceIndependent: true,
    },
    select: { id: true },
  });
}

export function serializeAvailability(row: CoachAvailability) {
  return {
    id: row.id,
    coachId: row.coachId,
    date: row.date.toISOString().slice(0, 10),
    startTime: row.startTime,
    endTime: row.endTime,
    price: row.price,
    type: row.type,
    isBooked: row.isBooked,
  };
}

export async function findOverlappingSlot(
  coachId: string,
  date: Date,
  startM: number,
  endM: number,
  excludeId?: string
): Promise<CoachAvailability | null> {
  const dayStart = new Date(date);
  dayStart.setUTCHours(0, 0, 0, 0);
  const dayEnd = new Date(dayStart);
  dayEnd.setUTCDate(dayEnd.getUTCDate() + 1);

  const sameDay = await prisma.coachAvailability.findMany({
    where: {
      coachId,
      date: { gte: dayStart, lt: dayEnd },
      ...(excludeId ? { NOT: { id: excludeId } } : {}),
    },
  });

  for (const row of sameDay) {
    const rs = parseTimeToMinutes(row.startTime);
    const re = parseTimeToMinutes(row.endTime);
    if (rs == null || re == null) continue;
    if (intervalsOverlap(startM, endM, rs, re)) {
      return row;
    }
  }
  return null;
}
