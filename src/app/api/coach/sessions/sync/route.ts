/**
 * POST /api/coach/sessions/sync
 * Coach mobile app syncs completed session bundle (observations, player snapshots, parent drafts).
 * Auth: Bearer token (mobileToken). Requires CRM role (coach+).
 *
 * Idempotency: if sessionId already exists, returns success with existing counts (no duplicate inserts).
 */

import { NextRequest, NextResponse } from "next/server";
import { requireCrmRole } from "@/lib/api-rbac";
import { prisma } from "@/lib/prisma";

// Payload types (matches coach-app CoachSessionBundlePayload)
interface SyncedObservation {
  playerId: string;
  playerName: string;
  skillType: string;
  impact: string;
  note?: string;
  createdAt: number;
}

interface SessionPayload {
  sessionId: string;
  title: string;
  startedAt: number;
  endedAt: number;
  observations: SyncedObservation[];
  playerCount?: number;
  observationCount?: number;
}

interface SkillSnapshotItem {
  skillType: string;
  score: number;
  trend: string;
  confidence: number;
}

interface PlayerSnapshotPayload {
  playerId: string;
  skills: SkillSnapshotItem[];
  lastUpdatedAt?: number;
}

interface ParentDraftPayload {
  sessionId: string;
  playerId: string;
  playerName: string;
  headline: string;
  parentMessage: string;
  positives: string[];
  improvementAreas: string[];
  focusSkills: string[];
}

interface BundlePayload {
  session: SessionPayload;
  playerSnapshots: PlayerSnapshotPayload[];
  parentDrafts: ParentDraftPayload[];
}

function validateSession(s: unknown): s is SessionPayload {
  if (!s || typeof s !== "object") return false;
  const o = s as Record<string, unknown>;
  return (
    typeof o.sessionId === "string" &&
    o.sessionId.trim().length > 0 &&
    typeof o.title === "string" &&
    typeof o.startedAt === "number" &&
    typeof o.endedAt === "number" &&
    Array.isArray(o.observations)
  );
}

function validateObservation(obs: unknown): obs is SyncedObservation {
  if (!obs || typeof obs !== "object") return false;
  const o = obs as Record<string, unknown>;
  return (
    typeof o.playerId === "string" &&
    typeof o.playerName === "string" &&
    typeof o.skillType === "string" &&
    typeof o.impact === "string" &&
    typeof o.createdAt === "number"
  );
}

function validateSnapshot(snap: unknown): snap is PlayerSnapshotPayload {
  if (!snap || typeof snap !== "object") return false;
  const o = snap as Record<string, unknown>;
  return typeof o.playerId === "string" && Array.isArray(o.skills);
}

function validateParentDraft(d: unknown): d is ParentDraftPayload {
  if (!d || typeof d !== "object") return false;
  const o = d as Record<string, unknown>;
  return (
    typeof o.sessionId === "string" &&
    typeof o.playerId === "string" &&
    typeof o.playerName === "string" &&
    typeof o.headline === "string" &&
    typeof o.parentMessage === "string" &&
    Array.isArray(o.positives) &&
    Array.isArray(o.improvementAreas) &&
    Array.isArray(o.focusSkills)
  );
}

export async function POST(req: NextRequest) {
  const { user, res } = await requireCrmRole(req);
  if (res) return res;

  try {
    const body = (await req.json().catch(() => null)) as unknown;
    if (!body || typeof body !== "object") {
      return NextResponse.json(
        { ok: false, error: "Invalid payload: expected JSON object" },
        { status: 400 }
      );
    }

    const { session, playerSnapshots, parentDrafts } = body as Record<string, unknown>;

    if (!validateSession(session)) {
      return NextResponse.json(
        {
          ok: false,
          error: "Invalid payload: session with sessionId, title, startedAt, endedAt, observations required",
        },
        { status: 400 }
      );
    }

    if (!Array.isArray(playerSnapshots)) {
      return NextResponse.json(
        { ok: false, error: "Invalid payload: playerSnapshots must be an array" },
        { status: 400 }
      );
    }

    if (!Array.isArray(parentDrafts)) {
      return NextResponse.json(
        { ok: false, error: "Invalid payload: parentDrafts must be an array" },
        { status: 400 }
      );
    }

    const validSnapshots = (playerSnapshots as unknown[]).filter(validateSnapshot);
    const validDrafts = (parentDrafts as unknown[]).filter(validateParentDraft);

    // Idempotency: if sessionId already exists, finalize/update and return
    const existing = await prisma.coachSession.findUnique({
      where: { sessionId: session.sessionId.trim() },
      include: {
        observations: true,
        snapshots: true,
        parentDrafts: true,
      },
    });

    if (existing) {
      // Server-backed live session: set endedAt, replace observations/snapshots/drafts from payload
      const coachUserId = user?.id ?? null;
      if (existing.coachUserId && coachUserId && existing.coachUserId !== coachUserId) {
        return NextResponse.json({ ok: false, error: "Forbidden" }, { status: 403 });
      }

      const validObs = (session.observations as SyncedObservation[]).filter(validateObservation);
      const obsData = validObs.map((obs) => ({
        coachSessionId: existing.id,
        playerId: String(obs.playerId),
        playerName: String(obs.playerName),
        skillType: String(obs.skillType),
        impact: String(obs.impact),
        note: obs.note ? String(obs.note).trim() : null,
        createdAtTs: new Date(obs.createdAt),
      }));
      const snapshotData = validSnapshots.map((snap) => ({
        coachSessionId: existing.id,
        playerId: String(snap.playerId),
        skills: snap.skills as object,
        lastUpdatedAt: snap.lastUpdatedAt ? new Date(snap.lastUpdatedAt) : null,
      }));
      const draftData = validDrafts.map((d) => ({
        coachSessionId: existing.id,
        playerId: String(d.playerId),
        playerName: String(d.playerName),
        headline: String(d.headline).trim() || "Session update",
        parentMessage: String(d.parentMessage).trim() || "",
        positives: d.positives as string[],
        improvementAreas: d.improvementAreas as string[],
        focusSkills: d.focusSkills as string[],
      }));

      await prisma.$transaction(async (tx) => {
        await tx.coachSession.update({
          where: { id: existing.id },
          data: { endedAt: new Date(session.endedAt), teamId: existing.teamId ?? undefined },
        });
        await tx.coachSessionObservation.deleteMany({ where: { coachSessionId: existing.id } });
        await tx.coachSessionPlayerSnapshot.deleteMany({ where: { coachSessionId: existing.id } });
        await tx.coachSessionParentDraft.deleteMany({ where: { coachSessionId: existing.id } });
        if (obsData.length > 0) {
          await tx.coachSessionObservation.createMany({ data: obsData });
        }
        if (snapshotData.length > 0) {
          await tx.coachSessionPlayerSnapshot.createMany({ data: snapshotData });
        }
        if (draftData.length > 0) {
          await tx.coachSessionParentDraft.createMany({ data: draftData });
        }
      });

      const counts = await prisma.coachSession.findUnique({
        where: { id: existing.id },
        include: {
          _count: { select: { observations: true, snapshots: true, parentDrafts: true } },
        },
      });

      return NextResponse.json({
        ok: true,
        sessionId: session.sessionId,
        syncedAt: new Date().toISOString(),
        savedCounts: {
          observations: counts?._count.observations ?? obsData.length,
          playerSnapshots: counts?._count.snapshots ?? snapshotData.length,
          parentDrafts: counts?._count.parentDrafts ?? draftData.length,
        },
      });
    }

    // Create session and related records in a transaction
    const coachUserId = user?.id ?? null;

    const coachSession = await prisma.coachSession.create({
      data: {
        sessionId: session.sessionId.trim(),
        title: String(session.title).trim() || "Practice Session",
        startedAt: new Date(session.startedAt),
        endedAt: new Date(session.endedAt),
        coachUserId,
      },
    });

    const obsData = (session.observations as SyncedObservation[])
      .filter(validateObservation)
      .map((obs) => ({
        coachSessionId: coachSession.id,
        playerId: String(obs.playerId),
        playerName: String(obs.playerName),
        skillType: String(obs.skillType),
        impact: String(obs.impact),
        note: obs.note ? String(obs.note).trim() : null,
        createdAtTs: new Date(obs.createdAt),
      }));

    const snapshotData = validSnapshots.map((snap) => ({
      coachSessionId: coachSession.id,
      playerId: String(snap.playerId),
      skills: snap.skills as object,
      lastUpdatedAt: snap.lastUpdatedAt ? new Date(snap.lastUpdatedAt) : null,
    }));

    const draftData = validDrafts.map((d) => ({
      coachSessionId: coachSession.id,
      playerId: String(d.playerId),
      playerName: String(d.playerName),
      headline: String(d.headline).trim() || "Session update",
      parentMessage: String(d.parentMessage).trim() || "",
      positives: d.positives as string[],
      improvementAreas: d.improvementAreas as string[],
      focusSkills: d.focusSkills as string[],
    }));

    await prisma.$transaction(async (tx) => {
      if (obsData.length > 0) {
        await tx.coachSessionObservation.createMany({ data: obsData });
      }
      if (snapshotData.length > 0) {
        await tx.coachSessionPlayerSnapshot.createMany({ data: snapshotData });
      }
      if (draftData.length > 0) {
        await tx.coachSessionParentDraft.createMany({ data: draftData });
      }
    });

    return NextResponse.json({
      ok: true,
      sessionId: session.sessionId,
      syncedAt: coachSession.createdAt.toISOString(),
      savedCounts: {
        observations: obsData.length,
        playerSnapshots: snapshotData.length,
        parentDrafts: draftData.length,
      },
    });
  } catch (error) {
    console.error("POST /api/coach/sessions/sync failed:", error);
    return NextResponse.json(
      {
        ok: false,
        error: "Sync failed",
        details: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    );
  }
}
