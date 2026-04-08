/**
 * Минимальный Hockey ID контекст для AI signals (без тяжёлых join’ов).
 */

import { prisma } from "@/lib/prisma";

export type CoachAiSignalsHockeyContext = {
  /** Личный диалог тренер↔родитель по игроку vs командный канал */
  channel: "direct" | "team";
  /** "Имя Фамилия" для direct с playerId */
  playerFirstLast: string | null;
  /** Номер с профиля; иначе null — не выдумываем */
  playerJersey: number | null;
  /** Название команды (канал или команда игрока) */
  teamDisplayName: string | null;
  /** teamId для запроса TrainingSession */
  scheduleTeamId: string | null;
  hasUpcomingTraining: boolean;
  hasRecentTraining: boolean;
  /** Короткая подпись для копирайта; null если нет данных */
  upcomingTrainingLabel: string | null;
};

export const EMPTY_COACH_AI_SIGNALS_CONTEXT: CoachAiSignalsHockeyContext = {
  channel: "direct",
  playerFirstLast: null,
  playerJersey: null,
  teamDisplayName: null,
  scheduleTeamId: null,
  hasUpcomingTraining: false,
  hasRecentTraining: false,
  upcomingTrainingLabel: null,
};

function formatUpcomingTrainingLabel(d: Date): string {
  try {
    return d.toLocaleString("ru-RU", {
      day: "numeric",
      month: "short",
      hour: "2-digit",
      minute: "2-digit",
    });
  } catch {
    return "";
  }
}

/**
 * Один round-trip к чату + до двух лёгких запросов к тренировкам по teamId.
 */
export async function loadCoachConversationAiSignalsContext(
  conversationId: string
): Promise<CoachAiSignalsHockeyContext> {
  try {
    const conv = await prisma.chatConversation.findUnique({
      where: { id: conversationId },
      select: {
        playerId: true,
        player: {
          select: {
            firstName: true,
            lastName: true,
            teamId: true,
            profile: { select: { jerseyNumber: true } },
            team: { select: { name: true } },
          },
        },
      },
    });

    if (!conv) return { ...EMPTY_COACH_AI_SIGNALS_CONTEXT };

    const channel: "direct" | "team" = "direct";

    let playerFirstLast: string | null = null;
    let playerJersey: number | null = null;
    if (conv.player) {
      const fn = (conv.player.firstName ?? "").trim();
      const ln = (conv.player.lastName ?? "").trim();
      const full = `${fn} ${ln}`.trim();
      if (full) playerFirstLast = full;
      const j = conv.player.profile?.jerseyNumber;
      if (typeof j === "number" && Number.isFinite(j) && j > 0 && j <= 99) {
        playerJersey = j;
      }
    }

    const teamDisplayName = conv.player?.team?.name?.trim() ?? null;

    const scheduleTeamId = conv.player?.teamId ?? null;

    const base: CoachAiSignalsHockeyContext = {
      channel,
      playerFirstLast,
      playerJersey,
      teamDisplayName,
      scheduleTeamId,
      hasUpcomingTraining: false,
      hasRecentTraining: false,
      upcomingTrainingLabel: null,
    };

    if (!scheduleTeamId) return base;

    const now = new Date();
    const tenDaysAgo = new Date(now.getTime() - 10 * 86400_000);

    const [upcoming, recent] = await Promise.all([
      prisma.trainingSession.findFirst({
        where: {
          teamId: scheduleTeamId,
          NOT: { status: "cancelled" },
          startAt: { gte: now },
        },
        orderBy: { startAt: "asc" },
        select: { startAt: true },
      }),
      prisma.trainingSession.findFirst({
        where: {
          teamId: scheduleTeamId,
          endAt: { lte: now, gte: tenDaysAgo },
          NOT: { status: "cancelled" },
        },
        orderBy: { endAt: "desc" },
        select: { endAt: true },
      }),
    ]);

    const upcomingLabel = upcoming?.startAt
      ? formatUpcomingTrainingLabel(upcoming.startAt)
      : null;

    return {
      ...base,
      hasUpcomingTraining: !!upcoming,
      hasRecentTraining: !!recent,
      upcomingTrainingLabel: upcomingLabel && upcomingLabel.length > 0 ? upcomingLabel : null,
    };
  } catch {
    return { ...EMPTY_COACH_AI_SIGNALS_CONTEXT };
  }
}
