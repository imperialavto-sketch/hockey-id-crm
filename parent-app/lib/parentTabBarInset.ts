/**
 * Плавающий tab bar родителя — те же числа, что в `app/(tabs)/_layout.tsx`.
 * Контент скролла использует высоту, чтобы не уезжать под бар.
 */
export const PARENT_TAB_BAR_ROW = 56;
export const PARENT_TAB_BAR_PADDING_TOP = 10;

export function getParentFloatingTabBarHeight(bottomSafeInset: number): number {
  const tabBarPaddingBottom = Math.max(bottomSafeInset, 6) + 6;
  return (
    PARENT_TAB_BAR_PADDING_TOP + tabBarPaddingBottom + PARENT_TAB_BAR_ROW
  );
}
