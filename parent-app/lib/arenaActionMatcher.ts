/**
 * Phase 3C.2: map Arena assistant text → same quick actions as deterministic chips.
 * Prompts and labels must stay aligned with:
 * - `deriveArenaInsightFollowUps` in `arenaWeeklyInsight.ts`
 * - `COACH_MARK_STARTERS`, `COACH_MARK_PRIMARY_SCENARIOS`, `COACH_MARK_SECONDARY_SCENARIOS` in `app/chat/[id].tsx`
 *
 * Matching: simple case-insensitive substring (longer labels first).
 */

export type ArenaQuickActionKindForTap =
  | "primary"
  | "secondary"
  | "insight";

export type ArenaMatchedQuickAction = {
  label: string;
  analyticsKey: string;
  prompt: string;
  kind: ArenaQuickActionKindForTap;
};

/**
 * Phase 3D — chips under AI messages: only these three, in this priority, max 3 total.
 * Must match `deriveArenaInsightFollowUps` labels used in core flow.
 */
export const ARENA_CORE_FLOW_BUBBLE_CHIP_LABEL_ORDER = [
  "Разобрать тренировку",
  "Что это значит для роста",
  "Как помочь дома",
] as const;

/**
 * Single ordered list: insight + starters + scenarios (labels unique).
 * Sort by label length descending at match time.
 */
const ARENA_QUICK_ACTION_DEFINITIONS: readonly ArenaMatchedQuickAction[] = [
  {
    label: "Разобрать тренировку",
    analyticsKey: "insight_followup_last_training",
    prompt:
      "Разбери последнюю тренировку игрока простыми словами: что получилось, что мешало и на чем сейчас лучше сфокусироваться. Если данных мало — честно скажи и предложи, что отследить на следующей тренировке.",
    kind: "insight",
  },
  {
    label: "Как помочь дома",
    analyticsKey: "insight_followup_home_help",
    prompt:
      "Подскажи, как родителю помочь ребёнку дома 10–15 минут в ближайшие дни без давления. Дай один конкретный фокус, одно упражнение и как понять, что идем в правильном направлении.",
    kind: "insight",
  },
  {
    label: "Что это значит для роста",
    analyticsKey: "insight_followup_meaning_growth",
    prompt:
      "Объясни, что текущие сигналы значат для развития игрока в ближайшие недели. Раздели: что видно по данным и что пока только гипотеза. Заверши одним следующим шагом для семьи.",
    kind: "insight",
  },
  {
    label: "С чего начать",
    analyticsKey: "insight_followup_start_here",
    prompt:
      "С чего логичнее начать развитие игрока прямо сейчас, если данных пока мало? Дай простой план на 7 дней: 1 главный фокус, 2–3 коротких действия и что спросить у тренера.",
    kind: "insight",
  },
  {
    label: "Как помочь ребёнку",
    analyticsKey: "insight_followup_help_child",
    prompt:
      "Как поддержать ребёнка в тренировочном процессе без давления, если данных пока немного? Дай родителю понятный тон общения и один следующий шаг на ближайшую неделю.",
    kind: "insight",
  },
  {
    label: "Фокус на неделю",
    analyticsKey: "arena_text_match_starter_focus_week",
    prompt:
      "Что для развития игрока логичнее держать в фокусе на этой неделе? Опирайся на данные из контекста, если они есть. Ответь структурно и по-родительски: главный приоритет, 2–3 конкретных шага и что отследить к концу недели. Если данных мало — скажи честно и дай безопасный ориентир.",
    kind: "primary",
  },
  {
    label: "Бросок: с чего начать",
    analyticsKey: "arena_text_match_starter_shot",
    prompt:
      "Объясни простыми словами, как помочь ребёнку с броском дома без перегруза. Учти возраст и контекст из данных, если есть. Дай: одну частую ошибку, одно упражнение на 10–15 минут и как родителю помочь без давления.",
    kind: "primary",
  },
  {
    label: "План на 7 дней",
    analyticsKey: "arena_text_match_starter_plan7",
    prompt:
      "Предложи реалистичный микро-план на неделю (школа, отдых, не идеальный режим). По дням коротко, без фанатизма, с одним главным навыком в центре. Используй данные игрока из контекста, если они есть; иначе объясни ограничение и дай осторожный каркас.",
    kind: "primary",
  },
  {
    label: "Перед важной игрой",
    analyticsKey: "arena_text_match_starter_game_day",
    prompt:
      "Что полезно сделать вечером и утром перед важной игрой: сон, еда, настрой, разговор с ребёнком — спокойно и без давления. Без медицинских советов; если нужен врач — мягко скажи обратиться к специалисту.",
    kind: "primary",
  },
  {
    label: "Последняя тренировка",
    analyticsKey: "analyze_last_training",
    prompt:
      "Разбери последнюю тренировку игрока простыми словами по тем сигналам, что есть в контексте (оценки, отчёт, live-сводка и т.д.). Если явных данных о последней тренировке нет — скажи честно и предложи: что понаблюдать на следующей и что уточнить у тренера. В конце — один конкретный следующий шаг для ребёнка и короткий совет родителю.",
    kind: "primary",
  },
  {
    label: "Что важнее всего",
    analyticsKey: "improve_now",
    prompt:
      "Исходя из данных об игроке в контексте (если есть): что сейчас важнее всего для развития и почему? Назови один главный приоритет, 2–3 шага на ближайшие дни и чек «как поймём, что движемся». Если данных мало — честно опиши лимит и дай безопасный ориентир без выдуманных фактов.",
    kind: "primary",
  },
  {
    label: "10–15 мин дома",
    analyticsKey: "help_at_home",
    prompt:
      "Подскажи, на чём лучше сфокусироваться дома 10–15 минут в ближайшие дни без спецплощадки, если возможно. Учти возраст и контекст. Дай одно простое упражнение, как помочь без давления и как понять «получается / нет». Заверши одним следующим шагом.",
    kind: "primary",
  },
  {
    label: "Отчёт тренера проще",
    analyticsKey: "coach_report_plain",
    prompt:
      "Объясни простыми словами последний отчёт тренера или сообщение для родителей из контекста — что важно и что это значит на практике. Если в данных нет отчёта — скажи и подскажи, что спросить или что принести на следующий контакт.",
    kind: "secondary",
  },
  {
    label: "Есть ли прогресс?",
    analyticsKey: "progress_recent",
    prompt:
      "По сигналам из контекста (оценки, посещаемость, отчёт, рекомендации, story): есть ли ощущение прогресса за последнее время и что бы ты отметил родителю? Чётко раздели: что следует из данных vs что гипотеза. Если данных мало — скажи честно и предложи, на что смотреть дальше.",
    kind: "secondary",
  },
  {
    label: "Как поддержать сейчас",
    analyticsKey: "parent_support_tone",
    prompt:
      "Как мне как родителю лучше поддержать ребёнка сейчас: тон разговора, мотивация без давления, что не усиливать словами после тренировки или игры. Учти возраст и контекст из данных, если есть. Без ярлыков; заверши мягким следующим шагом для семьи.",
    kind: "secondary",
  },
] as const;

function sortedDefinitionsLongestLabelFirst(): ArenaMatchedQuickAction[] {
  return [...ARENA_QUICK_ACTION_DEFINITIONS].sort(
    (a, b) => b.label.length - a.label.length
  );
}

const sortedDefs = sortedDefinitionsLongestLabelFirst();

const defsByLabelLower = new Map<string, ArenaMatchedQuickAction>(
  ARENA_QUICK_ACTION_DEFINITIONS.map((d) => [d.label.toLowerCase(), d])
);

/**
 * Find canonical action labels inside assistant message text (substring match, case-insensitive).
 * @param excludeLabels — lowercase labels to skip (e.g. already shown in header / today CTA).
 * @param allowedOrderedLabels — if set, only these labels are considered, in this order (Phase 3D core flow).
 */
export function matchArenaQuickActionsInText(
  text: string,
  options?: {
    excludeLabels?: ReadonlySet<string>;
    max?: number;
    allowedOrderedLabels?: readonly string[];
  }
): ArenaMatchedQuickAction[] {
  const max = options?.max ?? 3;
  const exclude = options?.excludeLabels ?? new Set<string>();
  const haystack = text.toLowerCase();
  const allowed = options?.allowedOrderedLabels;

  if (allowed?.length) {
    const out: ArenaMatchedQuickAction[] = [];
    for (const label of allowed) {
      if (out.length >= max) break;
      const key = label.toLowerCase();
      if (exclude.has(key)) continue;
      const def = defsByLabelLower.get(key);
      if (!def) continue;
      if (!haystack.includes(key)) continue;
      out.push(def);
    }
    return out;
  }

  const out: ArenaMatchedQuickAction[] = [];
  const seen = new Set<string>();

  for (const def of sortedDefs) {
    if (out.length >= max) break;
    const key = def.label.toLowerCase();
    if (exclude.has(key)) continue;
    if (seen.has(key)) continue;
    if (!haystack.includes(key)) continue;
    out.push(def);
    seen.add(key);
  }

  return out;
}
