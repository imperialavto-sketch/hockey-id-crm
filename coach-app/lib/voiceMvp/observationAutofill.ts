export type ObservationImpactCandidate = "positive" | "neutral" | "negative";

export type SkillTypeCandidate =
  | "skating"
  | "shooting"
  | "passing"
  | "positioning"
  | "defense"
  | "effort"
  | "confidence"
  | "communication";

export interface VoiceObservationCandidates {
  playerNameCandidate: string | null;
  playerJerseyCandidate: number | null;
  skillCandidate: SkillTypeCandidate | null;
  impactCandidate: ObservationImpactCandidate | null;
  noteCandidate: string;
}

export interface VoiceObservationPrefillPayload {
  id: string;
  createdAt: string;
  transcript: string;
  playerNameCandidate: string | null;
  playerJerseyCandidate: number | null;
  skillCandidate: SkillTypeCandidate | null;
  impactCandidate: ObservationImpactCandidate | null;
  noteCandidate: string;
}

const SKILL_KEYWORDS: Array<{ skill: SkillTypeCandidate; keywords: string[] }> = [
  { skill: "skating", keywords: ["катан", "скорост", "разгон", "тормож", "коньк"] },
  { skill: "shooting", keywords: ["брос", "щелч", "кистев", "добив"] },
  { skill: "passing", keywords: ["передач", "пас", "распасов"] },
  { skill: "positioning", keywords: ["позици", "расположен", "открыван", "выбор позици"] },
  { skill: "defense", keywords: ["оборон", "защит", "назад", "единоборств"] },
  { skill: "effort", keywords: ["интенсив", "старан", "активн", "энерг"] },
  { skill: "confidence", keywords: ["уверен", "скован", "боится", "психолог"] },
  { skill: "communication", keywords: ["коммуникац", "подсказ", "общени", "разговор"] },
];

const NEGATIVE_HINTS = [
  "плохо",
  "хуже",
  "слаб",
  "ошиб",
  "спад",
  "не успева",
  "не хватает",
  "потер",
  "проблем",
];

const POSITIVE_HINTS = [
  "лучше",
  "улучш",
  "прогресс",
  "прибав",
  "сильн",
  "хорош",
  "стабильн",
  "уверенн",
];

function normalize(text: string): string {
  return text.toLowerCase().replace(/[.,!?;:()[\]"]/g, " ").replace(/\s+/g, " ").trim();
}

function cleanNoteCandidate(text: string): string {
  let t = text.replace(/\s+/g, " ").trim();
  t = t.replace(/^ну\s+/i, "");
  t = t.replace(/^смотри\s+/i, "");
  t = t.replace(/^значит\s+/i, "");
  t = t.replace(/^[А-ЯЁ][а-яё]+(?:\s+[А-ЯЁ][а-яё]+)?[,:\-]\s*/u, "");
  t = t.replace(/^(игрок|по игроку|у игрока|для игрока)\s+/i, "");
  t = t.replace(/^(номер|№|#)\s*\d{1,3}\s*/i, "");
  t = t.replace(/^[—:,\s]+/, "");
  return t.trim();
}

function trimForNote(text: string, maxLen = 320): string {
  const t = cleanNoteCandidate(text);
  if (!t) return "Наблюдение из голосовой заметки";
  if (t.length <= maxLen) return t;
  return `${t.slice(0, maxLen - 1).trimEnd()}…`;
}

function detectImpactCandidate(normalized: string): ObservationImpactCandidate | null {
  const hasNegative = NEGATIVE_HINTS.some((w) => normalized.includes(w));
  const hasPositive = POSITIVE_HINTS.some((w) => normalized.includes(w));
  if (hasNegative && !hasPositive) return "negative";
  if (hasPositive && !hasNegative) return "positive";
  if (hasPositive && hasNegative) return "neutral";
  return null;
}

function detectSkillCandidate(normalized: string): SkillTypeCandidate | null {
  let winner: SkillTypeCandidate | null = null;
  let score = 0;
  for (const entry of SKILL_KEYWORDS) {
    const s = entry.keywords.reduce(
      (acc, kw) => acc + (normalized.includes(kw) ? 1 : 0),
      0
    );
    if (s > score) {
      winner = entry.skill;
      score = s;
    }
  }
  return score > 0 ? winner : null;
}

function detectPlayerNameCandidate(raw: string): string | null {
  const transcript = raw.replace(/\s+/g, " ").trim();
  if (!transcript) return null;
  const m =
    transcript.match(/(?:игрок|у|для)\s+([А-ЯЁ][а-яё]+(?:\s+[А-ЯЁ][а-яё]+)?)/) ??
    transcript.match(/^([А-ЯЁ][а-яё]+(?:\s+[А-ЯЁ][а-яё]+)?)/) ??
    transcript.match(/([А-ЯЁ][а-яё]+(?:\s+[А-ЯЁ][а-яё]+)?),/);
  return m?.[1]?.trim() ?? null;
}

function detectPlayerJerseyCandidate(raw: string): number | null {
  const m = raw.match(/(?:номер|№|#)\s*(\d{1,3})/i);
  if (!m?.[1]) return null;
  const n = Number.parseInt(m[1], 10);
  if (!Number.isFinite(n) || n <= 0) return null;
  return n;
}

export function parseVoiceObservationCandidatesRu(
  transcriptRaw: string
): VoiceObservationCandidates {
  const transcript = transcriptRaw.trim();
  const normalized = normalize(transcript);
  return {
    playerNameCandidate: detectPlayerNameCandidate(transcript),
    playerJerseyCandidate: detectPlayerJerseyCandidate(transcript),
    skillCandidate: detectSkillCandidate(normalized),
    impactCandidate: detectImpactCandidate(normalized),
    noteCandidate: trimForNote(transcript),
  };
}

export function buildVoiceObservationPrefill(
  transcriptRaw: string
): VoiceObservationPrefillPayload {
  const parsed = parseVoiceObservationCandidatesRu(transcriptRaw);
  return {
    id: `voice_obs_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
    createdAt: new Date().toISOString(),
    transcript: transcriptRaw.trim(),
    playerNameCandidate: parsed.playerNameCandidate,
    playerJerseyCandidate: parsed.playerJerseyCandidate,
    skillCandidate: parsed.skillCandidate,
    impactCandidate: parsed.impactCandidate,
    noteCandidate: parsed.noteCandidate,
  };
}

