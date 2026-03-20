import React, { useCallback, useEffect, useRef, useState } from "react";
import { View, Text, StyleSheet, Pressable } from "react-native";
import Animated from "react-native-reanimated";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { useAuth } from "@/context/AuthContext";
import { useSubscription } from "@/context/SubscriptionContext";
import { getAIAnalysis, getFullPlayerProfile } from "@/services/playerService";
import { COACH_MARK_ID } from "@/services/chatService";
import { FlagshipScreen } from "@/components/layout/FlagshipScreen";
import { SectionCard } from "@/components/player-passport";
import { SkeletonBlock, ErrorStateView } from "@/components/ui";
import { screenReveal, STAGGER } from "@/lib/animations";
import { triggerHaptic } from "@/lib/haptics";
import { colors, spacing, radius, shadows } from "@/constants/theme";
import type { Player, PlayerAIAnalysis } from "@/types";

const PRESSED_OPACITY = 0.88;
type ScreenErrorKind = "not_found" | "network";

const SECTION_META = {
  strengths: {
    title: "Сильные стороны",
    subtitle: "Что уже работает на высоком уровне",
    icon: "sparkles-outline" as const,
    accent: colors.success,
  },
  growth: {
    title: "Зоны роста",
    subtitle: "Что даст самый заметный прогресс",
    icon: "trending-up-outline" as const,
    accent: colors.accent,
  },
  recommendations: {
    title: "Рекомендации",
    subtitle: "Практические шаги на ближайший цикл",
    icon: "checkmark-done-outline" as const,
    accent: colors.textPrimary,
  },
  coachFocus: {
    title: "Фокус тренера",
    subtitle: "На чём стоит держать внимание",
    icon: "eye-outline" as const,
    accent: colors.accentSoft,
  },
} as const;

function hasAiContent(data: PlayerAIAnalysis | null): boolean {
  if (!data) return false;

  return Boolean(
    data.summary?.trim() ||
      data.motivation?.trim() ||
      data.strengths.length ||
      data.growthAreas.length ||
      data.recommendations.length ||
      data.coachFocus.length
  );
}

function getPreviewSummary(summary: string): string {
  const trimmed = summary.trim();
  if (!trimmed) return "";

  const firstSentenceMatch = trimmed.match(/^.*?[.!?](?:\s|$)/);
  const firstSentence = firstSentenceMatch?.[0]?.trim();
  if (firstSentence && firstSentence.length <= 180) return firstSentence;

  return trimmed.length > 180 ? `${trimmed.slice(0, 177).trim()}...` : trimmed;
}

function AIAnalysisSkeleton() {
  return (
    <View style={styles.skeletonContent}>
      <SkeletonBlock height={148} style={styles.skeletonHero} />
      <View style={styles.skeletonInsightCard}>
        <SkeletonBlock height={16} style={styles.skeletonInsightTitle} />
        <SkeletonBlock height={18} style={styles.skeletonInsightLine} />
        <SkeletonBlock height={18} style={styles.skeletonInsightLineWide} />
      </View>
      {[1, 2, 3].map((item) => (
        <View key={item} style={styles.skeletonSection}>
          <SkeletonBlock height={18} style={styles.skeletonSectionTitle} />
          <SkeletonBlock height={14} style={styles.skeletonSectionSub} />
          <SkeletonBlock height={46} style={styles.skeletonListRow} />
          <SkeletonBlock height={46} style={styles.skeletonListRow} />
          <SkeletonBlock height={46} style={styles.skeletonListRowLast} />
        </View>
      ))}
    </View>
  );
}

function AIAnalysisHeader({
  insetTop,
  onBack,
}: {
  insetTop: number;
  onBack: () => void;
}) {
  return (
    <View style={[styles.header, { paddingTop: insetTop + spacing.lg }]}>
      <Pressable
        style={({ pressed }) => [styles.backBtn, pressed && { opacity: PRESSED_OPACITY }]}
        onPress={onBack}
        accessibilityRole="button"
        accessibilityLabel="Назад"
      >
        <Ionicons name="arrow-back" size={24} color="#ffffff" />
      </Pressable>
      <Text style={styles.headerTitle}>AI анализ</Text>
      <View style={styles.headerBtn} />
    </View>
  );
}

function ListSection({
  title,
  subtitle,
  icon,
  accentColor,
  items,
}: {
  title: string;
  subtitle: string;
  icon: keyof typeof Ionicons.glyphMap;
  accentColor: string;
  items: string[];
}) {
  if (items.length === 0) return null;

  return (
    <SectionCard title={title} style={styles.sectionCard}>
      <View style={styles.sectionLead}>
        <View style={[styles.sectionIconWrap, { backgroundColor: accentColor }]}>
          <Ionicons name={icon} size={16} color="#ffffff" />
        </View>
        <Text style={styles.sectionLeadText}>{subtitle}</Text>
      </View>
      {items.map((item, index) => (
        <View
          key={`${title}-${index}`}
          style={[styles.listRow, index === items.length - 1 && styles.listRowLast]}
        >
          <View style={styles.listBulletWrap}>
            <Text style={styles.listBullet}>•</Text>
          </View>
          <Text style={styles.listText}>{item}</Text>
        </View>
      ))}
    </SectionCard>
  );
}

export default function PlayerAIAnalysisScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { user } = useAuth();
  const { hasAiReportAccess } = useSubscription();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const [player, setPlayer] = useState<Player | null>(null);
  const [analysis, setAnalysis] = useState<PlayerAIAnalysis | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<ScreenErrorKind | null>(null);
  const [isEmpty, setIsEmpty] = useState(false);
  const mountedRef = useRef(true);
  const requestRef = useRef(0);

  useEffect(() => () => {
    mountedRef.current = false;
  }, []);

  const goBack = useCallback(() => {
    triggerHaptic();
    router.back();
  }, [router]);

  const load = useCallback(async () => {
    const requestId = ++requestRef.current;
    const canCommit = () => mountedRef.current && requestId === requestRef.current;

    if (!id || typeof id !== "string") {
      if (canCommit()) {
        setPlayer(null);
        setAnalysis(null);
        setError("not_found");
        setIsEmpty(false);
        setLoading(false);
      }
      return;
    }

    if (!user?.id) {
      if (canCommit()) {
        setPlayer(null);
        setAnalysis(null);
        setError("network");
        setIsEmpty(false);
        setLoading(false);
      }
      return;
    }

    if (canCommit()) {
      setLoading(true);
      setError(null);
      setIsEmpty(false);
    }

    try {
      const profile = await getFullPlayerProfile(id, user.id, {
        includeVideoAnalyses: false,
      });

      if (!canCommit()) return;

      if (!profile) {
        setPlayer(null);
        setAnalysis(null);
        setError("not_found");
        return;
      }

      setPlayer(profile.player);

      const aiData = await getAIAnalysis(id, user.id);

      if (!canCommit()) return;

      if (!hasAiContent(aiData)) {
        setAnalysis(null);
        setIsEmpty(true);
        return;
      }

      setAnalysis(aiData);
    } catch {
      if (canCommit()) {
        setPlayer(null);
        setAnalysis(null);
        setError("network");
        setIsEmpty(false);
      }
    } finally {
      if (canCommit()) {
        setLoading(false);
      }
    }
  }, [id, user?.id]);

  useEffect(() => {
    load();
  }, [load]);

  const header = <AIAnalysisHeader insetTop={insets.top} onBack={goBack} />;
  const previewStrengths = (analysis?.strengths ?? []).slice(0, 2);
  const previewSummary = analysis?.summary ? getPreviewSummary(analysis.summary) : "";

  if (loading) {
    return (
      <FlagshipScreen header={header}>
        <AIAnalysisSkeleton />
      </FlagshipScreen>
    );
  }

  if (error) {
    return (
      <FlagshipScreen header={header} scroll={false}>
        <ErrorStateView
          variant={error === "not_found" ? "notFound" : "network"}
          title={error === "not_found" ? "Игрок не найден" : "Ошибка загрузки"}
          subtitle={
            error === "not_found"
              ? "Проверьте ссылку или выберите другого игрока"
              : "Не удалось подготовить AI анализ. Проверьте соединение и попробуйте снова"
          }
          onAction={load}
        />
      </FlagshipScreen>
    );
  }

  if (isEmpty || !analysis) {
    return (
      <FlagshipScreen header={header} scroll={false}>
        <View style={styles.emptyContainer}>
          <View style={styles.emptyIconWrap}>
            <Ionicons name="sparkles-outline" size={40} color={colors.textMuted} />
          </View>
          <Text style={styles.emptyTitle}>AI анализ пока недоступен</Text>
          <Text style={styles.emptySub}>
            Как только появится достаточно данных и игровых наблюдений, здесь появятся сильные стороны,
            зоны роста и персональные рекомендации.
          </Text>
        </View>
      </FlagshipScreen>
    );
  }

  return (
    <FlagshipScreen header={header}>
      <Animated.View entering={screenReveal(0)}>
        <View style={styles.heroCard}>
          <LinearGradient
            colors={["rgba(59,130,246,0.16)", "rgba(59,130,246,0.04)", "rgba(255,255,255,0.02)"]}
            style={styles.heroGradient}
          />
          <View style={styles.heroTopRow}>
            <View style={styles.heroBadge}>
              <Ionicons name="sparkles" size={14} color={colors.accent} />
              <Text style={styles.heroBadgeText}>AI инсайт</Text>
            </View>
          </View>
          <Text style={styles.heroEyebrow}>AI АНАЛИЗ ИГРОКА</Text>
          <Text style={styles.heroTitle}>{player?.name ?? "Игрок"}</Text>
          <Text style={styles.heroSubtitle}>
            На основе последних данных и статистики AI выделил ключевые сильные стороны, зоны роста и
            рекомендации для следующего шага развития.
          </Text>
          <View style={styles.heroMetaRow}>
            <View style={styles.heroMetaChip}>
              <Ionicons name="analytics-outline" size={14} color={colors.textSecondary} />
              <Text style={styles.heroMetaText}>Последние данные игрока</Text>
            </View>
            <View style={styles.heroMetaChip}>
              <Ionicons name="flash-outline" size={14} color={colors.textSecondary} />
              <Text style={styles.heroMetaText}>Быстрый обзор для родителя</Text>
            </View>
          </View>
        </View>
      </Animated.View>

      {analysis.summary ? (
        <Animated.View entering={screenReveal(STAGGER)}>
          <SectionCard title="Краткий вывод" style={styles.sectionCard}>
            <View style={styles.summaryLead}>
              <View style={styles.summaryLeadIcon}>
                <Ionicons name="bulb-outline" size={18} color={colors.accent} />
              </View>
              <Text style={styles.summaryLeadText}>Главный инсайт по текущему состоянию игрока</Text>
            </View>
            <Text style={styles.summaryText}>
              {hasAiReportAccess ? analysis.summary : previewSummary}
            </Text>
          </SectionCard>
        </Animated.View>
      ) : null}

      <Animated.View entering={screenReveal(STAGGER * 2)}>
        <ListSection
          title={SECTION_META.strengths.title}
          subtitle={SECTION_META.strengths.subtitle}
          icon={SECTION_META.strengths.icon}
          accentColor={SECTION_META.strengths.accent}
          items={hasAiReportAccess ? analysis.strengths ?? [] : previewStrengths}
        />
      </Animated.View>

      {hasAiReportAccess ? (
        <>
          <Animated.View entering={screenReveal(STAGGER * 3)}>
            <ListSection
              title={SECTION_META.growth.title}
              subtitle={SECTION_META.growth.subtitle}
              icon={SECTION_META.growth.icon}
              accentColor={SECTION_META.growth.accent}
              items={analysis.growthAreas ?? []}
            />
          </Animated.View>

          <Animated.View entering={screenReveal(STAGGER * 4)}>
            <ListSection
              title={SECTION_META.recommendations.title}
              subtitle={SECTION_META.recommendations.subtitle}
              icon={SECTION_META.recommendations.icon}
              accentColor={SECTION_META.recommendations.accent}
              items={analysis.recommendations ?? []}
            />
          </Animated.View>

          <Animated.View entering={screenReveal(STAGGER * 5)}>
            <ListSection
              title={SECTION_META.coachFocus.title}
              subtitle={SECTION_META.coachFocus.subtitle}
              icon={SECTION_META.coachFocus.icon}
              accentColor={SECTION_META.coachFocus.accent}
              items={analysis.coachFocus ?? []}
            />
          </Animated.View>

          {analysis.motivation ? (
            <Animated.View entering={screenReveal(STAGGER * 6)}>
              <SectionCard title="Мотивация" style={styles.sectionCard}>
                <Text style={[styles.summaryText, styles.motivationText]}>{analysis.motivation}</Text>
              </SectionCard>
            </Animated.View>
          ) : null}
        </>
      ) : (
        <Animated.View entering={screenReveal(STAGGER * 3)}>
          <SectionCard title="Разблокируйте полный AI анализ" style={styles.paywallCard}>
            <View style={styles.paywallIconWrap}>
              <Ionicons name="lock-closed" size={18} color={colors.accent} />
            </View>
            <Text style={styles.paywallTitle}>
              Полный AI анализ доступен в Development Membership
            </Text>
            <Text style={styles.paywallText}>
              Получите полный разбор зон роста, персональные рекомендации, фокус тренера и мотивационный блок.
            </Text>
            <Pressable
              style={({ pressed }) => [styles.paywallBtn, pressed && { opacity: PRESSED_OPACITY }]}
              onPress={() => {
                triggerHaptic();
                router.push("/subscription/membership");
              }}
              accessibilityRole="button"
              accessibilityLabel="Разблокировать полный AI анализ"
            >
              <Ionicons name="sparkles" size={16} color="#ffffff" />
              <Text style={styles.paywallBtnText}>Разблокировать полный AI анализ</Text>
            </Pressable>
          </SectionCard>
        </Animated.View>
      )}

      <Animated.View entering={screenReveal(STAGGER * 6.5)}>
        <Pressable
          style={({ pressed }) => [styles.coachMarkCta, pressed && { opacity: PRESSED_OPACITY }]}
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
        >
          <Ionicons name="sparkles-outline" size={18} color={colors.accent} />
          <Text style={styles.coachMarkCtaText}>Обсудить анализ с Coach Mark</Text>
        </Pressable>
      </Animated.View>

      <Animated.View entering={screenReveal(STAGGER * 7)}>
        <Pressable
          style={({ pressed }) => [styles.refreshBtn, pressed && { opacity: PRESSED_OPACITY }]}
          onPress={() => {
            triggerHaptic();
            load();
          }}
          accessibilityRole="button"
          accessibilityLabel="Обновить анализ"
        >
          <Ionicons name="refresh-outline" size={18} color="#ffffff" />
          <Text style={styles.refreshBtnText}>Обновить анализ</Text>
        </Pressable>
      </Animated.View>
    </FlagshipScreen>
  );
}

const styles = StyleSheet.create({
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: spacing.screenPadding,
    paddingVertical: 12,
    paddingTop: 12,
    borderBottomWidth: 1,
    borderBottomColor: colors.surfaceLevel1Border,
  },
  backBtn: {
    width: 40,
    height: 40,
    alignItems: "center",
    justifyContent: "center",
    marginLeft: -8,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: "700",
    lineHeight: 22,
    color: "#ffffff",
  },
  headerBtn: {
    width: 40,
    height: 40,
  },
  skeletonContent: {
    gap: spacing.xl,
  },
  skeletonHero: {
    borderRadius: radius.lg,
  },
  skeletonInsightCard: {
    borderRadius: radius.lg,
    padding: spacing.lg,
    backgroundColor: "rgba(255,255,255,0.03)",
    borderWidth: 1,
    borderColor: colors.surfaceLevel1Border,
  },
  skeletonInsightTitle: {
    width: 120,
    borderRadius: 8,
    marginBottom: spacing.md,
  },
  skeletonInsightLine: {
    width: "86%",
    borderRadius: 8,
    marginBottom: spacing.sm,
  },
  skeletonInsightLineWide: {
    width: "94%",
    borderRadius: 8,
  },
  skeletonSection: {
    borderRadius: radius.lg,
    padding: spacing.lg,
    backgroundColor: "rgba(255,255,255,0.03)",
    borderWidth: 1,
    borderColor: colors.surfaceLevel1Border,
  },
  skeletonSectionTitle: {
    width: 140,
    borderRadius: 8,
    marginBottom: spacing.sm,
  },
  skeletonSectionSub: {
    width: "72%",
    borderRadius: 8,
    marginBottom: spacing.lg,
  },
  skeletonListRow: {
    borderRadius: 12,
    marginBottom: spacing.sm,
  },
  skeletonListRowLast: {
    borderRadius: 12,
  },
  heroCard: {
    position: "relative",
    overflow: "hidden",
    marginBottom: spacing.xl,
    padding: spacing.xl,
    borderRadius: radius.lg,
    backgroundColor: "rgba(255,255,255,0.03)",
    borderColor: colors.surfaceLevel1Border,
    borderWidth: 1,
    ...shadows.level1,
  },
  heroGradient: {
    ...StyleSheet.absoluteFillObject,
  },
  heroTopRow: {
    flexDirection: "row",
    justifyContent: "flex-start",
    marginBottom: spacing.md,
  },
  heroBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.xs,
    paddingHorizontal: spacing.sm,
    paddingVertical: 6,
    borderRadius: 999,
    backgroundColor: "rgba(255,255,255,0.06)",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.08)",
  },
  heroBadgeText: {
    fontSize: 12,
    fontWeight: "700",
    color: colors.textSecondary,
  },
  heroEyebrow: {
    fontSize: 11,
    fontWeight: "700",
    letterSpacing: 1,
    color: colors.textMuted,
    marginBottom: spacing.sm,
  },
  heroTitle: {
    fontSize: 28,
    fontWeight: "800",
    color: colors.textPrimary,
    marginBottom: spacing.xs,
    letterSpacing: -0.4,
  },
  heroSubtitle: {
    fontSize: 15,
    lineHeight: 22,
    color: colors.textSecondary,
  },
  heroMetaRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: spacing.sm,
    marginTop: spacing.lg,
  },
  heroMetaChip: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.xs,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
    borderRadius: 999,
    backgroundColor: "rgba(255,255,255,0.04)",
    borderWidth: 1,
    borderColor: colors.borderSoft,
  },
  heroMetaText: {
    fontSize: 12,
    color: colors.textSecondary,
    fontWeight: "500",
  },
  sectionCard: {
    marginBottom: spacing.xl,
    borderColor: colors.surfaceLevel1Border,
    ...shadows.level1,
  },
  sectionLead: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
    marginBottom: spacing.md,
  },
  sectionIconWrap: {
    width: 28,
    height: 28,
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
  },
  sectionLeadText: {
    flex: 1,
    fontSize: 13,
    lineHeight: 18,
    color: colors.textMuted,
  },
  summaryLead: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
    marginBottom: spacing.md,
  },
  summaryLeadIcon: {
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: "rgba(59,130,246,0.12)",
    borderWidth: 1,
    borderColor: "rgba(59,130,246,0.18)",
    alignItems: "center",
    justifyContent: "center",
  },
  summaryLeadText: {
    flex: 1,
    fontSize: 13,
    lineHeight: 18,
    color: colors.textSecondary,
    fontWeight: "600",
  },
  summaryText: {
    fontSize: 15,
    lineHeight: 24,
    color: colors.textPrimary,
  },
  motivationText: {
    color: colors.accent,
  },
  paywallCard: {
    marginBottom: spacing.xl,
    borderColor: colors.surfaceLevel1Border,
    ...shadows.level1,
  },
  paywallIconWrap: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: "rgba(59,130,246,0.12)",
    borderWidth: 1,
    borderColor: "rgba(59,130,246,0.18)",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: spacing.md,
  },
  paywallTitle: {
    fontSize: 18,
    lineHeight: 24,
    fontWeight: "700",
    color: colors.textPrimary,
    marginBottom: spacing.sm,
  },
  paywallText: {
    fontSize: 14,
    lineHeight: 22,
    color: colors.textSecondary,
    marginBottom: spacing.lg,
  },
  paywallBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: spacing.sm,
    backgroundColor: colors.accent,
    borderRadius: radius.sm,
    paddingVertical: 14,
    paddingHorizontal: spacing.lg,
  },
  paywallBtnText: {
    fontSize: 15,
    fontWeight: "700",
    color: "#ffffff",
  },
  listRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: spacing.sm,
    paddingVertical: spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: colors.borderSoft,
  },
  listBulletWrap: {
    width: 22,
    height: 22,
    borderRadius: 11,
    backgroundColor: "rgba(59,130,246,0.12)",
    alignItems: "center",
    justifyContent: "center",
    marginTop: 1,
  },
  listRowLast: {
    borderBottomWidth: 0,
    paddingBottom: 0,
  },
  listBullet: {
    color: colors.accent,
    fontSize: 16,
    lineHeight: 16,
  },
  listText: {
    flex: 1,
    fontSize: 14,
    lineHeight: 22,
    color: colors.textPrimary,
  },
  emptyContainer: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: spacing.xl,
    gap: spacing.lg,
  },
  emptyIconWrap: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: colors.surfaceLevel1,
    borderWidth: 1,
    borderColor: colors.surfaceLevel1Border,
    alignItems: "center",
    justifyContent: "center",
  },
  emptyTitle: {
    fontSize: 20,
    fontWeight: "700",
    color: colors.textPrimary,
    textAlign: "center",
  },
  emptySub: {
    fontSize: 14,
    lineHeight: 22,
    color: colors.textMuted,
    textAlign: "center",
    maxWidth: 300,
  },
  coachMarkCta: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: spacing.sm,
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.lg,
    marginBottom: spacing.md,
    backgroundColor: "rgba(59,130,246,0.12)",
    borderRadius: radius.sm,
    borderWidth: 1,
    borderColor: "rgba(59,130,246,0.25)",
  },
  coachMarkCtaText: {
    fontSize: 15,
    fontWeight: "600",
    color: colors.accent,
  },
  refreshBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: spacing.sm,
    backgroundColor: colors.accent,
    borderRadius: radius.sm,
    paddingVertical: 14,
    paddingHorizontal: spacing.lg,
    marginBottom: spacing.md,
  },
  refreshBtnText: {
    fontSize: 15,
    fontWeight: "600",
    color: "#ffffff",
  },
});
