/**
 * Маппинг ответа GET /api/coach/conversations/:id/ai-signals → PlannedSmartThreadBlock.
 */

import type { PlannedSmartThreadBlock, SmartThreadBlockKind, SmartThreadLabelKind } from '@/lib/coachThreadSmartBlocks';
import type { CoachAiSignal } from '@/types/coachAiSignalsApi';
import type { MessageUi } from '@/services/coachMessagesService';

function signalTypeOrder(t: CoachAiSignal['type']): number {
  if (t === 'attention') return 0;
  if (t === 'pattern') return 1;
  return 2;
}

function mapSignalTypeToKinds(type: CoachAiSignal['type']): {
  blockKind: SmartThreadBlockKind;
  labelKind: SmartThreadLabelKind;
} {
  if (type === 'summary') {
    return { blockKind: 'summary', labelKind: 'analytics' };
  }
  if (type === 'pattern') {
    return { blockKind: 'insight', labelKind: 'ai' };
  }
  return { blockKind: 'recommendation', labelKind: 'ai' };
}

function resolveAfterIndex(signal: CoachAiSignal, messages: MessageUi[]): number {
  if (messages.length === 0) return -1;
  const idToIndex = new Map<string, number>();
  messages.forEach((m, i) => idToIndex.set(m.id, i));
  const indices = signal.relatedMessageIds
    .map((rid) => idToIndex.get(rid))
    .filter((x): x is number => typeof x === 'number');
  if (indices.length > 0) return Math.max(...indices);
  return messages.length - 1;
}

/**
 * Вставка после последнего связанного сообщения; при пустом треде — пустой массив.
 */
export function mapAiSignalsToPlannedSmartBlocks(
  signals: CoachAiSignal[],
  messages: MessageUi[]
): PlannedSmartThreadBlock[] {
  if (messages.length === 0 || signals.length === 0) return [];

  const enriched = signals.map((s) => ({
    signal: s,
    afterIndex: resolveAfterIndex(s, messages),
  }));

  enriched.sort((a, b) => {
    if (a.afterIndex !== b.afterIndex) return a.afterIndex - b.afterIndex;
    return signalTypeOrder(a.signal.type) - signalTypeOrder(b.signal.type);
  });

  const blocks: PlannedSmartThreadBlock[] = [];
  for (const { signal, afterIndex } of enriched) {
    if (afterIndex < 0) continue;
    const { blockKind, labelKind } = mapSignalTypeToKinds(signal.type);
    blocks.push({
      id: signal.id,
      afterIndex,
      blockKind,
      labelKind,
      body: signal.text,
      aiSignalType: signal.type,
    });
  }
  return blocks;
}
