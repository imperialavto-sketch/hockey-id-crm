export type CoachAiSignalType = 'attention' | 'pattern' | 'summary';

export type CoachAiSignal = {
  id: string;
  conversationId: string;
  type: CoachAiSignalType;
  text: string;
  createdAt: number;
  relatedMessageIds: string[];
};
