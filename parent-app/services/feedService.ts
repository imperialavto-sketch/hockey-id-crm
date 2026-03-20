import type { FeedPostItem } from "@/types/feed";
import { apiFetch, ApiRequestError } from "@/lib/api";
import { mapApiFeedPostToFeedPostItem, type ApiFeedPost } from "@/mappers/feedMapper";
import { withFallback } from "@/utils/withFallback";
import { getDemoFeed, getDemoFeedPost } from "@/demo/demoFeed";

const PARENT_ID_HEADER = "x-parent-id";

/** Fetch feed for parent. GET /api/feed with x-parent-id header + demo fallback. */
export async function getFeed(parentId: string): Promise<FeedPostItem[]> {
  return withFallback(
    async () => {
      const data = await apiFetch<ApiFeedPost[] | unknown>("/api/feed", {
        headers: { [PARENT_ID_HEADER]: parentId },
        timeoutMs: 10000,
      });
      if (!Array.isArray(data)) return [];
      return data.map((item) => mapApiFeedPostToFeedPostItem(item as ApiFeedPost));
    },
    async () => getDemoFeed()
  );
}

/** Fetch single post. GET /api/feed/:postId. Returns null on 404. */
export async function getFeedPost(
  postId: string,
  parentId: string
): Promise<FeedPostItem | null> {
  return withFallback(
    async () => {
      try {
        const data = await apiFetch<ApiFeedPost | null>(`/api/feed/${postId}`, {
          headers: { [PARENT_ID_HEADER]: parentId },
          timeoutMs: 10000,
        });
        return data && typeof data === "object" ? mapApiFeedPostToFeedPostItem(data) : null;
      } catch (err) {
        if (err instanceof ApiRequestError && err.status === 404) {
          return null;
        }
        throw err;
      }
    },
    async () => getDemoFeedPost(postId)
  );
}
