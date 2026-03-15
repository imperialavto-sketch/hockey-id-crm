/**
 * Экспорт всех данных CRM в JSON
 * Запуск: node scripts/export-data.js
 */
const { PrismaClient } = require("@prisma/client");
const prisma = new PrismaClient();

function toJson(obj) {
  return JSON.parse(
    JSON.stringify(obj, (_, v) => (v instanceof Date ? v.toISOString() : v))
  );
}

async function main() {
  const teams = await prisma.team.findMany({
    include: {
      school: true,
      coach: true,
      players: { include: { team: true } },
      trainings: {
        include: {
          attendances: { include: { player: true } },
        },
        orderBy: { startTime: "asc" },
      },
    },
  });

  const coaches = await prisma.coach.findMany({
    include: {
      teams: { include: { school: true } },
    },
  });

  const players = await prisma.player.findMany({
    include: {
      team: true,
      passport: true,
      teamHistory: true,
      medical: true,
      skills: true,
      achievements: true,
      videos: true,
      stats: true,
      payments: true,
      coachRatings: { include: { coach: true } },
      attendances: { include: { training: true } },
    },
  });

  const trainings = await prisma.training.findMany({
    include: {
      team: { include: { coach: true } },
      attendances: { include: { player: true } },
    },
    orderBy: { startTime: "asc" },
  });

  const data = {
    exportedAt: new Date().toISOString(),
    teams: toJson(teams),
    coaches: toJson(coaches),
    players: toJson(players),
    trainings: toJson(trainings),
  };

  console.log(JSON.stringify(data, null, 2));
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
