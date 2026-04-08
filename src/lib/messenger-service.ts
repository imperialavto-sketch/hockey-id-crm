/**
 * Расширенные каналы messenger (родитель ↔ родитель, каналы команды).
 *
 * Текущая Prisma-схема `ChatConversation` содержит только coach↔parent по игроку
 * (`playerId`, `parentId`, `coachId`). Полей `kind`, `messengerDedupeKey`, `teamContextId`
 * в БД нет — ensure для peer/team здесь отключён; вызовы получают явную ошибку.
 */

import { canParentAccessTeam } from "@/lib/parent-access";
import { parentsShareTeam } from "@/lib/messenger-parent-rules";
import { parentPeerPairBlockedInTeam } from "@/lib/messenger-peer-block";

export const MESSENGER_EXTENDED_CHANNELS_DISABLED = "MESSENGER_EXTENDED_CHANNELS_DISABLED";

export async function getOrCreateParentParentConversation(
  parentIdA: string,
  parentIdB: string,
  teamId: string
): Promise<{ id: string }> {
  if (parentIdA === parentIdB) {
    throw new Error("INVALID_PAIR");
  }
  const share = await parentsShareTeam(parentIdA, parentIdB, teamId);
  if (!share) {
    throw new Error("TEAM_SHARE_REQUIRED");
  }
  const aOk = await canParentAccessTeam(parentIdA, teamId);
  const bOk = await canParentAccessTeam(parentIdB, teamId);
  if (!aOk || !bOk) {
    throw new Error("TEAM_ACCESS_DENIED");
  }
  const blocked = await parentPeerPairBlockedInTeam(teamId, parentIdA, parentIdB);
  if (blocked) {
    throw new Error("PEER_BLOCKED");
  }

  throw new Error(MESSENGER_EXTENDED_CHANNELS_DISABLED);
}

export async function getOrCreateTeamParentChannel(teamId: string): Promise<{ id: string }> {
  void teamId;
  throw new Error(MESSENGER_EXTENDED_CHANNELS_DISABLED);
}

export async function getOrCreateTeamAnnouncementChannel(teamId: string): Promise<{ id: string }> {
  void teamId;
  throw new Error(MESSENGER_EXTENDED_CHANNELS_DISABLED);
}
