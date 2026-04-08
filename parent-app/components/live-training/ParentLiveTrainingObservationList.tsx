import { View, Text, StyleSheet } from "react-native";
import { SectionCard } from "@/components/player-passport";
import { ArenaParentExplanationBlock } from "./ArenaParentExplanationBlock";
import { colors, spacing } from "@/constants/theme";
import type { ParentLiveTrainingObservationRow } from "@/types/parentLiveTrainingObservation";

type Props = {
  /** Порядок как в ответе API — без пересортировки. */
  observations: ParentLiveTrainingObservationRow[];
};

/**
 * Список наблюдений с тренировки: короткая цитата + блок объяснения Арены (если есть).
 */
export function ParentLiveTrainingObservationList({ observations }: Props) {
  if (observations.length === 0) return null;

  return (
    <SectionCard
      title="Наблюдения"
      subtitle="Краткая сводка по каждой записи с занятия — без оценки"
      style={styles.section}
      contentDensity="compact"
    >
      {observations.map((row, idx) => (
        <View
          key={row.id}
          style={[styles.row, idx > 0 && styles.rowGap]}
          accessibilityRole="text"
        >
          {row.sourceText?.trim() ? (
            <Text style={styles.source} numberOfLines={3}>
              {row.sourceText.trim()}
            </Text>
          ) : null}
          {row.parentExplanation ? (
            <View style={styles.blockWrap}>
              <ArenaParentExplanationBlock parentExplanation={row.parentExplanation} />
            </View>
          ) : null}
        </View>
      ))}
    </SectionCard>
  );
}

const styles = StyleSheet.create({
  section: {
    marginBottom: spacing.md,
  },
  row: {
    alignSelf: "stretch",
  },
  rowGap: {
    marginTop: spacing.md,
    paddingTop: spacing.md,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: "rgba(255,255,255,0.08)",
  },
  source: {
    fontSize: 13,
    lineHeight: 18,
    color: colors.textMuted,
    marginBottom: spacing.xs,
    fontStyle: "italic",
  },
  blockWrap: {
    marginTop: 2,
  },
});
