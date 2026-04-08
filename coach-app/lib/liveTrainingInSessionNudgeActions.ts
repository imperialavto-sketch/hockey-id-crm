/**
 * Тексты и payload для действий из in-session nudges (POST /api/actions через createActionItem).
 */

/** Совместимо с CreateActionItemPayload в voiceCreateService. */
export type InSessionNudgeActionPayload = {
  playerId?: string;
  title: string;
  description: string;
};

const META = "Источник: подсказка Арены во время live-тренировки.";

function clip(s: string, max: number): string {
  const t = s.replace(/\s+/g, " ").trim();
  if (t.length <= max) return t;
  return `${t.slice(0, max - 1).trimEnd()}…`;
}

function uniqueSnippets(snippets: string[], max: number, eachMax: number): string[] {
  const seen = new Set<string>();
  const out: string[] = [];
  for (const raw of snippets) {
    const c = clip(raw, eachMax);
    if (!c || seen.has(c)) continue;
    seen.add(c);
    out.push(c);
    if (out.length >= max) break;
  }
  return out;
}

export function buildNeedsAttentionActionPayload(args: {
  playerLabel: string;
  playerId?: string;
  negativeCount: number;
  snippets: string[];
}): InSessionNudgeActionPayload {
  const lines = uniqueSnippets(args.snippets, 4, 160);
  const detail =
    lines.length > 0
      ? ["Фрагменты наблюдений:", ...lines.map((l) => `• ${l}`)].join("\n")
      : "Зафиксировано несколько негативных отметок подряд — стоит уделить внимание на следующих шагах.";
  const description = [META, "", `Негативных наблюдений: ${args.negativeCount}.`, "", detail].join(
    "\n"
  );
  const title = clip(`${args.playerLabel}: внимание после live`, 120);
  const payload: InSessionNudgeActionPayload = { title, description };
  if (args.playerId) payload.playerId = args.playerId;
  return payload;
}

export function buildTeamFocusActionPayload(teamName?: string): InSessionNudgeActionPayload {
  const tail = teamName?.trim() ? ` — ${clip(teamName.trim(), 48)}` : "";
  return {
    title: clip(`Командный фокус${tail}`, 120),
    description: [
      META,
      "",
      "Несколько замечаний по пятёрке за эту сессию. Зафиксируйте приоритет для следующей работы (баланс по игрокам, общий акцент).",
    ].join("\n"),
  };
}
