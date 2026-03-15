export type TeamRole = "coach" | "assistant_coach" | "parent" | "player";

export type PostType =
  | "announcement"
  | "team_update"
  | "photo"
  | "video"
  | "match_result"
  | "reminder";

export interface TeamPostAuthor {
  id: string;
  name: string;
  role: TeamRole;
  avatarUrl?: string;
}

export interface TeamPost {
  id: string;
  type: PostType;
  author: TeamPostAuthor;
  createdAt: string;
  text: string;
  imageUrl?: string;
  videoUrl?: string;
  matchResult?: {
    teamHome: string;
    teamAway: string;
    scoreHome: number;
    scoreAway: number;
    bestPlayer?: string;
  };
  event?: TeamEvent;
  likesCount: number;
  commentsCount: number;
  isPinned?: boolean;
  isCoachAnnouncement?: boolean;
}

export interface TeamMessage {
  id: string;
  authorId: string;
  authorName: string;
  authorRole: TeamRole;
  text: string;
  createdAt: string;
  type: "text" | "photo" | "system";
  imageUrl?: string;
}

export interface TeamMember {
  id: string;
  name: string;
  role: TeamRole;
  avatarUrl?: string;
  playerName?: string;
}

export interface TeamEvent {
  id: string;
  type: "training" | "match" | "tournament";
  title: string;
  date: string;
  time?: string;
  location?: string;
}
