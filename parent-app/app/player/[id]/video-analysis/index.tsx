import React, { useEffect, useState } from "react";
import {
  View,
  Text,
  Pressable,
  StyleSheet,
} from "react-native";
import Animated from "react-native-reanimated";
import { useLocalSearchParams, useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import type { VideoAnalysisRequest } from "@/types/video-analysis";
import { getVideoAnalyses, getVideoAnalysisById } from "@/services/videoAnalysisService";
import { VideoAnalysisHeader } from "@/components/video-analysis/VideoAnalysisHeader";
import { VideoAnalysisListItem } from "@/components/video-analysis/VideoAnalysisListItem";
import { AnalysisEmptyState } from "@/components/video-analysis/AnalysisEmptyState";
import { useAuth } from "@/context/AuthContext";
import { FlagshipScreen } from "@/components/layout/FlagshipScreen";
import { SkeletonBlock } from "@/components/ui";
import { screenReveal, STAGGER } from "@/lib/animations";
import { triggerHaptic } from "@/lib/haptics";
import { colors, spacing } from "@/constants/theme";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { PLAYER_MARK_GOLYSH } from "@/constants/mockPlayerMarkGolysh";

function VideoAnalysisSkeleton() {
  return (
    <View style={styles.skeletonContent}>
      <SkeletonBlock height={80} style={styles.skeletonHeader} />
      <SkeletonBlock height={140} style={styles.skeletonCard} />
      <SkeletonBlock height={100} style={styles.skeletonCard} />
      <SkeletonBlock height={100} style={styles.skeletonCard} />
      <SkeletonBlock height={100} style={styles.skeletonCard} />
    </View>
  );
}

export default function VideoAnalysisListScreen() {
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id: string }>();
  const { user } = useAuth();
  const insets = useSafeAreaInsets();
  const [items, setItems] = useState<VideoAnalysisRequest[]>([]);
  const [summaries, setSummaries] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!id || !user?.id) {
      setLoading(false);
      return;
    }
    let mounted = true;
    setLoading(true);
    getVideoAnalyses(id, user.id)
      .then(async (list) => {
        if (!mounted) return;
        setItems(list);
        const map: Record<string, string> = {};
        for (const req of list) {
          const details = await getVideoAnalysisById(req.id, user.id);
          if (details.result?.summary) map[req.id] = details.result.summary;
        }
        if (mounted) setSummaries(map);
      })
      .finally(() => {
        if (mounted) setLoading(false);
      });
    return () => {
      mounted = false;
    };
  }, [id, user?.id]);

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
      <Text style={styles.headerTitle}>Видео анализы</Text>
      <Pressable
        style={({ pressed }) => [styles.addBtn, pressed && { opacity: PRESSED_OPACITY }]}
        onPress={() => {
          triggerHaptic();
          id && router.push(`/player/${id}/video-analysis/upload`);
        }}
        accessibilityRole="button"
        accessibilityLabel="Добавить видео для анализа"
      >
        <Ionicons name="add" size={26} color={colors.accent} />
      </Pressable>
    </View>
  );

  const handleAddPress = () => {
    triggerHaptic();
    id && router.push(`/player/${id}/video-analysis/upload`);
  };

  const handleItemPress = (itemId: string) => {
    triggerHaptic();
    id && router.push(`/player/${id}/video-analysis/${itemId}`);
  };

  return (
    <FlagshipScreen header={header}>
      <View style={styles.contentWrap}>
        {loading ? (
          <VideoAnalysisSkeleton />
        ) : (
          <>
            <Animated.View entering={screenReveal(0)}>
              <VideoAnalysisHeader playerName={PLAYER_MARK_GOLYSH.profile.fullName} />
            </Animated.View>
            {items.length === 0 ? (
              <Animated.View entering={screenReveal(STAGGER)}>
                <AnalysisEmptyState onPress={handleAddPress} />
              </Animated.View>
            ) : (
              items.map((item, idx) => (
                <Animated.View key={item.id} entering={screenReveal(STAGGER * (idx + 1))}>
                  <VideoAnalysisListItem
                    item={item}
                    summary={summaries[item.id]}
                    onPress={() => handleItemPress(item.id)}
                  />
                </Animated.View>
              ))
            )}
          </>
        )}
      </View>
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
  headerTitle: {
    fontSize: 18,
    fontWeight: "700",
    lineHeight: 22,
    color: "#ffffff",
  },
  addBtn: {
    width: 40,
    height: 40,
    alignItems: "center",
    justifyContent: "center",
  },
  contentWrap: { gap: 0 },
  skeletonContent: { gap: spacing.xl },
  skeletonHeader: { borderRadius: 20, marginBottom: spacing.sm },
  skeletonCard: { borderRadius: 20 },
});
