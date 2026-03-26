import { NextResponse } from "next/server";

export async function POST(request: Request) {
  let body: Record<string, unknown> = {};

  try {
    const parsed = await request.json();
    if (parsed && typeof parsed === "object" && !Array.isArray(parsed)) {
      body = parsed as Record<string, unknown>;
    }
  } catch {
    body = {};
  }

  return NextResponse.json({
    clientSecret: "stub-client-secret",
    paymentIntentId: "stub-payment-intent",
    status: "requires_confirmation",
    amount: body.amount ?? null,
    currency: "rub",
  });
}
