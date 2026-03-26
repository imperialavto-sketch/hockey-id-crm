import { useCallback, useEffect, useState } from "react";
import { View, Text, Pressable, StyleSheet } from "react-native";
import Animated from "react-native-reanimated";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { useAuth } from "@/context/AuthContext";
import {
  getPlayerCoachMaterials,
  type ParentPlayerCoachMaterials,
} from "@/services/playerService";
import { FlagshipScreen } from "@/components/layout/FlagshipScreen";
import { SectionCard } from "@/components/player-passport";
import { SkeletonBlock, PrimaryButton } from "@/components/ui";
import { screenReveal, STAGGER } from "@/lib/animations";
import { triggerHaptic } from "@/lib/haptics";
import { colors, spacing, radius, feedback } from "@/constants/theme";
import { isDemoMode } from "@/config/api";
import {
  CM_COPY,
  CM_VOICE_LABEL,
  formatActionItemStatusLabel,
  formatCoachMaterialDateShort,
  coachHubReportTitle,
  coachHubReportPreview,
  coachHubActionTitle,
  coachHubActionPreview,
  coachHubDraftPreview,
} from "@/lib/coachMaterialsUi";
import { coachMaterialsHubStyles as hub } from "@/lib/coachMaterialsStyles";

const PRESSED_OPACITY = feedback.pressedOpacity;

function HubSkeleton() {
  return (
    <View style={styles.skeletonWrap}>
      <SkeletonBlock height={72} style={styles.skeletonHero} />
      <SkeletonBlock height={88} style={styles.skeletonCard} />
      <SkeletonBlock height={120} style={styles.skeletonCard} />
    </View>
  );
}

export default function CoachMaterialsHubScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { user, isLoading: authLoading } = useAuth();
  const { id: playerId } = useLocalSearchParams<{ id: string }>();

  const [data, setData] = useState<ParentPlayerCoachMaterials | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    if (!playerId || typeof playerId !== "string") {
      setLoading(false);
      setData(null);
      setError(null);
      return;
    }
    if (!user?.id) {
      setLoading(false);
      setData(null);
      setError(null);
      return;
    }

    setLoading(true);
    setError(null);
    try {
      const m = await getPlayerCoachMaterials(playerId, user.id);
      setData(m);
    } catch {
      setData(null);
      setError(CM_COPY.fetchErrorHub);
    } finally {
      setLoading(false);
    }
  }, [playerId, user?.id]);

  useEffect(() => {
    if (authLoading) return;
    void load();
  }, [load, authLoading]);

  const header = (
    <View style={[styles.headerRow, { paddingTop: insets.top + spacing.md }]}>
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
      <Text style={styles.headerTitle} numberOfLines={1}>
        Материалы тренера
      </Text>
      <View style={styles.headerSpacer} />
    </View>
  );

  if (!playerId || typeof playerId !== "string") {
    return (
      <FlagshipScreen header={header} scroll={false}>
        <View style={styles.centerBlock}>
          <Text style={styles.mutedText}>{CM_COPY.invalidPlayer}</Text>
          <PrimaryButton label="Назад" onPress={() => router.back()} />
        </View>
      </FlagshipScreen>
    );
  }

  if (error) {
    return (
      <FlagshipScreen header={header} scroll={false}>
        <View style={styles.centerBlock}>
          <Ionicons name="cloud-offline-outline" size={40} color={colors.textMuted} />
          <Text style={styles.errorText}>{error}</Text>
          <PrimaryButton
            label="Повторить"
            onPress={() => {
              triggerHaptic();
              void load();
            }}
          />
        </View>
      </FlagshipScreen>
    );
  }

  if (authLoading) {
    return (
      <FlagshipScreen header={header} scroll={false}>
        <HubSkeleton />
      </FlagshipScreen>
    );
  }

  if (!user?.id) {
    return (
      <FlagshipScreen header={header} scroll={false}>
        <View style={styles.centerBlock}>
          <Ionicons name="lock-closed-outline" size={40} color={colors.textMuted} />
          <Text style={styles.mutedText}>{CM_COPY.authRequired}</Text>
          <PrimaryButton label="Назад" onPress={() => router.back()} />
        </View>
      </FlagshipScreen>
    );
  }

  if (loading) {
    return (
      <FlagshipScreen header={header} scroll={false}>
        <HubSkeleton />
      </FlagshipScreen>
    );
  }

  const reports = data?.reports ?? [];
  const actions = data?.actions ?? [];
  const drafts = data?.parentDrafts ?? [];
  const total = reports.length + actions.length + drafts.length;

  const emptyAfterLoad = total === 0;

  if (emptyAfterLoad) {
    return (
      <FlagshipScreen header={header} scroll={false}>
        <View style={styles.centerBlock}>
          <Ionicons name="folder-open-outline" size={44} color={colors.textMuted} />
          <Text style={styles.mutedText}>
            {isDemoMode ? CM_COPY.hubEmptyDemo : CM_COPY.hubEmptyLive}
          </Text>
          <PrimaryButton label="Назад" onPress={() => router.back()} />
        </View>
      </FlagshipScreen>
    );
  }

  return (
    <FlagshipScreen header={header}>
      <Animated.View entering={screenReveal(0)}>
        <Text style={styles.intro}>{CM_COPY.hubIntro}</Text>
      </Animated.View>

      <Animated.View entering={screenReveal(STAGGER * 0.5)}>
        <SectionCard title="Сводка" variant="primary" style={hub.summaryCard}>
          <Text style={hub.summaryTotal}>{total}</Text>
          <Text style={hub.summaryHint}>Всего материалов после тренировок</Text>
          <View style={hub.summaryBreakdown}>
            <View style={hub.summaryChip}>
              <Text style={hub.summaryChipText}>Отчёты · {reports.length}</Text>
            </View>
            <View style={hub.summaryChip}>
              <Text style={hub.summaryChipText}>Задачи · {actions.length}</Text>
            </View>
            <View style={hub.summaryChip}>
              <Text style={hub.summaryChipText}>Черновики · {drafts.length}</Text>
            </View>
          </View>
        </SectionCard>
      </Animated.View>

      {reports.length > 0 ? (
        <Animated.View entering={screenReveal(STAGGER)}>
          <SectionCard title="Отчёты" style={styles.card}>
            {reports.map((r, idx) => (
              <Pressable
                key={r.id}
                onPress={() => {
                  triggerHaptic();
                  router.push(
                    `/player/${playerId}/coach-materials/report/${encodeURIComponent(r.id)}`
                  );
                }}
                style={({ pressed }) => [
                  hub.rowCard,
                  idx > 0 ? hub.rowCardGap : null,
                  pressed && { opacity: PRESSED_OPACITY },
                ]}
                accessibilityRole="button"
              >
                <Text style={styles.rowTitle} numberOfLines={2}>
                  {coachHubReportTitle(r)}
                </Text>
                <View style={hub.rowMetaRow}>
                  {r.voiceNoteId ? (
                    <Text style={styles.voiceTag}>{CM_VOICE_LABEL}</Text>
                  ) : null}
                  {r.createdAt ? (
                    <Text style={styles.rowDate}>{formatCoachMaterialDateShort(r.createdAt)}</Text>
                  ) : null}
                </View>
                <Text style={styles.rowPreview} numberOfLines={2}>
                  {coachHubReportPreview(r)}
                </Text>
              </Pressable>
            ))}
          </SectionCard>
        </Animated.View>
      ) : null}

      {actions.length > 0 ? (
        <Animated.View entering={screenReveal(STAGGER * 1.25)}>
          <SectionCard title="Задачи" style={styles.card}>
            {actions.map((a, idx) => (
              <Pressable
                key={a.id}
                onPress={() => {
                  triggerHaptic();
                  router.push(
                    `/player/${playerId}/coach-materials/action-item/${encodeURIComponent(a.id)}`
                  );
                }}
                style={({ pressed }) => [
                  hub.rowCard,
                  idx > 0 ? hub.rowCardGap : null,
                  pressed && { opacity: PRESSED_OPACITY },
                ]}
                accessibilityRole="button"
              >
                <Text style={styles.rowTitle} numberOfLines={2}>
                  {coachHubActionTitle(a)}
                </Text>
                <View style={hub.rowMetaRow}>
                  <Text style={hub.rowPill}>{formatActionItemStatusLabel(a.status)}</Text>
                  {a.voiceNoteId ? (
                    <Text style={styles.voiceTag}>{CM_VOICE_LABEL}</Text>
                  ) : null}
                  {a.createdAt ? (
                    <Text style={styles.rowDate}>{formatCoachMaterialDateShort(a.createdAt)}</Text>
                  ) : null}
                </View>
                <Text style={styles.rowPreview} numberOfLines={2}>
                  {coachHubActionPreview(a)}
                </Text>
              </Pressable>
            ))}
          </SectionCard>
        </Animated.View>
      ) : null}

      {drafts.length > 0 ? (
        <Animated.View entering={screenReveal(STAGGER * 1.5)}>
          <SectionCard title="Черновики для родителя" style={styles.card}>
            {drafts.map((d, idx) => (
              <Pressable
                key={d.id}
                onPress={() => {
                  triggerHaptic();
                  router.push(
                    `/player/${playerId}/coach-materials/parent-draft/${encodeURIComponent(d.id)}`
                  );
                }}
                style={({ pressed }) => [
                  hub.rowCard,
                  idx > 0 ? hub.rowCardGap : null,
                  pressed && { opacity: PRESSED_OPACITY },
                ]}
                accessibilityRole="button"
              >
                <Text style={styles.rowTitle} numberOfLines={2}>
                  {CM_COPY.draftTitleFallback}
                </Text>
                <View style={hub.rowMetaRow}>
                  <Text style={hub.rowPill}>Черновик</Text>
                  {d.voiceNoteId ? (
                    <Text style={styles.voiceTag}>{CM_VOICE_LABEL}</Text>
                  ) : null}
                  {d.createdAt ? (
                    <Text style={styles.rowDate}>{formatCoachMaterialDateShort(d.createdAt)}</Text>
                  ) : null}
                </View>
                <Text style={styles.rowPreview} numberOfLines={3}>
                  {coachHubDraftPreview(d)}
                </Text>
              </Pressable>
            ))}
          </SectionCard>
        </Animated.View>
      ) : null}
    </FlagshipScreen>
  );
}

const styles = StyleSheet.create({
  headerRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: spacing.screenPadding,
    paddingBottom: spacing.sm,
  },
  backBtn: {
    width: 44,
    height: 44,
    alignItems: "center",
    justifyContent: "center",
  },
  headerTitle: {
    flex: 1,
    fontSize: 17,
    fontWeight: "700",
    color: "#ffffff",
    textAlign: "center",
  },
  headerSpacer: { width: 44 },
  intro: {
    fontSize: 14,
    lineHeight: 21,
    color: colors.textMuted,
    marginBottom: spacing.lg,
    paddingHorizontal: 2,
  },
  skeletonWrap: {
    paddingHorizontal: spacing.screenPadding,
    paddingTop: spacing.lg,
    gap: spacing.md,
  },
  skeletonHero: {
    borderRadius: radius.lg,
  },
  skeletonCard: {
    borderRadius: radius.md,
  },
  centerBlock: {
    paddingHorizontal: spacing.xl,
    paddingTop: spacing.xxl,
    alignItems: "center",
    gap: spacing.lg,
  },
  mutedText: {
    fontSize: 15,
    color: colors.textMuted,
    textAlign: "center",
    lineHeight: 22,
  },
  errorText: {
    fontSize: 15,
    color: colors.errorText,
    textAlign: "center",
    lineHeight: 22,
  },
  card: {
    marginBottom: spacing.lg,
  },
  rowTitle: {
    fontSize: 16,
    fontWeight: "700",
    color: colors.text,
    marginBottom: spacing.xs,
  },
  rowPreview: {
    fontSize: 14,
    lineHeight: 20,
    color: colors.textSecondary,
    marginTop: spacing.xs,
  },
  rowDate: {
    fontSize: 12,
    color: colors.textMuted,
  },
  voiceTag: {
    fontSize: 11,
    fontWeight: "600",
    color: colors.accent,
  },
});
