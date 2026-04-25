import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  const schools = await prisma.school.findMany({
    select: { id: true, name: true },
    orderBy: { name: "asc" },
  });
  console.log("SCHOOLS", JSON.stringify(schools, null, 2));

  const ha = await prisma.school.findFirst({
    where: { name: { contains: "Hockey Academy", mode: "insensitive" } },
  });
  console.log(
    "lookup Hockey Academy:",
    ha ? `${ha.id} | ${ha.name}` : "NULL (demo login schoolId will NOT resolve)"
  );

  const parents = await prisma.parent.findMany({
    select: { id: true, email: true, firstName: true, lastName: true },
    orderBy: { email: "asc" },
  });
  console.log("PARENTS", JSON.stringify(parents, null, 2));

  const pe = await prisma.parent.findFirst({
    where: { email: "parent@example.com" },
  });
  console.log(
    "parent@example.com:",
    pe ? `${pe.id} | ${pe.firstName}` : "NULL (demo parentId falls back to demo-parent)"
  );

  const teams = await prisma.team.findMany({
    select: { id: true, name: true, schoolId: true, coachId: true },
    orderBy: { id: "asc" },
    take: 15,
  });
  console.log("TEAMS (first 15)", JSON.stringify(teams, null, 2));

  if (ha) {
    const firstTeam = await prisma.team.findFirst({
      where: { schoolId: ha.id },
    });
    console.log(
      "findFirst team for resolved schoolId:",
      firstTeam ? `${firstTeam.id} | ${firstTeam.name}` : "none"
    );
  }

  const users = await prisma.user.findMany({
    where: {
      email: {
        in: ["coach@hockey.edu", "parent@example.com", "admin@hockey.edu"],
      },
    },
    select: { email: true, role: true, schoolId: true, teamId: true },
  });
  console.log("USER rows (CRM login users)", JSON.stringify(users, null, 2));

  if (pe) {
    const cnt = await prisma.player.count({
      where: {
        OR: [
          { parentId: pe.id },
          { parentPlayers: { some: { parentId: pe.id } } },
        ],
      },
    });
    console.log("players linked to parent@example.com parent row:", cnt);
  }

  await prisma.$disconnect();
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
