import { View, Text, StyleSheet, ActivityIndicator, type StyleProp, type ViewStyle } from "react-native";
import { SectionCard } from "@/components/player-passport";
import { colors, spacing } from "@/constants/theme";
import type { ParentPlayerStory, ParentPlayerStoryItem } from "@/services/playerService";

function softKicker(type: ParentPlayerStoryItem["type"]): string {
  switch (type) {
    case "training_summary":
      return "Свежие нотки";
    case "positive_signal":
      return "Получается";
    case "focus_area":
      return "Зона роста";
    case "trend_note":
      return "В динамике";
    default:
      return "";
  }
}

function toneBorder(tone: ParentPlayerStoryItem["tone"]): string {
  if (tone === "positive") return "rgba(34, 197, 94, 0.55)";
  if (tone === "attention") return "rgba(245, 158, 11, 0.55)";
  return "rgba(148, 163, 184, 0.35)";
}

type Props = {
  loading: boolean;
  story: ParentPlayerStory | null;
  /** Выравнивание с другими SectionCard на профиле */
  cardStyle?: StyleProp<ViewStyle>;
};

export function ParentPlayerDevelopmentStorySection({
  loading,
  story,
  cardStyle,
}: Props) {
  const items = story?.items ?? [];
  const lowData = story?.lowData ?? true;

  return (
    <SectionCard title="Как идёт развитие" style={[styles.card, cardStyle]}>
      {loading ? (
        <View style={styles.loading}>
          <ActivityIndicator size="small" color={colors.accent} />
        </View>
      ) : lowData || items.length === 0 ? (
        <Text style={styles.placeholder}>
          История развития проявится после нескольких тренировок с персональными отметками.
        </Text>
      ) : (
        items.map((it, idx) => (
          <View
            key={`${it.type}-${idx}`}
            style={[styles.row, idx > 0 && styles.rowGap]}
          >
            <View style={[styles.accent, { backgroundColor: toneBorder(it.tone) }]} />
            <View style={styles.rowBody}>
              <Text style={styles.kicker}>{softKicker(it.type)}</Text>
              <Text style={styles.title}>{it.title}</Text>
              <Text style={styles.body}>{it.body}</Text>
            </View>
          </View>
        ))
      )}
    </SectionCard>
  );
}

const styles = StyleSheet.create({
  card: {
    marginBottom: 0,
  },
  loading: {
    paddingVertical: spacing.lg,
    alignItems: "center",
  },
  placeholder: {
    fontSize: 15,
    color: colors.textMuted,
    textAlign: "center",
    paddingVertical: spacing.md,
    lineHeight: 22,
  },
  row: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 10,
  },
  rowGap: {
    marginTop: spacing.md,
    paddingTop: spacing.md,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: "rgba(255,255,255,0.08)",
  },
  accent: {
    width: 3,
    borderRadius: 2,
    marginTop: 4,
    minHeight: 32,
    alignSelf: "stretch",
  },
  rowBody: {
    flex: 1,
    minWidth: 0,
  },
  kicker: {
    fontSize: 12,
    color: colors.textMuted,
    marginBottom: 4,
  },
  title: {
    fontSize: 15,
    fontWeight: "600",
    color: colors.text,
    marginBottom: 4,
  },
  body: {
    fontSize: 14,
    lineHeight: 20,
    color: colors.textMuted,
  },
});
