/**
 * Send push notifications via Expo Push API.
 * https://docs.expo.dev/push-notifications/sending-notifications/
 */

import { prisma } from "@/lib/prisma";
import { buildNotificationPayload } from "./buildNotificationPayload";
import type { NotificationData } from "./buildNotificationPayload";

const EXPO_PUSH_URL = "https://exp.host/--/api/v2/push/send";

interface ExpoMessage {
  to: string;
  title: string;
  body: string;
  data?: Record<string, string>;
  sound?: "default" | null;
  priority?: "default" | "normal" | "high";
}

export async function sendPushToParent(
  parentId: string,
  notificationData: NotificationData
): Promise<{ sent: number; failed: number }> {
  const tokens = await prisma.pushDevice.findMany({
    where: { parentId, isActive: true },
    select: { expoPushToken: true },
  });

  if (tokens.length === 0) {
    return { sent: 0, failed: 0 };
  }

  return sendPushToTokens(
    tokens.map((t) => t.expoPushToken),
    notificationData,
    parentId
  );
}

export async function sendPushToParents(
  parentIds: string[],
  notificationData: NotificationData
): Promise<{ sent: number; failed: number }> {
  const tokens = await prisma.pushDevice.findMany({
    where: { parentId: { in: parentIds }, isActive: true },
    select: { expoPushToken: true },
  });

  if (tokens.length === 0) {
    return { sent: 0, failed: 0 };
  }

  return sendPushToTokens(
    tokens.map((t) => t.expoPushToken),
    notificationData
  );
}

async function sendPushToTokens(
  expoTokens: string[],
  notificationData: NotificationData,
  parentId?: string
): Promise<{ sent: number; failed: number }> {
  const { title, body, data } = buildNotificationPayload(notificationData);

  const messages: ExpoMessage[] = expoTokens.map((token) => ({
    to: token,
    title,
    body,
    data,
    sound: "default",
    priority: "high",
  }));

  try {
    const res = await fetch(EXPO_PUSH_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Accept: "application/json",
      },
      body: JSON.stringify(messages),
    });

    const result = await res.json();
    const tickets = Array.isArray(result.data) ? result.data : [result];

    let sent = 0;
    let failed = 0;
    for (const t of tickets) {
      if (t?.status === "ok") sent++;
      else failed++;
    }

    if (parentId && tickets.length > 0) {
      await prisma.pushDevice.updateMany({
        where: { parentId, expoPushToken: { in: expoTokens } },
        data: { lastUsedAt: new Date() },
      });
    }

    if (failed > 0 || sent > 0) {
      console.log(
        `[Push] ${notificationData.type} parent=${parentId ?? "multiple"} sent=${sent} failed=${failed}`
      );
    }

    return { sent, failed };
  } catch (error) {
    console.error("[Push] Send failed:", error);
    return { sent: 0, failed: messages.length };
  }
}
