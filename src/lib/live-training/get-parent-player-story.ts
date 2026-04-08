import { buildParentPlayerStoryItems, parentStoryLowData } from "./build-parent-player-story";
import { getParentRecentScopedLiveTrainingSummaries } from "./parent-latest-live-training-summary";
import type { ParentPlayerStoryDto } from "./player-story-model";

export async function getParentPlayerStory(playerId: string): Promise<ParentPlayerStoryDto> {
  const summaries = await getParentRecentScopedLiveTrainingSummaries(playerId, 3);
  const items = buildParentPlayerStoryItems(summaries);
  return {
    items,
    lowData: parentStoryLowData(summaries),
  };
}
