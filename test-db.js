const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function main() {
  const userCount = await prisma.user.count();
  console.log('User count:', userCount);

  const parentCount = await prisma.parent.count();
  console.log('Parent count:', parentCount);
}

main()
  .catch((e) => {
    console.error(e);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
