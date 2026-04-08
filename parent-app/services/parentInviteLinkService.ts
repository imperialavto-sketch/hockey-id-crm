/**
 * Manual parent–player link via invite id (POST /api/parent/link-by-invite).
 * Phone+SMS flow remains primary; this is an additional path.
 */

import { apiFetch, ApiRequestError } from "@/lib/api";

export type LinkByInviteCodeResult = {
  alreadyLinked: boolean;
};

export type ParentInviteLinkFailureKind =
  | "INVALID_INVITE"
  | "INVITE_ALREADY_USED"
  | "PHONE_MISMATCH"
  | "UNAUTHORIZED"
  | "GENERIC";

export class ParentInviteLinkError extends Error {
  readonly kind: ParentInviteLinkFailureKind;

  constructor(message: string, kind: ParentInviteLinkFailureKind) {
    super(message);
    this.name = "ParentInviteLinkError";
    this.kind = kind;
  }
}

type LinkByInviteSuccessBody = {
  ok?: boolean;
  success?: boolean;
  alreadyLinked?: boolean;
};

function mapApiCodeToKind(
  status: number,
  apiCode: string | undefined
): ParentInviteLinkFailureKind | null {
  if (status === 401) return "UNAUTHORIZED";
  if (apiCode === "PHONE_MISMATCH" || status === 403) return "PHONE_MISMATCH";
  if (apiCode === "INVITE_ALREADY_USED" || status === 409) return "INVITE_ALREADY_USED";
  if (apiCode === "INVALID_INVITE" || status === 404) return "INVALID_INVITE";
  return null;
}

function userMessageForKind(kind: ParentInviteLinkFailureKind, fallback: string): string {
  switch (kind) {
    case "UNAUTHORIZED":
      return "Сессия истекла. Войдите снова.";
    case "INVALID_INVITE":
      return "Код не найден или недействителен.";
    case "INVITE_ALREADY_USED":
      return "Этот код уже использован другим аккаунтом.";
    case "PHONE_MISMATCH":
      return "Код выдан на другой номер. Войдите с тем же номером, что указал тренер, или попросите новое приглашение.";
    default:
      return fallback || "Не удалось подключить. Попробуйте позже.";
  }
}

/** POST /api/parent/link-by-invite with inviteCode = ParentInvite.id */
export async function linkByInviteCode(inviteCode: string): Promise<LinkByInviteCodeResult> {
  const trimmed = inviteCode.trim();
  if (!trimmed) {
    throw new ParentInviteLinkError("Введите код приглашения", "INVALID_INVITE");
  }

  try {
    const res = await apiFetch<LinkByInviteSuccessBody>("/api/parent/link-by-invite", {
      method: "POST",
      body: JSON.stringify({ inviteCode: trimmed }),
      timeoutMs: 15000,
    });
    const ok = res?.ok === true || res?.success === true;
    if (!ok) {
      throw new ParentInviteLinkError(
        userMessageForKind("GENERIC", "Не удалось подключить"),
        "GENERIC"
      );
    }
    return { alreadyLinked: res?.alreadyLinked === true };
  } catch (e) {
    if (e instanceof ParentInviteLinkError) throw e;
    if (e instanceof ApiRequestError) {
      const kind = mapApiCodeToKind(e.status, e.code) ?? "GENERIC";
      throw new ParentInviteLinkError(userMessageForKind(kind, e.message), kind);
    }
    throw e;
  }
}
