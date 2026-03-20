import { useState, useEffect, useCallback } from "react";
import {
  View,
  Text,
  FlatList,
  Pressable,
  RefreshControl,
  StyleSheet,
} from "react-native";
import Animated from "react-native-reanimated";
import { useRouter, useFocusEffect } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useAuth } from "@/context/AuthContext";
import {
  getConversations,
  COACH_MARK_ID,
} from "@/services/chatService";
import { FlagshipScreen } from "@/components/layout/FlagshipScreen";
import { SkeletonBlock } from "@/components/ui";
import { screenReveal, STAGGER } from "@/lib/animations";
import { triggerHaptic } from "@/lib/haptics";
import { trackCoachMarkEvent } from "@/lib/coachMarkAnalytics";
import { colors, spacing, typography, radius } from "@/constants/theme";
import type { ConversationItem } from "@/types/chat";

const PRESSED_OPACITY = 0.88;

function formatTime(iso: string): string {
  const d = new Date(iso);
  const now = new Date();
  const sameDay =
    d.getDate() === now.getDate() &&
    d.getMonth() === now.getMonth() &&
    d.getFullYear() === now.getFullYear();
  if (sameDay) {
    return d.toLocaleTimeString("ru-RU", { hour: "2-digit", minute: "2-digit" });
  }
  return d.toLocaleDateString("ru-RU", { day: "numeric", month: "short" });
}

function ChatListSkeleton() {
  return (
    <View style={styles.skeletonContent}>
      <SkeletonBlock height={88} style={styles.skeletonRow} />
      <SkeletonBlock height={88} style={styles.skeletonRow} />
      <SkeletonBlock height={88} style={styles.skeletonRow} />
      <SkeletonBlock height={88} style={styles.skeletonRow} />
      <SkeletonBlock height={88} style={styles.skeletonRow} />
    </View>
  );
}

export default function ChatTabScreen() {
  const { user } = useAuth();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const [conversations, setConversations] = useState<ConversationItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [loadError, setLoadError] = useState(false);

  const load = useCallback(async () => {
    if (!user?.id) return;
    setLoadError(false);
    try {
      const data = await getConversations(user.id);
      const coachMarkItem: ConversationItem = {
        id: COACH_MARK_ID,
        playerId: "",
        playerName: "AI-ассистент",
        coachId: COACH_MARK_ID,
        coachName: "Coach Mark",
        parentId: user.id,
        lastMessage: undefined,
        updatedAt: new Date().toISOString(),
      };
      setConversations([coachMarkItem, ...data]);
    } catch {
      setConversations([]);
      setLoadError(true);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [user?.id]);

  useFocusEffect(
    useCallback(() => {
      if (user?.id) load();
    }, [load, user?.id])
  );

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    load();
  }, [load]);

  const goToThread = (item: ConversationItem) => {
    triggerHaptic();
    if (item.id === COACH_MARK_ID) {
      trackCoachMarkEvent("coachmark_chat_open_from_list");
    }
    router.push(`/chat/${item.id}`);
  };

  if (!user?.id) {
    return (
      <FlagshipScreen scroll={false}>
        <View style={styles.heroSection}>
          <View style={styles.heroIconWrap}>
            <Ionicons name="chatbubbles-outline" size={28} color={colors.accent} />
          </View>
          <Text style={styles.heroTitle}>Чаты</Text>
          <Text style={styles.heroSub}>Coach Mark и диалоги с тренерами</Text>
        </View>
        <View style={styles.emptyContainer}>
          <View style={styles.emptyIconWrap}>
            <Ionicons name="person-outline" size={48} color={colors.textMuted} />
          </View>
          <Text style={styles.emptyTitle}>Требуется вход</Text>
          <Text style={styles.emptySub}>
            Авторизуйтесь, чтобы общаться с тренером
          </Text>
        </View>
      </FlagshipScreen>
    );
  }

  const header = (
    <View style={[styles.header, { paddingTop: insets.top + spacing.lg }]}>
      <View style={styles.heroIconWrap}>
        <Ionicons name="chatbubbles-outline" size={28} color={colors.accent} />
      </View>
      <Text style={styles.heroTitle}>Чаты</Text>
      <Text style={styles.heroSub}>Coach Mark и диалоги с тренерами</Text>
    </View>
  );

  if (loading) {
    return (
      <FlagshipScreen header={header} scroll={false}>
        <View style={styles.paddedContent}>
          <ChatListSkeleton />
        </View>
      </FlagshipScreen>
    );
  }

  if (loadError) {
    return (
      <FlagshipScreen header={header} scroll={false}>
        <View style={styles.errorContainer}>
          <Ionicons name="cloud-offline-outline" size={48} color={colors.textMuted} />
          <Text style={styles.errorTitle}>Не получилось загрузить чаты</Text>
          <Text style={styles.errorSub}>
            Проверьте подключение и попробуйте снова
          </Text>
          <Pressable
            style={({ pressed }) => [styles.retryBtn, pressed && { opacity: PRESSED_OPACITY }]}
            onPress={() => {
              triggerHaptic();
              setLoading(true);
              load();
            }}
          >
            <Text style={styles.retryBtnText}>Повторить</Text>
          </Pressable>
        </View>
      </FlagshipScreen>
    );
  }

  const listBottomPadding = spacing.xxl + insets.bottom + 60;

  return (
    <FlagshipScreen header={header} scroll={false}>
      <FlatList
        data={conversations}
        keyExtractor={(item) => item.id}
        contentContainerStyle={[
          styles.list,
          conversations.length === 0 ? styles.emptyList : {},
          { paddingBottom: listBottomPadding },
        ]}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor={colors.accent}
          />
        }
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <View style={styles.emptyIconWrap}>
              <Ionicons name="chatbubbles-outline" size={48} color={colors.textMuted} />
            </View>
            <Text style={styles.emptyTitle}>Чатов пока нет</Text>
            <Text style={styles.emptySub}>
              Начните с Coach Mark — задайте вопрос о развитии, упражнениях или советах
            </Text>
          </View>
        }
        renderItem={({ item, index }) => {
          const isCoachMark = item.id === COACH_MARK_ID;
          return (
            <Animated.View entering={screenReveal(STAGGER + index * 30)}>
              <Pressable
                style={({ pressed }) => [
                  styles.row,
                  isCoachMark && styles.rowCoachMark,
                  pressed && { opacity: PRESSED_OPACITY },
                ]}
                onPress={() => goToThread(item)}
              >
                <View style={[styles.avatarWrap, isCoachMark && styles.avatarCoachMark]}>
                  <Ionicons
                    name={isCoachMark ? "sparkles" : "person"}
                    size={24}
                    color={colors.accent}
                  />
                </View>
                <View style={styles.rowContent}>
                  <View style={styles.rowTitleRow}>
                    <Text style={[styles.coachName, isCoachMark && styles.coachNameCoachMark]}>
                      {item.coachName}
                    </Text>
                    {isCoachMark && (
                      <View style={styles.aiBadge}>
                        <Text style={styles.aiBadgeText}>AI</Text>
                      </View>
                    )}
                  </View>
                  <Text style={styles.playerName}>
                    {isCoachMark ? "Персональный хоккейный тренер" : item.playerName}
                  </Text>
                  {item.lastMessage ? (
                    <Text style={styles.preview} numberOfLines={1}>
                      {item.lastMessage}
                    </Text>
                  ) : null}
                </View>
                <Text style={styles.time}>{formatTime(item.updatedAt)}</Text>
                <Ionicons name="chevron-forward" size={20} color={colors.textMuted} />
              </Pressable>
            </Animated.View>
          );
        }}
      />
    </FlagshipScreen>
  );
}

const styles = StyleSheet.create({
  header: {
    paddingHorizontal: spacing.screenPadding,
    paddingVertical: spacing.lg,
    paddingBottom: spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: "rgba(255,255,255,0.06)",
  },
  heroSection: {
    paddingHorizontal: spacing.screenPadding,
    paddingTop: spacing.xl,
    paddingBottom: spacing.lg,
  },
  heroIconWrap: {
    width: 48,
    height: 48,
    borderRadius: radius.sm,
    backgroundColor: colors.accentSoft,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: spacing.md,
  },
  heroTitle: {
    ...typography.sectionTitle,
    color: colors.text,
    marginBottom: spacing.xs,
  },
  heroSub: {
    ...typography.caption,
    color: colors.textSecondary,
  },

  paddedContent: {
    flex: 1,
    paddingHorizontal: spacing.screenPadding,
    paddingTop: spacing.lg,
  },
  skeletonContent: { gap: spacing.md },
  skeletonRow: { borderRadius: radius.lg },

  errorContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    gap: spacing.lg,
  },
  errorTitle: { ...typography.h2, color: colors.text, textAlign: "center" },
  errorSub: {
    ...typography.bodySmall,
    color: colors.textSecondary,
    textAlign: "center",
    paddingHorizontal: spacing.xxl,
    marginBottom: spacing.lg,
  },
  retryBtn: {
    backgroundColor: colors.accent,
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.xxl,
    borderRadius: 14,
  },
  retryBtnText: { fontSize: 16, fontWeight: "600", color: colors.onAccent },

  list: {
    paddingHorizontal: spacing.screenPadding,
  },
  emptyList: { flexGrow: 1 },
  row: {
    flexDirection: "row",
    alignItems: "center",
    padding: spacing.lg,
    marginBottom: spacing.sm,
    backgroundColor: colors.surfaceLevel1,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.surfaceLevel1Border,
  },
  rowCoachMark: {
    backgroundColor: "rgba(59,130,246,0.08)",
    borderColor: "rgba(59,130,246,0.25)",
    borderLeftWidth: 3,
    borderLeftColor: colors.accent,
  },
  avatarWrap: {
    width: 52,
    height: 52,
    borderRadius: 26,
    backgroundColor: colors.accentSoft,
    alignItems: "center",
    justifyContent: "center",
    marginRight: spacing.lg,
  },
  avatarCoachMark: {
    backgroundColor: "rgba(59,130,246,0.25)",
  },
  rowContent: { flex: 1, minWidth: 0 },
  rowTitleRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
    flexWrap: "wrap",
  },
  coachName: {
    ...typography.cardTitle,
    color: colors.text,
  },
  coachNameCoachMark: {
    color: colors.accentBright,
  },
  aiBadge: {
    paddingHorizontal: spacing.sm,
    paddingVertical: 2,
    borderRadius: 6,
    backgroundColor: "rgba(59,130,246,0.2)",
  },
  aiBadgeText: {
    fontSize: 10,
    fontWeight: "700",
    color: colors.accentBright,
    letterSpacing: 0.5,
  },
  playerName: {
    ...typography.caption,
    color: colors.textSecondary,
    marginTop: spacing.xs,
  },
  preview: {
    ...typography.bodySmall,
    color: colors.textMuted,
    marginTop: spacing.xs,
    lineHeight: 20,
  },
  time: {
    ...typography.caption,
    color: colors.textMuted,
    marginRight: spacing.sm,
  },

  emptyContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    paddingVertical: spacing.xxxl,
  },
  emptyIconWrap: {
    width: 88,
    height: 88,
    borderRadius: 44,
    backgroundColor: colors.surfaceLevel2,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: spacing.xl,
  },
  emptyTitle: {
    ...typography.h2,
    color: colors.text,
    textAlign: "center",
    marginBottom: spacing.sm,
  },
  emptySub: {
    ...typography.bodySmall,
    color: colors.textSecondary,
    textAlign: "center",
    paddingHorizontal: spacing.xxl,
  },
});
