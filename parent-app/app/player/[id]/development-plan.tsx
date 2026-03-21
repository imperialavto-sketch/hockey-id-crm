import React, { useState, useMemo } from "react";
import {
  View,
  Text,
  StyleSheet,
  Pressable,
  Platform,
} from "react-native";
import Animated from "react-native-reanimated";
import { useRouter, useLocalSearchParams } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { BlurView } from "expo-blur";
import {
  MOCK_DEVELOPMENT_PLAN,
  type WeekPlan,
} from "@/constants/mockDevelopmentPlan";
import { growthZoneToSpecialization } from "@/constants/mockCoaches";
import { useSubscription } from "@/context/SubscriptionContext";
import { FlagshipScreen } from "@/components/layout/FlagshipScreen";
import { SectionCard } from "@/components/player-passport";
import { PrimaryButton, SecondaryButton } from "@/components/ui";
import { triggerHaptic } from "@/lib/haptics";
import { ScreenHeader } from "@/components/navigation/ScreenHeader";
import { screenReveal, STAGGER } from "@/lib/animations";
import { colors, spacing, radius, radii } from "@/constants/theme";

const PRESSED_OPACITY = 0.88;

function SummaryCard() {
  const { summary } = MOCK_DEVELOPMENT_PLAN;
  const content = (
    <View style={summaryStyles.content}>
      <View style={summaryStyles.row}>
        <Text style={summaryStyles.label}>Цель месяца</Text>
        <Text style={summaryStyles.value}>{summary.monthlyGoal}</Text>
      </View>
      <View style={[summaryStyles.row, summaryStyles.rowBorder]}>
        <Text style={summaryStyles.label}>Ключевая зона роста</Text>
        <Text style={summaryStyles.value}>{summary.keyGrowthZone}</Text>
      </View>
      <View style={summaryStyles.row}>
        <Text style={summaryStyles.label}>Прогнозируемый результат</Text>
        <Text style={[summaryStyles.value, summaryStyles.valueGreen]}>
          {summary.predictedResult}
        </Text>
      </View>
    </View>
  );

  if (Platform.OS === "web") {
    return (
      <View style={[summaryStyles.card, summaryStyles.cardWeb]}>{content}</View>
    );
  }
  return (
    <View style={summaryStyles.card}>
      <BlurView intensity={32} tint="dark" style={summaryStyles.blur}>
        {content}
      </BlurView>
    </View>
  );
}

const summaryStyles = StyleSheet.create({
  card: {
    marginBottom: 24,
    borderRadius: 20,
    overflow: "hidden",
    borderWidth: 1,
    borderColor: colors.border,
  },
  cardWeb: {
    backgroundColor: colors.bgMid,
  },
  blur: {
    borderRadius: 20,
    overflow: "hidden",
  },
  content: {
    padding: 20,
  },
  row: {
    paddingVertical: 12,
  },
  rowBorder: {
    borderTopWidth: 1,
    borderTopColor: colors.surfaceLevel1Border,
  },
  label: {
    fontSize: 12,
    fontWeight: "600",
    color: colors.textMuted,
    marginBottom: 4,
  },
  value: {
    fontSize: 16,
    fontWeight: "700",
    color: colors.text,
  },
  valueGreen: {
    color: colors.success,
  },
});

function GoalChip({ text }: { text: string }) {
  return (
    <View style={goalChipStyles.chip}>
      <View style={goalChipStyles.dot} />
      <Text style={goalChipStyles.text}>{text}</Text>
    </View>
  );
}

const goalChipStyles = StyleSheet.create({
  chip: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: colors.surfaceLevel1,
    borderRadius: radii.sm,
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.lg,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: colors.borderSoft,
  },
  dot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: colors.accent,
    marginRight: 12,
  },
  text: {
    fontSize: 15,
    fontWeight: "600",
    color: colors.textSecondary,
  },
});

function WeekCard({
  week,
  completedIds,
  onToggle,
}: {
  week: WeekPlan;
  completedIds: Set<string>;
  onToggle: (id: string) => void;
}) {
  return (
    <View style={weekCardStyles.card}>
      <Text style={weekCardStyles.title}>{week.title}</Text>
      {week.items.map((item) => (
        <Pressable
          key={item.id}
          style={({ pressed }) => [weekCardStyles.row, pressed && { opacity: PRESSED_OPACITY }]}
          onPress={() => {
            triggerHaptic();
            onToggle(item.id);
          }}
        >
          <View style={weekCardStyles.checkWrap}>
            {completedIds.has(item.id) ? (
              <View style={weekCardStyles.checkDone}>
                <Ionicons name="checkmark" size={14} color={colors.bgDeep} />
              </View>
            ) : (
              <View style={weekCardStyles.circleEmpty} />
            )}
          </View>
          <Text
            style={[
              weekCardStyles.text,
              completedIds.has(item.id) && weekCardStyles.textDone,
            ]}
          >
            {item.text}
          </Text>
        </Pressable>
      ))}
    </View>
  );
}

const weekCardStyles = StyleSheet.create({
  card: {
    backgroundColor: colors.surfaceLightAlt,
    borderRadius: radius.lg,
    padding: 18,
    marginBottom: spacing.lg,
    borderWidth: 1,
    borderColor: colors.surfaceLevel1Border,
  },
  title: {
    fontSize: 16,
    fontWeight: "800",
    color: colors.text,
    marginBottom: 14,
  },
  row: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 10,
    borderTopWidth: 1,
    borderTopColor: colors.surfaceLevel1,
  },
  checkWrap: {
    width: 28,
    marginRight: 14,
  },
  circleEmpty: {
    width: 22,
    height: 22,
    borderRadius: 11,
    borderWidth: 2,
    borderColor: colors.textMuted,
  },
  checkDone: {
    width: 22,
    height: 22,
    borderRadius: 11,
    backgroundColor: colors.success,
    alignItems: "center",
    justifyContent: "center",
  },
  text: {
    flex: 1,
    fontSize: 15,
    color: colors.textSecondary,
    fontWeight: "500",
  },
  textDone: {
    color: colors.textMuted,
    textDecorationLine: "line-through",
  },
});

function DrillCard({
  title,
  description,
  duration,
  focus,
}: {
  title: string;
  description: string;
  duration: string;
  focus: string;
}) {
  return (
    <View style={drillStyles.card}>
      <View style={drillStyles.header}>
        <Text style={drillStyles.title}>{title}</Text>
        <View style={drillStyles.badge}>
          <Text style={drillStyles.badgeText}>{duration}</Text>
        </View>
      </View>
      <Text style={drillStyles.desc}>{description}</Text>
      <Text style={drillStyles.focus}>Фокус: {focus}</Text>
    </View>
  );
}

const drillStyles = StyleSheet.create({
  card: {
    backgroundColor: colors.surfaceLightAlt,
    borderRadius: radius.lg,
    padding: 18,
    marginBottom: spacing.md,
    borderWidth: 1,
    borderColor: colors.surfaceLevel1Border,
  },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 10,
  },
  title: {
    fontSize: 16,
    fontWeight: "700",
    color: colors.text,
  },
  badge: {
    backgroundColor: colors.accentSoft,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 8,
  },
  badgeText: {
    fontSize: 12,
    fontWeight: "700",
    color: colors.accent,
  },
  desc: {
    fontSize: 14,
    color: colors.textMuted,
    lineHeight: 21,
    marginBottom: 8,
  },
  focus: {
    fontSize: 12,
    color: colors.textMuted,
    fontWeight: "600",
  },
});

function ProgressBar({ completed, total }: { completed: number; total: number }) {
  const pct = total > 0 ? Math.round((completed / total) * 100) : 0;
  return (
    <View style={progressStyles.wrap}>
      <View style={progressStyles.header}>
        <Text style={progressStyles.title}>Прогресс</Text>
        <Text style={progressStyles.count}>
          {completed} / {total} сессий
        </Text>
      </View>
      <View style={progressStyles.barBg}>
        <View style={[progressStyles.barFill, { width: `${pct}%` }]} />
      </View>
    </View>
  );
}

const progressStyles = StyleSheet.create({
  wrap: {
    marginBottom: 24,
  },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 12,
  },
  title: {
    fontSize: 18,
    fontWeight: "800",
    color: colors.text,
  },
  count: {
    fontSize: 14,
    fontWeight: "600",
    color: colors.textMuted,
  },
  barBg: {
    height: 8,
    borderRadius: 4,
    backgroundColor: colors.surfaceLevel2,
    overflow: "hidden",
  },
  barFill: {
    height: "100%",
    borderRadius: 4,
    backgroundColor: colors.success,
  },
});

export default function DevelopmentPlanScreen() {
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id: string }>();
  const { hasDevelopmentPlanAccess } = useSubscription();
  const plan = MOCK_DEVELOPMENT_PLAN;

  const [completedIds, setCompletedIds] = useState<Set<string>>(() =>
    new Set(plan.progress.completedItems)
  );

  const totalItems = useMemo(
    () => plan.weeklyPlan.reduce((acc, w) => acc + w.items.length, 0),
    [plan.weeklyPlan]
  );
  const completedCount = completedIds.size;

  const toggleItem = (itemId: string) => {
    setCompletedIds((prev) => {
      const next = new Set(prev);
      if (next.has(itemId)) next.delete(itemId);
      else next.add(itemId);
      return next;
    });
  };

  const suggestedSpec = growthZoneToSpecialization(
    plan.summary.keyGrowthZone.split(",")[0]?.trim() ?? ""
  );

  const handleBookCoach = () => {
    const params = suggestedSpec ? { specialization: suggestedSpec } : {};
    router.push({
      pathname: "/marketplace/coaches",
      params,
    });
  };

  const handleOpenMarketplace = () => {
    router.push("/marketplace/coaches");
  };

  const header = (
    <ScreenHeader
      title="План развития"
      onBack={() => {
        triggerHaptic();
        router.back();
      }}
    />
  );

  return (
    <FlagshipScreen header={header}>
      <Animated.View entering={screenReveal(0)}>
        <View style={styles.headerBlock}>
          <Text style={styles.playerName}>{plan.playerName}</Text>
          <Text style={styles.subtitle}>Персональный план на 4 недели</Text>
        </View>
        <SummaryCard />
      </Animated.View>

      {!hasDevelopmentPlanAccess ? (
        <Animated.View entering={screenReveal(STAGGER)}>
          <View style={devPlanStyles.teaserBlock}>
              <View style={devPlanStyles.teaserContent}>
                <Text style={devPlanStyles.teaserLabel}>Teaser</Text>
                <Text style={devPlanStyles.teaserTitle}>
                  Персональный план на 4 недели
                </Text>
                <Text style={devPlanStyles.teaserText}>
                  Персональный план: цели на 4 недели, упражнения, прогресс и рекомендации под слабые стороны
                </Text>
                <Pressable
                  style={({ pressed }) => [
                    devPlanStyles.teaserCta,
                    pressed && { opacity: PRESSED_OPACITY },
                  ]}
                  onPress={() => {
                    triggerHaptic();
                    router.push("/subscription");
                  }}
                >
                <Text style={devPlanStyles.teaserCtaText}>
                  Получить полный план
                </Text>
                </Pressable>
              </View>
              <View style={devPlanStyles.teaserLocked}>
                <Text style={devPlanStyles.teaserLockedText}>
                  Недельный план и упражнения
                </Text>
                <Text style={devPlanStyles.teaserLockedSub}>
                  Доступны в Pro
                </Text>
              </View>
            </View>
          </Animated.View>
        ) : null}

      <Animated.View entering={screenReveal(STAGGER * 2)}>
        <SectionCard title="Цели месяца">
          {plan.monthlyGoals.map((g) => (
            <GoalChip key={g} text={g} />
          ))}
        </SectionCard>
      </Animated.View>

      <Animated.View entering={screenReveal(STAGGER * 3)}>
        <SectionCard title="Недельный план">
          {hasDevelopmentPlanAccess ? plan.weeklyPlan.map((week) => (
            <WeekCard
              key={week.id}
              week={week}
              completedIds={completedIds}
              onToggle={toggleItem}
            />
          )) : (
            <View style={styles.teaser}>
              <Text style={styles.teaserText}>
                Недельный план и упражнения доступны в Pro
              </Text>
            </View>
          )}
        </SectionCard>
      </Animated.View>

      <Animated.View entering={screenReveal(STAGGER * 4)}>
        <SectionCard title="Recommended drills">
          {hasDevelopmentPlanAccess ? plan.drills.map((d) => (
            <DrillCard
              key={d.id}
              title={d.title}
              description={d.description}
              duration={d.duration}
              focus={d.focus}
            />
          )) : (
            <View style={styles.teaser}>
              <Text style={styles.teaserText}>
                Упражнения и трекинг прогресса — в Pro
              </Text>
            </View>
          )}
        </SectionCard>
      </Animated.View>

      <Animated.View entering={screenReveal(STAGGER * 5)}>
        <SectionCard title="Progress tracking">
          {hasDevelopmentPlanAccess ? (
            <ProgressBar completed={completedCount} total={totalItems} />
          ) : (
            <View style={styles.teaser}>
              <Text style={styles.teaserText}>
                Отслеживание прогресса — в Pro
              </Text>
            </View>
          )}
        </SectionCard>
      </Animated.View>

      <Animated.View entering={screenReveal(STAGGER * 6)} style={styles.ctaWrap}>
        <PrimaryButton
          label="Записаться на индивидуальную тренировку"
          onPress={() => {
            triggerHaptic();
            handleBookCoach();
          }}
        />
        <SecondaryButton
          label="Открыть Marketplace"
          onPress={() => {
            triggerHaptic();
            handleOpenMarketplace();
          }}
        />
      </Animated.View>
    </FlagshipScreen>
  );
}

const devPlanStyles = StyleSheet.create({
  teaserBlock: {
    marginBottom: 24,
  },
  teaserContent: {
    padding: 24,
    backgroundColor: colors.accentSoft,
    borderRadius: 24,
    borderWidth: 1,
    borderColor: colors.border,
    marginBottom: 16,
  },
  teaserLabel: {
    fontSize: 12,
    fontWeight: "700",
    color: colors.accent,
    letterSpacing: 0.5,
    marginBottom: 8,
  },
  teaserTitle: {
    fontSize: 18,
    fontWeight: "800",
    color: colors.text,
    marginBottom: spacing.sm,
  },
  teaserText: {
    fontSize: 14,
    color: colors.textMuted,
    lineHeight: 22,
    marginBottom: spacing.xl,
  },
  teaserCta: {
    backgroundColor: colors.accent,
    paddingVertical: 16,
    borderRadius: 14,
    alignItems: "center",
  },
  teaserCtaText: {
    fontSize: 16,
    fontWeight: "700",
    color: colors.bgDeep,
  },
  teaserLocked: {
    padding: spacing.xl,
    backgroundColor: colors.surfaceLightAlt,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.borderSoft,
    alignItems: "center",
  },
  teaserLockedText: {
    fontSize: 14,
    color: colors.textMuted,
    fontWeight: "600",
  },
  teaserLockedSub: {
    fontSize: 12,
    color: colors.textMuted,
    marginTop: spacing.xs,
  },
});

const styles = StyleSheet.create({
  headerBlock: {
    marginBottom: 24,
  },
  playerName: {
    color: colors.text,
    fontSize: 28,
    fontWeight: "900",
    letterSpacing: -0.5,
    lineHeight: 34,
    marginBottom: 6,
  },
  subtitle: {
    color: colors.textMuted,
    fontSize: 15,
    fontWeight: "600",
  },
  teaser: {
    padding: spacing.xl,
    backgroundColor: colors.surfaceLightAlt,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.borderSoft,
  },
  teaserText: {
    fontSize: 14,
    color: colors.textMuted,
    lineHeight: 22,
    textAlign: "center",
  },
  ctaWrap: {
    gap: 12,
    marginTop: 8,
  },
});
