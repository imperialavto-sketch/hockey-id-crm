export type FeedPostType =
  | "announcement"
  | "news"
  | "schedule_update"
  | "match_day"
  | "photo_post";

export interface FeedPostItem {
  id: string;
  teamId: string;
  teamName?: string;
  authorId: string;
  authorName: string;
  authorRole: "coach" | "admin";
  type: FeedPostType;
  title: string;
  body: string;
  imageUrl?: string | null;
  isPinned: boolean;
  createdAt: string;
  updatedAt?: string;
  publishedAt?: string | null;
}
