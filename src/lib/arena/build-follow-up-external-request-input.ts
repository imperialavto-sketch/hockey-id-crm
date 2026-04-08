import { getLatestExternalTrainingRequestForParentPlayer } from "@/lib/arena/external-training-requests";
import { getExternalTrainingReportByRequestId } from "@/lib/arena/external-training-reports";
import { parseNextStepLines } from "@/lib/arena/build-external-follow-up-recommendation";

export type FollowUpExternalRequestInput = {
  playerId: string;
  parentId: string;
  coachId: string;
  skillKey: string | null;
  reasonSummary: string;
};

const MAX_REASON = 480;
const MAX_FIRST_STEP = 140;

function clampText(s: string, max: number): string {
  const t = s.trim();
  if (t.length <= max) return t;
  return `${t.slice(0, Math.max(0, max - 1)).trimEnd()}…`;
}

export async function buildFollowUpExternalRequestInput(params: {
  playerId: string;
  parentId: string;
}): Promise<FollowUpExternalRequestInput | null> {
  const playerId = params.playerId.trim();
  const parentId = params.parentId.trim();
  if (!playerId || !parentId) return null;

  const request = await getLatestExternalTrainingRequestForParentPlayer({
    parentId,
    playerId,
  });
  if (!request) return null;

  const report = await getExternalTrainingReportByRequestId(request.id);
  if (!report) return null;

  const coachId = request.coachId?.trim();
  if (!coachId) return null;

  const lines = parseNextStepLines(report.nextSteps);
  const first = lines[0]?.trim();
  const reasonSummary = clampText(
    first
      ? `Продолжение работы: ${clampText(first, MAX_FIRST_STEP)}`
      : "Продолжение дополнительной работы по текущему фокусу",
    MAX_REASON
  );

  return {
    playerId,
    parentId,
    coachId,
    skillKey: request.skillKey?.trim() || null,
    reasonSummary,
  };
}
