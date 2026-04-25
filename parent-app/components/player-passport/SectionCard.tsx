import {
  View,
  Text,
  StyleSheet,
  type StyleProp,
  type ViewStyle,
} from "react-native";
import { colors, spacing, radius, typography } from "@/constants/theme";

type SectionCardVariant = "default" | "primary";

type SectionCardContentDensity = "default" | "compact";

interface SectionCardProps {
  title: string;
  /** Optional muted line under the title (context / intro). */
  subtitle?: string;
  children: React.ReactNode;
  style?: StyleProp<ViewStyle>;
  /** Primary variant: stronger surface/border for hero sections */
  variant?: SectionCardVariant;
  /** Tighter padding for dense lists (observations, help-now). */
  contentDensity?: SectionCardContentDensity;
}

export function SectionCard({
  title,
  subtitle,
  children,
  style,
  variant = "default",
  contentDensity = "default",
}: SectionCardProps) {
  const isPrimary = variant === "primary";
  const densityPad =
    contentDensity === "compact" ? styles.cardPaddingCompact : styles.cardPaddingDefault;
  return (
    <View style={[styles.card, isPrimary && styles.cardPrimary, densityPad, style]}>
      <Text
        style={[
          styles.title,
          isPrimary && styles.titlePrimary,
          subtitle ? styles.titleWithSubtitle : styles.titleMarginBottomLg,
        ]}
      >
        {title}
      </Text>
      {subtitle ? <Text style={styles.subtitle}>{subtitle}</Text> : null}
      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: colors.surfaceLevel1,
    borderRadius: radius.lg,
    marginBottom: spacing.xl,
    borderWidth: 1,
    borderColor: colors.surfaceLevel1Border,
  },
  cardPaddingDefault: {
    padding: spacing.xl,
  },
  cardPaddingCompact: {
    padding: spacing.lg,
  },
  cardPrimary: {
    backgroundColor: colors.surfaceLevel2,
    borderColor: colors.surfaceLevel2Border,
  },
  title: {
    ...typography.sectionTitle,
    fontSize: 17,
    color: colors.text,
    letterSpacing: -0.3,
  },
  titleMarginBottomLg: {
    marginBottom: spacing.lg,
  },
  titleWithSubtitle: {
    marginBottom: 0,
  },
  titlePrimary: {
    fontWeight: "700",
  },
  subtitle: {
    fontSize: 13,
    lineHeight: 19,
    color: colors.textMuted,
    marginBottom: spacing.lg,
    marginTop: 2,
  },
});
