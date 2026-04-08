/**
 * Запасной тестовый User(COACH) для восстановления login, если основной сид не гоняли.
 *
 * Запуск: `npm run db:seed:login-recovery` (из корня репо, нужен DATABASE_URL).
 *
 * Учётные данные (coach-app / CRM, intent coach):
 *   phone: 79993334455
 *   password: 123456
 *   или email: coach.recovery@hockey-id.local + тот же пароль
 *
 * Основной демо-пользователь из prisma/seed.ts остаётся:
 *   phone 79991234567 / password 1234 (email cheprasov@hockey.edu)
 *   admin@hockey.edu / admin123 (SCHOOL_ADMIN)
 *
 * Prisma Studio: таблица User — можно вручную создать строку; поле password — bcrypt-хеш (как в этом скрипте).
 */

import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

const RECOVERY_EMAIL = "coach.recovery@hockey-id.local";
const RECOVERY_PHONE = "79993334455";
const RECOVERY_PASSWORD = "123456";

async function main() {
  let school = await prisma.school.findFirst();
  if (!school) {
    school = await prisma.school.create({
      data: {
        name: "Hockey Academy Moscow",
        address: "Seed recovery",
        phone: "+7 000 000-00-00",
        email: "recovery@hockey-id.local",
      },
    });
    console.log("[seed-login-recovery] created minimal school", school.id);
  }

  const team = await prisma.team.findFirst({ where: { schoolId: school.id } });
  const hash = await bcrypt.hash(RECOVERY_PASSWORD, 10);

  await prisma.user.upsert({
    where: { email: RECOVERY_EMAIL },
    create: {
      email: RECOVERY_EMAIL,
      password: hash,
      name: "Recovery Coach",
      role: "COACH",
      schoolId: school.id,
      teamId: team?.id ?? null,
      phone: RECOVERY_PHONE,
    },
    update: {
      password: hash,
      name: "Recovery Coach",
      role: "COACH",
      schoolId: school.id,
      teamId: team?.id ?? null,
      phone: RECOVERY_PHONE,
    },
  });

  console.log("[seed-login-recovery] OK");
  console.log(`  POST /api/auth/login  phone=${RECOVERY_PHONE}  password=${RECOVERY_PASSWORD}  intent=coach`);
  console.log(`  или email=${RECOVERY_EMAIL}  password=${RECOVERY_PASSWORD}`);
}

main()
  .catch((e) => {
    console.error("[seed-login-recovery] failed", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
