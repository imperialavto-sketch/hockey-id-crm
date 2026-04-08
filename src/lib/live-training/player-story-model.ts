/**
 * PHASE 14: компактная модель «истории развития» без LLM — только structured items из агрегатов.
 */

export type PlayerStoryItemTone = "positive" | "neutral" | "attention";

export type PlayerStoryItemType =
  | "training_summary"
  | "positive_signal"
  | "focus_area"
  | "trend_note";

export type PlayerStoryItemDto = {
  type: PlayerStoryItemType;
  /** ISO или null для непривязанных сводок */
  date: string | null;
  title: string;
  body: string;
  tone: PlayerStoryItemTone;
};

export type CoachPlayerStoryDto = {
  items: PlayerStoryItemDto[];
  /** Мало сигналов / нечего показывать как «линию» */
  lowData: boolean;
};

export type ParentPlayerStoryDto = {
  items: PlayerStoryItemDto[];
  lowData: boolean;
};
