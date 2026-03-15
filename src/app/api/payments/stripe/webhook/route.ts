import { NextRequest, NextResponse } from "next/server";
import { stripe } from "@/lib/stripe";
import { prisma } from "@/lib/prisma";
import { createNotification } from "@/lib/notifications";
import Stripe from "stripe";

export async function POST(req: NextRequest) {
  if (!stripe) {
    return NextResponse.json({ error: "Stripe disabled" }, { status: 503 });
  }

  const body = await req.text();
  const sig = req.headers.get("stripe-signature");
  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;

  if (!webhookSecret || !sig) {
    return NextResponse.json({ error: "Webhook secret required" }, { status: 400 });
  }

  let event: Stripe.Event;
  try {
    event = stripe.webhooks.constructEvent(body, sig, webhookSecret);
  } catch (err) {
    console.error("Webhook signature verification failed:", err);
    return NextResponse.json({ error: "Invalid signature" }, { status: 400 });
  }

  if (event.type === "checkout.session.completed") {
    const session = event.data.object as Stripe.Checkout.Session;
    const paymentId = session.metadata?.paymentId;
    if (paymentId) {
      const payment = await prisma.playerPayment.update({
        where: { id: paymentId },
        data: {
          status: "Оплачено",
          paidAt: new Date(),
          stripePaymentIntentId: session.payment_intent as string,
        },
        include: { player: true },
      });
      if (payment.player.parentId) {
        await createNotification({
          type: "PAYMENT_RECEIVED",
          title: "Оплата получена",
          body: `Платёж ${payment.amount} ₽ за ${payment.player.firstName} ${payment.player.lastName} успешно оплачен.`,
          link: "/parent",
          playerId: payment.playerId,
          parentId: payment.player.parentId,
        });
      }
    }
  }

  return NextResponse.json({ received: true });
}
