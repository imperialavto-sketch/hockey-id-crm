import { View, Text, StyleSheet, type ViewStyle } from "react-native";
import { colors, spacing, radius, typography } from "@/constants/theme";

type SectionCardVariant = "default" | "primary";

interface SectionCardProps {
  title: string;
  children: React.ReactNode;
  style?: ViewStyle;
  /** Primary variant: stronger surface/border for hero sections */
  variant?: SectionCardVariant;
}

export function SectionCard({ title, children, style, variant = "default" }: SectionCardProps) {
  const isPrimary = variant === "primary";
  return (
    <View style={[styles.card, isPrimary && styles.cardPrimary, style]}>
      <Text style={[styles.title, isPrimary && styles.titlePrimary]}>{title}</Text>
      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: colors.surfaceLevel1,
    borderRadius: radius.lg,
    padding: spacing.xl,
    marginBottom: spacing.xl,
    borderWidth: 1,
    borderColor: colors.surfaceLevel1Border,
  },
  cardPrimary: {
    backgroundColor: colors.surfaceLevel2,
    borderColor: colors.surfaceLevel2Border,
  },
  title: {
    ...typography.sectionTitle,
    fontSize: 17,
    color: colors.text,
    marginBottom: spacing.lg,
    letterSpacing: -0.3,
  },
  titlePrimary: {
    fontWeight: "700",
  },
});
