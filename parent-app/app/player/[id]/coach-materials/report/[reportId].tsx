import { useCallback, useEffect, useState } from "react";
import { View, Text, Pressable } from "react-native";
import Animated from "react-native-reanimated";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { useAuth } from "@/context/AuthContext";
import {
  getPlayerCoachReportDetail,
  type ParentCoachReportDetail,
} from "@/services/playerService";
import { FlagshipScreen } from "@/components/layout/FlagshipScreen";
import { SectionCard } from "@/components/player-passport";
import { SkeletonBlock, PrimaryButton } from "@/components/ui";
import { screenReveal } from "@/lib/animations";
import { triggerHaptic } from "@/lib/haptics";
import { colors, spacing, feedback } from "@/constants/theme";
import { isDemoMode } from "@/config/api";
import {
  CM_COPY,
  CM_VOICE_LABEL,
  formatCoachMaterialDateDetail,
} from "@/lib/coachMaterialsUi";
import { coachMaterialsDetailStyles as d } from "@/lib/coachMaterialsStyles";

const PRESSED_OPACITY = feedback.pressedOpacity;

function ReportSkeleton() {
  return (
    <View style={d.skeletonWrap}>
      <SkeletonBlock height={22} style={d.skeletonLine} />
      <SkeletonBlock height={14} style={d.skeletonMeta} />
      <SkeletonBlock height={120} style={d.skeletonBody} />
    </View>
  );
}

export default function CoachReportDetailScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { user, isLoading: authLoading } = useAuth();
  const { id: playerId, reportId } = useLocalSearchParams<{
    id: string;
    reportId: string;
  }>();

  const [data, setData] = useState<ParentCoachReportDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    if (!playerId || typeof playerId !== "string" || !reportId || typeof reportId !== "string") {
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

    if (isDemoMode) {
      setLoading(false);
      setData(null);
      setError(null);
      return;
    }

    setLoading(true);
    setError(null);
    try {
      const r = await getPlayerCoachReportDetail(playerId, reportId, user.id);
      setData(r);
    } catch {
      setData(null);
      setError(CM_COPY.fetchErrorReport);
    } finally {
      setLoading(false);
    }
  }, [playerId, reportId, user?.id]);

  useEffect(() => {
    if (authLoading) return;
    void load();
  }, [load, authLoading]);

  const header = (
    <View style={[d.headerRow, { paddingTop: insets.top + spacing.md }]}>
      <Pressable
        style={({ pressed }) => [d.backBtn, pressed && { opacity: PRESSED_OPACITY }]}
        onPress={() => {
          triggerHaptic();
          router.back();
        }}
        accessibilityRole="button"
        accessibilityLabel="Назад"
      >
        <Ionicons name="arrow-back" size={24} color="#ffffff" />
      </Pressable>
      <Text style={d.headerTitle} numberOfLines={1}>
        Отчёт тренера
      </Text>
      <View style={d.headerSpacer} />
    </View>
  );

  if (!playerId || typeof playerId !== "string" || !reportId || typeof reportId !== "string") {
    return (
      <FlagshipScreen header={header} scroll={false}>
        <View style={d.centerBlock}>
          <Text style={d.mutedText}>{CM_COPY.invalidPlayer}</Text>
          <PrimaryButton label="Назад" onPress={() => router.back()} />
        </View>
      </FlagshipScreen>
    );
  }

  if (error) {
    return (
      <FlagshipScreen header={header} scroll={false}>
        <View style={d.centerBlock}>
          <Ionicons name="cloud-offline-outline" size={40} color={colors.textMuted} />
          <Text style={d.errorText}>{error}</Text>
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
        <ReportSkeleton />
      </FlagshipScreen>
    );
  }

  if (!user?.id) {
    return (
      <FlagshipScreen header={header} scroll={false}>
        <View style={d.centerBlock}>
          <Ionicons name="lock-closed-outline" size={40} color={colors.textMuted} />
          <Text style={d.mutedText}>{CM_COPY.authRequired}</Text>
          <PrimaryButton label="Назад" onPress={() => router.back()} />
        </View>
      </FlagshipScreen>
    );
  }

  if (loading) {
    return (
      <FlagshipScreen header={header} scroll={false}>
        <ReportSkeleton />
      </FlagshipScreen>
    );
  }

  if (isDemoMode && !data) {
    return (
      <FlagshipScreen header={header} scroll={false}>
        <View style={d.centerBlock}>
          <Text style={d.mutedText}>{CM_COPY.demoReport}</Text>
          <PrimaryButton label="Назад" onPress={() => router.back()} />
        </View>
      </FlagshipScreen>
    );
  }

  if (!data) {
    return (
      <FlagshipScreen header={header} scroll={false}>
        <View style={d.centerBlock}>
          <Ionicons name="document-outline" size={40} color={colors.textMuted} />
          <Text style={d.mutedText}>{CM_COPY.notFoundReport}</Text>
          <PrimaryButton label="Назад" onPress={() => router.back()} />
        </View>
      </FlagshipScreen>
    );
  }

  const title = data.title.trim() || CM_COPY.reportTitleFallback;
  const bodyText = data.content.trim() || CM_COPY.reportBodyEmpty;

  return (
    <FlagshipScreen header={header}>
      <Animated.View entering={screenReveal(0)}>
        <SectionCard title={title} subtitle={CM_COPY.reportSubtitle} style={d.card}>
          {data.voiceNoteId ? <Text style={d.voiceHint}>{CM_VOICE_LABEL}</Text> : null}
          {data.createdAt ? (
            <Text style={[d.metaDate, { marginBottom: spacing.md }]}>
              Создано: {formatCoachMaterialDateDetail(data.createdAt)}
            </Text>
          ) : null}
          <Text style={d.sectionLabel}>{CM_COPY.sectionText}</Text>
          <Text style={d.bodyText}>{bodyText}</Text>
        </SectionCard>
      </Animated.View>
    </FlagshipScreen>
  );
}
