/**
 * Один универсальный аккаунт: CRM (User SCHOOL_ADMIN) + coach-app (CRM Bearer) + parent-app (тот же телефон + пароль).
 * Coach: запись `Coach` с `linkedUserId` → `User.id`. Parent: строка `Parent` с тем же `phone`, что у User.
 *
 * Запуск: `npm run db:reset:user` (из корня, нужен DATABASE_URL).
 *
 * Prisma: поле пароля — `password` (bcrypt), не `passwordHash`. У `Coach` нет `userId`/`schoolId` — связь через `linkedUserId`.
 */

import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

const EMAIL = "admin@hockey-id.local";
const PHONE = "79990000000";
const PASSWORD = "123456";
const SCHOOL_NAME = "Hockey ID Universal Seed";
const TEAM_NAME = "Universal Seed Team";
const PLAYER_FIRST = "Тест";
const PLAYER_LAST = "Универсальный";

async function main() {
  const passwordHash = await bcrypt.hash(PASSWORD, 10);

  let school = await prisma.school.findFirst({ where: { name: SCHOOL_NAME } });
  if (!school) {
    school = await prisma.school.create({
      data: {
        name: SCHOOL_NAME,
        address: "Seed single-user",
        phone: "+7 000 000-00-01",
        email: "seed@hockey-id.local",
      },
    });
  }

  const user = await prisma.user.upsert({
    where: { email: EMAIL },
    create: {
      email: EMAIL,
      phone: PHONE,
      role: "SCHOOL_ADMIN",
      password: passwordHash,
      name: "Universal Admin",
      schoolId: school.id,
    },
    update: {
      phone: PHONE,
      role: "SCHOOL_ADMIN",
      password: passwordHash,
      name: "Universal Admin",
      schoolId: school.id,
    },
  });

  let coach = await prisma.coach.findFirst({
    where: { linkedUserId: user.id },
  });
  if (!coach) {
    coach = await prisma.coach.create({
      data: {
        firstName: "Universal",
        lastName: "Coach",
        email: EMAIL,
        phone: PHONE,
        linkedUserId: user.id,
      },
    });
  } else {
    coach = await prisma.coach.update({
      where: { id: coach.id },
      data: {
        firstName: "Universal",
        lastName: "Coach",
        email: EMAIL,
        phone: PHONE,
        linkedUserId: user.id,
      },
    });
  }

  let team = await prisma.team.findFirst({
    where: { schoolId: school.id, name: TEAM_NAME },
  });
  if (!team) {
    team = await prisma.team.create({
      data: {
        name: TEAM_NAME,
        ageGroup: "2018",
        schoolId: school.id,
        coachId: coach.id,
      },
    });
  } else {
    team = await prisma.team.update({
      where: { id: team.id },
      data: { coachId: coach.id },
    });
  }

  await prisma.user.update({
    where: { id: user.id },
    data: { teamId: team.id },
  });

  const parent = await prisma.parent.upsert({
    where: { phone: PHONE },
    create: {
      firstName: "Universal",
      lastName: "Parent",
      phone: PHONE,
      email: EMAIL,
    },
    update: {
      firstName: "Universal",
      lastName: "Parent",
      email: EMAIL,
    },
  });

  let player = await prisma.player.findFirst({
    where: {
      teamId: team.id,
      firstName: PLAYER_FIRST,
      lastName: PLAYER_LAST,
    },
  });
  if (!player) {
    player = await prisma.player.create({
      data: {
        firstName: PLAYER_FIRST,
        lastName: PLAYER_LAST,
        birthYear: 2018,
        birthDate: new Date("2018-05-01T00:00:00.000Z"),
        position: "Нападающий",
        grip: "LEFT",
        city: "Москва",
        country: "Россия",
        teamId: team.id,
        parentId: parent.id,
        status: "Активен",
        comment: "seed-single-user",
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
      relation: "Опекун",
    },
    update: { relation: "Опекун" },
  });

  try {
    const existingConv = await prisma.chatConversation.findFirst({
      where: {
        playerId: player.id,
        parentId: parent.id,
        coachId: coach.id,
      },
    });
    if (!existingConv) {
      await prisma.chatConversation.create({
        data: {
          kind: "coach_parent_direct",
          playerId: player.id,
          parentId: parent.id,
          coachId: coach.id,
        },
      });
    }
  } catch (e) {
    console.warn(
      "[seed-single-user] chat conversation skipped (migrate DB / prisma db push if needed)",
      e
    );
  }

  console.log("[seed-single-user] OK");
  console.log("LOGIN:");
  console.log("email: admin@hockey-id.local");
  console.log("phone: 79990000000");
  console.log("password: 123456");
  console.log(
    "CRM / coach-app: POST /api/auth/login  email или phone + password  (intent coach / по умолчанию)"
  );
  console.log(
    "parent-app: POST /api/auth/login  phone + password  intent=parent"
  );
}

main()
  .catch((e) => {
    console.error("[seed-single-user] failed", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
