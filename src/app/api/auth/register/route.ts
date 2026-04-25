/**
 * Parent email registration — creates `Parent` + `User` (role PARENT) when enabled.
 * Opt out: PARENT_EMAIL_REGISTER_DISABLED=true
 */

import { NextRequest, NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { Prisma } from "@prisma/client";
import { setSessionCookie } from "@/lib/api-auth";
import { prisma } from "@/lib/prisma";

const NO_STORE = { "Cache-Control": "no-store" } as const;

function splitDisplayName(name: string | undefined, emailLocal: string): { firstName: string; lastName: string } {
  const raw = (name ?? "").trim();
  if (!raw) {
    return { firstName: emailLocal || "Родитель", lastName: "—" };
  }
  const parts = raw.split(/\s+/).filter(Boolean);
  if (parts.length === 1) {
    return { firstName: parts[0], lastName: "—" };
  }
  return { firstName: parts[0], lastName: parts.slice(1).join(" ") };
}

export async function POST(req: NextRequest) {
  if (process.env.PARENT_EMAIL_REGISTER_DISABLED === "true") {
    return NextResponse.json(
      {
        error: "Регистрация по email временно недоступна. Войдите по номеру телефона.",
        code: "REGISTER_DISABLED",
      },
      { status: 503, headers: NO_STORE }
    );
  }

  try {
    const body = await req.json().catch(() => ({}));
    const emailRaw = body.email;
    const password = body.password;
    const name = typeof body.name === "string" ? body.name : undefined;

    if (!emailRaw || !password) {
      return NextResponse.json(
        { error: "Email и пароль обязательны" },
        { status: 400, headers: NO_STORE }
      );
    }

    const email = String(emailRaw).toLowerCase().trim();
    if (!email.includes("@")) {
      return NextResponse.json({ error: "Некорректный email" }, { status: 400, headers: NO_STORE });
    }

    const existingUser = await prisma.user.findUnique({ where: { email } });
    if (existingUser) {
      return NextResponse.json(
        { error: "Пользователь с таким email уже зарегистрирован" },
        { status: 409, headers: NO_STORE }
      );
    }

    const emailLocal = email.split("@")[0] ?? "parent";
    const { firstName, lastName } = splitDisplayName(name, emailLocal);
    const displayName = `${firstName} ${lastName}`.trim();

    const hashed = await bcrypt.hash(String(password), 10);

    const parent = await prisma.$transaction(async (tx) => {
      const p = await tx.parent.create({
        data: {
          firstName,
          lastName,
          email,
        },
      });
      await tx.user.create({
        data: {
          email,
          password: hashed,
          name: displayName,
          role: "PARENT",
          schoolId: null,
        },
      });
      return p;
    });

    const sessionPayload = {
      id: parent.id,
      email,
      name: displayName,
      role: "PARENT" as const,
      schoolId: null as string | null,
      teamId: null as string | null,
      parentId: parent.id,
    };

    const token = setSessionCookie(sessionPayload);

    return NextResponse.json(
      {
        token,
        mobileToken: token,
        parent: { id: parent.id, email },
        user: {
          id: parent.id,
          email,
          name: displayName,
          role: "parent",
          parentId: parent.id,
        },
      },
      { headers: NO_STORE }
    );
  } catch (e) {
    if (e instanceof Prisma.PrismaClientKnownRequestError && e.code === "P2002") {
      return NextResponse.json(
        { error: "Пользователь с таким email или телефоном уже существует" },
        { status: 409, headers: NO_STORE }
      );
    }
    console.error("[auth][register] error:", e);
    return NextResponse.json(
      { error: "Не удалось зарегистрироваться" },
      { status: 500, headers: NO_STORE }
    );
  }
}
