import type { ArenaParentExplanation } from "./arenaParentExplanation";

/** Строка списка наблюдений с тренировки (порядок = порядок в JSON). */
export type ParentLiveTrainingObservationRow = {
  id: string;
  sourceText?: string;
  parentExplanation?: ArenaParentExplanation | null;
};
