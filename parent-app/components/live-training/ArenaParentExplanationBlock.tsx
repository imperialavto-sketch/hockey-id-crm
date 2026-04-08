import { View, Text, StyleSheet } from "react-native";
import { GlassCardV2 } from "@/components/ui";
import { colors, spacing, typography } from "@/constants/theme";
import type { ArenaParentExplanation } from "@/types/arenaParentExplanation";

type Props = {
  parentExplanation: ArenaParentExplanation;
};

/**
 * Компактный блок объяснения Арены для родителя (детерминированный текст с сервера).
 */
export function ArenaParentExplanationBlock({ parentExplanation }: Props) {
  const hasAttention = Boolean(parentExplanation.attention?.trim());

  return (
    <GlassCardV2
      variant="default"
      padding="sm"
      glow={false}
      contentStyle={hasAttention ? styles.cardAttentionBorder : undefined}
    >
      <Text style={styles.explanation} numberOfLines={4}>
        {parentExplanation.explanation}
      </Text>
      <Text style={styles.meaning} numberOfLines={3}>
        {parentExplanation.meaning}
      </Text>
      {hasAttention ? (
        <Text style={styles.attention} numberOfLines={2}>
          {parentExplanation.attention}
        </Text>
      ) : null}
    </GlassCardV2>
  );
}

const styles = StyleSheet.create({
  cardAttentionBorder: {
    borderLeftWidth: 3,
    borderLeftColor: "rgba(245, 158, 11, 0.45)",
    paddingLeft: spacing.sm,
  },
  explanation: {
    ...typography.body,
    fontSize: 14,
    lineHeight: 20,
    fontWeight: "600",
    color: colors.textPrimary,
    marginBottom: spacing.xs,
  },
  meaning: {
    ...typography.caption,
    fontSize: 13,
    lineHeight: 18,
    color: colors.textSecondary,
  },
  attention: {
    ...typography.caption,
    fontSize: 12,
    lineHeight: 16,
    color: colors.textMuted,
    marginTop: spacing.sm,
    fontStyle: "italic",
  },
});
