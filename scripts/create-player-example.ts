/**
 * Создание игрока Марк Голыш с профилем и базовой статистикой
 * Соответствует prisma/schema.prisma
 *
 * Запуск: npx tsx scripts/create-player-example.ts
 * или: npx ts-node scripts/create-player-example.ts
 */
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function createPlayer() {
  // Найти первую команду (если есть)
  const team = await prisma.team.findFirst();

  const player = await prisma.player.create({
    data: {
      firstName: "Марк",
      lastName: "Голыш",
      birthYear: 2012,
      position: "Нападающий",
      grip: "Левый",
      status: "Активен",
      ...(team && { teamId: team.id }),
      profile: {
        create: {
          height: 150,
          weight: 40,
          jerseyNumber: 10,
          shoots: "Левый",
        },
      },
      stats: {
        create: {
          season: "2024/2025",
          games: 0,
          goals: 0,
          assists: 0,
          points: 0,
          pim: 0,
        },
      },
    },
    include: {
      profile: true,
      stats: true,
      team: true,
    },
  });

  console.log("Создан игрок:", JSON.stringify(player, null, 2));
}

createPlayer()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
