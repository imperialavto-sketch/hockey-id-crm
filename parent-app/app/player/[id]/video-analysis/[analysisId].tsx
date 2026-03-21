import React, { useEffect, useState, useCallback } from "react";
import { View, Text, Pressable, StyleSheet } from "react-native";
import Animated from "react-native-reanimated";
import { useLocalSearchParams, useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { useAuth } from "@/context/AuthContext";
import { getVideoAnalysisById, retryVideoAnalysis } from "@/services/videoAnalysisService";
import type { VideoAnalysisRequest, VideoAnalysisResult } from "@/types/video-analysis";
import { VideoAnalysisHeader } from "@/components/video-analysis/VideoAnalysisHeader";
import { AnalysisStatusBadge } from "@/components/video-analysis/AnalysisStatusBadge";
import { AnalysisInsightCard } from "@/components/video-analysis/AnalysisInsightCard";
import { FlagshipScreen } from "@/components/layout/FlagshipScreen";
import { SkeletonBlock } from "@/components/ui";
import { SectionCard } from "@/components/player-passport";
import { ActionLinkCard } from "@/components/player/ActionLinkCard";
import { GhostButton, PrimaryButton } from "@/components/ui";
import { screenReveal, STAGGER } from "@/lib/animations";
import { triggerHaptic } from "@/lib/haptics";
import { colors, spacing, typography } from "@/constants/theme";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { PLAYER_MARK_GOLYSH } from "@/constants/mockPlayerMarkGolysh";

function DetailsSkeleton() {
  return (
    <View style={styles.skeletonContent}>
      <SkeletonBlock height={80} style={styles.skeletonHeader} />
      <SkeletonBlock height={100} style={styles.skeletonCard} />
      <SkeletonBlock height={120} style={styles.skeletonCard} />
      <SkeletonBlock height={140} style={styles.skeletonCard} />
      <SkeletonBlock height={80} style={styles.skeletonButton} />
    </View>
  );
}

export default function VideoAnalysisDetailsScreen() {
  const router = useRouter();
  const { user } = useAuth();
  const insets = useSafeAreaInsets();
  const { id, analysisId } = useLocalSearchParams<{ id: string; analysisId: string }>();
  const [request, setRequest] = useState<VideoAnalysisRequest | null>(null);
  const [result, setResult] = useState<VideoAnalysisResult | null>(null);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    if (!analysisId) return;
    setLoading(true);
    try {
      const details = await getVideoAnalysisById(analysisId, user?.id);
      setRequest(details.request);
      setResult(details.result);
    } finally {
      setLoading(false);
    }
  }, [analysisId, user?.id]);

  useEffect(() => {
    load();
  }, [load]);

  const onRetry = async () => {
    if (!analysisId) return;
    triggerHaptic();
    await retryVideoAnalysis(analysisId, user?.id);
    load();
  };

  const header = (
    <View style={[styles.customHeader, { paddingTop: insets.top + spacing.lg }]}>
      <Pressable
        style={({ pressed }) => [styles.backBtn, pressed && { opacity: PRESSED_OPACITY }]}
        onPress={() => {
          triggerHaptic();
          router.back();
        }}
        accessibilityRole="button"
        accessibilityLabel="Назад"
      >
        <Ionicons name="arrow-back" size={24} color="#ffffff" />
      </Pressable>
      <Text style={styles.headerTitle}>Детали анализа</Text>
      <View style={styles.headerBtn} />
    </View>
  );

  const goTo = (path: string) => {
    triggerHaptic();
    router.push(path as never);
  };

  if (loading && !request) {
    return (
      <FlagshipScreen header={header}>
        <DetailsSkeleton />
      </FlagshipScreen>
    );
  }

  if (!loading && !request) {
    return (
      <FlagshipScreen header={header} scroll={false}>
        <View style={styles.errorContainer}>
          <Ionicons name="alert-circle-outline" size={48} color={colors.textMuted} />
          <Text style={styles.notFoundText}>Анализ не найден</Text>
          <GhostButton
            label="Назад"
            onPress={() => {
              triggerHaptic();
              router.back();
            }}
          />
        </View>
      </FlagshipScreen>
    );
  }

  return (
    <FlagshipScreen header={header}>
      <Animated.View entering={screenReveal(0)}>
        <VideoAnalysisHeader playerName={PLAYER_MARK_GOLYSH.profile.fullName} />
      </Animated.View>

      {request && (
        <Animated.View entering={screenReveal(STAGGER)}>
          <SectionCard title={request.title || "Видео анализ"} style={styles.statusCard}>
            <View style={styles.statusRow}>
              <AnalysisStatusBadge status={request.analysisStatus} />
            </View>
          </SectionCard>
        </Animated.View>
      )}

      {request?.analysisStatus === "processing" && (
        <Animated.View entering={screenReveal(STAGGER * 2)}>
          <SectionCard title="Обработка" style={styles.infoCard}>
            <Text style={styles.infoText}>Видео обрабатывается...</Text>
          </SectionCard>
        </Animated.View>
      )}

      {request?.analysisStatus === "failed" && (
        <Animated.View entering={screenReveal(STAGGER * 2)}>
          <SectionCard title="Ошибка" style={styles.errorCard}>
            <Text style={styles.errorText}>
              {request.errorMessage || "Не удалось завершить анализ."}
            </Text>
            <PrimaryButton
              label="Повторить"
              onPress={onRetry}
            />
          </SectionCard>
        </Animated.View>
      )}

      {request?.analysisStatus === "completed" && result && (
        <>
          <Animated.View entering={screenReveal(STAGGER * 2)}>
            <SectionCard title="Резюме" style={styles.summaryCard}>
              <Text style={styles.summaryText}>{result.summary}</Text>
              <Text style={styles.confidence}>
                Confidence: {(result.confidenceScore * 100).toFixed(0)}%
              </Text>
            </SectionCard>
          </Animated.View>
          <Animated.View entering={screenReveal(STAGGER * 3)}>
            <AnalysisInsightCard title="Сильные стороны" items={result.strengths} />
          </Animated.View>
          <Animated.View entering={screenReveal(STAGGER * 4)}>
            <AnalysisInsightCard title="Зоны роста" items={result.weaknesses} />
          </Animated.View>
          <Animated.View entering={screenReveal(STAGGER * 5)}>
            <AnalysisInsightCard title="Рекомендации" items={result.recommendations} />
          </Animated.View>
          <Animated.View entering={screenReveal(STAGGER * 6)}>
            <AnalysisInsightCard title="Ключевые наблюдения" items={result.keyMoments} />
          </Animated.View>
        </>
      )}

      <Animated.View entering={screenReveal(STAGGER * 7)} style={styles.ctaSection}>
        <ActionLinkCard
          icon="document-text-outline"
          title="План развития"
          description="Открыть Development Plan"
          onPress={() => id && goTo(`/player/${id}/development-plan`)}
          variant="default"
        />
        <ActionLinkCard
          icon="people-outline"
          title="Подобрать тренера"
          description="Найти специалиста по броску"
          onPress={() => goTo("/marketplace/coaches?specialization=Бросок")}
          variant="accent"
        />
        <ActionLinkCard
          icon="videocam-outline"
          title="Загрузить новое видео"
          description="Другой эпизод для AI-анализа"
          onPress={() => id && goTo(`/player/${id}/video-analysis/upload`)}
          variant="default"
        />
      </Animated.View>
    </FlagshipScreen>
  );
}

const PRESSED_OPACITY = 0.88;

const styles = StyleSheet.create({
  customHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: spacing.screenPadding,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: "rgba(255,255,255,0.06)",
  },
  backBtn: {
    width: 40,
    height: 40,
    alignItems: "center",
    justifyContent: "center",
    marginLeft: -8,
  },
  headerTitle: { fontSize: 18, fontWeight: "700", lineHeight: 22, color: "#ffffff" },
  headerBtn: { width: 40, height: 40 },
  skeletonContent: { gap: spacing.xl },
  skeletonHeader: { borderRadius: 20, marginBottom: spacing.sm },
  skeletonCard: { borderRadius: 20 },
  skeletonButton: { borderRadius: 14, marginTop: spacing.md },
  statusCard: { marginBottom: spacing.xl },
  statusRow: { flexDirection: "row", alignItems: "center" },
  infoCard: { marginBottom: spacing.xl },
  infoText: { ...typography.bodySmall, color: colors.textSecondary, lineHeight: 22 },
  errorCard: {
    marginBottom: spacing.xl,
    borderColor: colors.errorBorder,
    backgroundColor: colors.errorSoft,
  },
  errorText: { color: colors.error, marginBottom: spacing.lg, ...typography.body },
  summaryCard: {
    marginBottom: spacing.xl,
    backgroundColor: colors.accentSoft,
    borderColor: colors.border,
  },
  summaryText: { ...typography.bodySmall, color: colors.text, lineHeight: 22, marginBottom: spacing.sm },
  confidence: { ...typography.body, color: colors.accent, fontWeight: "700" },
  ctaSection: { gap: spacing.lg, marginTop: spacing.lg },
  errorContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    gap: spacing.lg,
  },
  notFoundText: { ...typography.body, color: colors.textSecondary, textAlign: "center" },
});
