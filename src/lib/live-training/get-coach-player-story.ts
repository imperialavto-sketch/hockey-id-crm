import { buildCoachPlayerStoryItems, coachStoryLowData } from "./build-coach-player-story";
import { getPlayerLiveTrainingSignalsBundle } from "./get-coach-player-live-training-signals";
import type { CoachPlayerStoryDto } from "./player-story-model";

export async function getCoachPlayerStory(playerId: string): Promise<CoachPlayerStoryDto> {
  const bundle = await getPlayerLiveTrainingSignalsBundle(playerId);
  const items = buildCoachPlayerStoryItems(bundle);
  return {
    items,
    lowData: coachStoryLowData(bundle, items),
  };
}
