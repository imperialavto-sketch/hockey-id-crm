import { NextRequest, NextResponse } from "next/server";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(() => ({}));
    const { userId, currentPassword, newPassword } = body;

    if (!userId || !currentPassword || !newPassword) {
      return NextResponse.json(
        { error: "Все поля обязательны" },
        { status: 400 }
      );
    }

    if (newPassword.length < 6) {
      return NextResponse.json(
        { error: "Пароль должен быть не менее 6 символов" },
        { status: 400 }
      );
    }

    // Demo mode: accept admin123 as current password
    const DEMO_PASSWORD = "admin123";
    if (currentPassword !== DEMO_PASSWORD) {
      return NextResponse.json(
        { error: "Неверный текущий пароль" },
        { status: 401 }
      );
    }

    // In production: update password in database via bcrypt
    // await prisma.user.update({ where: { id: userId }, data: { password: hashed } });
    return NextResponse.json({ ok: true, message: "Пароль обновлён (демо режим)" });
  } catch (error) {
    console.error("POST /api/settings/password failed:", error);
    return NextResponse.json(
      { error: "Ошибка смены пароля" },
      { status: 500 }
    );
  }
}
