export type TeamAnnouncementDto = {
  id: string;
  teamId: string;
  kind: string;
  title: string;
  body: string;
  authorRole: string;
  authorName: string;
  isPinned: boolean;
  hasMedia: boolean;
  publishedAt: string | null;
  createdAt: string;
  updatedAt: string;
};

/** Одна строка инбокса «объявления» — одна команда. */
export type TeamAnnouncementInboxChannel = {
  teamId: string;
  teamName: string;
  anchorPlayerId: string;
  playersLabel: string;
  preview: string;
  updatedAt: string;
  unreadCount: number;
};

export type TeamAnnouncementsInboxSummary =
  | {
      status: "ready";
      channels: TeamAnnouncementInboxChannel[];
    }
  | {
      status: "no_channel";
      reason: "no_players" | "no_team" | "error";
    };

/** Вариант выбора команды, если запрос без teamId/playerId при нескольких командах. */
export type TeamAnnouncementChoice = {
  teamId: string;
  teamName: string;
  playerIds: string[];
  playersLabel: string;
};
