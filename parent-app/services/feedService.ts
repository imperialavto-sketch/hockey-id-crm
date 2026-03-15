import type { FeedPostItem } from "@/types/feed";
import { apiFetch } from "@/lib/api";
import { mapApiFeedPostToFeedPostItem, type ApiFeedPost } from "@/mappers/feedMapper";

const PARENT_ID_HEADER = "x-parent-id";

/** Fetch feed for parent. GET /api/feed with x-parent-id header. */
export async function getFeed(parentId: string): Promise<FeedPostItem[]> {
  const data = await apiFetch<ApiFeedPost[] | unknown>("/api/feed", {
    headers: { [PARENT_ID_HEADER]: parentId },
  });
  if (!Array.isArray(data)) return [];
  return data.map((item) => mapApiFeedPostToFeedPostItem(item as ApiFeedPost));
}

export async function getFeedPost(
  postId: string,
  parentId: string
): Promise<FeedPostItem | null> {
  const data = await apiFetch<ApiFeedPost | null>(`/api/feed/${postId}`, {
    headers: { [PARENT_ID_HEADER]: parentId },
  });
  return data && typeof data === "object" ? mapApiFeedPostToFeedPostItem(data) : null;
}
