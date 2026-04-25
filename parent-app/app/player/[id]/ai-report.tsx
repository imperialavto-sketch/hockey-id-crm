import React from "react";
import {
  View,
  Text,
  StyleSheet,
  Pressable,
  Platform,
} from "react-native";
import Animated from "react-native-reanimated";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useRouter, useLocalSearchParams } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { BlurView } from "expo-blur";
import { MOCK_AI_REPORT } from "@/constants/mockAiReport";
import { DEMO_PLAYER } from "@/constants/demoPlayer";
import { useSubscription } from "@/context/SubscriptionContext";
import { growthZoneToSpecialization } from "@/constants/mockCoaches";
import { COACH_MARK_ID } from "@/services/chatService";
import { StrengthWeaknessCard } from "@/components/player/StrengthWeaknessCard";
import { RecommendationCard } from "@/components/player/RecommendationCard";
import { SkillRadarPreview } from "@/components/player/SkillRadarPreview";
import { InsightBlock } from "@/components/player/InsightBlock";
import { CoachSummaryCard } from "@/components/player/CoachSummaryCard";
import { ActionLinkCard } from "@/components/player/ActionLinkCard";
import { PrimaryButton, SecondaryButton, GhostButton } from "@/components/ui";
import { FlagshipScreen } from "@/components/layout/FlagshipScreen";
import { SectionCard } from "@/components/player-passport";
import { triggerHaptic } from "@/lib/haptics";
import { screenReveal, STAGGER } from "@/lib/animations";
import { colors, spacing, radius, shadows, feedback } from "@/constants/theme";

const PRESSED_OPACITY = feedback.pressedOpacity;

const STRONGER_TEAM_LABELS: Record<string, string> = {
  low: "низкий",
  medium: "средний",
  high: "высокий",
};

function HeroSummaryCard() {
  const { hero } = MOCK_AI_REPORT;
  const content = (
    <View style={heroStyles.content}>
      <View style={heroStyles.grid}>
        <View style={heroStyles.cell}>
          <Text style={heroStyles.value}>{hero.aiRating}</Text>
          <Text style={heroStyles.label}>AI Rating</Text>
        </View>
        <View style={[heroStyles.cell, heroStyles.cellHighlight]}>
          <Text style={[heroStyles.value, heroStyles.valueGreen]}>
            +{hero.seasonTrend}
          </Text>
          <Text style={heroStyles.label}>за сезон</Text>
        </View>
        <View style={heroStyles.cell}>
          <Text style={heroStyles.value}>{hero.potential}</Text>
          <Text style={heroStyles.label}>Потенциал</Text>
        </View>
      </View>
      <Text style={heroStyles.summaryLabel}>Главный инсайт</Text>
      <Text style={heroStyles.summary}>{hero.summary}</Text>
    </View>
  );

  if (Platform.OS === "web") {
    return (
      <View style={[heroStyles.card, heroStyles.cardWeb]}>{content}</View>
    );
  }
  return (
    <View style={heroStyles.card}>
      <BlurView intensity={32} tint="dark" style={heroStyles.blur}>
        {content}
      </BlurView>
    </View>
  );
}

const heroStyles = StyleSheet.create({
  card: {
    marginBottom: spacing.sectionGap,
    borderRadius: radius.xl,
    overflow: "hidden",
    borderWidth: 1,
    borderColor: colors.surfaceLevel2Border,
    ...shadows.level2,
  },
  cardWeb: {
    backgroundColor: colors.bgMid,
  },
  blur: {
    borderRadius: radius.xl,
    overflow: "hidden",
  },
  content: {
    padding: 24,
  },
  grid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 12,
    marginBottom: 20,
  },
  cell: {
    flex: 1,
    minWidth: "28%",
    backgroundColor: colors.surfaceLightAlt,
    borderRadius: 16,
    padding: 18,
    borderWidth: 1,
    borderColor: colors.surfaceLevel1Border,
  },
  cellHighlight: {
    borderColor: colors.successSoft,
    backgroundColor: colors.successSoft,
  },
  value: {
    color: colors.text,
    fontSize: 22,
    fontWeight: "900",
    letterSpacing: -0.3,
    marginBottom: 4,
  },
  valueGreen: {
    color: colors.success,
  },
  label: {
    color: colors.textMuted,
    fontSize: 12,
    fontWeight: "600",
  },
  summaryLabel: {
    fontSize: 11,
    fontWeight: "700",
    letterSpacing: 0.8,
    color: colors.accent,
    marginBottom: spacing.xs,
  },
  summary: {
    color: colors.textSecondary,
    fontSize: 15,
    lineHeight: 23,
    fontWeight: "500",
  },
});

export default function AICoachReportScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { id } = useLocalSearchParams<{ id: string }>();
  const { hasAiReportAccess } = useSubscription();
  const { player, strengths, growthZones, recommendations, forecast, coachComment, skills } =
    MOCK_AI_REPORT;

  const handleOpenPlan = () => {
    const playerId = id ?? "1";
    router.push(`/player/${playerId}/development-plan`);
  };

  const suggestedSpec =
    growthZones[0]?.title && growthZoneToSpecialization(growthZones[0].title);
  const weakSkills = growthZones.map((g) => g.title).filter(Boolean);

  const handleFindCoach = () => {
    const params: Record<string, string> = {};
    if (suggestedSpec) params.specialization = suggestedSpec;
    if (weakSkills.length > 0) params.weakSkills = weakSkills.join(",");
    params.playerAge = String(player.age);
    params.playerName = DEMO_PLAYER.name;
    router.push({
      pathname: "/marketplace/coaches",
      params,
    });
  };

  const header = (
    <View style={[styles.customHeader, { paddingTop: insets.top + spacing.lg }]}>
      <Pressable
        onPress={() => {
          triggerHaptic();
          router.back();
        }}
        style={({ pressed }) => [styles.backBtn, pressed && { opacity: PRESSED_OPACITY }]}
        accessibilityRole="button"
        accessibilityLabel="Назад"
      >
        <Ionicons name="chevron-back" size={28} color={colors.text} />
      </Pressable>
      <Text style={styles.headerTitle}>AI Coach Report</Text>
    </View>
  );

  return (
    <FlagshipScreen header={header}>
      <Animated.View entering={screenReveal(0)}>
        <View style={styles.headerBlock}>
          <View style={styles.headerIconWrap}>
            <Ionicons name="sparkles" size={28} color={colors.accent} />
          </View>
          <Text style={styles.playerName}>{player.name}</Text>
          <Text style={styles.subtitle}>Персональный AI‑отчёт</Text>
          <Text style={styles.desc}>
            Анализ прогресса, игровых качеств, зон роста и практических рекомендаций под вашего игрока
          </Text>
        </View>
        <HeroSummaryCard />
      </Animated.View>

      {!hasAiReportAccess && (
            <Animated.View entering={screenReveal(STAGGER * 0.5)}>
            <View style={styles.premiumCta}>
              <Text style={styles.premiumCtaLabel}>Preview</Text>
              <Text style={styles.premiumCtaTitle}>
                Полный отчёт + Арена как персональный тренер — в Pro
              </Text>
              <Text style={styles.premiumCtaSubtitle}>
                Зоны роста, рекомендации, прогноз, skill-карта и еженедельные отчёты под вашего игрока
              </Text>
              <Pressable
                style={({ pressed }) => [
                  styles.premiumCtaButton,
                  pressed && { opacity: PRESSED_OPACITY },
                ]}
                onPress={() => {
                  triggerHaptic();
                  router.push("/subscription");
                }}
              >
                <Text style={styles.premiumCtaButtonText}>
                  Получить полный доступ
                </Text>
              </Pressable>
            </View>
            </Animated.View>
          )}

      <Animated.View entering={screenReveal(STAGGER)}>
        <SectionCard title="Ключевые сильные стороны">
          {(hasAiReportAccess ? strengths : strengths.slice(0, 2)).map((s) => (
            <StrengthWeaknessCard
              key={s.id}
              type="strength"
              title={s.title}
              explanation={s.explanation}
              score={s.score}
              maxScore={s.maxScore}
            />
          ))}
          {!hasAiReportAccess && strengths.length > 2 && (
            <View style={styles.teaser}>
              <Ionicons name="lock-open-outline" size={20} color={colors.textMuted} />
              <Text style={styles.teaserText}>
                Ещё {strengths.length - 2} сильных сторон и детальный разбор — в Pro
              </Text>
            </View>
          )}
        </SectionCard>
      </Animated.View>

      <Animated.View entering={screenReveal(STAGGER * 2)}>
        <SectionCard title="Зоны роста и потенциал">
          {!hasAiReportAccess ? (
            <View style={styles.teaser}>
              <Ionicons name="lock-closed-outline" size={20} color={colors.textMuted} />
              <Text style={styles.teaserText}>
                Зоны роста, что делать и как расти — разблокируйте в Pro
              </Text>
            </View>
          ) : (
            growthZones.map((g) => (
              <StrengthWeaknessCard
                key={g.id}
                type="weakness"
                title={g.title}
                explanation={g.explanation}
                score={g.score}
                maxScore={g.maxScore}
                problem={g.problem}
                action={g.action}
              />
            ))
          )}
        </SectionCard>
      </Animated.View>

      <Animated.View entering={screenReveal(STAGGER * 3)}>
        <SectionCard title="Что делать дальше">
          {!hasAiReportAccess ? (
            <View style={styles.teaser}>
              <Ionicons name="lock-closed-outline" size={20} color={colors.textMuted} />
              <Text style={styles.teaserText}>
                Что делать дальше — персональные шаги на ближайший цикл в Pro
              </Text>
            </View>
          ) : (
            recommendations.map((r) => (
              <RecommendationCard
                key={r.id}
                title={r.title}
                description={r.description}
                priority={r.priority}
                expectedEffect={r.expectedEffect}
              />
            ))
          )}
        </SectionCard>
      </Animated.View>

      <Animated.View entering={screenReveal(STAGGER * 4)}>
        <SectionCard title="Прогноз развития">
          {!hasAiReportAccess ? (
            <View style={styles.teaser}>
              <Ionicons name="lock-closed-outline" size={20} color={colors.textMuted} />
              <Text style={styles.teaserText}>
                Прогноз роста и потенциала на сезон — в Pro
              </Text>
            </View>
          ) : (
            <InsightBlock
              title="Прогноз AI"
              items={[
                {
                  label: "Рост рейтинга",
                  value: `${forecast.currentRating} → ${forecast.potentialRating} за ${forecast.horizonMonths} мес`,
                },
                {
                  label: "Шанс в сильную команду",
                  value: STRONGER_TEAM_LABELS[forecast.strongerTeamChance] ?? forecast.strongerTeamChance,
                },
                {
                  label: "Главный потенциал роста",
                  value: forecast.maxGrowthPotential.join(", "),
                },
              ]}
            />
          )}
        </SectionCard>
      </Animated.View>

      <Animated.View entering={screenReveal(STAGGER * 5)}>
        <SectionCard title="Итог от AI-тренера">
          {!hasAiReportAccess ? (
            <View style={styles.teaser}>
              <Ionicons name="lock-closed-outline" size={20} color={colors.textMuted} />
              <Text style={styles.teaserText}>
                Итоговый комментарий AI-тренера под вашего игрока — в Pro
              </Text>
            </View>
          ) : (
            <CoachSummaryCard text={coachComment} />
          )}
        </SectionCard>
      </Animated.View>

      <Animated.View entering={screenReveal(STAGGER * 6)}>
        <SectionCard title="Skill Overview">
          {!hasAiReportAccess ? (
            <View style={styles.teaser}>
              <Ionicons name="lock-closed-outline" size={20} color={colors.textMuted} />
              <Text style={styles.teaserText}>
                Детальная skill-карта по всем показателям — в Pro
              </Text>
            </View>
          ) : (
            <View style={styles.skillCard}>
              <SkillRadarPreview
                skills={skills.map((s) => ({ label: s.label, score: s.score, maxScore: s.maxScore }))}
              />
            </View>
          )}
        </SectionCard>
      </Animated.View>

      <Animated.View entering={screenReveal(STAGGER * 7)} style={[styles.ctaWrap, { paddingBottom: insets.bottom + spacing.xl }]}>
        <PrimaryButton
          label="Подобрать тренера"
          onPress={() => {
            triggerHaptic();
            handleFindCoach();
          }}
        />
        <SecondaryButton
          label="Открыть план развития"
          onPress={() => {
            triggerHaptic();
            handleOpenPlan();
          }}
        />
        <GhostButton
          label="Обсудить анализ с AI-компаньоном Арена"
          leftIcon={<Ionicons name="sparkles-outline" size={18} color={colors.accent} />}
          onPress={() => {
            triggerHaptic();
            const params = new URLSearchParams();
            if (id) params.set("playerId", id);
            params.set(
              "initialMessage",
              "Давай обсудим анализ прогресса моего ребёнка"
            );
            router.push(`/chat/${COACH_MARK_ID}?${params.toString()}`);
          }}
        />

        <ActionLinkCard
          icon="videocam-outline"
          title="Загрузить видео для точного анализа"
          description="Анализ техники и персональные рекомендации"
          onPress={() => {
            triggerHaptic();
            id && router.push(`/player/${id}/video-analysis/upload`);
          }}
        />
      </Animated.View>
    </FlagshipScreen>
  );
}

const styles = StyleSheet.create({
  customHeader: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: spacing.screenPadding,
    paddingVertical: spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: colors.surfaceLevel1Border,
  },
  backBtn: {
    width: 44,
    height: 44,
    alignItems: "center",
    justifyContent: "center",
  },
  headerTitle: {
    flex: 1,
    color: colors.text,
    fontSize: 18,
    fontWeight: "800",
    marginLeft: spacing.sm,
  },
  headerBlock: {
    marginBottom: spacing.sectionGap,
  },
  headerIconWrap: {
    width: 48,
    height: 48,
    borderRadius: radius.lg,
    backgroundColor: colors.accentSoft,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: spacing.md,
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
    color: colors.accent,
    fontSize: 15,
    fontWeight: "700",
    letterSpacing: 0.3,
    marginBottom: 6,
  },
  desc: {
    color: colors.textMuted,
    fontSize: 14,
    lineHeight: 21,
  },
  sectionTitle: {
    color: colors.text,
    fontSize: 20,
    fontWeight: "900",
    letterSpacing: -0.35,
    marginBottom: 16,
    marginTop: 8,
  },
  skillCard: {
    backgroundColor: colors.surfaceLightAlt,
    borderRadius: radius.lg,
    padding: spacing.xl,
    borderWidth: 1,
    borderColor: colors.borderSoft,
  },
  ctaWrap: {
    gap: spacing.md,
  },
  teaser: {
    padding: spacing.xl,
    backgroundColor: colors.surfaceLevel1,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.surfaceLevel1Border,
    marginBottom: spacing.lg,
    alignItems: "center",
    gap: spacing.md,
  },
  teaserText: {
    fontSize: 14,
    color: colors.textMuted,
    lineHeight: 22,
    textAlign: "center",
  },
  premiumCta: {
    padding: spacing.xl,
    backgroundColor: colors.accentSoft,
    borderRadius: radius.xl,
    marginBottom: spacing.sectionGap,
    borderWidth: 1,
    borderColor: "rgba(59,130,246,0.3)",
    ...shadows.level1,
  },
  premiumCtaLabel: {
    fontSize: 11,
    fontWeight: "700",
    color: colors.accent,
    letterSpacing: 1.2,
    marginBottom: spacing.sm,
  },
  premiumCtaTitle: {
    fontSize: 18,
    fontWeight: "800",
    color: colors.text,
    marginBottom: spacing.sm,
    lineHeight: 24,
  },
  premiumCtaSubtitle: {
    fontSize: 14,
    color: colors.textMuted,
    lineHeight: 22,
    marginBottom: 20,
  },
  premiumCtaButton: {
    backgroundColor: colors.accent,
    paddingVertical: 16,
    borderRadius: 14,
    alignItems: "center",
  },
  premiumCtaButtonText: {
    fontSize: 16,
    fontWeight: "700",
    color: colors.bgDeep,
  },
});
