/**
 * Client-only composer / note prefills for AI signal workflow CTAs.
 * Uses signal text and light thread context only — no generation, no API.
 */

import type { ConversationType } from '@/components/messages/ConversationCard';

/** Max chars embedded in URLs for pattern → notes bridge (signal body). */
export const AI_SIGNAL_QUERY_SNIPPET_MAX = 380;

/** Max chars for optional thread context in query (banner line). */
export const AI_SIGNAL_THREAD_CONTEXT_QUERY_MAX = 120;

export type PatternDevelopmentBucket =
  | 'discipline'
  | 'concentration'
  | 'errors'
  | 'organization';

const BUCKET_RULES: { bucket: PatternDevelopmentBucket; needles: string[] }[] = [
  {
    bucket: 'discipline',
    needles: ['дисциплин', 'поведен', 'нарушен', 'правил', 'протокол', 'взыскан'],
  },
  {
    bucket: 'concentration',
    needles: ['концентрац', 'внимани', 'отвлек', 'фокус', 'сосредоточ', 'рассеян'],
  },
  {
    bucket: 'errors',
    needles: ['ошибк', 'промах', 'неудач', 'неточн', 'повторяющ', 'систематич'],
  },
  {
    bucket: 'organization',
    needles: ['организац', 'порядок', 'опозда', 'сбор', 'сборы', 'расписан'],
  },
];

/** Keyword-only bucket from signal text; null if nothing obvious. */
export function inferPatternDevelopmentBucket(text: string): PatternDevelopmentBucket | null {
  const lower = text.toLowerCase();
  for (const { bucket, needles } of BUCKET_RULES) {
    if (needles.some((n) => lower.includes(n))) return bucket;
  }
  return null;
}

export function parsePatternBucketParam(raw: string | undefined): PatternDevelopmentBucket | null {
  if (
    raw === 'discipline' ||
    raw === 'concentration' ||
    raw === 'errors' ||
    raw === 'organization'
  ) {
    return raw;
  }
  return null;
}

export function patternBucketToHeadline(bucket: PatternDevelopmentBucket | null): string {
  switch (bucket) {
    case 'discipline':
      return 'Наблюдение по дисциплине из переписки:';
    case 'concentration':
      return 'Наблюдение по концентрации игрока из переписки:';
    case 'errors':
      return 'Повторяющаяся тема ошибок в обсуждении:';
    case 'organization':
      return 'Наблюдение по организации из переписки:';
    default:
      return 'Наблюдение по игроку из переписки:';
  }
}

export function normalizeAiSignalSnippet(body: string, maxLen = 220): string {
  return body.trim().replace(/\s+/g, ' ').slice(0, maxLen);
}

function truncateForQuery(snippet: string, maxLen: number): string {
  const s = snippet.trim().replace(/\s+/g, ' ');
  if (s.length <= maxLen) return s;
  return `${s.slice(0, maxLen - 1).trimEnd()}…`;
}

/**
 * Build href for /notes/[playerId] with optional conversation bridge params.
 * Unknown query keys are ignored by the notes screen if not read.
 */
export function buildNotesHrefWithSignalContext(params: {
  playerId: string;
  conversationId: string;
  signalText: string;
  patternBucket?: PatternDevelopmentBucket | null;
  threadContextLine?: string | null;
}): string {
  const pid = encodeURIComponent(params.playerId.trim());
  const conv = encodeURIComponent(params.conversationId.trim());
  const text = encodeURIComponent(
    truncateForQuery(params.signalText, AI_SIGNAL_QUERY_SNIPPET_MAX)
  );
  let q = `source=conversation&conversationId=${conv}&signalType=pattern&signalText=${text}`;
  if (params.patternBucket) {
    q += `&patternBucket=${encodeURIComponent(params.patternBucket)}`;
  }
  const tc = params.threadContextLine?.trim();
  if (tc) {
    q += `&threadContext=${encodeURIComponent(truncateForQuery(tc, AI_SIGNAL_THREAD_CONTEXT_QUERY_MAX))}`;
  }
  return `/notes/${pid}?${q}`;
}

export function buildAttentionComposerPrefill(params: {
  threadType: ConversationType | null;
  playerFirstName: string | null;
  signalSnippet: string;
}): string {
  const { threadType, playerFirstName, signalSnippet } = params;
  const teamLike = threadType === 'team' || threadType === 'announcement';

  if (teamLike) {
    const head = 'Спасибо за сообщение в чате команды.\n\n';
    if (signalSnippet) {
      return `${head}По теме: ${signalSnippet}\n\n`;
    }
    return head;
  }

  if (playerFirstName) {
    return `Спасибо за сообщение. Вижу ваш вопрос по игроку ${playerFirstName}.\n\n`;
  }

  const head = 'Спасибо за сообщение.\n\n';
  if (signalSnippet) {
    return `${head}По сути: ${signalSnippet}\n\n`;
  }
  return head;
}

export function buildSummaryComposerPrefill(params: {
  signalSnippet: string;
  threadContextLine: string | null;
}): string {
  const { signalSnippet, threadContextLine } = params;
  const ctx = threadContextLine?.trim();
  const lead = signalSnippet
    ? `Кратко по обсуждению: ${signalSnippet}`
    : 'Кратко по обсуждению:';
  const ctxBlock = ctx ? `\n\n(${ctx})` : '';
  return `${lead}${ctxBlock}\n\n• \n• \n• \n\nДополню при необходимости.\n`;
}

export function buildPatternComposerPrefillWithoutPlayer(signalSnippet: string): string {
  const bucket = inferPatternDevelopmentBucket(signalSnippet);
  const headline = patternBucketToHeadline(bucket);
  const s = normalizeAiSignalSnippet(signalSnippet);
  if (s) {
    return `${headline}\n${s}\n\nЗафиксируйте в карточке игрока (тип заметки «Развитие»), когда появится контекст.\n\n`;
  }
  return `${headline}\n\n`;
}

/** Notes body when opened from pattern CTA (development workflow framing). */
export function buildPatternDevelopmentNotePrefill(params: {
  signalSnippet: string;
  threadContextLine?: string | null;
  bucket?: PatternDevelopmentBucket | null;
}): string {
  const body = params.signalSnippet.trim().replace(/\s+/g, ' ');
  if (!body) return '';
  const headline = patternBucketToHeadline(params.bucket ?? null);
  const ctx = params.threadContextLine?.trim();
  const ctxLine = ctx ? `\n\nКонтекст треда: ${ctx}` : '';
  return `${headline}\n${body}${ctxLine}\n\n• \n• \n`;
}

/** @deprecated Prefer buildPatternDevelopmentNotePrefill */
export function buildPatternNotePrefillFromSignal(signalSnippet: string): string {
  return buildPatternDevelopmentNotePrefill({ signalSnippet });
}
