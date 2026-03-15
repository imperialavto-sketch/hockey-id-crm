import React, { useState, useEffect, useCallback } from "react";
import { View, Text, ScrollView, Pressable, StyleSheet } from "react-native";
import { useRouter } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { useAuth } from "@/context/AuthContext";
import { getTeamMembers } from "@/services/teamService";
import { MOCK_TEAM_NAME } from "@/constants/mockTeamPosts";
import { TeamHeader } from "@/components/team/TeamHeader";
import { TeamMemberCard } from "@/components/team/TeamMemberCard";
import { FlagshipScreen } from "@/components/layout/FlagshipScreen";
import { ErrorStateView, EmptyStateView, SkeletonBlock } from "@/components/ui";
import { triggerHaptic } from "@/lib/haptics";
import { colors, spacing, typography, radius } from "@/constants/theme";

const PRESSED_OPACITY = 0.88;

function MembersSkeleton() {
  return (
    <View style={styles.skeletonContent}>
      <SkeletonBlock height={72} style={styles.skeletonHeader} />
      <SkeletonBlock height={24} style={styles.skeletonSectionTitle} />
      <View style={styles.skeletonGrid}>
        <SkeletonBlock height={100} style={styles.skeletonCard} />
        <SkeletonBlock height={100} style={styles.skeletonCard} />
      </View>
      <SkeletonBlock height={24} style={styles.skeletonSectionTitle} />
      <View style={styles.skeletonGrid}>
        <SkeletonBlock height={100} style={styles.skeletonCard} />
        <SkeletonBlock height={100} style={styles.skeletonCard} />
      </View>
    </View>
  );
}

export default function TeamMembersScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { user } = useAuth();
  const [members, setMembers] = useState<Awaited<ReturnType<typeof getTeamMembers>>>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    setError(false);
    try {
      const data = await getTeamMembers(user?.id);
      setMembers(data);
    } catch {
      setMembers([]);
      setError(true);
    } finally {
      setLoading(false);
    }
  }, [user?.id]);

  useEffect(() => {
    load();
  }, [load]);

  const coaches = members.filter(
    (m) => m.role === "coach" || m.role === "assistant_coach"
  );
  const parents = members.filter((m) => m.role === "parent");
  const hasAny = coaches.length > 0 || parents.length > 0;

  const header = (
    <View style={[styles.header, { paddingTop: insets.top + spacing.lg }]}>
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
      <View style={styles.headerCenter}>
        <Text style={styles.headerTitle}>Участники</Text>
        <Text style={styles.headerSub}>Команда</Text>
      </View>
    </View>
  );

  if (loading) {
    return (
      <FlagshipScreen header={header} scroll={false}>
        <View style={styles.skeletonWrap}>
          <MembersSkeleton />
        </View>
      </FlagshipScreen>
    );
  }

  if (error) {
    return (
      <FlagshipScreen header={header} scroll={false}>
        <ErrorStateView
          variant="network"
          title="Не удалось загрузить участников"
          subtitle="Проверьте подключение и попробуйте снова"
          onAction={load}
          style={styles.errorWrap}
        />
      </FlagshipScreen>
    );
  }

  return (
    <FlagshipScreen header={header} scroll={false}>
      <ScrollView
        style={styles.scroll}
        contentContainerStyle={[styles.scrollContent, { paddingBottom: spacing.xxl + insets.bottom }]}
        showsVerticalScrollIndicator={false}
      >
        <TeamHeader teamName={MOCK_TEAM_NAME} subtitle="Участники команды" />

        {!hasAny ? (
          <EmptyStateView
            icon="people-outline"
            title="Пока нет участников"
            subtitle="Тренеры и родители команды появятся в этом разделе"
            style={styles.emptyWrap}
          />
        ) : (
          <>
            <Text style={styles.sectionTitle}>Тренеры</Text>
            <View style={styles.grid}>
              {coaches.length > 0 ? (
                coaches.map((m) => <TeamMemberCard key={m.id} member={m} />)
              ) : (
                <View style={styles.emptyRole}>
                  <Text style={styles.emptyRoleText}>Нет тренеров в списке</Text>
                </View>
              )}
            </View>

            <Text style={styles.sectionTitle}>Родители</Text>
            <View style={styles.grid}>
              {parents.length > 0 ? (
                parents.map((m) => <TeamMemberCard key={m.id} member={m} />)
              ) : (
                <View style={styles.emptyRole}>
                  <Text style={styles.emptyRoleText}>Нет родителей в списке</Text>
                </View>
              )}
            </View>
          </>
        )}
      </ScrollView>
    </FlagshipScreen>
  );
}

const styles = StyleSheet.create({
  header: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: spacing.screenPadding,
    paddingVertical: spacing.sm,
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
  headerCenter: { flex: 1, marginLeft: spacing.sm },
  headerTitle: {
    ...typography.sectionTitle,
    color: colors.textPrimary,
  },
  headerSub: {
    ...typography.caption,
    color: colors.textMuted,
    marginTop: 2,
  },
  scroll: { flex: 1 },
  scrollContent: { paddingBottom: spacing.xl },
  sectionTitle: {
    ...typography.sectionTitle,
    color: colors.textPrimary,
    marginHorizontal: spacing.screenPadding,
    marginBottom: spacing.lg,
    marginTop: spacing.lg,
  },
  grid: {
    flexDirection: "row",
    flexWrap: "wrap",
    justifyContent: "space-between",
    paddingHorizontal: spacing.screenPadding,
    marginBottom: spacing.xxl,
  },
  emptyWrap: {
    paddingVertical: spacing.xxl,
  },
  emptyRole: {
    width: "100%",
    padding: spacing.lg,
  },
  emptyRoleText: {
    ...typography.caption,
    color: colors.textMuted,
  },
  errorWrap: { flex: 1 },
  skeletonWrap: { flex: 1 },
  skeletonContent: {
    paddingHorizontal: spacing.screenPadding,
    gap: spacing.lg,
  },
  skeletonHeader: {
    height: 72,
    borderRadius: radius.lg,
    marginBottom: spacing.sm,
  },
  skeletonSectionTitle: {
    height: 24,
    width: 120,
    borderRadius: radius.sm,
  },
  skeletonGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    justifyContent: "space-between",
    gap: spacing.md,
  },
  skeletonCard: {
    width: "47%",
    height: 100,
    borderRadius: radius.lg,
  },
});
