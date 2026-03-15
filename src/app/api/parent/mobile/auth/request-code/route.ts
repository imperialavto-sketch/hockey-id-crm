/**
 * Parent Mobile Auth — request SMS code.
 * TODO: Connect to real SMS provider.
 * For now: accepts any phone, no-op (dev mode).
 */

import { NextRequest, NextResponse } from "next/server";

export async function POST(req: NextRequest) {
  try {
    const { phone } = await req.json().catch(() => ({}));
    const normalized = String(phone ?? "").replace(/\D/g, "").trim();
    if (!normalized) {
      return NextResponse.json({ error: "Введите номер телефона" }, { status: 400 });
    }

    // TODO: Send SMS via provider (Twilio, etc.)
    // await sendSms(normalized, generateCode());

    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error("POST /api/parent/mobile/auth/request-code failed:", error);
    return NextResponse.json(
      { error: "Не удалось отправить код" },
      { status: 500 }
    );
  }
}
