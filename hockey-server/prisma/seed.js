const { PrismaClient } = require("@prisma/client");
const prisma = new PrismaClient();

async function main() {
  const existing = await prisma.coachProfile.findFirst();
  if (existing) {
    console.log("CoachProfile already seeded");
    return;
  }
  const coach = await prisma.coachProfile.create({
    data: {
      fullName: "Алексей Петров",
      slug: "aleksey-petrov",
      city: "Казань",
      bio: "Тренер по катанию и индивидуальной технике.",
      specialization: "Катание",
      experienceYears: 8,
      priceFrom: 2500,
      rating: 4.9,
      isPublished: true,
    },
  });
  await prisma.coachService.create({
    data: {
      coachId: coach.id,
      title: "Индивидуальное катание 1 час",
      category: "skating",
      durationMinutes: 60,
      price: 2500,
      format: "individual",
    },
  });
  await prisma.coachSlot.createMany({
    data: [
      { coachId: coach.id, startTime: new Date(Date.now() + 86400000), endTime: new Date(Date.now() + 86400000 + 3600000), available: true },
      { coachId: coach.id, startTime: new Date(Date.now() + 172800000), endTime: new Date(Date.now() + 172800000 + 3600000), available: true },
    ],
  });
  console.log("Seeded CoachProfile:", coach.id);
}

main()
  .then(() => prisma.$disconnect())
  .catch((e) => {
    console.error(e);
    prisma.$disconnect();
    process.exit(1);
  });
