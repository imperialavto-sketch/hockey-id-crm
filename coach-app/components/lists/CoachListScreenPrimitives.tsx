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

export function formatCoachListContextDate(): string {
  const d = new Date();
  return d.toLocaleDateString("ru-RU", {
    weekday: "long",
    month: "short",
    day: "numeric",
  });
}

export function CoachListHero({
  eyebrow,
  title,
  dateLabel,
  countLabel,
  subtitle,
}: {
  eyebrow: string;
  title: string;
  dateLabel: string;
  countLabel: string;
  subtitle: string;
}) {
  return (
    <View style={styles.hero}>
      <Text style={styles.eyebrow}>{eyebrow}</Text>
      <Text style={styles.title}>{title}</Text>
      <View style={styles.heroContext}>
        <Text style={styles.context}>{dateLabel}</Text>
        <View style={styles.dot} />
        <Text style={styles.context}>{countLabel}</Text>
      </View>
      <Text style={styles.heroSubtitle}>{subtitle}</Text>
    </View>
  );
}

function PulseBar({ widthPct }: { widthPct: `${number}%` }) {
  const pulse = useSharedValue(0.35);
  useEffect(() => {
    pulse.value = withRepeat(
      withSequence(withTiming(0.72, { duration: 600 }), withTiming(0.35, { duration: 600 })),
      -1,
      true
    );
  }, [pulse]);
  const bar = useAnimatedStyle(() => ({ opacity: pulse.value }));
  return (
    <Animated.View style={[styles.skelBar, { width: widthPct }, bar]} />
  );
}

export function CoachListSkeletonCard() {
  return (
    <SectionCard elevated style={styles.skeletonCard}>
      <View style={styles.skelGap}>
        <PulseBar widthPct="100%" />
        <PulseBar widthPct="88%" />
        <PulseBar widthPct="64%" />
      </View>
      <View style={styles.skelDivider} />
      <View style={styles.skelGap}>
        <PulseBar widthPct="92%" />
        <PulseBar widthPct="80%" />
      </View>
    </SectionCard>
  );
}

export function CoachListLoadingBody({
  eyebrow,
  title,
}: {
  eyebrow: string;
  title: string;
}) {
  const dateLabel = formatCoachListContextDate();
  return (
    <>
      <StaggerFadeIn preset="snappy" delay={0}>
        <CoachListHero
          eyebrow={eyebrow}
          title={title}
          dateLabel={dateLabel}
          countLabel="Загрузка…"
          subtitle="Подтягиваем актуальный список."
        />
      </StaggerFadeIn>
      <StaggerFadeIn preset="snappy" delay={14}>
        <CoachListSkeletonCard />
      </StaggerFadeIn>
    </>
  );
}

export function CoachListErrorPanel({
  errorDetail,
  onRetry,
}: {
  errorDetail: string | null;
  onRetry: () => void;
}) {
  return (
    <SectionCard elevated style={styles.errorCard}>
      <Text style={styles.errorHeading}>Список сейчас недоступен</Text>
      {errorDetail ? (
        <Text style={styles.errorDetail} numberOfLines={3}>
          {errorDetail}
        </Text>
      ) : null}
      <Text style={styles.errorHint}>
        Проверьте подключение к сети и обновите экран.
      </Text>
      <PrimaryButton
        animatedPress
        title="Обновить"
        variant="outline"
        onPress={onRetry}
        style={styles.retryBtn}
      />
    </SectionCard>
  );
}

export function CoachListEmptyAccent() {
  return <View style={styles.emptyAccent} />;
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
    marginBottom: theme.spacing.sm,
  },
  heroContext: {
    flexDirection: "row",
    alignItems: "center",
    flexWrap: "wrap",
    gap: theme.spacing.sm,
  },
  context: {
    ...theme.typography.body,
    color: theme.colors.textSecondary,
  },
  dot: {
    width: 4,
    height: 4,
    borderRadius: 2,
    backgroundColor: theme.colors.border,
  },
  heroSubtitle: {
    ...theme.typography.caption,
    color: theme.colors.textMuted,
    marginTop: theme.spacing.sm,
    lineHeight: 20,
  },
  skeletonCard: {
    borderLeftWidth: 3,
    borderLeftColor: theme.colors.border,
  },
  skelGap: {
    gap: theme.spacing.sm,
  },
  skelBar: {
    height: 12,
    borderRadius: theme.borderRadius.sm,
    backgroundColor: theme.colors.surfaceElevated,
  },
  skelDivider: {
    height: 1,
    backgroundColor: theme.colors.border,
    marginVertical: theme.spacing.md,
    opacity: 0.85,
  },
  errorCard: {
    alignItems: "center",
    paddingVertical: theme.spacing.lg,
    borderLeftWidth: 4,
    borderLeftColor: theme.colors.accent,
  },
  errorHeading: {
    ...theme.typography.title,
    color: theme.colors.text,
    textAlign: "center",
    marginBottom: theme.spacing.sm,
  },
  errorDetail: {
    ...theme.typography.caption,
    color: theme.colors.textSecondary,
    textAlign: "center",
    marginBottom: theme.spacing.sm,
    lineHeight: 18,
  },
  errorHint: {
    ...theme.typography.caption,
    color: theme.colors.textMuted,
    textAlign: "center",
    marginBottom: theme.spacing.lg,
    lineHeight: 18,
  },
  retryBtn: {
    alignSelf: "center",
    minWidth: 176,
  },
  emptyAccent: {
    position: "absolute",
    top: -16,
    right: -16,
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: theme.colors.primaryMuted,
    opacity: 0.3,
  },
});
