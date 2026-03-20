import { NextRequest, NextResponse } from "next/server";
import { issueCodeForPhone, normalizePhone } from "@/lib/phoneCodeStore";
import { checkRateLimit, getClientIp } from "@/lib/rateLimit";

const REQUEST_LIMIT = 3;
const REQUEST_WINDOW_MS = 10 * 60 * 1000; // 10 минут

const NO_STORE_HEADERS = { "Cache-Control": "no-store" } as const;

export async function POST(req: NextRequest) {
  try {
    const { phone } = await req.json().catch(() => ({}));
    const normalized = normalizePhone(phone);

    if (!normalized) {
      console.warn("[auth][request-code] invalid phone");
      return NextResponse.json(
        { error: "Введите номер телефона" },
        { status: 400, headers: NO_STORE_HEADERS }
      );
    }

    const ip = getClientIp(req);
    const key = `request:${ip}:${normalized}`;
    const rl = checkRateLimit(key, REQUEST_LIMIT, REQUEST_WINDOW_MS);

    if (!rl.allowed) {
      console.warn("[auth][request-code] rate limited", {
        phone: normalized,
        ip,
        retryAfterSec: rl.retryAfterSec,
      });

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

    const { code } = issueCodeForPhone(normalized);

    if (process.env.NODE_ENV === "development") {
      console.log("[auth][request-code] phone:", normalized, "code:", code);
    } else {
      console.info("[auth][request-code] code issued", {
        phone: normalized,
        ip,
      });
    }

    // TODO: future SMS provider integration goes here

    return NextResponse.json({ ok: true }, { headers: NO_STORE_HEADERS });
  } catch (error) {
    console.error("[auth][request-code] unexpected error", error);
    return NextResponse.json(
      { error: "Не удалось отправить код" },
      { status: 500, headers: NO_STORE_HEADERS }
    );
  }
}
