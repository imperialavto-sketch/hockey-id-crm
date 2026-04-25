import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

/** Deterministic Stage 1 pilot smoke fixtures (no LiveTrainingSession / reports). */
const PILOT_SCHOOL_NAME = "Pilot Smoke School (Stage 1)";
const PILOT_TEAM_NAME = "Pilot Smoke Team U12";
/** One active group per pilot team — required for `GET /api/coach/schedule` DTO (`group` include). */
const PILOT_TEAM_GROUP_NAME = "Pilot Smoke Main";
const PILOT_COACH_EMAIL = "pilot-coach@smoke.hockey-id.local";
const PILOT_PARENT_EMAIL = "pilot-parent@smoke.hockey-id.local";
const PILOT_PASSWORD = "SmokePilot1!";
const PILOT_TRAINING_NOTES_MARKER = "PILOT_SMOKE_CANONICAL_SLOT";
const PILOT_PLAYER_FIRST = "PilotSmoke";
const PILOT_PLAYER_LAST = "Player";

async function main() {
  const hashed = await bcrypt.hash(PILOT_PASSWORD, 10);

  let school = await prisma.school.findFirst({ where: { name: PILOT_SCHOOL_NAME } });
  if (!school) {
    school = await prisma.school.create({
      data: {
        name: PILOT_SCHOOL_NAME,
        address: "Smoke Rink, 1 Pilot Way",
        phone: "+7 000 000-00-01",
        email: "pilot-school@smoke.hockey-id.local",
      },
    });
  }

  let coachRecord = await prisma.coach.findFirst({ where: { email: PILOT_COACH_EMAIL } });
  if (!coachRecord) {
    coachRecord = await prisma.coach.create({
      data: {
        firstName: "Pilot",
        lastName: "Coach",
        email: PILOT_COACH_EMAIL,
        phone: "+7 000 000-00-02",
      },
    });
  }

  let team = await prisma.team.findFirst({
    where: { schoolId: school.id, name: PILOT_TEAM_NAME },
  });
  if (!team) {
    team = await prisma.team.create({
      data: {
        name: PILOT_TEAM_NAME,
        ageGroup: "U12",
        schoolId: school.id,
        coachId: coachRecord.id,
      },
    });
  } else if (team.coachId !== coachRecord.id) {
    team = await prisma.team.update({
      where: { id: team.id },
      data: { coachId: coachRecord.id },
    });
  }

  let teamGroup = await prisma.teamGroup.findFirst({
    where: { teamId: team.id, name: PILOT_TEAM_GROUP_NAME },
  });
  if (!teamGroup) {
    teamGroup = await prisma.teamGroup.create({
      data: {
        teamId: team.id,
        name: PILOT_TEAM_GROUP_NAME,
        level: 1,
        sortOrder: 0,
        isActive: true,
      },
    });
  } else if (!teamGroup.isActive) {
    teamGroup = await prisma.teamGroup.update({
      where: { id: teamGroup.id },
      data: { isActive: true },
    });
  }

  await prisma.user.upsert({
    where: { email: PILOT_COACH_EMAIL },
    create: {
      email: PILOT_COACH_EMAIL,
      password: hashed,
      name: "Pilot Coach",
      role: "COACH",
      schoolId: school.id,
      teamId: team.id,
    },
    update: {
      password: hashed,
      schoolId: school.id,
      teamId: team.id,
    },
  });

  let parent = await prisma.parent.findFirst({ where: { email: PILOT_PARENT_EMAIL } });
  if (!parent) {
    parent = await prisma.parent.create({
      data: {
        firstName: "Pilot",
        lastName: "Parent",
        email: PILOT_PARENT_EMAIL,
        phone: "+7 000 000-00-03",
      },
    });
  }

  await prisma.user.upsert({
    where: { email: PILOT_PARENT_EMAIL },
    create: {
      email: PILOT_PARENT_EMAIL,
      password: hashed,
      name: "Pilot Parent",
      role: "PARENT",
      schoolId: school.id,
    },
    update: {
      password: hashed,
      schoolId: school.id,
    },
  });

  let player = await prisma.player.findFirst({
    where: {
      teamId: team.id,
      firstName: PILOT_PLAYER_FIRST,
      lastName: PILOT_PLAYER_LAST,
    },
  });
  if (!player) {
    player = await prisma.player.create({
      data: {
        firstName: PILOT_PLAYER_FIRST,
        lastName: PILOT_PLAYER_LAST,
        birthYear: 2013,
        position: "Нападающий",
        grip: "Правый",
        teamId: team.id,
        parentId: parent.id,
        status: "Активен",
      },
    });
  } else {
    player = await prisma.player.update({
      where: { id: player.id },
      data: {
        teamId: team.id,
        parentId: parent.id,
      },
    });
  }

  await prisma.parentPlayer.upsert({
    where: {
      parentId_playerId: { parentId: parent.id, playerId: player.id },
    },
    create: {
      parentId: parent.id,
      playerId: player.id,
      relation: "Родитель",
    },
    update: {},
  });

  const startAt = new Date("2026-04-20T10:00:00.000Z");
  const endAt = new Date("2026-04-20T11:30:00.000Z");

  const existingSlot = await prisma.trainingSession.findFirst({
    where: { teamId: team.id, notes: PILOT_TRAINING_NOTES_MARKER },
  });
  if (existingSlot) {
    await prisma.trainingSession.update({
      where: { id: existingSlot.id },
      data: {
        coachId: coachRecord.id,
        groupId: teamGroup.id,
        startAt,
        endAt,
        status: "scheduled",
        sessionStatus: "planned",
        type: "ice",
        locationName: "Pilot Rink",
      },
    });
  } else {
    await prisma.trainingSession.create({
      data: {
        teamId: team.id,
        coachId: coachRecord.id,
        groupId: teamGroup.id,
        type: "ice",
        startAt,
        endAt,
        locationName: "Pilot Rink",
        notes: PILOT_TRAINING_NOTES_MARKER,
        status: "scheduled",
        sessionStatus: "planned",
      },
    });
  }

  console.log("Pilot smoke seed OK:", {
    schoolId: school.id,
    teamId: team.id,
    teamGroupId: teamGroup.id,
    coachId: coachRecord.id,
    parentId: parent.id,
    playerId: player.id,
    coachEmail: PILOT_COACH_EMAIL,
    parentEmail: PILOT_PARENT_EMAIL,
  });
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
