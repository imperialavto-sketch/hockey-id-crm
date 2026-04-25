import type {
  ArenaCrmSnapshot,
  ArenaCrmSupercoreOperationalFocusLine,
  ArenaGroupSnapshot,
  ArenaPlayerSnapshot,
  ArenaPlayerTrend,
  ArenaTeamSnapshot,
} from "./arenaCrmTypes";

/**
 * Frozen local CRM HTTP wire for `GET .../arena-crm-snapshot` (player + team detail only).
 * `supercoreOperationalFocus` обязателен (массив, может быть пустым); `playerSnapshot` / `teamSnapshot`
 * опциональны — read-only секции CRM без отдельных запросов.
 * `groupArenaSnapshots` — только team-ответ: строки для `CrmArenaGroupSnapshotInline` (без отдельного API).
 */
export type ArenaCrmGroupSnapshotWireRow = {
  groupId: string;
  groupSnapshot: ArenaGroupSnapshot;
};

export type ArenaCrmOperationalFocusWireJson = {
  supercoreOperationalFocus: ArenaCrmSupercoreOperationalFocusLine[];
  playerSnapshot?: ArenaPlayerSnapshot;
  teamSnapshot?: ArenaTeamSnapshot;
  groupArenaSnapshots?: ArenaCrmGroupSnapshotWireRow[];
};

export function toArenaCrmOperationalFocusWireJson(snap: ArenaCrmSnapshot): ArenaCrmOperationalFocusWireJson {
  const out: ArenaCrmOperationalFocusWireJson = {
    supercoreOperationalFocus: snap.supercoreOperationalFocus ?? [],
  };
  if (snap.player) out.playerSnapshot = snap.player;
  if (snap.team) out.teamSnapshot = snap.team;
  return out;
}

function isNonEmptyString(v: unknown): v is string {
  return typeof v === "string" && v.length > 0;
}

function isString(v: unknown): v is string {
  return typeof v === "string";
}

function isFiniteNumber(v: unknown): v is number {
  return typeof v === "number" && Number.isFinite(v);
}

function parsePlayerSnapshotWire(v: unknown): ArenaPlayerSnapshot | undefined {
  if (!v || typeof v !== "object") return undefined;
  const o = v as Record<string, unknown>;
  const trend = o.trend as ArenaPlayerTrend | undefined;
  if (trend !== "up" && trend !== "stable" && trend !== "down") return undefined;
  if (
    !isFiniteNumber(o.recentSignals) ||
    !isFiniteNumber(o.positiveCount) ||
    !isFiniteNumber(o.attentionCount) ||
    !isFiniteNumber(o.repeatedConcerns)
  ) {
    return undefined;
  }
  return {
    recentSignals: o.recentSignals,
    positiveCount: o.positiveCount,
    attentionCount: o.attentionCount,
    trend,
    repeatedConcerns: o.repeatedConcerns,
  };
}

function parseTeamSnapshotWire(v: unknown): ArenaTeamSnapshot | undefined {
  if (!v || typeof v !== "object") return undefined;
  const o = v as Record<string, unknown>;
  if (!isFiniteNumber(o.totalPlayers)) return undefined;
  if (!Array.isArray(o.attentionZones) || !Array.isArray(o.dominantStrengths)) return undefined;
  if (!o.attentionZones.every(isString) || !o.dominantStrengths.every(isString)) return undefined;
  return {
    totalPlayers: o.totalPlayers,
    attentionZones: [...o.attentionZones],
    dominantStrengths: [...o.dominantStrengths],
  };
}

function parseGroupSnapshotWire(v: unknown): ArenaGroupSnapshot | undefined {
  if (!v || typeof v !== "object") return undefined;
  const o = v as Record<string, unknown>;
  if (
    !isFiniteNumber(o.players) ||
    !isFiniteNumber(o.attentionPlayers) ||
    !isFiniteNumber(o.strongPlayers) ||
    !isFiniteNumber(o.unstablePlayers)
  ) {
    return undefined;
  }
  return {
    players: o.players,
    attentionPlayers: o.attentionPlayers,
    strongPlayers: o.strongPlayers,
    unstablePlayers: o.unstablePlayers,
  };
}

/**
 * Validates JSON from `.../arena-crm-snapshot` routes. Returns null if malformed.
 */
export function parseArenaCrmOperationalFocusWireResponse(
  json: unknown
): ArenaCrmOperationalFocusWireJson | null {
  if (!json || typeof json !== "object") return null;
  const raw = json as {
    supercoreOperationalFocus?: unknown;
    playerSnapshot?: unknown;
    teamSnapshot?: unknown;
    groupArenaSnapshots?: unknown;
  };
  if (!Array.isArray(raw.supercoreOperationalFocus)) return null;

  const supercoreOperationalFocus: ArenaCrmSupercoreOperationalFocusLine[] = [];
  for (const item of raw.supercoreOperationalFocus) {
    if (!item || typeof item !== "object") continue;
    const o = item as Record<string, unknown>;
    if (
      !isString(o.title) ||
      !isString(o.body) ||
      !isNonEmptyString(o.liveTrainingSessionId) ||
      !isNonEmptyString(o.bindingDecisionId)
    ) {
      continue;
    }
    supercoreOperationalFocus.push({
      title: o.title,
      body: o.body,
      liveTrainingSessionId: o.liveTrainingSessionId,
      bindingDecisionId: o.bindingDecisionId,
    });
  }
  const out: ArenaCrmOperationalFocusWireJson = { supercoreOperationalFocus };
  const ps = parsePlayerSnapshotWire(raw.playerSnapshot);
  if (ps) out.playerSnapshot = ps;
  const ts = parseTeamSnapshotWire(raw.teamSnapshot);
  if (ts) out.teamSnapshot = ts;

  if (Array.isArray(raw.groupArenaSnapshots)) {
    const groupArenaSnapshots: ArenaCrmGroupSnapshotWireRow[] = [];
    for (const item of raw.groupArenaSnapshots) {
      if (!item || typeof item !== "object") continue;
      const o = item as Record<string, unknown>;
      if (!isNonEmptyString(o.groupId)) continue;
      const groupSnapshot = parseGroupSnapshotWire(o.groupSnapshot);
      if (!groupSnapshot) continue;
      groupArenaSnapshots.push({ groupId: o.groupId, groupSnapshot });
    }
    if (groupArenaSnapshots.length > 0) out.groupArenaSnapshots = groupArenaSnapshots;
  }

  return out;
}
