import {
  COACH_SESSION_METRICS_SCHEMA_VERSION,
  type PlayerSessionStructuredMetricsPayloadV1,
} from "./types";

const AXIS_KEYS_ICE = new Set([
  "skating",
  "passing",
  "shooting",
  "puckControl",
  "balance",
  "coordination",
]);
const AXIS_KEYS_TACTICAL = new Set([
  "positioning",
  "decisionMaking",
  "offPuckWork",
  "discipline",
  "gameAwareness",
]);
const AXIS_KEYS_OFP = new Set([
  "speed",
  "endurance",
  "strength",
  "agility",
  "mobility",
  "balance",
]);
const AXIS_KEYS_PHYSICAL = new Set(["exertion"]);
const AXIS_KEYS_BEHAVIORAL = new Set(["focus", "engagement", "discipline"]);

const NOTE_MAX = 2000;
const TAG_MAX = 64;
const LIST_MAX_ITEMS = 50;
const STRING_ID_MAX = 128;

function hasKey(obj: Record<string, unknown>, key: string): boolean {
  return Object.prototype.hasOwnProperty.call(obj, key);
}

function isPlainObject(v: unknown): v is Record<string, unknown> {
  return v !== null && typeof v === "object" && !Array.isArray(v);
}

function parseAxis1to5(v: unknown, key: string): number | null {
  if (v === null || v === undefined) return null;
  const n = typeof v === "number" ? v : typeof v === "string" ? Number(v) : NaN;
  if (!Number.isInteger(n) || n < 1 || n > 5) {
    throw new Error(`${key}: ожидается целое 1–5 или null`);
  }
  return n;
}

function sanitizeAxisBucket(
  raw: unknown,
  allowedKeys: Set<string>,
  label: string
): Record<string, number | null> | null {
  if (raw === null) return null;
  if (!isPlainObject(raw)) {
    throw new Error(`${label}: ожидается объект или null`);
  }
  const out: Record<string, number | null> = {};
  for (const [k, val] of Object.entries(raw)) {
    if (!allowedKeys.has(k)) {
      continue;
    }
    out[k] = parseAxis1to5(val, `${label}.${k}`);
  }
  return Object.keys(out).length > 0 ? out : null;
}

function sanitizeStringList(raw: unknown, label: string): string[] | undefined {
  if (raw === undefined) return undefined;
  if (raw === null) return undefined;
  if (!Array.isArray(raw)) {
    throw new Error(`${label}: ожидается массив строк`);
  }
  if (raw.length > LIST_MAX_ITEMS) {
    throw new Error(`${label}: не более ${LIST_MAX_ITEMS} элементов`);
  }
  const out: string[] = [];
  for (let i = 0; i < raw.length; i++) {
    const item = raw[i];
    if (typeof item !== "string") {
      throw new Error(`${label}[${i}]: ожидается строка`);
    }
    const t = item.trim();
    if (!t) continue;
    if (t.length > TAG_MAX) {
      throw new Error(`${label}[${i}]: не длиннее ${TAG_MAX} символов`);
    }
    out.push(t);
  }
  return out.length > 0 ? out : undefined;
}

function sanitizeNote(raw: unknown): string | undefined {
  if (raw === undefined || raw === null) return undefined;
  if (typeof raw !== "string") {
    throw new Error("observation.note: ожидается строка");
  }
  const t = raw.trim();
  if (!t) return undefined;
  return t.length > NOTE_MAX ? t.slice(0, NOTE_MAX) : t;
}

function sanitizeObservationObject(
  raw: Record<string, unknown>
): PlayerSessionStructuredMetricsPayloadV1["observation"] {
  const strengths = sanitizeStringList(raw.strengths, "observation.strengths");
  const growthAreas = sanitizeStringList(
    raw.growthAreas,
    "observation.growthAreas"
  );
  const tags = sanitizeStringList(raw.tags, "observation.tags");
  const note = sanitizeNote(raw.note);
  if (
    strengths === undefined &&
    growthAreas === undefined &&
    tags === undefined &&
    note === undefined
  ) {
    return null;
  }
  return { strengths, growthAreas, tags, note };
}

function sanitizeObservation(
  raw: unknown
): PlayerSessionStructuredMetricsPayloadV1["observation"] {
  if (raw === null) return null;
  if (!isPlainObject(raw)) {
    throw new Error("observation: ожидается объект или null");
  }
  return sanitizeObservationObject(raw);
}

function sanitizeVoiceMetaObject(
  raw: Record<string, unknown>
): PlayerSessionStructuredMetricsPayloadV1["voiceMeta"] {
  const out: Record<string, unknown> = {};
  if (typeof raw.draftSessionId === "string") {
    const t = raw.draftSessionId.trim();
    if (t.length > STRING_ID_MAX) {
      throw new Error("voiceMeta.draftSessionId: слишком длинный id");
    }
    if (t) out.draftSessionId = t;
  } else if (raw.draftSessionId !== undefined && raw.draftSessionId !== null) {
    throw new Error("voiceMeta.draftSessionId: ожидается строка");
  }
  if (typeof raw.rawTranscriptRef === "string") {
    const t = raw.rawTranscriptRef.trim();
    if (t.length > STRING_ID_MAX) {
      throw new Error("voiceMeta.rawTranscriptRef: слишком длинная ссылка");
    }
    if (t) out.rawTranscriptRef = t;
  } else if (
    raw.rawTranscriptRef !== undefined &&
    raw.rawTranscriptRef !== null
  ) {
    throw new Error("voiceMeta.rawTranscriptRef: ожидается строка");
  }
  if (raw.confidence !== undefined && raw.confidence !== null) {
    const n =
      typeof raw.confidence === "number"
        ? raw.confidence
        : Number(raw.confidence);
    if (!Number.isFinite(n) || n < 0 || n > 1) {
      throw new Error("voiceMeta.confidence: ожидается число 0–1");
    }
    out.confidence = n;
  }
  if (typeof raw.reviewRequired === "boolean") {
    out.reviewRequired = raw.reviewRequired;
  } else if (
    raw.reviewRequired !== undefined &&
    raw.reviewRequired !== null
  ) {
    throw new Error("voiceMeta.reviewRequired: ожидается boolean");
  }
  if (raw.extractedObservationIds !== undefined && raw.extractedObservationIds !== null) {
    const ids = sanitizeStringList(
      raw.extractedObservationIds,
      "voiceMeta.extractedObservationIds"
    );
    if (ids) out.extractedObservationIds = ids;
  }
  return Object.keys(out).length > 0
    ? (out as NonNullable<PlayerSessionStructuredMetricsPayloadV1["voiceMeta"]>)
    : null;
}

function sanitizeVoiceMeta(
  raw: unknown
): PlayerSessionStructuredMetricsPayloadV1["voiceMeta"] {
  if (raw === null) return null;
  if (!isPlainObject(raw)) {
    throw new Error("voiceMeta: ожидается объект или null");
  }
  return sanitizeVoiceMetaObject(raw);
}

export type ParsedPlayerSessionStructuredMetricsMerge = {
  schemaVersion?: number;
  iceTechnical?: Record<string, number | null> | null;
  tactical?: Record<string, number | null> | null;
  ofpQualitative?: Record<string, number | null> | null;
  physical?: Record<string, number | null> | null;
  behavioral?: Record<string, number | null> | null;
  observation?: PlayerSessionStructuredMetricsPayloadV1["observation"] | null;
  voiceMeta?: PlayerSessionStructuredMetricsPayloadV1["voiceMeta"] | null;
};

/**
 * Partial update semantics: only keys present on `input` are validated and returned.
 * `null` for a bucket clears it in persistence; omitted key leaves previous DB value unchanged.
 */
export function parsePlayerSessionStructuredMetricsMergePayload(
  input: unknown
): ParsedPlayerSessionStructuredMetricsMerge {
  if (!isPlainObject(input)) {
    throw new Error("Тело запроса: ожидается объект");
  }
  const out: ParsedPlayerSessionStructuredMetricsMerge = {};

  if (hasKey(input, "schemaVersion")) {
    const v = input.schemaVersion;
    if (v === null || v === undefined) {
      throw new Error("schemaVersion: не может быть пустым, если передан");
    }
    const n = typeof v === "number" ? v : Number(v);
    if (!Number.isInteger(n) || n < 1 || n > COACH_SESSION_METRICS_SCHEMA_VERSION) {
      throw new Error(
        `schemaVersion: поддерживается только ${COACH_SESSION_METRICS_SCHEMA_VERSION}`
      );
    }
    out.schemaVersion = n;
  }

  if (hasKey(input, "iceTechnical")) {
    out.iceTechnical = sanitizeAxisBucket(
      input.iceTechnical,
      AXIS_KEYS_ICE,
      "iceTechnical"
    );
  }
  if (hasKey(input, "tactical")) {
    out.tactical = sanitizeAxisBucket(
      input.tactical,
      AXIS_KEYS_TACTICAL,
      "tactical"
    );
  }
  if (hasKey(input, "ofpQualitative")) {
    out.ofpQualitative = sanitizeAxisBucket(
      input.ofpQualitative,
      AXIS_KEYS_OFP,
      "ofpQualitative"
    );
  }
  if (hasKey(input, "physical")) {
    out.physical = sanitizeAxisBucket(
      input.physical,
      AXIS_KEYS_PHYSICAL,
      "physical"
    );
  }
  if (hasKey(input, "behavioral")) {
    out.behavioral = sanitizeAxisBucket(
      input.behavioral,
      AXIS_KEYS_BEHAVIORAL,
      "behavioral"
    );
  }
  if (hasKey(input, "observation")) {
    out.observation = sanitizeObservation(input.observation);
  }
  if (hasKey(input, "voiceMeta")) {
    out.voiceMeta = sanitizeVoiceMeta(input.voiceMeta);
  }

  return out;
}
