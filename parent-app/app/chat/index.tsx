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
import { useRouter } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { useAuth } from "@/context/AuthContext";
import { getConversations } from "@/services/chatService";
import { FlagshipScreen } from "@/components/layout/FlagshipScreen";
import { SkeletonBlock, ErrorStateView, EmptyStateView } from "@/components/ui";
import { screenReveal, STAGGER } from "@/lib/animations";
import { triggerHaptic } from "@/lib/haptics";
import { ScreenHeader } from "@/components/navigation/ScreenHeader";
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
    </View>
  );
}

export default function ChatListScreen() {
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
      setConversations(data);
    } catch {
      setConversations([]);
      setLoadError(true);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [user?.id]);

  useEffect(() => {
    load();
  }, [load]);

  const goToThread = (item: ConversationItem) => {
    triggerHaptic();
    router.push(`/chat/${item.id}`);
  };

  if (!user?.id) {
    return (
      <FlagshipScreen scroll={false}>
        <EmptyStateView
          icon="person-outline"
          title="Требуется вход"
          subtitle="Авторизуйтесь для общения"
          style={styles.emptyWrap}
        />
      </FlagshipScreen>
    );
  }

  const header = (
    <ScreenHeader
      title="Чат с тренером"
      subtitle="Диалоги с тренерами ваших игроков"
    />
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

  const handleRetry = useCallback(() => {
    setLoading(true);
    load();
  }, [load]);

  if (loadError) {
    return (
      <FlagshipScreen header={header} scroll={false}>
        <ErrorStateView
          variant="network"
          title="Не удалось загрузить чаты"
          subtitle="Проверьте подключение и попробуйте снова"
          onAction={handleRetry}
          style={styles.errorWrap}
        />
      </FlagshipScreen>
    );
  }

  const listBottomPadding = spacing.xxl + insets.bottom;

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
            onRefresh={() => {
              setRefreshing(true);
              load();
            }}
            tintColor={colors.accent}
          />
        }
        ListEmptyComponent={
          <EmptyStateView
            icon="chatbubbles-outline"
            title="Чатов пока нет"
            subtitle="Откройте профиль игрока и нажмите «Чат с тренером»"
            style={styles.emptyWrap}
          />
        }
        renderItem={({ item, index }) => (
          <Animated.View entering={screenReveal(STAGGER + index * 30)}>
            <Pressable
              style={({ pressed }) => [styles.row, pressed && { opacity: PRESSED_OPACITY }]}
              onPress={() => goToThread(item)}
            >
              <View style={styles.avatarWrap}>
                <Ionicons name="person" size={24} color={colors.accent} />
              </View>
              <View style={styles.rowContent}>
                <Text style={styles.coachName}>{item.coachName}</Text>
                <Text style={styles.playerName}>{item.playerName}</Text>
                {item.lastMessage ? (
                  <Text style={styles.preview} numberOfLines={1}>{item.lastMessage}</Text>
                ) : null}
              </View>
              <Text style={styles.time}>{formatTime(item.updatedAt)}</Text>
              <Ionicons name="chevron-forward" size={20} color={colors.textMuted} />
            </Pressable>
          </Animated.View>
        )}
      />
    </FlagshipScreen>
  );
}

const styles = StyleSheet.create({
  paddedContent: { flex: 1, paddingHorizontal: spacing.screenPadding, paddingTop: spacing.lg },
  skeletonContent: { gap: spacing.md },
  skeletonRow: { borderRadius: radius.lg },
  errorWrap: { flex: 1 },
  emptyWrap: { flex: 1, justifyContent: "center" },
  list: { paddingHorizontal: spacing.screenPadding },
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
  avatarWrap: {
    width: 52,
    height: 52,
    borderRadius: 26,
    backgroundColor: colors.accentSoft,
    alignItems: "center",
    justifyContent: "center",
    marginRight: spacing.lg,
  },
  rowContent: { flex: 1, minWidth: 0 },
  coachName: { ...typography.cardTitle, color: colors.text },
  playerName: { ...typography.caption, color: colors.textSecondary, marginTop: spacing.xs },
  preview: { ...typography.bodySmall, color: colors.textMuted, marginTop: spacing.xs },
  time: { ...typography.caption, color: colors.textMuted, marginRight: spacing.sm },
});
