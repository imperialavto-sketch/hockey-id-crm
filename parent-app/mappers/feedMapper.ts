import type { FeedPostItem, FeedPostType } from "@/types/feed";

/** API feed post shape (snake_case or camelCase). */
export interface ApiFeedPost {
  id: string;
  team_id?: string;
  teamId?: string;
  team_name?: string;
  teamName?: string;
  author_id?: string;
  authorId?: string;
  author_name?: string;
  authorName?: string;
  author_role?: "coach" | "admin";
  authorRole?: "coach" | "admin";
  type?: string;
  title?: string;
  body?: string;
  image_url?: string | null;
  imageUrl?: string | null;
  is_pinned?: boolean;
  isPinned?: boolean;
  created_at?: string;
  createdAt?: string;
  updated_at?: string;
  updatedAt?: string;
  published_at?: string | null;
  publishedAt?: string | null;
}

const FEED_TYPES: FeedPostType[] = [
  "announcement",
  "news",
  "schedule_update",
  "match_day",
  "photo_post",
];

function toFeedType(s?: string): FeedPostType {
  if (s && FEED_TYPES.includes(s as FeedPostType)) return s as FeedPostType;
  return "news";
}

export function mapApiFeedPostToFeedPostItem(raw: ApiFeedPost): FeedPostItem {
  return {
    id: String(raw.id),
    teamId: raw.team_id ?? raw.teamId ?? "",
    teamName: raw.team_name ?? raw.teamName,
    authorId: raw.author_id ?? raw.authorId ?? "",
    authorName: raw.author_name ?? raw.authorName ?? "",
    authorRole: raw.author_role ?? raw.authorRole ?? "coach",
    type: toFeedType(raw.type),
    title: raw.title ?? "",
    body: raw.body ?? "",
    imageUrl: raw.image_url ?? raw.imageUrl ?? null,
    isPinned: raw.is_pinned ?? raw.isPinned ?? false,
    createdAt: raw.created_at ?? raw.createdAt ?? new Date().toISOString(),
    updatedAt: raw.updated_at ?? raw.updatedAt,
    publishedAt: raw.published_at ?? raw.publishedAt ?? null,
  };
}
