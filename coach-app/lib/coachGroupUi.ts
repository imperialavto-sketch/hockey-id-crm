/** Пресеты цвета группы (hex) — быстрый выбор в формах. */
export const COACH_GROUP_COLOR_PRESETS = [
  '#3B82F6',
  '#22C55E',
  '#EAB308',
  '#EF4444',
  '#A855F7',
  '#F97316',
  '#14B8A6',
  '#64748B',
] as const;

export function scheduleSessionGroupAccent(
  groupId: string | null | undefined,
  groupColor: string | null | undefined,
  fallback: string
): string {
  const c = groupColor?.trim();
  if (groupId && c && /^#([0-9A-Fa-f]{3}|[0-9A-Fa-f]{6})$/.test(c)) {
    return c;
  }
  return fallback;
}

export function scheduleSessionGroupLabel(
  groupId: string | null | undefined,
  groupName: string | null | undefined
): string {
  if (!groupId) return 'Команда';
  return groupName?.trim() || 'Группа';
}
