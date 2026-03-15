/**
 * Паспорт хоккеиста — создание тестового игрока Голыш Марк
 * Запуск: node scripts/seed-hockey-passport.js
 */
const { PrismaClient } = require("@prisma/client");
const prisma = new PrismaClient();

async function main() {
  const existing = await prisma.player.findFirst({
    where: { firstName: "Марк", lastName: "Голыш" },
    include: {
      passport: true,
      teamHistory: true,
      medical: true,
      skills: true,
      achievements: true,
      videos: true,
    },
  });

  let player;

  if (existing) {
    console.log("Игрок Голыш Марк уже существует. Обновляем данные...\n");

    await prisma.video.deleteMany({ where: { playerId: existing.id } });
    await prisma.achievement.deleteMany({ where: { playerId: existing.id } });
    await prisma.teamHistory.deleteMany({ where: { playerId: existing.id } });
    await prisma.medical.deleteMany({ where: { playerId: existing.id } });
    await prisma.skills.deleteMany({ where: { playerId: existing.id } });
    await prisma.passport.deleteMany({ where: { playerId: existing.id } });

    player = await prisma.player.update({
      where: { id: existing.id },
      data: {
        birthDate: new Date("2010-05-15"),
        position: "Нападающий",
        height: 150,
        weight: 45,
        city: "Казань",
        country: "Россия",
        internationalRating: 92,
      },
    });
  } else {
    player = await prisma.player.create({
      data: {
        firstName: "Марк",
        lastName: "Голыш",
        birthYear: 2010,
        birthDate: new Date("2010-05-15"),
        position: "Нападающий",
        grip: "Левый",
        height: 150,
        weight: 45,
        city: "Казань",
        country: "Россия",
        internationalRating: 92,
        status: "Активен",
      },
    });
  }

  await prisma.passport.create({
    data: {
      playerId: player.id,
      passportNumber: "1234567890",
      issueDate: new Date("2020-01-01"),
      expiryDate: new Date("2030-01-01"),
      issuedBy: "Хоккейная школа Казань",
      internationalID: "INT-2026-0001",
    },
  });

  await prisma.teamHistory.create({
    data: {
      playerId: player.id,
      teamName: "Хоккейная школа Казань",
      season: "2023/24",
      league: "Дети 10-12 лет",
      coach: "Алексей Ковалёв",
      stats: {
        gamesPlayed: 15,
        goals: 12,
        assists: 7,
        penalties: 2,
      },
    },
  });

  await prisma.medical.create({
    data: {
      playerId: player.id,
      lastCheckup: new Date("2026-03-01"),
      injuries: [
        {
          type: "Лёгкая травма плеча",
          date: "2025-11-10",
          recoveryDays: 14,
        },
      ],
      restrictions: "Нет",
    },
  });

  await prisma.skills.create({
    data: {
      playerId: player.id,
      speed: 85,
      shotAccuracy: 78,
      dribbling: 80,
      stamina: 88,
    },
  });

  await prisma.achievement.create({
    data: {
      playerId: player.id,
      title: "Лучший бомбардир сезона",
      year: 2025,
    },
  });

  await prisma.video.create({
    data: {
      playerId: player.id,
      title: "Гол в финале турнира",
      url: "https://example.com/video1.mp4",
    },
  });

  const fullPlayer = await prisma.player.findUnique({
    where: { id: player.id },
    include: {
      passport: true,
      teamHistory: true,
      medical: true,
      skills: true,
      achievements: true,
      videos: true,
    },
  });

  console.log("=".repeat(60));
  console.log("ПАСПОРТ ХОККЕИСТА — Создан игрок");
  console.log("=".repeat(60));
  console.log(JSON.stringify(fullPlayer, (_, v) =>
    v instanceof Date ? v.toISOString() : v
  , 2));
  console.log("=".repeat(60));
  console.log("✓ Готово.");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
