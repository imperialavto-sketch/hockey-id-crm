/**
 * Держать в синхроне с src/lib/messenger/coachInboxListContract.ts → formatTeamParentChannelListPreview
 * (Metro не тянет корень monorepo).
 */
export function formatTeamParentChannelListPreview(
  lastSenderLabel: string | undefined,
  lastMessage: string | undefined
): string {
  const label = (lastSenderLabel ?? '').trim();
  const body = (lastMessage ?? '').trim();
  if (label && body) return `${label}: ${body}`;
  if (label) return label;
  if (body) return body;
  return '—';
}
