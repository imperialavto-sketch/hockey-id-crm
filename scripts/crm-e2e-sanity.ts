/**
 * Pre-release CRM sanity check (API-level E2E).
 * Requires Next app running on BASE_URL (default http://localhost:3010).
 */

import { PrismaClient } from "@prisma/client";

const BASE = process.env.BASE_URL || "http://localhost:3010";

type Check = { name: string; ok: boolean; status?: number; note?: string };

async function api(
  path: string,
  init: { method?: string; token?: string; body?: unknown } = {}
): Promise<{ ok: boolean; status: number; json: any }> {
  const headers: Record<string, string> = { "Content-Type": "application/json" };
  if (init.token) headers.authorization = `Bearer ${init.token}`;
  const res = await fetch(`${BASE}${path}`, {
    method: init.method || "GET",
    headers,
    body: init.body !== undefined ? JSON.stringify(init.body) : undefined,
  });
  const json = await res.json().catch(() => null);
  return { ok: res.ok, status: res.status, json };
}

async function login(email: string, password: string) {
  const res = await api("/api/auth/login", {
    method: "POST",
    body: { email, password },
  });
  if (!res.ok || !res.json?.mobileToken) {
    throw new Error(`login failed for ${email}: ${res.status}`);
  }
  return String(res.json.mobileToken);
}

async function main() {
  const checks: Check[] = [];
  const prisma = new PrismaClient();
  let createdTrainingId: string | null = null;

  try {
    // Minimal deterministic fixtures for sanity checks.
    const school =
      (await prisma.school.findFirst({ orderBy: { createdAt: "asc" } })) ??
      (await prisma.school.create({
        data: { name: "Sanity School", address: "Test", phone: "+70000000000" },
      }));
    const coach =
      (await prisma.coach.findFirst({ where: { isMarketplaceIndependent: false }, orderBy: { createdAt: "asc" } })) ??
      (await prisma.coach.create({
        data: { firstName: "Sanity", lastName: "Coach", email: "sanity-coach@example.com" },
      }));
    const team =
      (await prisma.team.findFirst({ orderBy: { createdAt: "asc" } })) ??
      (await prisma.team.create({
        data: { name: "Sanity Team", ageGroup: "U12", schoolId: school.id, coachId: coach.id },
      }));
    const parent =
      (await prisma.parent.findFirst({ orderBy: { createdAt: "asc" } })) ??
      (await prisma.parent.create({
        data: { firstName: "Sanity", lastName: "Parent", email: "sanity-parent@example.com" },
      }));
    const player =
      (await prisma.player.findFirst({ orderBy: { createdAt: "asc" } })) ??
      (await prisma.player.create({
        data: {
          firstName: "Sanity",
          lastName: "Player",
          birthYear: 2012,
          position: "Нападающий",
          grip: "левый",
          teamId: team.id,
          parentId: parent.id,
        },
      }));
    await prisma.parentPlayer.upsert({
      where: { parentId_playerId: { parentId: parent.id, playerId: player.id } },
      create: { parentId: parent.id, playerId: player.id },
      update: {},
    });
    const currentMonth = new Date().getMonth() + 1;
    const currentYear = new Date().getFullYear();
    const existingPayment = await prisma.playerPayment.findFirst({
      where: { playerId: player.id, month: currentMonth, year: currentYear },
    });
    if (!existingPayment) {
      await prisma.playerPayment.create({
        data: {
          playerId: player.id,
          month: currentMonth,
          year: currentYear,
          amount: 1000,
          status: "Не оплачено",
        },
      });
    }
    await prisma.chatConversation.upsert({
      where: {
        playerId_parentId_coachId: {
          playerId: player.id,
          parentId: parent.id,
          coachId: coach.id,
        },
      },
      create: { playerId: player.id, parentId: parent.id, coachId: coach.id },
      update: {},
    });

    const adminToken = await login("admin@hockey.edu", "admin123");
    checks.push({ name: "AUTH login (admin)", ok: true, status: 200 });

    const parentToken = await login("parent@example.com", "admin123");
    checks.push({ name: "AUTH login (parent)", ok: true, status: 200 });

    const me = await api("/api/me", { token: parentToken });
    checks.push({
      name: "AUTH /api/me",
      ok: me.ok && typeof me.json?.id === "string",
      status: me.status,
    });

    const players = await api("/api/players", { token: adminToken });
    const dbPlayer = await prisma.player.findFirst({ orderBy: { createdAt: "desc" } });
    const playerId = players.ok && Array.isArray(players.json) && players.json[0]?.id
      ? String(players.json[0].id)
      : dbPlayer?.id ?? player.id;
    checks.push({ name: "PLAYERS list", ok: players.ok, status: players.status });

    const playerDetail = playerId ? await api(`/api/player/${playerId}`, { token: adminToken }) : { ok: false, status: 0, json: null };
    checks.push({ name: "PLAYERS detail", ok: playerDetail.ok, status: playerDetail.status });

    const playerSchedule = playerId ? await api(`/api/player/${playerId}/trainings`, { token: adminToken }) : { ok: false, status: 0, json: null };
    checks.push({
      name: "PLAYERS schedule",
      ok: playerSchedule.ok && Array.isArray(playerSchedule.json),
      status: playerSchedule.status,
    });

    const teams = await api("/api/teams", { token: adminToken });
    const dbTeam = await prisma.team.findFirst({ orderBy: { createdAt: "desc" } });
    const teamId = teams.ok && Array.isArray(teams.json) && teams.json[0]?.id
      ? String(teams.json[0].id)
      : playerDetail.json?.team?.id ?? dbTeam?.id ?? team.id;
    checks.push({ name: "TEAMS list", ok: teams.ok, status: teams.status });

    const teamDetail = teamId ? await api(`/api/teams/${teamId}`, { token: adminToken }) : { ok: false, status: 0, json: null };
    checks.push({ name: "TEAMS detail", ok: teamDetail.ok, status: teamDetail.status, note: teamId ? undefined : "no team id" });

    const weekStart = new Date();
    const day = weekStart.getDay();
    const diff = day === 0 ? -6 : 1 - day;
    weekStart.setDate(weekStart.getDate() + diff);
    const week = weekStart.toISOString().slice(0, 10);
    const teamSchedule = teamId
      ? await api(`/api/trainings?teamId=${encodeURIComponent(teamId)}&weekStartDate=${encodeURIComponent(week)}`, { token: adminToken })
      : { ok: false, status: 0, json: null };
    checks.push({
      name: "TEAMS schedule",
      ok: teamSchedule.ok && Array.isArray(teamSchedule.json),
      status: teamSchedule.status,
      note: teamId ? undefined : "no team id",
    });

    const trainings = await api("/api/trainings", { token: adminToken });
    const dbTraining = await prisma.training.findFirst({ orderBy: { createdAt: "desc" } });
    const trainingId = trainings.ok && Array.isArray(trainings.json) && trainings.json[0]?.id
      ? String(trainings.json[0].id)
      : dbTraining?.id ?? null;
    checks.push({ name: "TRAININGS list", ok: trainings.ok, status: trainings.status });

    const newTraining = teamId
      ? await api("/api/trainings", {
          method: "POST",
          token: adminToken,
          body: {
            title: "Sanity training",
            startTime: new Date(Date.now() + 60 * 60 * 1000).toISOString(),
            endTime: new Date(Date.now() + 2 * 60 * 60 * 1000).toISOString(),
            location: "Sanity rink",
            teamId,
          },
        })
      : { ok: false, status: 0, json: null };
    createdTrainingId = newTraining.ok && newTraining.json?.id ? String(newTraining.json.id) : null;
    checks.push({ name: "TRAININGS create", ok: newTraining.ok, status: newTraining.status, note: teamId ? undefined : "no team id" });

    const detailTrainingId = trainingId ?? createdTrainingId;
    const trainingDetail = detailTrainingId
      ? await api(`/api/trainings/${detailTrainingId}`, { token: adminToken })
      : { ok: false, status: 0, json: null };
    checks.push({ name: "TRAININGS detail", ok: trainingDetail.ok, status: trainingDetail.status, note: detailTrainingId ? undefined : "no training id" });

    const finance = await api("/api/payments", { token: adminToken });
    const dbPayment = await prisma.playerPayment.findFirst({ orderBy: { createdAt: "desc" } });
    const paymentId = finance.ok && Array.isArray(finance.json?.payments) && finance.json.payments[0]?.id
      ? String(finance.json.payments[0].id)
      : dbPayment?.id ?? null;
    checks.push({ name: "FINANCE list", ok: finance.ok, status: finance.status });

    const paymentDetail = paymentId ? await api(`/api/payments/${paymentId}`, { token: adminToken }) : { ok: false, status: 0, json: null };
    checks.push({ name: "FINANCE detail", ok: paymentDetail.ok, status: paymentDetail.status, note: paymentId ? undefined : "no payment id" });

    const paymentPatch = paymentId
      ? await api(`/api/payments/${paymentId}`, {
          method: "PUT",
          token: adminToken,
          body: { comment: "sanity-check" },
        })
      : { ok: false, status: 0, json: null };
    checks.push({ name: "FINANCE update", ok: paymentPatch.ok, status: paymentPatch.status, note: paymentId ? undefined : "no payment id" });

    const marketplaceHub = await api("/api/admin/marketplace/coaches", { token: adminToken });
    let coachId = marketplaceHub.ok && Array.isArray(marketplaceHub.json) && marketplaceHub.json[0]?.id
      ? String(marketplaceHub.json[0].id)
      : null;
    checks.push({ name: "MARKETPLACE hub/coaches list", ok: marketplaceHub.ok, status: marketplaceHub.status });

    if (!coachId) {
      const createdCoach = await api("/api/admin/marketplace/coaches", {
        method: "POST",
        token: adminToken,
        body: { fullName: "Sanity Coach", city: "Moscow", specialties: [], trainingFormats: [], isPublished: false },
      });
      if (createdCoach.ok && createdCoach.json?.id) coachId = String(createdCoach.json.id);
    }

    const coachDetail = coachId ? await api(`/api/admin/marketplace/coaches/${coachId}`, { token: adminToken }) : { ok: false, status: 0, json: null };
    checks.push({ name: "MARKETPLACE coach detail", ok: coachDetail.ok, status: coachDetail.status, note: coachId ? undefined : "no coach id" });

    const coachSave = coachId && coachDetail.ok
      ? await api(`/api/admin/marketplace/coaches/${coachId}`, {
          method: "PATCH",
          token: adminToken,
          body: {
            fullName: coachDetail.json.fullName,
            city: coachDetail.json.city,
            bio: coachDetail.json.bio ?? null,
            specialties: coachDetail.json.specialties ?? [],
            experienceYears: coachDetail.json.experienceYears ?? 0,
            priceFrom: coachDetail.json.priceFrom ?? 0,
            rating: coachDetail.json.rating ?? null,
            trainingFormats: coachDetail.json.trainingFormats ?? [],
            isPublished: Boolean(coachDetail.json.isPublished),
          },
        })
      : { ok: false, status: 0, json: null };
    checks.push({ name: "MARKETPLACE coach save", ok: coachSave.ok, status: coachSave.status, note: coachId ? undefined : "no coach id" });

    const requests = await api("/api/admin/marketplace/booking-requests", { token: adminToken });
    checks.push({
      name: "MARKETPLACE requests pipeline",
      ok: requests.ok && Array.isArray(requests.json),
      status: requests.status,
    });

    const conversations = await api("/api/chat/conversations", { token: adminToken });
    let conversationId = conversations.ok && Array.isArray(conversations.json) && conversations.json[0]?.id
      ? String(conversations.json[0].id)
      : null;
    checks.push({ name: "COMMUNICATIONS list", ok: conversations.ok, status: conversations.status });

    if (!conversationId) {
      const conv = await prisma.chatConversation.findFirst({ orderBy: { updatedAt: "desc" } });
      conversationId = conv?.id ?? null;
    }

    const chatOpen = conversationId ? await api(`/api/chat/conversations/${conversationId}/messages`, { token: adminToken }) : { ok: false, status: 0, json: null };
    checks.push({
      name: "COMMUNICATIONS open chat",
      ok: chatOpen.ok && Array.isArray(chatOpen.json),
      status: chatOpen.status,
      note: conversationId ? undefined : "no conversation id",
    });

    const chatSend = conversationId
      ? await api(`/api/chat/conversations/${conversationId}/messages`, {
          method: "POST",
          token: adminToken,
          body: { text: "sanity check ping" },
        })
      : { ok: false, status: 0, json: null };
    checks.push({ name: "COMMUNICATIONS send message", ok: chatSend.ok, status: chatSend.status, note: conversationId ? undefined : "no conversation id" });
  } finally {
    if (createdTrainingId) {
      const adminToken = await login("admin@hockey.edu", "admin123");
      await api(`/api/trainings/${createdTrainingId}`, { method: "DELETE", token: adminToken }).catch(() => null);
    }
    await prisma.$disconnect();
  }

  const broken = checks.filter((c) => !c.ok);
  const working = checks.filter((c) => c.ok);

  console.log("\nWORKING FLOWS:");
  for (const c of working) console.log(`- ${c.name} (${c.status ?? "-"})`);
  console.log("\nBROKEN FLOWS:");
  if (broken.length === 0) console.log("- none");
  for (const c of broken) console.log(`- ${c.name} (${c.status ?? "-"}) ${c.note ?? ""}`);

  if (broken.length > 0) process.exitCode = 1;
}

main().catch((e) => {
  console.error("sanity script failed", e);
  process.exit(1);
});

