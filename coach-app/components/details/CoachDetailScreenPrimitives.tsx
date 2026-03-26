import React, { useEffect } from "react";
import { StyleSheet, Text, View } from "react-native";
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withSequence,
  withTiming,
} from "react-native-reanimated";
import { SectionCard } from "@/components/ui/SectionCard";
import { PrimaryButton } from "@/components/ui/PrimaryButton";
import { StaggerFadeIn } from "@/components/dashboard/StaggerFadeIn";
import { theme } from "@/constants/theme";

export function CoachDetailHero({
  eyebrow,
  title,
  subtitle,
  metaLeft,
  metaRight,
}: {
  eyebrow: string;
  title: string;
  subtitle: string;
  metaLeft?: string;
  metaRight?: string;
}) {
  return (
    <View style={styles.hero}>
      <Text style={styles.eyebrow}>{eyebrow}</Text>
      <Text style={styles.title}>{title}</Text>
      {(metaLeft || metaRight) && (
        <View style={styles.metaRow}>
          {metaLeft ? <Text style={styles.metaText}>{metaLeft}</Text> : null}
          {metaLeft && metaRight ? <View style={styles.dot} /> : null}
          {metaRight ? <Text style={styles.metaText}>{metaRight}</Text> : null}
        </View>
      )}
      <Text style={styles.subtitle}>{subtitle}</Text>
    </View>
  );
}

function PulseBar({ widthPct }: { widthPct: `${number}%` }) {
  const pulse = useSharedValue(0.35);
  useEffect(() => {
    pulse.value = withRepeat(
      withSequence(withTiming(0.7, { duration: 620 }), withTiming(0.35, { duration: 620 })),
      -1,
      true
    );
  }, [pulse]);
  const bar = useAnimatedStyle(() => ({ opacity: pulse.value }));
  return <Animated.View style={[styles.skelBar, { width: widthPct }, bar]} />;
}

export function CoachDetailLoadingBody({
  eyebrow,
  title,
  subtitle = "Подтягиваем актуальные данные.",
}: {
  eyebrow: string;
  title: string;
  subtitle?: string;
}) {
  return (
    <>
      <StaggerFadeIn preset="snappy" delay={0}>
        <CoachDetailHero eyebrow={eyebrow} title={title} subtitle={subtitle} metaLeft="Загружаем…" />
      </StaggerFadeIn>
      <StaggerFadeIn preset="snappy" delay={20}>
        <SectionCard elevated style={styles.skeletonCard}>
          <View style={styles.skelGap}>
            <PulseBar widthPct="94%" />
            <PulseBar widthPct="78%" />
            <PulseBar widthPct="100%" />
            <PulseBar widthPct="70%" />
          </View>
        </SectionCard>
      </StaggerFadeIn>
    </>
  );
}

export function CoachDetailErrorState({
  title = "Раздел сейчас недоступен",
  description,
  hint,
  retryTitle = "Обновить",
  onRetry,
  backTitle,
  onBack,
}: {
  title?: string;
  description?: string;
  /** Muted line under description (e.g. network retry guidance). */
  hint?: string;
  retryTitle?: string;
  onRetry: () => void;
  backTitle?: string;
  onBack?: () => void;
}) {
  return (
    <SectionCard elevated style={styles.stateCard}>
      <Text style={styles.stateTitle}>{title}</Text>
      {description ? <Text style={styles.stateDescription}>{description}</Text> : null}
      {hint ? <Text style={styles.stateHint}>{hint}</Text> : null}
      <PrimaryButton title={retryTitle} variant="outline" onPress={onRetry} style={styles.statePrimaryBtn} />
      {backTitle && onBack ? (
        <PrimaryButton title={backTitle} variant="ghost" onPress={onBack} />
      ) : null}
    </SectionCard>
  );
}

export function CoachDetailEmptyState({
  title,
  description,
  primaryTitle,
  onPrimary,
  secondaryTitle,
  onSecondary,
}: {
  title: string;
  description: string;
  primaryTitle: string;
  onPrimary: () => void;
  secondaryTitle?: string;
  onSecondary?: () => void;
}) {
  return (
    <SectionCard elevated style={styles.stateCard}>
      <View style={styles.emptyAccent} />
      <Text style={styles.stateTitle}>{title}</Text>
      <Text style={styles.stateDescription}>{description}</Text>
      <PrimaryButton title={primaryTitle} variant="outline" onPress={onPrimary} style={styles.statePrimaryBtn} />
      {secondaryTitle && onSecondary ? (
        <PrimaryButton title={secondaryTitle} variant="ghost" onPress={onSecondary} />
      ) : null}
    </SectionCard>
  );
}

const styles = StyleSheet.create({
  hero: {
    marginBottom: theme.layout.heroBottom,
  },
  eyebrow: {
    ...theme.typography.heroEyebrow,
    color: theme.colors.primary,
    marginBottom: theme.spacing.xs,
  },
  title: {
    ...theme.typography.hero,
    color: theme.colors.text,
  },
  subtitle: {
    ...theme.typography.body,
    color: theme.colors.textSecondary,
    marginTop: theme.spacing.sm,
  },
  metaRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: theme.spacing.sm,
    marginTop: theme.spacing.sm,
  },
  metaText: {
    ...theme.typography.caption,
    color: theme.colors.textMuted,
  },
  dot: {
    width: 4,
    height: 4,
    borderRadius: 2,
    backgroundColor: theme.colors.border,
  },
  skeletonCard: {
    paddingVertical: theme.spacing.lg,
  },
  skelGap: {
    gap: theme.spacing.sm,
  },
  skelBar: {
    height: 12,
    borderRadius: theme.borderRadius.sm,
    backgroundColor: theme.colors.surfaceElevated,
  },
  stateCard: {
    alignItems: "center",
    paddingVertical: theme.spacing.xl,
  },
  stateTitle: {
    ...theme.typography.title,
    color: theme.colors.text,
    textAlign: "center",
    marginBottom: theme.spacing.sm,
  },
  stateDescription: {
    ...theme.typography.body,
    color: theme.colors.textMuted,
    textAlign: "center",
    marginBottom: theme.spacing.sm,
  },
  stateHint: {
    ...theme.typography.caption,
    color: theme.colors.textMuted,
    textAlign: "center",
    lineHeight: 18,
    marginBottom: theme.spacing.lg,
    paddingHorizontal: theme.spacing.md,
  },
  statePrimaryBtn: {
    marginBottom: theme.spacing.sm,
    minWidth: 176,
  },
  emptyAccent: {
    width: 48,
    height: 4,
    borderRadius: 2,
    backgroundColor: theme.colors.primary,
    opacity: 0.55,
    marginBottom: theme.spacing.md,
  },
});
