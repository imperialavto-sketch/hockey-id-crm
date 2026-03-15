import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

async function main() {
  const hashed = await bcrypt.hash("admin123", 10);

  let school = await prisma.school.findFirst({ where: { name: "Hockey Academy Moscow" } });
  if (!school) {
    school = await prisma.school.create({
      data: {
        name: "Hockey Academy Moscow",
        address: "Ice Arena, 123 Sport St",
        phone: "+7 495 123-45-67",
        email: "info@hockey-academy.ru",
      },
    });
  }

  await prisma.user.upsert({
    where: { email: "admin@hockey.edu" },
    create: {
      email: "admin@hockey.edu",
      password: hashed,
      name: "School Admin",
      role: "SCHOOL_ADMIN",
      schoolId: school.id,
    },
    update: {},
  });

  // Coach user - teamId set later when golyshTeam exists

  await prisma.user.upsert({
    where: { email: "parent@example.com" },
    create: {
      email: "parent@example.com",
      password: hashed,
      name: "Ivan Petrov",
      role: "PARENT",
      schoolId: school.id,
    },
    update: {},
  });

  let team = await prisma.team.findFirst({ where: { name: "Bears U12", schoolId: school.id } });
  if (!team) {
    team = await prisma.team.create({
      data: {
        name: "Bears U12",
        ageGroup: "U12",
        schoolId: school.id,
      },
    });
  }

  let training = await prisma.training.findFirst({ where: { teamId: team.id } });
  if (!training) {
    training = await prisma.training.create({
      data: {
        title: "Morning Practice",
        startTime: new Date("2025-03-10T09:00:00"),
        endTime: new Date("2025-03-10T10:30:00"),
        location: "Main Rink",
        teamId: team.id,
      },
    });
  }

  // Parent для demo (parent@example.com) — data scope для PARENT
  let parent = await prisma.parent.findFirst({ where: { email: "parent@example.com" } });
  if (!parent) {
    parent = await prisma.parent.create({
      data: {
        firstName: "Иван",
        lastName: "Петров",
        email: "parent@example.com",
        phone: "+7 999 123-45-67",
      },
    });
  }

  const existingPlayer = await prisma.player.findFirst({ where: { firstName: "Дмитрий", lastName: "Петров" } });
  if (!existingPlayer) {
    await prisma.player.create({
      data: {
        firstName: "Дмитрий",
        lastName: "Петров",
        birthYear: 2012,
        position: "Нападающий",
        grip: "Левый",
        teamId: team.id,
        parentId: parent.id,
        status: "Активен",
        comment: "Перспективный игрок.",
      },
    });
  } else if (!existingPlayer.parentId) {
    await prisma.player.update({
      where: { id: existingPlayer.id },
      data: { parentId: parent.id },
    });
  }

  // Parent "Юрий Голыш" + Player "Голыш Марк" для mobile app dev (код 1234)
  let yuryParent = await prisma.parent.findFirst({ where: { phone: { contains: "9001234567" } } });
  if (!yuryParent) {
    yuryParent = await prisma.parent.create({
      data: {
        firstName: "Юрий",
        lastName: "Голыш",
        phone: "+7 900 123-45-67",
        email: "yury@example.com",
      },
    });
  }

  let golyshTeam = await prisma.team.findFirst({ where: { name: "Ак Барс 2014", schoolId: school.id } });
  if (!golyshTeam) {
    golyshTeam = await prisma.team.create({
      data: {
        name: "Ак Барс 2014",
        ageGroup: "2014",
        schoolId: school.id,
      },
    });
  }

  // Coach for team (for chat)
  let coach = await prisma.coach.findFirst({ where: { firstName: "Алексей", lastName: "Тренеров" } });
  if (!coach) {
    coach = await prisma.coach.create({
      data: {
        firstName: "Алексей",
        lastName: "Тренеров",
        email: "coach@hockey.edu",
        phone: "+7 916 000-00-00",
      },
    });
  }
  if (!golyshTeam.coachId) {
    await prisma.team.update({
      where: { id: golyshTeam.id },
      data: { coachId: coach.id },
    });
    golyshTeam = await prisma.team.findUnique({ where: { id: golyshTeam.id } }) ?? golyshTeam;
  }
  await prisma.user.upsert({
    where: { email: "coach@hockey.edu" },
    create: {
      email: "coach@hockey.edu",
      password: hashed,
      name: "Alex Coach",
      role: "COACH",
      schoolId: school.id,
      teamId: golyshTeam.id,
    },
    update: { teamId: golyshTeam.id },
  });

  let markPlayer = await prisma.player.findFirst({ where: { firstName: "Марк", lastName: "Голыш" } });
  if (!markPlayer) {
    markPlayer = await prisma.player.create({
      data: {
        firstName: "Марк",
        lastName: "Голыш",
        birthYear: 2014,
        position: "Нападающий",
        grip: "Левый",
        teamId: golyshTeam.id,
        parentId: yuryParent.id,
        status: "Активен",
      },
    });
  } else if (!markPlayer.parentId) {
    await prisma.player.update({
      where: { id: markPlayer.id },
      data: { parentId: yuryParent.id },
    });
  }

  if (markPlayer) {
    const existingProfile = await prisma.playerProfile.findUnique({ where: { playerId: markPlayer.id } });
    if (!existingProfile) {
      await prisma.playerProfile.create({
        data: {
          playerId: markPlayer.id,
          jerseyNumber: 17,
        },
      });
    }

    // Progress history for Голыш Марк
    const snapshots = [
      { month: 10, year: 2025, games: 4, goals: 2, assists: 1, points: 3, attendancePercent: 85, coachComment: "Привыкает к темпу, нужно добавить уверенности.", focusArea: "Катание", trend: "stable" },
      { month: 11, year: 2025, games: 5, goals: 3, assists: 2, points: 5, attendancePercent: 88, coachComment: "Стал активнее вступать в борьбу.", focusArea: "Баланс и корпус", trend: "up" },
      { month: 12, year: 2025, games: 4, goals: 3, assists: 3, points: 6, attendancePercent: 90, coachComment: "Есть прогресс в понимании эпизода.", focusArea: "Принятие решений", trend: "up" },
      { month: 1, year: 2026, games: 6, goals: 4, assists: 3, points: 7, attendancePercent: 92, coachComment: "Хорошая активность в атаке, но нужно улучшать стартовую скорость.", focusArea: "Стартовая скорость", trend: "up" },
    ];
    for (const s of snapshots) {
      await prisma.playerProgressSnapshot.upsert({
        where: {
          playerId_month_year: { playerId: markPlayer.id, month: s.month, year: s.year },
        },
        create: { playerId: markPlayer.id, ...s },
        update: { ...s },
      });
    }

    // Chat: Юрий Голыш ↔ тренер (Голыш Марк)
    const coachForChat = golyshTeam.coachId ? await prisma.coach.findUnique({ where: { id: golyshTeam.coachId } }) : coach;
    if (coachForChat) {
      let chatConv = await prisma.chatConversation.findFirst({
        where: { playerId: markPlayer.id, parentId: yuryParent.id, coachId: coachForChat.id },
      });
      if (!chatConv) {
        chatConv = await prisma.chatConversation.create({
          data: {
            playerId: markPlayer.id,
            parentId: yuryParent.id,
            coachId: coachForChat.id,
          },
        });
        await prisma.chatMessage.createMany({
          data: [
            { conversationId: chatConv.id, senderType: "coach", senderId: coachForChat.id, text: "Добрый день! Марк сегодня хорошо отработал тренировку." },
            { conversationId: chatConv.id, senderType: "parent", senderId: yuryParent.id, text: "Спасибо! На что нам стоит обратить внимание дома?" },
            { conversationId: chatConv.id, senderType: "coach", senderId: coachForChat.id, text: "Рекомендую уделить внимание стартовой скорости и балансу." },
          ],
        });
      }
    }

    // Feed posts for Ак Барс 2014
    const coachForFeed = golyshTeam.coachId
      ? await prisma.coach.findUnique({ where: { id: golyshTeam.coachId } })
      : coach;
    const authorName = coachForFeed
      ? `${coachForFeed.firstName} ${coachForFeed.lastName}`
      : "Тренер";

    const feedPosts = [
      {
        type: "announcement",
        title: "Изменение времени тренировки",
        body: "Тренировка в среду перенесена на 18:30.",
        isPinned: true,
      },
      {
        type: "news",
        title: "Поздравляем команду с победой",
        body: "Команда Ак Барс 2014 одержала уверенную победу в матче выходного дня.",
        isPinned: false,
      },
      {
        type: "match_day",
        title: "Матч в субботу",
        body: "Сбор команды в 11:15. Начало игры в 12:00.",
        isPinned: false,
      },
      {
        type: "photo_post",
        title: "Фото с тренировки",
        body: "Несколько кадров с сегодняшнего занятия.",
        isPinned: false,
      },
    ];

    for (const fp of feedPosts) {
      const existing = await prisma.teamFeedPost.findFirst({
        where: { teamId: golyshTeam.id, title: fp.title },
      });
      if (!existing) {
        await prisma.teamFeedPost.create({
          data: {
            teamId: golyshTeam.id,
            authorId: coachForFeed?.id ?? "seed",
            authorRole: "coach",
            authorName,
            type: fp.type,
            title: fp.title,
            body: fp.body,
            isPinned: fp.isPinned,
            publishedAt: new Date(),
          },
        });
      }
    }
  }

  // Marketplace: seed coaches (Казань)
  const marketplaceCoaches = [
    {
      fullName: "Алексей Петров",
      slug: "aleksey-petrov",
      city: "Казань",
      bio: "Тренер по катанию и индивидуальной технике для юных хоккеистов.",
      specialties: ["Катание", "Подкатка"],
      experienceYears: 8,
      priceFrom: 2500,
      rating: 4.9,
      trainingFormats: ["individual", "offline"],
      isPublished: true,
      services: [
        { title: "Индивидуальное катание 1 час", category: "skating", durationMinutes: 60, price: 2500, format: "individual" },
        { title: "Подкатка в группе", category: "team_extra_training", durationMinutes: 90, price: 1500, format: "group" },
      ],
    },
    {
      fullName: "Илья Смирнов",
      slug: "ilya-smirnov",
      city: "Казань",
      bio: "Специализация: техника броска и индивидуальные тренировки.",
      specialties: ["Бросок", "Индивидуальная тренировка"],
      experienceYears: 6,
      priceFrom: 3000,
      rating: 4.8,
      trainingFormats: ["individual", "group", "offline"],
      isPublished: true,
      services: [
        { title: "Индивидуальная тренировка по броску", category: "shooting", durationMinutes: 60, price: 3000, format: "individual" },
        { title: "Групповое занятие по броску", category: "shooting", durationMinutes: 90, price: 1800, format: "group" },
      ],
    },
    {
      fullName: "Дмитрий Волков",
      slug: "dmitry-volkov",
      city: "Казань",
      bio: "ОФП, баланс, скорость — подготовка юных хоккеистов к сезону.",
      specialties: ["ОФП", "Баланс", "Скорость"],
      experienceYears: 10,
      priceFrom: 2200,
      rating: 4.7,
      trainingFormats: ["individual", "group", "offline"],
      isPublished: true,
      services: [
        { title: "ОФП индивидуально", category: "strength", durationMinutes: 60, price: 2200, format: "individual" },
        { title: "Баланс и координация", category: "strength", durationMinutes: 60, price: 2500, format: "individual" },
      ],
    },
  ];

  for (const mc of marketplaceCoaches) {
    const existing = await prisma.coachProfile.findFirst({ where: { slug: mc.slug } });
    if (!existing) {
      const { services, ...coachData } = mc;
      const coach = await prisma.coachProfile.create({
        data: {
          ...coachData,
          specialties: coachData.specialties,
          trainingFormats: coachData.trainingFormats,
        },
      });
      for (const s of services) {
        await prisma.coachService.create({
          data: {
            coachId: coach.id,
            title: s.title,
            category: s.category,
            durationMinutes: s.durationMinutes,
            price: s.price,
            format: s.format,
          },
        });
      }
    }
  }
}

main()
  .then(() => prisma.$disconnect())
  .catch((e) => {
    console.error(e);
    prisma.$disconnect();
    process.exit(1);
  });
