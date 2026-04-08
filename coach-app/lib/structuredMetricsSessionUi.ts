import type {
  PatchTrainingStructuredMetricsPayload,
  TrainingStructuredMetricsPlayer,
} from '@/services/coachScheduleService';

/** Per-player draft: `undefined` = не трогать при PATCH, `null` = сбросить ось на сервере. */
export type StructuredMetricsAxisDraft = {
  skating?: number | null;
  passing?: number | null;
  shooting?: number | null;
  positioning?: number | null;
  decisionMaking?: number | null;
  endurance?: number | null;
  speed?: number | null;
  focus?: number | null;
  discipline?: number | null;
};

export type StructuredMetricsDraftMap = Record<
  string,
  StructuredMetricsAxisDraft | undefined
>;

function pickAxis(
  obj: unknown,
  key: string
): number | null | undefined {
  if (!obj || typeof obj !== 'object' || Array.isArray(obj)) return undefined;
  const v = (obj as Record<string, unknown>)[key];
  if (v === null) return null;
  if (typeof v === 'number' && Number.isInteger(v) && v >= 1 && v <= 5) {
    return v;
  }
  return undefined;
}

export function initStructuredMetricsDraftFromPlayers(
  players: TrainingStructuredMetricsPlayer[]
): StructuredMetricsDraftMap {
  const d: StructuredMetricsDraftMap = {};
  for (const p of players) {
    const m = p.structuredMetrics;
    d[p.playerId] = {
      skating: pickAxis(m?.iceTechnical, 'skating'),
      passing: pickAxis(m?.iceTechnical, 'passing'),
      shooting: pickAxis(m?.iceTechnical, 'shooting'),
      positioning: pickAxis(m?.tactical, 'positioning'),
      decisionMaking: pickAxis(m?.tactical, 'decisionMaking'),
      endurance: pickAxis(m?.ofpQualitative, 'endurance'),
      speed: pickAxis(m?.ofpQualitative, 'speed'),
      focus: pickAxis(m?.behavioral, 'focus'),
      discipline: pickAxis(m?.behavioral, 'discipline'),
    };
  }
  return d;
}

export function buildStructuredMetricsPatchItems(
  players: TrainingStructuredMetricsPlayer[],
  draft: StructuredMetricsDraftMap
): PatchTrainingStructuredMetricsPayload['items'] {
  const items: PatchTrainingStructuredMetricsPayload['items'] = [];
  for (const p of players) {
    const row = draft[p.playerId] ?? {};
    const ice: Record<string, number | null> = {};
    if (row.skating !== undefined) ice.skating = row.skating;
    if (row.passing !== undefined) ice.passing = row.passing;
    if (row.shooting !== undefined) ice.shooting = row.shooting;

    const tactical: Record<string, number | null> = {};
    if (row.positioning !== undefined) tactical.positioning = row.positioning;
    if (row.decisionMaking !== undefined) {
      tactical.decisionMaking = row.decisionMaking;
    }

    const ofpQualitative: Record<string, number | null> = {};
    if (row.endurance !== undefined) ofpQualitative.endurance = row.endurance;
    if (row.speed !== undefined) ofpQualitative.speed = row.speed;

    const behavioral: Record<string, number | null> = {};
    if (row.focus !== undefined) behavioral.focus = row.focus;
    if (row.discipline !== undefined) behavioral.discipline = row.discipline;

    const item: PatchTrainingStructuredMetricsPayload['items'][number] = {
      playerId: p.playerId,
    };
    if (Object.keys(ice).length > 0) item.iceTechnical = ice;
    if (Object.keys(tactical).length > 0) item.tactical = tactical;
    if (Object.keys(ofpQualitative).length > 0) {
      item.ofpQualitative = ofpQualitative;
    }
    if (Object.keys(behavioral).length > 0) item.behavioral = behavioral;

    if (
      item.iceTechnical ||
      item.tactical ||
      item.ofpQualitative ||
      item.behavioral
    ) {
      items.push(item);
    }
  }
  return items;
}
