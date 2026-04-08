import { MESSENGER_KIND } from "@/lib/messenger-kinds";

const PREFIX = "messenger";

export function parentParentDedupeKey(
  parentIdA: string,
  parentIdB: string,
  teamId: string
): string {
  const [a, b] = [parentIdA, parentIdB].sort((x, y) => x.localeCompare(y));
  return `${PREFIX}:pp:${a}:${b}:${teamId}`;
}

export function teamParentChannelDedupeKey(teamId: string): string {
  return `${PREFIX}:tp:${teamId}`;
}

export function teamAnnouncementChannelDedupeKey(teamId: string): string {
  return `${PREFIX}:ta:${teamId}`;
}

export function isAnnouncementChannelKind(kind: string): boolean {
  return kind === MESSENGER_KIND.TEAM_ANNOUNCEMENT_CHANNEL;
}
