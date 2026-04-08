import React, { useCallback, useEffect, useState } from "react";
import { View, Text, Pressable, StyleSheet, ScrollView, ActivityIndicator } from "react-native";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useAuth } from "@/context/AuthContext";
import { FlagshipScreen } from "@/components/layout/FlagshipScreen";
import { ScreenHeader } from "@/components/navigation/ScreenHeader";
import { ErrorStateView, EmptyStateView } from "@/components/ui";
import { hrefMessengerThread } from "@/lib/parentMessagingDeepLinks";
import { triggerHaptic } from "@/lib/haptics";
import {
  fetchTeamParentsList,
  postParentDirectOpen,
  type TeamParentMemberRow,
} from "@/services/parentMessengerService";
import { colors, spacing, typography, radius, feedback } from "@/constants/theme";

export default function TeamParentsListScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { user } = useAuth();
  const { teamId: teamIdParam } = useLocalSearchParams<{ teamId?: string }>();
  const teamId =
    typeof teamIdParam === "string" && teamIdParam.trim()
      ? teamIdParam.trim()
      : "";

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [teamName, setTeamName] = useState("");
  const [members, setMembers] = useState<TeamParentMemberRow[]>([]);

  const load = useCallback(async () => {
    if (!user?.id || !teamId) {
      setLoading(false);
      return;
    }
    setLoading(true);
    setError(false);
    const data = await fetchTeamParentsList(user.id, teamId);
    if (!data) {
      setMembers([]);
      setError(true);
    } else {
      setTeamName(data.team.name);
      setMembers(data.members);
    }
    setLoading(false);
  }, [user?.id, teamId]);

  useEffect(() => {
    void load();
  }, [load]);

  const openChat = useCallback(
    async (m: TeamParentMemberRow) => {
      if (!user?.id || !teamId || m.isSelf || !m.canMessage) return;
      triggerHaptic();
      if (m.existingConversationId) {
        router.push(
          hrefMessengerThread(m.existingConversationId, {
            threadTitle: m.displayName,
            threadSubtitle: m.relationLabel ?? teamName,
            peerLayout: true,
            teamId,
          }) as never
        );
        return;
      }
      const res = await postParentDirectOpen(user.id, m.parentId, teamId);
      if (!res?.conversationId) return;
      router.push(
        hrefMessengerThread(res.conversationId, {
          threadTitle: m.displayName,
          threadSubtitle: m.relationLabel ?? teamName,
          peerLayout: true,
          teamId,
        }) as never
      );
    },
    [router, teamId, teamName, user?.id]
  );

  if (!user?.id || !teamId) {
    return (
      <FlagshipScreen scroll={false}>
        <ScreenHeader title="Родители" onBack={() => router.back()} />
        <View style={styles.center}>
          <Text style={styles.muted}>Некорректная ссылка</Text>
        </View>
      </FlagshipScreen>
    );
  }

  return (
    <FlagshipScreen scroll={false}>
      <ScreenHeader title="Родители команды" subtitle={teamName} onBack={() => router.back()} />
      {loading ? (
        <View style={styles.center}>
          <ActivityIndicator color={colors.accent} />
        </View>
      ) : error ? (
        <View style={styles.padded}>
          <ErrorStateView
            variant="network"
            title="Не удалось загрузить список"
            onAction={load}
          />
        </View>
      ) : members.length === 0 ? (
        <View style={styles.padded}>
          <EmptyStateView
            icon="people-outline"
            title="В команде пока нет других родителей"
            subtitle="Когда появятся другие родители, вы сможете написать им из этого списка"
          />
        </View>
      ) : (
        <ScrollView
          contentContainerStyle={[
            styles.list,
            { paddingBottom: insets.bottom + spacing.xxl },
          ]}
          showsVerticalScrollIndicator={false}
        >
          {members.map((m) => (
            <View key={m.parentId} style={styles.row}>
              <View style={styles.rowMain}>
                <Text style={styles.name}>{m.displayName}</Text>
                <Text style={styles.sub}>
                  {m.relationLabel ||
                    m.childrenInTeam.map((c) => c.name).join(", ") ||
                    "Родитель"}
                </Text>
              </View>
              {m.isSelf ? (
                <Text style={styles.selfLabel}>Это вы</Text>
              ) : (
                <Pressable
                  onPress={() => void openChat(m)}
                  style={({ pressed }) => [
                    styles.cta,
                    pressed && { opacity: feedback.pressedOpacity },
                  ]}
                >
                  <Text style={styles.ctaText}>
                    {m.existingConversationId ? "Открыть чат" : "Написать"}
                  </Text>
                </Pressable>
              )}
            </View>
          ))}
        </ScrollView>
      )}
    </FlagshipScreen>
  );
}

const styles = StyleSheet.create({
  center: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    padding: spacing.xl,
  },
  padded: {
    flex: 1,
    padding: spacing.screenPadding,
    justifyContent: "center",
  },
  muted: {
    ...typography.body,
    color: colors.textMuted,
  },
  list: {
    paddingHorizontal: spacing.screenPadding,
    paddingTop: spacing.md,
    gap: spacing.sm,
  },
  row: {
    flexDirection: "row",
    alignItems: "center",
    padding: spacing.lg,
    backgroundColor: colors.surfaceLevel1,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.border,
    marginBottom: spacing.sm,
  },
  rowMain: {
    flex: 1,
  },
  name: {
    ...typography.body,
    fontWeight: "700",
    color: colors.textPrimary,
  },
  sub: {
    ...typography.captionSmall,
    color: colors.textMuted,
    marginTop: 4,
  },
  selfLabel: {
    ...typography.captionSmall,
    color: colors.textMuted,
  },
  cta: {
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.md,
    backgroundColor: colors.accentSoft,
    borderRadius: radius.md,
  },
  ctaText: {
    fontSize: 14,
    fontWeight: "700",
    color: colors.accent,
  },
});
