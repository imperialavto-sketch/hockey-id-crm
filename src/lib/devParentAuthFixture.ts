/**
 * Dev-only: guarantee at least one ParentPlayer row for magic / bypass OTP logins.
 */

import { prisma } from "@/lib/prisma";

const DEV_TEAM_NAME = "Тестовая команда";
const DEV_GROUP_NAME = "Основная";
const DEV_SCHOOL_NAME = "__dev_parent_fixture_school__";
const DEV_PLAYER_FIRST = "Марк";
const DEV_PLAYER_LAST = "Голыш";
const DEV_BIRTH_YEAR = 2019;

/**
 * Idempotent: if this parent already has ParentPlayer rows, does nothing.
 * Otherwise creates School → Team → TeamGroup → Player + ParentPlayer and verifies.
 */
export async function ensureDevParentFixtureGuaranteed(parentId: string): Promise<void> {
  console.log("CHECKING PARENT PLAYERS", { parentId });

  const ppCount = await prisma.parentPlayer.count({
    where: { parentId },
  });

  if (ppCount > 0) {
    console.log("DEV FIXTURE: parent already has ParentPlayer rows, skip", {
      parentId,
      ppCount,
    });
    return;
  }

  console.log("NO PLAYERS → CREATING FIXTURE", { parentId });

  await prisma.$transaction(async (tx) => {
    let school = await tx.school.findFirst({
      where: { name: DEV_SCHOOL_NAME },
    });
    if (!school) {
      school = await tx.school.create({
        data: {
          name: DEV_SCHOOL_NAME,
          city: "Dev",
        },
      });
    }

    let team = await tx.team.findFirst({
      where: { schoolId: school.id, name: DEV_TEAM_NAME },
    });
    if (!team) {
      team = await tx.team.create({
        data: {
          name: DEV_TEAM_NAME,
          ageGroup: "2019",
          schoolId: school.id,
        },
      });
    }

    let group = await tx.teamGroup.findFirst({
      where: { teamId: team.id, name: DEV_GROUP_NAME },
    });
    if (!group) {
      group = await tx.teamGroup.create({
        data: {
          teamId: team.id,
          name: DEV_GROUP_NAME,
          level: 1,
          sortOrder: 0,
        },
      });
    }

    const player = await tx.player.create({
      data: {
        firstName: DEV_PLAYER_FIRST,
        lastName: DEV_PLAYER_LAST,
        birthYear: DEV_BIRTH_YEAR,
        position: "Нападающий",
        grip: "Правый",
        teamId: team.id,
        groupId: group.id,
        parentId,
      },
    });

    await tx.parentPlayer.create({
      data: {
        parentId,
        playerId: player.id,
        relation: "parent",
      },
    });
  });

  const verifyCount = await prisma.parentPlayer.count({
    where: { parentId },
  });
  if (verifyCount < 1) {
    console.error("DEV FIXTURE FAILED: ParentPlayer still empty after transaction", {
      parentId,
    });
    throw new Error("DEV_FIXTURE_PARENT_PLAYER_NOT_CREATED");
  }

  console.log("FIXTURE CREATED OK", { parentId, parentPlayerRows: verifyCount });
}

/** @deprecated use ensureDevParentFixtureGuaranteed */
export async function ensureDevParentFixtureIfNoPlayers(parentId: string): Promise<void> {
  return ensureDevParentFixtureGuaranteed(parentId);
}
