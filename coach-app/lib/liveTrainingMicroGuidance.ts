/**
 * Очень короткие операционные подсказки для live-экрана из снимка плана старта.
 * Не дублирует целиком continuity summary и не ведёт диалог.
 */

import type {
  LiveTrainingPlanningSnapshot,
  LiveTrainingPlanningSnapshotStartPriorities,
} from "@/types/liveTraining";

export type LiveMicroGuidanceTone = "focus" | "check" | "reinforce";

export type LiveMicroGuidanceDto = {
  cues: Array<{ title: string; tone?: LiveMicroGuidanceTone }>;
  sourceNote?: string;
};

const MAX_CUES = 3;
const MAX_TITLE = 72;

function norm(s: string): string {
  return s
    .trim()
    .toLowerCase()
    .replace(/\s+/gu, " ")
    .slice(0, 120);
}

function clip(s: string): string {
  const t = s.trim();
  if (t.length <= MAX_TITLE) return t;
  return `${t.slice(0, MAX_TITLE - 1)}…`;
}

function bodyAfterPrefix(line: string, prefix: string): string {
  const t = line.trim();
  if (!t.startsWith(prefix)) return "";
  return t.slice(prefix.length).trim();
}

function toneForReinforceDomain(domain: string): LiveMicroGuidanceTone {
  if (domain.startsWith("report_hint_r_")) return "reinforce";
  if (domain.startsWith("report_followup_") || domain.startsWith("prev_cycle_recheck")) return "check";
  return "reinforce";
}

type Cand = { title: string; tone: LiveMicroGuidanceTone };

function addCand(list: Cand[], seen: Set<string>, title: string, tone: LiveMicroGuidanceTone): void {
  const c = clip(title);
  if (!c) return;
  const k = norm(c);
  if (!k || seen.has(k)) return;
  seen.add(k);
  list.push({ title: c, tone });
}

function mergeTiers(
  tier1: Cand[],
  tier2: Cand[],
  tier3: Cand[],
  maxCues: number
): LiveMicroGuidanceDto["cues"] {
  const out: LiveMicroGuidanceDto["cues"] = [];
  const used = new Set<string>();
  const push = (c: Cand): boolean => {
    if (out.length >= maxCues) return false;
    const k = norm(c.title);
    if (!k || used.has(k)) return false;
    used.add(k);
    out.push({ title: c.title, tone: c.tone });
    return true;
  };

  let i1 = 0;
  let i2 = 0;
  let i3 = 0;

  while (out.length < maxCues) {
    const n0 = out.length;
    if (i1 < tier1.length) {
      const c = tier1[i1]!;
      if (push(c)) i1 += 1;
      else i1 += 1;
    }
    if (out.length >= maxCues) break;
    if (i2 < tier2.length) {
      const c = tier2[i2]!;
      if (push(c)) i2 += 1;
      else i2 += 1;
    }
    if (out.length >= maxCues) break;
    if (i3 < tier3.length) {
      const c = tier3[i3]!;
      if (push(c)) i3 += 1;
      else i3 += 1;
    }
    if (out.length === n0) {
      if (i1 < tier1.length) i1 += 1;
      else if (i2 < tier2.length) i2 += 1;
      else if (i3 < tier3.length) i3 += 1;
      else break;
    }
  }

  return out;
}

/**
 * Приоритет по ярусам: 1) текущий фокус старта → 2) повтор/сверка → 3) перенос и закрепление.
 * Внутри лимита слоты чередуются между ярусами, чтобы не забить всё первым слоем.
 */
export function buildLiveMicroGuidanceFromPlanningSnapshot(
  snap: LiveTrainingPlanningSnapshot | null | undefined,
  startPriorities: LiveTrainingPlanningSnapshotStartPriorities | undefined
): LiveMicroGuidanceDto | null {
  if (!snap) return null;

  const seen1 = new Set<string>();
  const seen2 = new Set<string>();
  const seen3 = new Set<string>();
  const tier1: Cand[] = [];
  const tier2: Cand[] = [];
  const tier3: Cand[] = [];

  const spLow = Boolean(startPriorities?.lowData);
  const thinSnap =
    (snap.focusDomains?.length ?? 0) <= 1 && (snap.reinforceAreas?.length ?? 0) <= 1;
  const maxCues = spLow && thinSnap ? 1 : MAX_CUES;

  if (startPriorities && !startPriorities.lowData) {
    for (const d of startPriorities.primaryDomains ?? []) {
      addCand(tier1, seen1, d.labelRu ?? "", "focus");
    }
    for (const p of startPriorities.primaryPlayers ?? []) {
      const name = p.playerName?.trim().split(/\s+/)[0] || p.playerName?.trim();
      if (!name) continue;
      const r = p.reason?.trim();
      const line =
        r && r !== "—"
          ? `${name}: ${r.length > 48 ? `${r.slice(0, 45)}…` : r}`
          : name;
      addCand(tier1, seen1, line, "focus");
    }
  }

  if (tier1.length === 0) {
    for (const d of snap.focusDomains ?? []) {
      addCand(tier1, seen1, d.labelRu ?? "", "focus");
      if (tier1.length >= 2) break;
    }
  }

  const focusNorms = new Set(
    (snap.focusDomains ?? []).map((d) => norm(d.labelRu)).filter(Boolean)
  );

  for (const r of snap.reinforceAreas ?? []) {
    const label = r.labelRu?.trim();
    if (!label) continue;
    if (focusNorms.has(norm(label))) {
      addCand(
        tier2,
        seen2,
        `Сверить: ${clip(label)} — в фокусе и в закреплении`,
        "check"
      );
    }
  }

  for (const d of snap.focusDomains ?? []) {
    const dom = d.domain ?? "";
    const label = d.labelRu?.trim();
    if (!label) continue;
    if (dom.startsWith("report_followup_")) {
      addCand(tier2, seen2, `Проверить по отчёту: ${clip(label)}`, "check");
    } else if (dom.startsWith("report_next_") && !seen1.has(norm(label))) {
      addCand(tier2, seen2, label, "focus");
    }
  }

  if (snap.suggestionSeeds?.source === "report_action_layer") {
    for (const raw of snap.suggestionSeeds.items.slice(0, 2)) {
      addCand(tier3, seen3, raw, "focus");
    }
  }

  for (const line of snap.summaryLines ?? []) {
    const t = line.trim();
    if (!t) continue;
    if (t.startsWith("[Прошлый цикл]")) {
      const body = bodyAfterPrefix(t, "[Прошлый цикл]");
      if (body) addCand(tier3, seen3, body, "check");
    } else if (t.startsWith("[Отчёты · проверка]")) {
      const body = bodyAfterPrefix(t, "[Отчёты · проверка]");
      if (body) addCand(tier3, seen3, `Сверить: ${clip(body)}`, "check");
    } else if (t.startsWith("[Отчёты]")) {
      const body = bodyAfterPrefix(t, "[Отчёты]");
      if (body) addCand(tier3, seen3, body, "focus");
    }
  }

  for (const r of snap.reinforceAreas ?? []) {
    addCand(tier3, seen3, r.labelRu ?? "", toneForReinforceDomain(r.domain ?? ""));
  }

  for (const d of snap.focusDomains ?? []) {
    const dom = d.domain ?? "";
    if (dom.startsWith("report_next_") || dom.startsWith("report_followup_")) continue;
    addCand(tier3, seen3, d.labelRu ?? "", "focus");
  }

  if (tier1.length + tier2.length + tier3.length === 0) return null;

  const cues = mergeTiers(tier1, tier2, tier3, maxCues);
  if (cues.length === 0) return null;

  return {
    cues,
    sourceNote: "Коротко по плану на старт — не оценка того, что уже происходит на льду.",
  };
}
