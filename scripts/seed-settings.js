/**
 * Сид настроек: демо-пользователи, роли, права доступа
 * Запуск: node scripts/seed-settings.js
 */
const { PrismaClient } = require("@prisma/client");
const prisma = new PrismaClient();

const DEMO_IDS = ["demo-admin", "demo-coach", "demo-parent"];

const MODULES = ["dashboard", "school", "teams", "players", "coaches", "schedule", "finance", "analytics", "communications", "settings"];
const FULL_ACCESS = { canView: true, canCreate: true, canEdit: true, canDelete: true };
const VIEW_EDIT = { canView: true, canCreate: true, canEdit: true, canDelete: false };
const VIEW_ONLY = { canView: true, canCreate: false, canEdit: false, canDelete: false };

async function main() {
  const rolesData = [
    { name: "Администратор", systemRole: "SCHOOL_ADMIN", perms: MODULES.map(() => FULL_ACCESS) },
    { name: "Главный тренер", systemRole: "MAIN_COACH", perms: MODULES.map((_, i) => (["settings"].includes(MODULES[i]) ? VIEW_ONLY : VIEW_EDIT)) },
    { name: "Тренер", systemRole: "COACH", perms: MODULES.map((_, i) => {
      if (MODULES[i] === "settings") return { canView: false, canCreate: false, canEdit: false, canDelete: false };
      if (["school", "finance"].includes(MODULES[i])) return VIEW_ONLY;
      return VIEW_EDIT;
    })},
    { name: "Менеджер школы", systemRole: "SCHOOL_MANAGER", perms: MODULES.map((_, i) => (MODULES[i] === "settings" ? VIEW_ONLY : VIEW_EDIT)) },
  ];

  for (const r of rolesData) {
    let role = await prisma.role.findFirst({ where: { systemRole: r.systemRole } });
    if (!role) {
      role = await prisma.role.create({ data: { name: r.name, systemRole: r.systemRole } });
      console.log("Создана роль:", role.name);
    }
    await prisma.permission.deleteMany({ where: { roleId: role.id } });
    for (let i = 0; i < MODULES.length; i++) {
      await prisma.permission.create({
        data: {
          roleId: role.id,
          module: MODULES[i],
          ...r.perms[i],
        },
      });
    }
  }

  let sys = await prisma.systemSetting.findFirst();
  if (!sys) {
    await prisma.systemSetting.create({
      data: { theme: "dark", language: "ru", timezone: "Europe/Moscow", dateFormat: "DD.MM.YYYY", currency: "RUB" },
    });
    console.log("Созданы системные настройки");
  }

  let notif = await prisma.notificationSetting.findFirst({ where: { userId: null } });
  if (!notif) {
    await prisma.notificationSetting.create({
      data: {
        emailEnabled: true,
        pushEnabled: true,
        systemEnabled: true,
        newMessages: true,
        newPayments: true,
        overduePayments: true,
        newTrainings: true,
        scheduleChanges: true,
      },
    });
    console.log("Созданы настройки уведомлений");
  }

  for (const userId of DEMO_IDS) {
    await prisma.userSettings.upsert({
      where: { userId },
      create: {
        userId,
        name: userId === "demo-admin" ? "School Admin" : userId === "demo-coach" ? "Alex Coach" : "Ivan Petrov",
        email: userId === "demo-admin" ? "admin@hockey.edu" : userId === "demo-coach" ? "coach@hockey.edu" : "parent@example.com",
        emailNotifications: true,
        pushNotifications: true,
        smsNotifications: false,
        theme: "dark",
        colorScheme: "neon",
        googleCalendarSync: false,
        twoFactorEnabled: false,
      },
      update: {},
    });
    // Добавляем запись в историю входов
    const existing = await prisma.loginHistory.findFirst({ where: { userId } });
    if (!existing) {
      await prisma.loginHistory.create({
        data: {
          userId,
          ipAddress: "127.0.0.1",
          userAgent: "Mozilla/5.0 (demo)",
        },
      });
    }
  }
  console.log("✓ Настройки и история входов созданы для демо-пользователей");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
