/**
 * Типы переписок Hockey ID Messenger (единый источник строк для Prisma.kind).
 * coach_parent_direct — историческое имя; в коде также «тренер ↔ родитель по игроку».
 */
export const MESSENGER_KIND = {
  COACH_PARENT_DIRECT: "coach_parent_direct",
  PARENT_PARENT_DIRECT: "parent_parent_direct",
  /** Общий чат родителей команды: 1 team = 1 канал (не путать с read-only объявлениями). */
  TEAM_PARENT_CHANNEL: "team_parent_channel",
  TEAM_ANNOUNCEMENT_CHANNEL: "team_announcement_channel",
} as const;

export type MessengerKind = (typeof MESSENGER_KIND)[keyof typeof MESSENGER_KIND];

/** Moderation / UX hooks — без бизнес-логики в этом проходе. */
export type MessengerModerationPlaceholder = {
  /** TODO: reportConversation, blockParticipant, muteParticipant */
  _future?: never;
};
