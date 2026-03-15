import { prisma } from "./prisma";

export type NotificationType =
  | "TRAINING_NEW"
  | "SCHEDULE_CHANGE"
  | "PAYMENT_DUE"
  | "PAYMENT_RECEIVED";

export async function createNotification(params: {
  type: NotificationType;
  title: string;
  body?: string;
  link?: string;
  playerId?: string;
  parentId?: string;
}) {
  const notif = await prisma.notification.create({
    data: {
      type: params.type,
      title: params.title,
      body: params.body ?? null,
      link: params.link ?? null,
      playerId: params.playerId ?? null,
      parentId: params.parentId ?? null,
    },
  });
  await sendNotificationDelivery(notif);
  return notif;
}

async function sendNotificationDelivery(notif: {
  id: string;
  type: string;
  title: string;
  body: string | null;
  parentId: string | null;
}) {
  if (notif.parentId) {
    const parent = await prisma.parent.findUnique({
      where: { id: notif.parentId },
      select: { email: true, pushToken: true },
    });
    if (parent?.email) {
      await sendEmail(parent.email, notif.title, notif.body ?? "");
      await prisma.notification.update({
        where: { id: notif.id },
        data: { emailSent: true },
      });
    }
    if (parent?.pushToken) {
      await sendPush(parent.pushToken, notif.title, notif.body ?? "");
      await prisma.notification.update({
        where: { id: notif.id },
        data: { pushSent: true },
      });
    }
  }
}

async function sendEmail(to: string, subject: string, body: string) {
  if (process.env.RESEND_API_KEY) {
    try {
      const res = await fetch("https://api.resend.com/emails", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${process.env.RESEND_API_KEY}`,
        },
        body: JSON.stringify({
          from: process.env.EMAIL_FROM ?? "Hockey ID <noreply@hockey-id.ru>",
          to,
          subject,
          html: `<p>${body.replace(/\n/g, "<br>")}</p>`,
        }),
      });
      if (!res.ok) console.error("Resend email failed:", await res.text());
    } catch (e) {
      console.error("sendEmail error:", e);
    }
  } else {
    console.log("[Notification] Email would be sent to", to, ":", subject);
  }
}

async function sendPush(pushToken: string, title: string, body: string) {
  if (process.env.FIREBASE_SERVER_KEY || process.env.VAPID_PUBLIC_KEY) {
    console.log("[Notification] Push would be sent to token:", pushToken.slice(0, 20) + "...");
  } else {
    console.log("[Notification] Push would be sent:", title, body);
  }
}
