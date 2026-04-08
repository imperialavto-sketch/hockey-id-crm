/**
 * Типы и подписи для SmartThreadBlock в треде (данные приходят с GET .../ai-signals).
 */

export type SmartThreadBlockKind = 'insight' | 'recommendation' | 'summary';

export type SmartThreadLabelKind = 'ai' | 'analytics';

/** Совпадает с серверным типом сигнала — для CTA workflow bridge */
export type AiSignalActionType = 'attention' | 'pattern' | 'summary';

export type PlannedSmartThreadBlock = {
  id: string;
  afterIndex: number;
  blockKind: SmartThreadBlockKind;
  labelKind: SmartThreadLabelKind;
  body: string;
  /** Заполняется для блоков из ai-signals; по нему показывается действие */
  aiSignalType?: AiSignalActionType;
};

export function labelTextForSmartBlock(labelKind: SmartThreadLabelKind): string {
  return labelKind === 'analytics' ? 'Аналитика' : 'AI';
}
