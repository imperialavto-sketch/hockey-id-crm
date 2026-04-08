import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { createParentSessionToken } from "@/lib/api-auth";
import { checkRateLimit, getClientIp } from "@/lib/rateLimit";
import {
  issueCodeForPhone,
  normalizePhone,
  verifyAndConsumeCode,
} from "@/lib/phoneCodeStore";
import { isSmscConfigured, sendAuthCodeSMS } from "@/lib/sms";
import { ensureDevParentFixtureGuaranteed } from "@/lib/devParentAuthFixture";

const REQUEST_LIMIT = 3;
const REQUEST_WINDOW_MS = 10 * 60 * 1000;
const VERIFY_LIMIT = 5;
const VERIFY_WINDOW_MS = 10 * 60 * 1000;
const ALLOW_DEV_OTP_BYPASS = process.env.ALLOW_DEV_OTP_BYPASS === "true";
const SMS_DEBUG_RESPONSE = process.env.SMS_DEBUG_RESPONSE === "true";
const NO_STORE_HEADERS = { "Cache-Control": "no-store" } as const;

/** Canonical test phone for parent-app when SMS is unavailable (see .env.example). */
const DEV_MAGIC_PHONE = "79991234567";
const DEV_MAGIC_CODE = "1234";

function devParentBypassAllowed(): boolean {
  return (
    process.env.NODE_ENV !== "production" ||
    process.env.ALLOW_DEV_PARENT_MAGIC_LOGIN === "true"
  );
}

/** When true, any normalized phone + code 1234 bypasses SMS (non‑prod or ALLOW_DEV_PARENT_MAGIC_LOGIN). */
function devAuthWideEnabled(): boolean {
  return (
    process.env.EXPO_PUBLIC_DEV_AUTH === "true" ||
    process.env.DEV_AUTH === "true"
  );
}

function isMagicParentOtp(normalizedPhone: string, codeStr: string): boolean {
  if (!devParentBypassAllowed()) return false;
  if (codeStr !== DEV_MAGIC_CODE) return false;
  if (normalizedPhone === DEV_MAGIC_PHONE) return true;
  return devAuthWideEnabled();
}

function shouldSkipSmsForDevRequest(normalized: string): boolean {
  if (!devParentBypassAllowed()) return false;
  return normalized === DEV_MAGIC_PHONE || devAuthWideEnabled();
}

/**
 * Обрабатывает все pending `ParentInvite` для нормализованного телефона (upsert `ParentPlayer`, accept invite).
 * Тот же движок, что и при verify-code; экспорт только для доп. точек входа (например refresh без повторного SMS).
 */
export async function processPendingInvites(phone: string) {
  const invites = await prisma.parentInvite.findMany({
    where: { phone, status: "pending" },
    include: { player: true },
  });
  if (invites.length === 0) return null;

  let parent = await prisma.parent.findUnique({ where: { phone } });
  if (!parent) {
    parent = await prisma.parent.create({
      data: {
        firstName: "Родитель",
        lastName: invites[0]?.player ? `${invites[0].player.lastName}` : phone.slice(-4),
        phone,
      },
    });
  }

  const now = new Date();
  for (const inv of invites) {
    await prisma.parentPlayer.upsert({
      where: { parentId_playerId: { parentId: parent.id, playerId: inv.playerId } },
      create: {
        parentId: parent.id,
        playerId: inv.playerId,
        relation: "parent",
      },
      update: {},
    });
    await prisma.parentInvite.update({
      where: { id: inv.id },
      data: { status: "accepted", acceptedAt: now },
    });
  }

  return parent;
}

async function createOrLoadParentAfterVerifiedPhone(phone: string) {
  let parent = await processPendingInvites(phone);
  if (!parent) {
    parent = await prisma.parent.upsert({
      where: { phone },
      create: {
        firstName: "Родитель",
        lastName: phone.slice(-4),
        phone,
      },
      update: {},
    });
  }
  return parent;
}

async function buildVerifySuccessResponse(
  parent: { id: string; firstName: string; lastName: string },
  normalized: string,
  devMagicUsed: boolean
) {
  const user = {
    id: parent.id,
    phone: normalized,
    name: `${parent.firstName} ${parent.lastName}`.trim(),
    role: "PARENT" as const,
    parentId: parent.id,
  };

  let token: string;
  try {
    token = createParentSessionToken(parent.id);
  } catch (tokenError) {
    console.error("[auth][verify] failed to issue parent token", {
      parentId: parent.id,
      error: tokenError instanceof Error ? tokenError.message : tokenError,
    });
    return NextResponse.json(
      { error: "Сервис авторизации временно недоступен" },
      { status: 503, headers: NO_STORE_HEADERS }
    );
  }

  console.info("[auth][verify] success", {
    parentId: parent.id,
    phone: normalized,
    devOtpBypassUsed: devMagicUsed,
  });
  return NextResponse.json({ user, token }, { headers: NO_STORE_HEADERS });
}

export async function handlePhoneAuthRequestCode(req: NextRequest) {
  try {
    const { phone } = await req.json().catch(() => ({}));
    const normalized = normalizePhone(phone);

    if (!normalized) {
      return NextResponse.json(
        { error: "Введите номер телефона" },
        { status: 400, headers: NO_STORE_HEADERS }
      );
    }

    if (shouldSkipSmsForDevRequest(normalized)) {
      if (process.env.NODE_ENV === "development") {
        console.log("[auth][request-code] dev bypass (no SMS)", normalized);
      }
      return NextResponse.json(
        { ok: true, message: "Код отправлен (dev)" },
        { headers: NO_STORE_HEADERS }
      );
    }

    const ip = getClientIp(req);
    const key = `request:${ip}:${normalized}`;
    const rl = checkRateLimit(key, REQUEST_LIMIT, REQUEST_WINDOW_MS);
    if (!rl.allowed) {
      return NextResponse.json(
        { error: "Слишком много запросов. Попробуйте позже" },
        {
          status: 429,
          headers: {
            ...NO_STORE_HEADERS,
            "Retry-After": String(rl.retryAfterSec),
          },
        }
      );
    }

    if (process.env.NODE_ENV === "production" && !isSmscConfigured()) {
      return NextResponse.json(
        { error: "Сервис SMS временно недоступен" },
        { status: 503, headers: NO_STORE_HEADERS }
      );
    }

    const { code } = issueCodeForPhone(normalized);
    const sendResult = await sendAuthCodeSMS(normalized, code);
    const includeDebug = process.env.NODE_ENV !== "production" && SMS_DEBUG_RESPONSE;
    const debugPayload = includeDebug
      ? {
          debug: {
            correlationId: sendResult.correlationId,
            finalChannel: sendResult.finalChannel,
            finalMode: sendResult.finalMode,
            attemptsCount: sendResult.attempts.length,
            lastErrorCode: sendResult.lastErrorCode,
            lastErrorMessage: sendResult.lastErrorMessage,
          },
        }
      : {};

    if (!sendResult.ok) {
      return NextResponse.json(
        {
          error: "Не удалось отправить код",
          ...debugPayload,
        },
        { status: 500, headers: NO_STORE_HEADERS }
      );
    }

    if (process.env.NODE_ENV === "development") {
      console.log("[auth][request-code] phone:", normalized, "code:", code);
    }

    return NextResponse.json(
      { ok: true, message: "Код отправлен", ...debugPayload },
      { headers: NO_STORE_HEADERS }
    );
  } catch (error) {
    console.error("[auth][request-code] unexpected error", error);
    return NextResponse.json(
      { error: "Не удалось отправить код" },
      { status: 500, headers: NO_STORE_HEADERS }
    );
  }
}

export async function handlePhoneAuthVerifyCode(req: NextRequest) {
  try {
    const { phone, code } = await req.json().catch(() => ({}));
    const normalized = normalizePhone(phone);
    const codeStr = String(code ?? "").trim();

    if (!normalized) {
      return NextResponse.json(
        { error: "Введите номер телефона" },
        { status: 400, headers: NO_STORE_HEADERS }
      );
    }
    if (!codeStr) {
      return NextResponse.json(
        { error: "Введите код подтверждения" },
        { status: 400, headers: NO_STORE_HEADERS }
      );
    }

    const magicOtp = isMagicParentOtp(normalized, codeStr);
    if (magicOtp) {
      try {
        console.log("DEV LOGIN SUCCESS", { phone: normalized, path: "magic-otp" });
        const parent = await createOrLoadParentAfterVerifiedPhone(normalized);
        await ensureDevParentFixtureGuaranteed(parent.id);
        return await buildVerifySuccessResponse(parent, normalized, true);
      } catch (dbError) {
        console.error("[auth][verify] dev magic login failed", {
          phone: normalized,
          error: dbError instanceof Error ? dbError.message : dbError,
        });
        return NextResponse.json(
          { error: "Не удалось подготовить профиль родителя" },
          { status: 500, headers: NO_STORE_HEADERS }
        );
      }
    }

    const ip = getClientIp(req);
    const key = `verify:${ip}:${normalized}`;
    const rl = checkRateLimit(key, VERIFY_LIMIT, VERIFY_WINDOW_MS);
    if (!rl.allowed) {
      return NextResponse.json(
        { error: "Слишком много попыток. Попробуйте позже" },
        {
          status: 429,
          headers: {
            ...NO_STORE_HEADERS,
            "Retry-After": String(rl.retryAfterSec),
          },
        }
      );
    }

    const result = verifyAndConsumeCode(normalized, codeStr);
    const devAccept1234 =
      process.env.NODE_ENV === "development" &&
      ALLOW_DEV_OTP_BYPASS &&
      codeStr === "1234";

    if (result === "EXPIRED" && !devAccept1234) {
      return NextResponse.json(
        { error: "Срок действия кода истёк" },
        { status: 410, headers: NO_STORE_HEADERS }
      );
    }
    if (result === "INVALID" && !devAccept1234) {
      return NextResponse.json(
        { error: "Неверный код" },
        { status: 401, headers: NO_STORE_HEADERS }
      );
    }

    let parent;
    try {
      parent = await createOrLoadParentAfterVerifiedPhone(normalized);
    } catch (dbError) {
      console.error("[auth][verify] failed to resolve/create parent profile", {
        phone: normalized,
        error: dbError instanceof Error ? dbError.message : dbError,
      });
      return NextResponse.json(
        { error: "Не удалось подготовить профиль родителя" },
        { status: 500, headers: NO_STORE_HEADERS }
      );
    }

    if (
      devAccept1234 &&
      devParentBypassAllowed() &&
      codeStr === DEV_MAGIC_CODE
    ) {
      console.log("DEV LOGIN SUCCESS", { phone: normalized, path: "otp-store-bypass" });
      try {
        await ensureDevParentFixtureGuaranteed(parent.id);
      } catch (fixtureErr) {
        console.error("[auth][verify] dev fixture after OTP bypass failed", {
          parentId: parent.id,
          error: fixtureErr instanceof Error ? fixtureErr.message : fixtureErr,
        });
        return NextResponse.json(
          { error: "Не удалось подготовить тестового игрока (dev)" },
          { status: 500, headers: NO_STORE_HEADERS }
        );
      }
    }

    return await buildVerifySuccessResponse(parent, normalized, devAccept1234);
  } catch (error) {
    console.error("[auth][verify] unexpected error", {
      error: error instanceof Error ? error.message : error,
      stack: error instanceof Error ? error.stack : undefined,
    });
    return NextResponse.json(
      { error: "Не удалось выполнить вход" },
      { status: 500, headers: NO_STORE_HEADERS }
    );
  }
}
