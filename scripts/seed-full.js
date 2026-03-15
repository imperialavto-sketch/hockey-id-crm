/**
 * Полный сид: Голыш Марк, тренеры Ковалёв и Мозякин, школа Казань
 * Запуск: node scripts/seed-full.js
 */
const { PrismaClient } = require("@prisma/client");
const prisma = new PrismaClient();

async function main() {
  // 1. Школа
  let school = await prisma.school.findFirst({
    where: { name: { contains: "Казань" } },
  });
  if (!school) {
    school = await prisma.school.create({
      data: {
        name: "Хоккейная школа Казань",
        city: "Казань",
        country: "Россия",
        address: "г. Казань, ул. Спортивная, 1",
        phone: "+7 843 123-45-67",
        email: "info@hockey-kazan.ru",
        description: "Хоккейная школа для детей и подростков",
      },
    });
    console.log("Создана школа:", school.name);
  }

  // 2. Команда
  const teamName = "Хоккейная школа Казань — Дети 10-12 лет";
  let team = await prisma.team.findFirst({
    where: {
      schoolId: school.id,
      OR: [{ name: teamName }, { name: "Дети 10-12 лет" }, { ageGroup: "10-12 лет" }],
    },
  });
  if (!team) {
    team = await prisma.team.create({
      data: {
        name: teamName,
        ageGroup: "10-12 лет",
        schoolId: school.id,
      },
    });
    console.log("Создана команда:", team.name);
  } else if (team.name !== teamName) {
    team = await prisma.team.update({
      where: { id: team.id },
      data: { name: teamName },
    });
  }

  // 3. Тренеры
  const coachesData = [
    { firstName: "Алексей", lastName: "Ковалёв", specialization: "Нападающие, техническая подготовка" },
    { firstName: "Сергей", lastName: "Мозякин", specialization: "Игровая практика, тактика" },
  ];
  for (const c of coachesData) {
    let coach = await prisma.coach.findFirst({
      where: { firstName: c.firstName, lastName: c.lastName },
    });
    if (!coach) {
      coach = await prisma.coach.create({
        data: {
          ...c,
          email: `${c.lastName.toLowerCase()}@hockey-kazan.ru`,
        },
      });
      console.log("Создан тренер:", coach.firstName, coach.lastName);
    }
  }

  const kovalev = await prisma.coach.findFirst({
    where: { firstName: "Алексей", lastName: "Ковалёв" },
  });
  const mozyakin = await prisma.coach.findFirst({
    where: { firstName: "Сергей", lastName: "Мозякин" },
  });
  if (mozyakin) {
    await prisma.team.update({
      where: { id: team.id },
      data: { coachId: mozyakin.id },
    });
  }
  const existingTrainings = await prisma.training.count({ where: { teamId: team.id } });
  if (existingTrainings === 0) {
    const now = new Date();
    for (let i = 0; i < 12; i++) {
      const d = new Date(now);
      d.setDate(d.getDate() + i * 3);
      d.setHours(18, 0, 0, 0);
      await prisma.training.create({
        data: {
          title: i < 3 ? `Тренировка ${i + 1}` : `Тренировка ${i + 1}`,
          startTime: d,
          endTime: new Date(d.getTime() + 90 * 60 * 1000),
          location: "Ледовая арена Казань",
          teamId: team.id,
          notes: i < 3 ? "Пример тренировки" : "Основная группа",
        },
      });
    }
  }
  let team2 = await prisma.team.findFirst({
    where: { schoolId: school.id, name: { contains: "Тренировочная" } },
  });
  if (mozyakin && !team2) {
    team2 = await prisma.team.create({
      data: {
        name: "Тренировочная группа Мозякина",
        ageGroup: "12-14 лет",
        schoolId: school.id,
        coachId: mozyakin.id,
      },
    });
  }
  if (team2 && mozyakin) {
    const existing = await prisma.training.count({ where: { teamId: team2.id } });
    if (existing === 0) {
      const now = new Date();
      for (let i = 0; i < 3; i++) {
        const d = new Date(now);
        d.setDate(d.getDate() - i * 2);
        await prisma.training.create({
          data: {
            title: `Занятие ${i + 1}`,
            startTime: d,
            endTime: new Date(d.getTime() + 60 * 60 * 1000),
            location: "Ледовая арена",
            teamId: team2.id,
            notes: "90 мин",
          },
        });
      }
    }
  }

  // 4. Родитель и игрок Голыш Марк
  let parent = await prisma.parent.findFirst({
    where: { lastName: "Голыш", firstName: "Иван" },
  });
  if (!parent) {
    parent = await prisma.parent.create({
      data: {
        firstName: "Иван",
        lastName: "Голыш",
        email: "parent@hockey-kazan.ru",
        phone: "+7 999 123-45-67",
      },
    });
    console.log("Создан родитель:", parent.firstName, parent.lastName);
  }

  const existing = await prisma.player.findFirst({
    where: { OR: [{ firstName: "Марк", lastName: "Голыш" }, { firstName: "Голыш", lastName: "Марк" }] },
  });

  let player;
  if (existing) {
    await prisma.video.deleteMany({ where: { playerId: existing.id } });
    await prisma.achievement.deleteMany({ where: { playerId: existing.id } });
    await prisma.teamHistory.deleteMany({ where: { playerId: existing.id } });
    await prisma.medical.deleteMany({ where: { playerId: existing.id } });
    await prisma.skills.deleteMany({ where: { playerId: existing.id } });
    await prisma.passport.deleteMany({ where: { playerId: existing.id } });

    player = await prisma.player.update({
      where: { id: existing.id },
      data: {
        firstName: "Марк",
        lastName: "Голыш",
        birthDate: new Date("2010-05-15"),
        position: "Нападающий",
        height: 150,
        weight: 45,
        city: "Казань",
        country: "Россия",
        internationalRating: 92,
        teamId: team.id,
        parentId: parent.id,
      },
    });
    console.log("Обновлён игрок:", player.firstName, player.lastName);
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
        teamId: team.id,
        parentId: parent.id,
      },
    });
    console.log("Создан игрок:", player.firstName, player.lastName);
  }

  await prisma.teamHistory.deleteMany({ where: { playerId: player.id } });
  await prisma.passport.upsert({
    where: { playerId: player.id },
    create: {
      playerId: player.id,
      passportNumber: "1234567890",
      issueDate: new Date("2020-01-01"),
      expiryDate: new Date("2030-01-01"),
      issuedBy: "Хоккейная школа Казань",
      internationalID: "INT-2026-0001",
    },
    update: {},
  });

  await prisma.teamHistory.create({
    data: {
      playerId: player.id,
      teamName: "Хоккейная школа Казань",
      season: "2023/24",
      league: "Дети 10-12 лет",
      coach: "Алексей Ковалёв",
      stats: { gamesPlayed: 15, goals: 12, assists: 7, penalties: 2 },
    },
  });

  await prisma.medical.upsert({
    where: { playerId: player.id },
    create: {
      playerId: player.id,
      lastCheckup: new Date("2026-03-01"),
      injuries: "Легкая травма плеча",
      restrictions: "Нет",
    },
    update: {
      lastCheckup: new Date("2026-03-01"),
      injuries: "Легкая травма плеча",
      restrictions: "Нет",
    },
  });

  await prisma.skills.upsert({
    where: { playerId: player.id },
    create: {
      playerId: player.id,
      speed: 85,
      shotAccuracy: 78,
      dribbling: 80,
      stamina: 88,
    },
    update: {},
  });

  await prisma.achievement.deleteMany({ where: { playerId: player.id } });
  await prisma.achievement.createMany({
    data: [
      { playerId: player.id, title: "Лучший бомбардир сезона", year: 2025, description: "12 голов в 15 играх" },
      { playerId: player.id, title: "Приз лучшему игроку турнира", year: 2024, description: "Турнир «Золотая шайба»" },
      { playerId: player.id, title: "Чемпион лиги 10-12 лет", year: 2024, description: "Хоккейная школа Казань" },
    ],
  });

  await prisma.playerStat.deleteMany({ where: { playerId: player.id } });
  await prisma.playerStat.create({
    data: {
      playerId: player.id,
      season: "2023/24",
      games: 15,
      goals: 12,
      assists: 7,
      points: 19,
      pim: 2,
    },
  });

  await prisma.video.deleteMany({ where: { playerId: player.id } });
  await prisma.video.createMany({
    data: [
      { playerId: player.id, title: "Гол в финале турнира", url: "https://example.com/video1.mp4" },
      { playerId: player.id, title: "Тренировочный матч", url: "https://www.youtube.com/watch?v=example2" },
      { playerId: player.id, title: "Интервью после игры", url: "https://www.youtube.com/watch?v=example3" },
    ],
  });

  await prisma.playerPayment.deleteMany({ where: { playerId: player.id } });
  await prisma.playerPayment.createMany({
    data: [
      { playerId: player.id, month: 3, year: 2026, amount: 5000, status: "Оплачено", paidAt: new Date("2026-03-15"), comment: "Оплачено в срок" },
      { playerId: player.id, month: 4, year: 2026, amount: 5000, status: "Не оплачено", paidAt: null },
      { playerId: player.id, month: 5, year: 2026, amount: 5000, status: "Частично", paidAt: null, comment: "Внесено 2500 ₽" },
      { playerId: player.id, month: 2, year: 2026, amount: 5000, status: "Оплачено", paidAt: new Date("2026-02-10") },
    ],
  });

  // Дополнительные игроки и платежи для аналитики
  const extraPlayers = [
    { firstName: "Артём", lastName: "Петров" },
    { firstName: "Кирилл", lastName: "Сидоров" },
    { firstName: "Даниил", lastName: "Иванов" },
    { firstName: "Максим", lastName: "Козлов" },
  ];
  for (const p of extraPlayers) {
    let pl = await prisma.player.findFirst({
      where: { firstName: p.firstName, lastName: p.lastName, teamId: team.id },
    });
    if (!pl) {
      pl = await prisma.player.create({
        data: {
          firstName: p.firstName,
          lastName: p.lastName,
          birthYear: 2011,
          position: "Нападающий",
          grip: "Левый",
          teamId: team.id,
          parentId: parent.id,
          status: "Активен",
        },
      });
    }
    const count = await prisma.playerPayment.count({ where: { playerId: pl.id, year: 2026 } });
    if (count === 0) {
      await prisma.playerPayment.createMany({
        data: [
          { playerId: pl.id, month: 3, year: 2026, amount: 5000, status: "Оплачено", paidAt: new Date("2026-03-10") },
          { playerId: pl.id, month: 4, year: 2026, amount: 5000, status: "Не оплачено", paidAt: null },
          { playerId: pl.id, month: 5, year: 2026, amount: 5000, status: Math.random() > 0.5 ? "Не оплачено" : "Оплачено", paidAt: Math.random() > 0.5 ? new Date("2026-05-01") : null },
        ],
      });
    }
  }

  const teamTrainings = await prisma.training.findMany({
    where: { teamId: team.id },
    orderBy: { startTime: "desc" },
    take: 5,
  });
  for (const t of teamTrainings) {
    await prisma.attendance.upsert({
      where: {
        trainingId_playerId: { trainingId: t.id, playerId: player.id },
      },
      create: {
        trainingId: t.id,
        playerId: player.id,
        status: Math.random() > 0.3 ? "PRESENT" : "ABSENT",
        comment: Math.random() > 0.5 ? "Отработал отлично" : null,
      },
      update: {},
    });
  }

  await prisma.coachRating.deleteMany({
    where: { playerId: player.id },
  });
  if (mozyakin) {
    await prisma.coachRating.create({
      data: {
        coachId: mozyakin.id,
        playerId: player.id,
        rating: 5,
        recommendation: "Отличный прогресс. Рекомендую для перевода в старшую группу.",
        comment: "Март 2026",
      },
    });
  }
  if (kovalev) {
    await prisma.coachRating.create({
      data: {
        coachId: kovalev.id,
        playerId: player.id,
        rating: 4,
        recommendation: "Хорошая техника катания. Работать над ударом.",
        comment: "Февраль 2026",
      },
    });
  }

  const teamTrainingsForJournal = await prisma.training.findMany({
    where: { teamId: team.id },
    orderBy: { startTime: "asc" },
    take: 3,
  });
  for (const t of teamTrainingsForJournal) {
    if (mozyakin) {
      await prisma.trainingJournal.upsert({
        where: {
          trainingId_coachId: { trainingId: t.id, coachId: mozyakin.id },
        },
        create: {
          trainingId: t.id,
          coachId: mozyakin.id,
          topic: "Техника катания и передачи",
          goals: "Отработка конькового хода, передачи в движении",
          notes: "Группа работала активно",
          teamComment: "Общий прогресс хороший. Марк Голыш выделился.",
        },
        update: {},
      });
    }
  }

  await prisma.activityLog.deleteMany({});
  const activities = [
    { type: "create_player", message: "Добавлен игрок Марк Голыш", entityType: "Player", entityId: player.id },
    { type: "create_training", message: "Создана тренировка «Техника катания»", entityType: "Training" },
    { type: "payment_updated", message: "Оплата март 2026 — Голыш Марк", entityType: "Payment" },
    { type: "rating_added", message: "Оценка 5 — Голыш Марк (Мозякин С.)" },
    { type: "recommendation_added", message: "Рекомендация: перевод в старшую группу — Голыш Марк" },
    { type: "create_coach", message: "Добавлен тренер Сергей Мозякин", entityType: "Coach" },
    { type: "create_team", message: "Создана команда «Дети 10-12 лет»", entityType: "Team" },
    { type: "create_player", message: "Добавлен игрок Артём Петров", entityType: "Player" },
    { type: "payment_updated", message: "Создан платёж апрель 2026 — Петров А." },
    { type: "rating_added", message: "Оценка 4 — Петров А. (Ковалёв А.)" },
  ];
  for (const a of activities) {
    await prisma.activityLog.create({
      data: {
        type: a.type,
        entityType: a.entityType ?? null,
        entityId: a.entityId ?? null,
        message: a.message,
      },
    });
  }

  console.log("\n✓ Сид завершён: Голыш Марк, Ковалёв, Мозякин, журнал, ActivityLog");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
