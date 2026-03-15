import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { stripe, isStripeEnabled } from "@/lib/stripe";
import { requireAuth } from "@/lib/api-rbac";

export async function POST(req: NextRequest) {
  const { res } = await requireAuth(req);
  if (res) return res;
  if (!isStripeEnabled) {
    return NextResponse.json(
      { error: "Stripe не настроен. Добавьте STRIPE_SECRET_KEY в .env" },
      { status: 503 }
    );
  }

  try {
    const body = await req.json().catch(() => ({}));
    const { paymentId } = body;

    if (!paymentId) {
      return NextResponse.json(
        { error: "paymentId обязателен" },
        { status: 400 }
      );
    }

    const payment = await prisma.playerPayment.findFirst({
      where: { id: paymentId },
      include: { player: { include: { parent: true } } },
    });

    if (!payment || payment.status === "Оплачено") {
      return NextResponse.json({ error: "Платёж не найден или уже оплачен" }, { status: 404 });
    }

    const origin = req.headers.get("origin") ?? "http://localhost:3000";

    const session = await stripe!.checkout.sessions.create({
      mode: "payment",
      payment_method_types: ["card"],
      line_items: [
        {
          price_data: {
            currency: "rub",
            product_data: {
              name: `Оплата за ${payment.month}/${payment.year} — ${payment.player.firstName} ${payment.player.lastName}`,
              description: "Хоккейная школа Hockey ID",
            },
            unit_amount: payment.amount * 100,
          },
          quantity: 1,
        },
      ],
      success_url: `${origin}/parent?payment=success`,
      cancel_url: `${origin}/parent?payment=cancel`,
      metadata: { paymentId },
      customer_email: payment.player.parent?.email ?? undefined,
    });

    await prisma.playerPayment.update({
      where: { id: paymentId },
      data: { stripeCheckoutUrl: session.url },
    });

    return NextResponse.json({ url: session.url });
  } catch (error) {
    console.error("POST /api/payments/stripe/checkout failed:", error);
    return NextResponse.json(
      { error: "Ошибка создания сессии оплаты" },
      { status: 500 }
    );
  }
}
