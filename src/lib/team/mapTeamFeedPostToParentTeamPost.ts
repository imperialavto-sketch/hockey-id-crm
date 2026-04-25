import type { TeamFeedPost } from "@prisma/client";

/** Parent `TeamPost` / `mapPost` — author.role is TeamRole */
function mapAuthorRole(role: string): "coach" | "assistant_coach" | "parent" | "player" {
  const r = role.toLowerCase();
  if (r === "parent") return "parent";
  if (r === "player") return "player";
  if (r === "assistant" || r === "assistant_coach") return "assistant_coach";
  return "coach";
}

function mapFeedTypeToPostType(feedType: string):
  | "announcement"
  | "team_update"
  | "photo"
  | "video"
  | "match_result"
  | "reminder" {
  switch (feedType) {
    case "announcement":
      return "announcement";
    case "photo_post":
    case "photo":
      return "photo";
    case "video_post":
    case "video":
      return "video";
    case "match_day":
    case "match_result":
      return "match_result";
    case "reminder":
      return "reminder";
    case "news":
    case "team_update":
    default:
      return "team_update";
  }
}

/**
 * Map Prisma `TeamFeedPost` → parent-app `TeamPost` shape (see `teamService.mapPost`).
 */
export function mapTeamFeedPostToTeamPostResponse(p: TeamFeedPost): Record<string, unknown> {
  const title = (p.title ?? "").trim();
  const body = (p.body ?? "").trim();
  const text = title ? `${title}\n\n${body}` : body;

  const authorRole = mapAuthorRole(p.authorRole);
  const type = mapFeedTypeToPostType(p.type);

  return {
    id: p.id,
    type,
    author: {
      id: p.authorId,
      name: p.authorName,
      role: authorRole,
    },
    createdAt: p.createdAt.toISOString(),
    text,
    imageUrl: p.imageUrl ?? undefined,
    likesCount: 0,
    commentsCount: 0,
    isPinned: p.isPinned,
    isCoachAnnouncement:
      authorRole === "coach" || p.type === "announcement" || p.authorRole?.toLowerCase() === "coach",
  };
}
