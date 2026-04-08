/**
 * PHASE 3: Team hub links into **canonical chat** via `parentMessengerService` (resolves `ChatConversation` ids) — not `teamService` stub messages.
 */
import React, { useCallback, useEffect, useState } from "react";
import { View, Text, Pressable, StyleSheet, ActivityIndicator } from "react-native";
import { useLocalSearchParams, useRouter, useFocusEffect } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { useAuth } from "@/context/AuthContext";
import { FlagshipScreen } from "@/components/layout/FlagshipScreen";
import { ScreenHeader } from "@/components/navigation/ScreenHeader";
import { ErrorStateView } from "@/components/ui";
import { hrefMessengerThread } from "@/lib/parentMessagingDeepLinks";
import { triggerHaptic } from "@/lib/haptics";
import {
  fetchParentTeams,
  fetchTeamAnnouncementChannelId,
  fetchTeamParentChannelId,
} from "@/services/parentMessengerService";
import { colors, spacing, typography, radius, feedback } from "@/constants/theme";
import { CHAT_INBOX_COPY } from "@/lib/parentChatInboxUi";

export default function TeamCommunicationHubScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { user } = useAuth();
  const { teamId: teamIdParam } = useLocalSearchParams<{ teamId?: string }>();
  const teamId =
    typeof teamIdParam === "string" && teamIdParam.trim()
      ? teamIdParam.trim()
      : "";

  const [teamName, setTeamName] = useState<string>("Команда");
  const [loadingMeta, setLoadingMeta] = useState(true);
  const [metaError, setMetaError] = useState(false);

  const loadMeta = useCallback(async () => {
    if (!user?.id || !teamId) {
      setLoadingMeta(false);
      return;
    }
    setLoadingMeta(true);
    setMetaError(false);
    try {
      const teams = await fetchParentTeams(user.id);
      const t = teams.find((x) => x.id === teamId);
      if (t) setTeamName(t.name);
      else setMetaError(true);
    } catch {
      setMetaError(true);
    } finally {
      setLoadingMeta(false);
    }
  }, [user?.id, teamId]);

  useEffect(() => {
    void loadMeta();
  }, [loadMeta]);

  const openParentChannel = useCallback(async () => {
    if (!user?.id || !teamId) return;
    triggerHaptic();
    const cid = await fetchTeamParentChannelId(user.id, teamId);
    if (!cid) return;
    router.push(
      hrefMessengerThread(cid, {
        threadTitle: CHAT_INBOX_COPY.teamParentChannelThreadTitle,
        threadSubtitle: teamName,
        peerLayout: true,
        teamId,
        teamParentChat: true,
      }) as never
    );
  }, [router, teamId, teamName, user?.id]);

  const openAnnouncementChannel = useCallback(async () => {
    if (!user?.id || !teamId) return;
    triggerHaptic();
    const cid = await fetchTeamAnnouncementChannelId(user.id, teamId);
    if (!cid) return;
    router.push(
      hrefMessengerThread(cid, {
        threadTitle: "Объявления",
        threadSubtitle: teamName,
        readOnly: true,
        teamId,
        announcementChannel: true,
      }) as never
    );
  }, [router, teamId, teamName, user?.id]);

  if (!user?.id) {
    return (
      <FlagshipScreen scroll={false}>
        <ScreenHeader title="Связь" onBack={() => router.back()} />
        <View style={styles.center}>
          <Text style={styles.muted}>Войдите в аккаунт</Text>
        </View>
      </FlagshipScreen>
    );
  }

  useFocusEffect(
    useCallback(() => {
      if (!user?.id || teamId) return;
      router.replace("/team/select-team" as never);
    }, [user?.id, teamId, router])
  );

  if (!teamId) {
    return (
      <FlagshipScreen scroll={false}>
        <ScreenHeader title="Связь" onBack={() => router.back()} />
        <View style={styles.center}>
          <ActivityIndicator color={colors.accent} />
        </View>
      </FlagshipScreen>
    );
  }

  return (
    <FlagshipScreen scroll={false}>
      <ScreenHeader title="Связь в команде" subtitle={teamName} onBack={() => router.back()} />
      <View style={[styles.body, { paddingBottom: insets.bottom + spacing.lg }]}>
        {loadingMeta ? (
          <View style={styles.center}>
            <ActivityIndicator color={colors.accent} />
          </View>
        ) : metaError ? (
          <ErrorStateView
            variant="network"
            title="Нет доступа к команде"
            subtitle="Проверьте, что ребёнок привязан к этой команде"
            onAction={loadMeta}
          />
        ) : (
          <View style={styles.cards}>
            <HubCard
              icon="people-outline"
              title="Родители"
              subtitle="Написать родителю из вашей команды"
              onPress={() => {
                triggerHaptic();
                router.push(`/team/parents?teamId=${encodeURIComponent(teamId)}` as never);
              }}
            />
            <HubCard
              icon="chatbubbles-outline"
              title={CHAT_INBOX_COPY.teamParentChannelThreadTitle}
              subtitle="Общий чат для родителей команды"
              onPress={() => void openParentChannel()}
            />
            <HubCard
              icon="megaphone-outline"
              title="Объявления"
              subtitle="Канал объявлений (скоро сообщения от тренера)"
              onPress={() => void openAnnouncementChannel()}
            />
            <HubCard
              icon="mail-outline"
              title="Мои диалоги"
              subtitle="Все переписки в разделе «Чат»"
              onPress={() => {
                triggerHaptic();
                router.push("/(tabs)/chat" as never);
              }}
            />
          </View>
        )}
      </View>
    </FlagshipScreen>
  );
}

function HubCard({
  icon,
  title,
  subtitle,
  onPress,
}: {
  icon: keyof typeof Ionicons.glyphMap;
  title: string;
  subtitle: string;
  onPress: () => void;
}) {
  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [styles.card, pressed && { opacity: feedback.pressedOpacity }]}
    >
      <Ionicons name={icon} size={22} color={colors.accent} />
      <View style={styles.cardText}>
        <Text style={styles.cardTitle}>{title}</Text>
        <Text style={styles.cardSub}>{subtitle}</Text>
      </View>
      <Ionicons name="chevron-forward" size={20} color={colors.textMuted} />
    </Pressable>
  );
}

const styles = StyleSheet.create({
  body: {
    flex: 1,
    paddingHorizontal: spacing.screenPadding,
    paddingTop: spacing.md,
  },
  center: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    padding: spacing.xl,
  },
  muted: {
    ...typography.body,
    color: colors.textMuted,
  },
  cards: {
    gap: spacing.md,
  },
  card: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.md,
    padding: spacing.lg,
    backgroundColor: colors.surfaceLevel1,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.border,
  },
  cardText: {
    flex: 1,
  },
  cardTitle: {
    ...typography.body,
    fontWeight: "700",
    color: colors.textPrimary,
  },
  cardSub: {
    ...typography.captionSmall,
    color: colors.textMuted,
    marginTop: 4,
  },
});
