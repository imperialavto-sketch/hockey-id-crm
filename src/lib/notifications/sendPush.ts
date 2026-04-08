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
  badge?: number;
}

export type CoachPushNotificationInput = {
  type: string;
  title: string;
  body: string;
  conversationId?: string;
  playerId?: string;
  teamId?: string;
  senderName?: string;
  previewText?: string;
  badge?: number;
  collapseId?: string;
  threadIdentifier?: string;
};

export async function sendPushToCoach(
  coachId: string,
  notificationData: CoachPushNotificationInput
): Promise<{ sent: number; failed: number }> {
  const tokens = await prisma.coachPushDevice.findMany({
    where: { coachId, isActive: true },
    select: { expoPushToken: true },
  });

  if (tokens.length === 0) {
    return { sent: 0, failed: 0 };
  }

  const data: Record<string, string> = { type: notificationData.type };
  if (notificationData.playerId) data.playerId = notificationData.playerId;
  if (notificationData.conversationId) data.conversationId = notificationData.conversationId;
  if (notificationData.teamId) data.teamId = notificationData.teamId;
  if (notificationData.senderName) data.senderName = notificationData.senderName;
  if (notificationData.previewText) data.previewText = notificationData.previewText;
  if (notificationData.collapseId) data.collapseId = notificationData.collapseId;
  if (notificationData.threadIdentifier) data.threadIdentifier = notificationData.threadIdentifier;

  const expoTokens = tokens.map((t) => t.expoPushToken);
  const messages: ExpoMessage[] = expoTokens.map((token) => ({
    to: token,
    title: notificationData.title,
    body: notificationData.body,
    data,
    sound: "default",
    priority: "high",
    ...(typeof notificationData.badge === "number" ? { badge: notificationData.badge } : {}),
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

    if (tickets.length > 0) {
      await prisma.coachPushDevice.updateMany({
        where: { coachId, expoPushToken: { in: expoTokens } },
        data: { lastUsedAt: new Date() },
      });
    }

    if (failed > 0 || sent > 0) {
      console.log(
        `[Push] ${notificationData.type} coach=${coachId} sent=${sent} failed=${failed}`
      );
    }

    return { sent, failed };
  } catch (error) {
    console.error("[Push] Coach send failed:", error);
    return { sent: 0, failed: messages.length };
  }
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
    ...(typeof notificationData.badge === "number" ? { badge: notificationData.badge } : {}),
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
