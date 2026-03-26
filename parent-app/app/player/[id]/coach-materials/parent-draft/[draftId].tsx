import { useCallback, useEffect, useState } from "react";
import { View, Text, Pressable } from "react-native";
import Animated from "react-native-reanimated";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { useAuth } from "@/context/AuthContext";
import {
  getPlayerParentDraftDetail,
  type ParentDraftDetail,
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
  formatParentDraftStatusLabel,
} from "@/lib/coachMaterialsUi";
import { coachMaterialsDetailStyles as d } from "@/lib/coachMaterialsStyles";

const PRESSED_OPACITY = feedback.pressedOpacity;

function DetailSkeleton() {
  return (
    <View style={d.skeletonWrap}>
      <SkeletonBlock height={22} style={d.skeletonLine} />
      <SkeletonBlock height={14} style={d.skeletonMeta} />
      <SkeletonBlock height={100} style={d.skeletonBody} />
    </View>
  );
}

export default function ParentDraftDetailScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { user, isLoading: authLoading } = useAuth();
  const { id: playerId, draftId } = useLocalSearchParams<{
    id: string;
    draftId: string;
  }>();

  const [data, setData] = useState<ParentDraftDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    if (!playerId || typeof playerId !== "string" || !draftId || typeof draftId !== "string") {
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
      const r = await getPlayerParentDraftDetail(playerId, draftId, user.id);
      setData(r);
    } catch {
      setData(null);
      setError(CM_COPY.fetchErrorDraft);
    } finally {
      setLoading(false);
    }
  }, [playerId, draftId, user?.id]);

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
        Сообщение для вас
      </Text>
      <View style={d.headerSpacer} />
    </View>
  );

  if (!playerId || typeof playerId !== "string" || !draftId || typeof draftId !== "string") {
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
        <DetailSkeleton />
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
        <DetailSkeleton />
      </FlagshipScreen>
    );
  }

  if (isDemoMode && !data) {
    return (
      <FlagshipScreen header={header} scroll={false}>
        <View style={d.centerBlock}>
          <Text style={d.mutedText}>{CM_COPY.demoDraft}</Text>
          <PrimaryButton label="Назад" onPress={() => router.back()} />
        </View>
      </FlagshipScreen>
    );
  }

  if (!data) {
    return (
      <FlagshipScreen header={header} scroll={false}>
        <View style={d.centerBlock}>
          <Ionicons name="chatbubble-ellipses-outline" size={40} color={colors.textMuted} />
          <Text style={d.mutedText}>{CM_COPY.notFoundDraft}</Text>
          <PrimaryButton label="Назад" onPress={() => router.back()} />
        </View>
      </FlagshipScreen>
    );
  }

  const displayTitle =
    data.title && data.title.trim() ? data.title.trim() : CM_COPY.draftTitleFallback;
  const contentBody = data.content.trim() || CM_COPY.draftBodyEmpty;
  const statusLabel = formatParentDraftStatusLabel(data.status);
  const showUpdated =
    data.updatedAt &&
    data.createdAt &&
    data.updatedAt.trim() !== data.createdAt.trim();

  return (
    <FlagshipScreen header={header}>
      <Animated.View entering={screenReveal(0)}>
        <SectionCard title={displayTitle} subtitle={CM_COPY.draftSubtitle} style={d.card}>
          <Text style={d.kindKicker}>{CM_COPY.draftKindLine}</Text>
          {data.voiceNoteId ? <Text style={d.voiceHint}>{CM_VOICE_LABEL}</Text> : null}
          <View style={d.statusPill}>
            <Text style={d.statusPillText}>{statusLabel}</Text>
          </View>
          {data.createdAt ? (
            <Text style={[d.metaDate, !showUpdated ? { marginBottom: spacing.md } : null]}>
              Создано: {formatCoachMaterialDateDetail(data.createdAt)}
            </Text>
          ) : null}
          {showUpdated && data.updatedAt ? (
            <Text style={d.metaDateSecondary}>
              Обновлено: {formatCoachMaterialDateDetail(data.updatedAt)}
            </Text>
          ) : null}
          <Text style={[d.sectionLabel, { marginTop: spacing.sm }]}>{CM_COPY.sectionText}</Text>
          <Text style={d.bodyText}>{contentBody}</Text>
        </SectionCard>
      </Animated.View>
    </FlagshipScreen>
  );
}
