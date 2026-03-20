import type { FeedPostItem } from "@/types/feed";
import { MOCK_TEAM_POSTS, MOCK_TEAM_NAME } from "@/constants/mockTeamPosts";

/**
 * Demo feed for parent app, mapped from team posts into FeedPostItem shape.
 */

function mapTeamPostToFeedItem(post: (typeof MOCK_TEAM_POSTS)[number]): FeedPostItem {
  const base: FeedPostItem = {
    id: post.id,
    teamId: "team-1",
    teamName: MOCK_TEAM_NAME,
    authorId: post.author.id,
    authorName: post.author.name,
    authorRole: post.author.role === "coach" ? "coach" : "admin",
    type:
      post.type === "announcement"
        ? "announcement"
        : post.type === "match_result"
          ? "match_day"
          : post.type === "photo"
            ? "photo_post"
            : "news",
    title:
      post.type === "match_result"
        ? "Результат матча"
        : post.type === "announcement"
          ? "Объявление тренера"
          : post.type === "reminder"
            ? "Напоминание"
            : "Новости команды",
    body: post.text,
    imageUrl: post.imageUrl ?? null,
    isPinned: Boolean(post.isPinned),
    createdAt: post.createdAt,
    updatedAt: post.createdAt,
    publishedAt: post.createdAt,
  };

  return base;
}

export const demoFeedItems: FeedPostItem[] = MOCK_TEAM_POSTS.map(mapTeamPostToFeedItem);

export function getDemoFeed(): FeedPostItem[] {
  return demoFeedItems;
}

export function getDemoFeedPost(postId: string): FeedPostItem | null {
  return demoFeedItems.find((p) => p.id === postId) ?? null;
}

