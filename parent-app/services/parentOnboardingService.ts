import { getPlayers } from "@/services/playerService";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { apiFetch, ApiRequestError } from "@/lib/api";

const POST_LINK_SUCCESS_KEY = "@parent_post_link_success_once";

/** Ответ POST /api/parent/refresh-pending-links */
export type RefreshPendingLinksCode =
  | "NO_PHONE_ON_PROFILE"
  | "NO_PENDING_INVITES"
  | "NO_CHANGE"
  | "LINKS_APPLIED";

export type RefreshPendingLinksResult = {
  success: boolean;
  code: RefreshPendingLinksCode;
  changed: boolean;
  linkedPlayersCount: number;
  message: string;
};

type RefreshPendingLinksApiBody = {
  success?: boolean;
  code?: string;
  changed?: boolean;
  linkedPlayersCount?: number;
  message?: string;
};

const REFRESH_CODES: RefreshPendingLinksCode[] = [
  "NO_PHONE_ON_PROFILE",
  "NO_PENDING_INVITES",
  "NO_CHANGE",
  "LINKS_APPLIED",
];

function parseRefreshBody(raw: unknown): RefreshPendingLinksResult {
  if (!raw || typeof raw !== "object") {
    return {
      success: false,
      code: "NO_CHANGE",
      changed: false,
      linkedPlayersCount: 0,
      message: "Неверный ответ сервера",
    };
  }
  const o = raw as RefreshPendingLinksApiBody;
  const rawCode = typeof o.code === "string" ? o.code : "";
  const code = (REFRESH_CODES.includes(rawCode as RefreshPendingLinksCode)
    ? rawCode
    : "NO_CHANGE") as RefreshPendingLinksCode;
  const linkedPlayersCount =
    typeof o.linkedPlayersCount === "number" && Number.isFinite(o.linkedPlayersCount)
      ? Math.max(0, Math.floor(o.linkedPlayersCount))
      : 0;
  return {
    success: o.success === true,
    code,
    changed: o.changed === true,
    linkedPlayersCount,
    message: typeof o.message === "string" && o.message.trim() ? o.message.trim() : "",
  };
}

/**
 * Повторно применяет pending-приглашения по телефону профиля (тот же `processPendingInvites`, что и при verify).
 * Идемпотентно: повторные вызовы без новых invite не меняют данные.
 */
export async function refreshPendingParentLinks(): Promise<RefreshPendingLinksResult> {
  try {
    const raw = await apiFetch<unknown>("/api/parent/refresh-pending-links", {
      method: "POST",
      body: JSON.stringify({}),
      timeoutMs: 15000,
    });
    return parseRefreshBody(raw);
  } catch (e) {
    if (e instanceof ApiRequestError) {
      const msg =
        e.message?.trim() ||
        (e.status === 401 ? "Сессия истекла. Войдите снова." : "Не удалось обновить привязки");
      throw new ApiRequestError(msg, e.status, e.code);
    }
    throw e;
  }
}

export async function hasLinkedPlayers(): Promise<boolean> {
  const players = await getPlayers("self").catch(() => []);
  return Array.isArray(players) && players.length > 0;
}

export async function markPostLinkSuccess(): Promise<void> {
  await AsyncStorage.setItem(POST_LINK_SUCCESS_KEY, "1");
}

export async function consumePostLinkSuccess(): Promise<boolean> {
  const value = await AsyncStorage.getItem(POST_LINK_SUCCESS_KEY);
  if (value !== "1") return false;
  await AsyncStorage.removeItem(POST_LINK_SUCCESS_KEY);
  return true;
}
