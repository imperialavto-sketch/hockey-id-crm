/**
 * Team hub — coach-first управление составом и группами.
 */

import React, { useCallback, useMemo, useState } from "react";
import { ActivityIndicator, Pressable, StyleSheet, Text, View } from "react-native";
import { useFocusEffect, useLocalSearchParams, useRouter } from "expo-router";
import { getParamId } from "@/lib/params";
import { ScreenContainer } from "@/components/layout/ScreenContainer";
import { SectionCard } from "@/components/ui/SectionCard";
import { PrimaryButton } from "@/components/ui/PrimaryButton";
import { DashboardSection } from "@/components/dashboard/DashboardSection";
import { StaggerFadeIn } from "@/components/dashboard/StaggerFadeIn";
import { TeamDetailHero } from "@/components/team-detail/TeamDetailHero";
import { TeamScheduleAttendanceBanner } from "@/components/team/TeamScheduleAttendanceBanner";
import { CoachGroupFormModal } from "@/components/team/CoachGroupFormModal";
import { AssignGroupSheet } from "@/components/team/AssignGroupSheet";
import { isAuthRequiredError } from "@/lib/coachAuth";
import { theme } from "@/constants/theme";
import type { TeamDetailData } from "@/constants/teamDetailData";
import { getCoachPlayers, type CoachPlayerItem } from "@/services/coachPlayersService";
import { getCoachTeamDetail, type CoachTeamDetail } from "@/services/coachTeamsService";
import { listCoachTeamGroups, type CoachTeamGroupListItem } from "@/services/coachTeamGroupsService";

function mapToTeamDetailData(d: CoachTeamDetail): TeamDetailData {
  return {
    id: d.id,
    name: d.name,
    level: d.level,
    playerCount: d.playerCount,
    nextSession: d.nextSession ?? {
      date: "—",
      time: "—",
      venue: "—",
      confirmed: 0,
      expected: d.playerCount,
    },
    attendance: d.attendance,
    rosterHighlights: d.roster.map((r) => ({
      id: r.id,
      name: r.name,
      number: r.number,
      position: r.position,
    })),
    announcements: [],
    recentActivity: [],
  };
}

export default function TeamHubScreen() {
  const params = useLocalSearchParams<{ id: string }>();
  const id = getParamId(params.id);
  const router = useRouter();

  const [team, setTeam] = useState<CoachTeamDetail | null>(null);
  const [players, setPlayers] = useState<CoachPlayerItem[]>([]);
  const [teamGroups, setTeamGroups] = useState<CoachTeamGroupListItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [createGroupOpen, setCreateGroupOpen] = useState(false);
  const [assignPlayerId, setAssignPlayerId] = useState<string | null>(null);

  const reloadAll = useCallback(() => {
    if (!id) return;
    setLoading(true);
    setError(null);
    Promise.all([getCoachTeamDetail(id), listCoachTeamGroups(id), getCoachPlayers(id)])
      .then(([teamRes, groupsRes, playersRes]) => {
        setTeam(teamRes ?? null);
        setTeamGroups(groupsRes ?? []);
        setPlayers(playersRes ?? []);
        if (!teamRes) {
          setError("Команда не найдена");
        }
      })
      .catch((err) => {
        setTeam(null);
        setPlayers([]);
        setTeamGroups([]);
        setError(
          isAuthRequiredError(err)
            ? "Требуется авторизация"
            : err instanceof Error
              ? err.message
              : "Не удалось загрузить команду"
        );
      })
      .finally(() => setLoading(false));
  }, [id]);

  useFocusEffect(
    useCallback(() => {
      if (!id) {
        setLoading(false);
        setTeam(null);
        return;
      }
      reloadAll();
    }, [id, reloadAll])
  );

  const groupsById = useMemo(() => {
    const m = new Map<string, CoachTeamGroupListItem>();
    for (const g of teamGroups) m.set(g.id, g);
    return m;
  }, [teamGroups]);

  const ungroupedPlayers = useMemo(
    () => players.filter((p) => !p.groupId?.trim()),
    [players]
  );
  const selectedPlayer = useMemo(
    () => players.find((p) => p.id === assignPlayerId) ?? null,
    [players, assignPlayerId]
  );

  const groupedPlayersCount = useMemo(
    () => players.filter((p) => p.groupId?.trim()).length,
    [players]
  );

  if (!id) {
    return (
      <ScreenContainer>
        <View style={styles.center}>
          <Text style={styles.errorText}>Команда не найдена</Text>
          <PrimaryButton title="К списку команд" onPress={() => router.back()} />
        </View>
      </ScreenContainer>
    );
  }

  if (loading) {
    return (
      <ScreenContainer>
        <View style={styles.center}>
          <ActivityIndicator color={theme.colors.primary} />
          <Text style={styles.muted}>Загрузка…</Text>
        </View>
      </ScreenContainer>
    );
  }

  if (error || !team) {
    return (
      <ScreenContainer>
        <View style={styles.center}>
          <Text style={styles.errorText}>{error ?? "Команда не найдена"}</Text>
          <PrimaryButton title="Повторить" variant="outline" onPress={reloadAll} />
        </View>
      </ScreenContainer>
    );
  }

  const teamData = mapToTeamDetailData(team);

  return (
    <ScreenContainer contentContainerStyle={styles.content}>
      <StaggerFadeIn delay={0}>
        <TeamDetailHero team={teamData} />
      </StaggerFadeIn>

      <StaggerFadeIn delay={40}>
        <TeamScheduleAttendanceBanner
          onOpenSchedule={() =>
            router.push("/schedule" as Parameters<typeof router.push>[0])
          }
        />
      </StaggerFadeIn>

      <StaggerFadeIn delay={70}>
        <DashboardSection title="Группы команды">
          <SectionCard elevated>
            <View style={styles.overviewRow}>
              <View style={styles.overviewCell}>
                <Text style={styles.overviewLabel}>Групп</Text>
                <Text style={styles.overviewValue}>{teamGroups.length}</Text>
              </View>
              <View style={styles.overviewDivider} />
              <View style={styles.overviewCell}>
                <Text style={styles.overviewLabel}>В группах</Text>
                <Text style={styles.overviewValue}>{groupedPlayersCount}</Text>
              </View>
              <View style={styles.overviewDivider} />
              <View style={styles.overviewCell}>
                <Text style={styles.overviewLabel}>Без группы</Text>
                <Text
                  style={[
                    styles.overviewValue,
                    ungroupedPlayers.length > 0 && { color: theme.colors.warning },
                  ]}
                >
                  {ungroupedPlayers.length}
                </Text>
              </View>
            </View>

            {teamGroups.length === 0 ? (
              <Text style={styles.emptyHint}>Пока нет групп — создайте первую.</Text>
            ) : (
              <View style={styles.groupList}>
                {teamGroups
                  .slice()
                  .sort((a, b) => {
                    if (b.playersCount !== a.playersCount) return b.playersCount - a.playersCount;
                    return a.name.localeCompare(b.name, "ru");
                  })
                  .map((g) => (
                    <Pressable
                      key={g.id}
                      style={({ pressed }) => [styles.groupCard, pressed && styles.pressed]}
                      onPress={() =>
                        router.push(`/team/${id}/group/${g.id}` as Parameters<typeof router.push>[0])
                      }
                    >
                      <View style={[styles.groupAccent, { backgroundColor: g.color || theme.colors.primary }]} />
                      <View style={styles.groupBody}>
                        <View style={styles.groupTitleRow}>
                          <Text style={styles.groupName}>{g.name}</Text>
                          <View style={styles.levelPill}>
                            <Text style={styles.levelPillText}>L{Math.max(1, Number(g.level ?? 1))}</Text>
                          </View>
                        </View>
                        <Text style={styles.groupMeta}>{g.playersCount} игроков</Text>
                      </View>
                      <Text style={styles.arrow}>→</Text>
                    </Pressable>
                  ))}
              </View>
            )}

            <PrimaryButton
              title="+ Создать группу"
              variant="outline"
              onPress={() => setCreateGroupOpen(true)}
              style={styles.createBtn}
            />
          </SectionCard>
        </DashboardSection>
      </StaggerFadeIn>

      <StaggerFadeIn delay={110}>
        <DashboardSection title="Состав и распределение">
          <SectionCard elevated>
            {ungroupedPlayers.length > 0 ? (
              <View style={styles.signalWarn}>
                <Text style={styles.signalWarnText}>
                  Без группы: {ungroupedPlayers.length}. Добавьте в сегменты для точного планирования.
                </Text>
              </View>
            ) : (
              <View style={styles.signalOk}>
                <Text style={styles.signalOkText}>Весь состав распределен по группам.</Text>
              </View>
            )}

            {players.length === 0 ? (
              <Text style={styles.emptyHint}>Состав команды пока пуст.</Text>
            ) : (
              players.map((p) => {
                const g = p.groupId ? groupsById.get(p.groupId) : undefined;
                const groupName = g?.name || p.groupName || "Без группы";
                const groupColor = g?.color || null;
                const isUngrouped = !p.groupId;
                return (
                  <View key={p.id} style={styles.playerRow}>
                    <Pressable
                      style={styles.playerMain}
                      onPress={() => router.push(`/player/${p.id}` as Parameters<typeof router.push>[0])}
                    >
                      <Text style={styles.playerName}>{p.name}</Text>
                      <Text style={styles.playerSub}>{p.position || "Игрок"}</Text>
                    </Pressable>
                    <View
                      style={[
                        styles.playerGroupPill,
                        isUngrouped
                          ? styles.playerGroupPillWarn
                          : { borderColor: groupColor || theme.colors.border },
                      ]}
                    >
                      {!isUngrouped ? (
                        <View style={[styles.playerGroupDot, { backgroundColor: groupColor || theme.colors.primary }]} />
                      ) : null}
                      <Text
                        style={[
                          styles.playerGroupText,
                          isUngrouped && { color: theme.colors.warning, fontWeight: "700" },
                        ]}
                      >
                        {groupName}
                      </Text>
                    </View>
                    <Pressable
                      style={({ pressed }) => [styles.moveBtn, pressed && styles.pressed]}
                      onPress={() => setAssignPlayerId(p.id)}
                    >
                      <Text style={styles.moveBtnText}>Перевести</Text>
                    </Pressable>
                  </View>
                );
              })
            )}
          </SectionCard>
        </DashboardSection>
      </StaggerFadeIn>

      <CoachGroupFormModal
        visible={createGroupOpen}
        onClose={() => setCreateGroupOpen(false)}
        teamId={id}
        editGroup={null}
        onSaved={reloadAll}
      />

      <AssignGroupSheet
        visible={assignPlayerId !== null}
        onClose={() => setAssignPlayerId(null)}
        teamId={id}
        playerId={assignPlayerId ?? ""}
        playerName={selectedPlayer?.name ?? null}
        currentGroupId={selectedPlayer?.groupId ?? null}
        currentGroupName={selectedPlayer?.groupName ?? null}
        onAssigned={reloadAll}
      />
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  content: { paddingBottom: theme.spacing.xxl },
  center: { paddingVertical: theme.spacing.xxl, alignItems: "center", gap: theme.spacing.md },
  muted: { ...theme.typography.body, color: theme.colors.textMuted },
  errorText: { ...theme.typography.body, color: theme.colors.error, textAlign: "center" },
  pressed: { opacity: 0.85 },
  overviewRow: { flexDirection: "row", alignItems: "center", marginBottom: theme.spacing.md },
  overviewCell: { flex: 1, alignItems: "center" },
  overviewDivider: { width: 1, height: 30, backgroundColor: theme.colors.border },
  overviewLabel: {
    ...theme.typography.caption,
    color: theme.colors.textMuted,
    textTransform: "uppercase",
    letterSpacing: 0.35,
  },
  overviewValue: { ...theme.typography.subtitle, marginTop: 2, color: theme.colors.text },
  emptyHint: { ...theme.typography.body, color: theme.colors.textMuted, paddingVertical: theme.spacing.sm },
  groupList: { marginTop: theme.spacing.xs },
  groupCard: {
    flexDirection: "row",
    alignItems: "center",
    gap: theme.spacing.md,
    paddingVertical: theme.spacing.md,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: theme.colors.border,
  },
  groupAccent: { width: 10, height: 44, borderRadius: 4 },
  groupBody: { flex: 1 },
  groupTitleRow: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", gap: theme.spacing.sm },
  groupName: { ...theme.typography.subtitle, color: theme.colors.text, fontWeight: "700" },
  groupMeta: { ...theme.typography.caption, color: theme.colors.textSecondary, marginTop: 2 },
  levelPill: {
    borderWidth: 1,
    borderColor: theme.colors.border,
    borderRadius: theme.borderRadius.full,
    paddingHorizontal: theme.spacing.sm,
    paddingVertical: 2,
    backgroundColor: theme.colors.surfaceElevated,
  },
  levelPillText: { ...theme.typography.caption, color: theme.colors.textSecondary, fontWeight: "700" },
  arrow: { ...theme.typography.body, color: theme.colors.textMuted },
  createBtn: { marginTop: theme.spacing.md },
  signalWarn: {
    borderWidth: 1,
    borderColor: theme.colors.warning,
    borderRadius: theme.borderRadius.md,
    backgroundColor: theme.colors.warningMuted,
    padding: theme.spacing.sm,
    marginBottom: theme.spacing.sm,
  },
  signalWarnText: { ...theme.typography.caption, color: theme.colors.warning, fontWeight: "700" },
  signalOk: {
    borderWidth: 1,
    borderColor: theme.colors.border,
    borderRadius: theme.borderRadius.md,
    padding: theme.spacing.sm,
    marginBottom: theme.spacing.sm,
    backgroundColor: theme.colors.surfaceElevated,
  },
  signalOkText: { ...theme.typography.caption, color: theme.colors.textSecondary },
  playerRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: theme.spacing.sm,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: theme.colors.border,
    paddingVertical: theme.spacing.sm,
  },
  playerMain: { flex: 1 },
  playerName: { ...theme.typography.subtitle, color: theme.colors.text },
  playerSub: { ...theme.typography.caption, color: theme.colors.textSecondary, marginTop: 2 },
  playerGroupPill: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    borderWidth: 1,
    borderColor: theme.colors.border,
    borderRadius: theme.borderRadius.full,
    paddingHorizontal: theme.spacing.sm,
    paddingVertical: 4,
    maxWidth: 128,
  },
  playerGroupPillWarn: {
    borderColor: theme.colors.warning,
    backgroundColor: theme.colors.warningMuted,
  },
  playerGroupDot: { width: 8, height: 8, borderRadius: 4 },
  playerGroupText: { ...theme.typography.caption, color: theme.colors.textSecondary },
  moveBtn: {
    borderWidth: 1,
    borderColor: theme.colors.border,
    borderRadius: theme.borderRadius.md,
    paddingHorizontal: theme.spacing.sm,
    paddingVertical: 6,
    backgroundColor: theme.colors.surfaceElevated,
  },
  moveBtnText: { ...theme.typography.caption, color: theme.colors.text, fontWeight: "700" },
});
