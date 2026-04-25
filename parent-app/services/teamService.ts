import type { TeamPost, TeamMember, TeamMessage } from "@/types/team";
import { apiFetch } from "@/lib/api";
import { logApiError } from "@/lib/apiErrors";
import { isDev } from "@/config/api";
import { MOCK_TEAM_POSTS } from "@/constants/mockTeamPosts";
import { MOCK_TEAM_MEMBERS } from "@/constants/mockTeamMembers";
import { MOCK_TEAM_MESSAGES } from "@/constants/mockTeamMessages";

const PARENT_ID_HEADER = "x-parent-id";

function headers(parentId?: string | null): Record<string, string> {
  const h: Record<string, string> = { "Content-Type": "application/json" };
  if (parentId) h[PARENT_ID_HEADER] = parentId;
  return h;
}

/** Map API post to TeamPost if format differs */
function mapPost(api: unknown): TeamPost {
  const p = api as Record<string, unknown>;
  const author = (p.author ?? {}) as Record<string, unknown>;
  return {
    id: String(p.id ?? ""),
    type: (p.type as TeamPost["type"]) ?? "team_update",
    author: {
      id: String(author.id ?? ""),
      name: String(author.name ?? "—"),
      role: (author.role as TeamPost["author"]["role"]) ?? "parent",
      avatarUrl: author.avatarUrl as string | undefined,
    },
    createdAt: String(p.createdAt ?? new Date().toISOString()),
    text: String(p.text ?? ""),
    imageUrl: p.imageUrl as string | undefined,
    videoUrl: p.videoUrl as string | undefined,
    matchResult: p.matchResult as TeamPost["matchResult"],
    event: p.event as TeamPost["event"],
    likesCount: Number(p.likesCount ?? 0),
    commentsCount: Number(p.commentsCount ?? 0),
    isPinned: Boolean(p.isPinned),
    isCoachAnnouncement: Boolean(p.isCoachAnnouncement),
  };
}

/** Map API member to TeamMember */
function mapMember(api: unknown): TeamMember {
  const m = api as Record<string, unknown>;
  return {
    id: String(m.id ?? ""),
    name: String(m.name ?? "—"),
    role: (m.role as TeamMember["role"]) ?? "parent",
    avatarUrl: m.avatarUrl as string | undefined,
    playerName: m.playerName as string | undefined,
  };
}

/** Map API message to TeamMessage */
function mapMessage(api: unknown): TeamMessage {
  const m = api as Record<string, unknown>;
  return {
    id: String(m.id ?? ""),
    authorId: String(m.authorId ?? ""),
    authorName: String(m.authorName ?? "—"),
    authorRole: (m.authorRole as TeamMessage["authorRole"]) ?? "parent",
    text: String(m.text ?? ""),
    createdAt: String(m.createdAt ?? new Date().toISOString()),
    type: (m.type as TeamMessage["type"]) ?? "text",
    imageUrl: m.imageUrl as string | undefined,
  };
}

/**
 * Get team posts (GET /api/team/posts — Prisma TeamFeedPost, Bearer + parent team scope).
 * Fallback: MOCK_TEAM_POSTS only in __DEV__ when API fails.
 */
export async function getTeamPosts(parentId?: string | null): Promise<TeamPost[]> {
  try {
    const data = await apiFetch<unknown[]>(
      "/api/team/posts",
      { headers: headers(parentId) }
    );
    return Array.isArray(data) ? data.map(mapPost) : [];
  } catch (err) {
    logApiError("teamService.getTeamPosts", err);
    if (isDev) return [...MOCK_TEAM_POSTS];
    throw err;
  }
}

/**
 * Get team post by id (GET /api/team/posts/:id — same access rules as list).
 * Fallback: find in MOCK_TEAM_POSTS only in __DEV__ when API fails.
 */
export async function getTeamPostById(
  id: string,
  parentId?: string | null
): Promise<TeamPost | null> {
  try {
    const data = await apiFetch<unknown>(
      `/api/team/posts/${id}`,
      { headers: headers(parentId) }
    );
    if (data && typeof data === "object" && "id" in (data as object)) {
      return mapPost(data);
    }
    return null;
  } catch (err) {
    logApiError("teamService.getTeamPostById", err);
    if (isDev) return MOCK_TEAM_POSTS.find((p) => p.id === id) ?? null;
    return null;
  }
}

/**
 * Get team members.
 * Fallback: MOCK_TEAM_MEMBERS only in __DEV__ when API fails.
 */
export async function getTeamMembers(parentId?: string | null): Promise<TeamMember[]> {
  try {
    const data = await apiFetch<unknown[]>(
      "/api/team/members",
      { headers: headers(parentId) }
    );
    return Array.isArray(data) ? data.map(mapMember) : [];
  } catch (err) {
    logApiError("teamService.getTeamMembers", err);
    if (isDev) return [...MOCK_TEAM_MEMBERS];
    throw err;
  }
}

/**
 * Get team chat messages.
 * Fallback: MOCK_TEAM_MESSAGES only in __DEV__ when API fails.
 */
export async function getTeamMessages(parentId?: string | null): Promise<TeamMessage[]> {
  try {
    const data = await apiFetch<unknown[]>(
      "/api/team/messages",
      { headers: headers(parentId) }
    );
    return Array.isArray(data) ? data.map(mapMessage) : [];
  } catch (err) {
    logApiError("teamService.getTeamMessages", err);
    if (isDev) return [...MOCK_TEAM_MESSAGES];
    throw err;
  }
}

/**
 * Send team message.
 * Returns new message or null on failure.
 * Fallback: create optimistic message only in __DEV__ when API fails.
 */
export async function sendTeamMessage(
  text: string,
  parentId?: string | null
): Promise<TeamMessage | null> {
  try {
    const data = await apiFetch<unknown>(
      "/api/team/messages",
      {
        method: "POST",
        headers: headers(parentId),
        body: JSON.stringify({ text }),
      }
    );
    if (data && typeof data === "object") return mapMessage(data);
    return null;
  } catch (err) {
    logApiError("teamService.sendTeamMessage", err);
    if (isDev) {
      return {
        id: "m_" + Date.now(),
        authorId: "me",
        authorName: "Вы",
        authorRole: "parent",
        text,
        createdAt: new Date().toISOString(),
        type: "text",
      };
    }
    return null;
  }
}

/**
 * Create team post.
 * Returns new post or null on failure.
 * Fallback: create optimistic post only in __DEV__ when API fails.
 */
export async function createTeamPost(
  text: string,
  parentId?: string | null
): Promise<TeamPost | null> {
  try {
    const data = await apiFetch<unknown>(
      "/api/team/posts",
      {
        method: "POST",
        headers: headers(parentId),
        body: JSON.stringify({ text }),
      }
    );
    if (data && typeof data === "object" && "id" in (data as object)) {
      return mapPost(data);
    }
    return null;
  } catch (err) {
    logApiError("teamService.createTeamPost", err);
    if (isDev) {
      return {
        id: "p_" + Date.now(),
        type: "team_update",
        author: {
          id: "me",
          name: "Вы",
          role: "parent",
        },
        createdAt: new Date().toISOString(),
        text,
        likesCount: 0,
        commentsCount: 0,
      };
    }
    return null;
  }
}
