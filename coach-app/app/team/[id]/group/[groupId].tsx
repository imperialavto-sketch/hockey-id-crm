/**
 * Игроки группы + быстрый перевод в другую группу.
 */

import React, { useState, useCallback } from 'react';
import {
  ActivityIndicator,
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { useLocalSearchParams, useRouter, useFocusEffect } from 'expo-router';
import { getParamId } from '@/lib/params';
import { ScreenContainer } from '@/components/layout/ScreenContainer';
import { SectionCard } from '@/components/ui/SectionCard';
import { PrimaryButton } from '@/components/ui/PrimaryButton';
import { getCoachPlayers, type CoachPlayerItem } from '@/services/coachPlayersService';
import {
  listCoachTeamGroups,
  type CoachTeamGroupListItem,
} from '@/services/coachTeamGroupsService';
import { isAuthRequiredError } from '@/lib/coachAuth';
import { theme } from '@/constants/theme';
import { AssignGroupSheet } from '@/components/team/AssignGroupSheet';
import { CoachGroupFormModal } from '@/components/team/CoachGroupFormModal';

export default function TeamGroupDetailScreen() {
  const params = useLocalSearchParams<{ id: string; groupId: string }>();
  const teamId = getParamId(params.id);
  const groupId = getParamId(params.groupId);
  const router = useRouter();

  const [groupMeta, setGroupMeta] = useState<CoachTeamGroupListItem | null>(null);
  const [players, setPlayers] = useState<CoachPlayerItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [assignPlayerId, setAssignPlayerId] = useState<string | null>(null);
  const [editOpen, setEditOpen] = useState(false);
  const [lastMovedPlayerId, setLastMovedPlayerId] = useState<string | null>(null);

  const reload = useCallback(async () => {
    if (!teamId || !groupId) return;
    setError(null);
    const groups = await listCoachTeamGroups(teamId).catch(() => [] as CoachTeamGroupListItem[]);
    const meta = groups.find((g) => g.id === groupId) ?? null;
    setGroupMeta(meta);
    const list = await getCoachPlayers(teamId, groupId).catch(() => [] as CoachPlayerItem[]);
    setPlayers(list);
  }, [teamId, groupId]);

  useFocusEffect(
    useCallback(() => {
      if (!teamId || !groupId) {
        setLoading(false);
        return;
      }
      setLoading(true);
      reload()
        .catch((e) => {
          setError(
            isAuthRequiredError(e)
              ? 'Требуется авторизация'
              : e instanceof Error
                ? e.message
                : 'Ошибка загрузки'
          );
        })
        .finally(() => setLoading(false));
    }, [teamId, groupId, reload])
  );

  if (!teamId || !groupId) {
    return (
      <ScreenContainer>
        <Text style={styles.err}>Группа не найдена</Text>
      </ScreenContainer>
    );
  }

  if (loading && !groupMeta) {
    return (
      <ScreenContainer>
        <View style={styles.center}>
          <ActivityIndicator color={theme.colors.primary} />
        </View>
      </ScreenContainer>
    );
  }

  return (
    <ScreenContainer contentContainerStyle={styles.content}>
      <SectionCard elevated style={styles.headerCard}>
        <View style={styles.headerRow}>
          <View
            style={[
              styles.colorBar,
              {
                backgroundColor:
                  groupMeta?.color?.trim() || theme.colors.primary,
              },
            ]}
          />
          <View style={styles.headerText}>
            <Text style={styles.groupTitle}>{groupMeta?.name ?? 'Группа'}</Text>
            <Text style={styles.sub}>
              {groupMeta?.playersCount ?? players.length} игроков
            </Text>
          </View>
          <View style={styles.levelPill}>
            <Text style={styles.levelPillText}>L{Math.max(1, Number(groupMeta?.level ?? 1))}</Text>
          </View>
        </View>
        {groupMeta ? (
          <PrimaryButton
            title="Изменить группу"
            variant="outline"
            onPress={() => setEditOpen(true)}
            style={styles.editBtn}
          />
        ) : null}
      </SectionCard>

      {error ? <Text style={styles.err}>{error}</Text> : null}

      <Text style={styles.sectionLabel}>Состав группы</Text>
      <SectionCard elevated>
        {players.length === 0 ? (
          <Text style={styles.empty}>В группе пока нет игроков</Text>
        ) : (
          players.map((p) => (
            <View key={p.id} style={styles.playerRow}>
              <Pressable
                style={styles.playerMain}
                onPress={() => router.push(`/player/${p.id}`)}
              >
                <Text style={styles.playerName}>{p.name}</Text>
                <Text style={styles.playerPos}>{p.position}</Text>
              </Pressable>
              <Pressable style={styles.moveBtn} onPress={() => setAssignPlayerId(p.id)}>
                <Text style={styles.moveBtnText}>Перевести</Text>
              </Pressable>
              {lastMovedPlayerId === p.id ? <Text style={styles.movedTag}>переведен</Text> : null}
            </View>
          ))
        )}
      </SectionCard>

      <AssignGroupSheet
        visible={assignPlayerId !== null}
        onClose={() => setAssignPlayerId(null)}
        teamId={teamId}
        playerId={assignPlayerId ?? ''}
        playerName={players.find((p) => p.id === assignPlayerId)?.name ?? null}
        currentGroupId={groupId}
        currentGroupName={groupMeta?.name ?? null}
        onAssigned={() => {
          setLastMovedPlayerId(assignPlayerId);
          void reload();
        }}
      />

      {groupMeta ? (
        <CoachGroupFormModal
          visible={editOpen}
          onClose={() => setEditOpen(false)}
          teamId={teamId}
          editGroup={groupMeta}
          onSaved={() => void reload()}
        />
      ) : null}
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  content: { paddingBottom: theme.spacing.xxl },
  center: { padding: theme.spacing.xxl, alignItems: 'center' },
  err: { ...theme.typography.body, color: theme.colors.error, padding: theme.spacing.md },
  headerCard: { marginBottom: theme.spacing.md },
  headerRow: { flexDirection: 'row', alignItems: 'center', gap: theme.spacing.md },
  colorBar: { width: 6, alignSelf: 'stretch', minHeight: 48, borderRadius: 3 },
  headerText: { flex: 1 },
  groupTitle: { ...theme.typography.title, color: theme.colors.text },
  sub: { ...theme.typography.caption, color: theme.colors.textSecondary, marginTop: 4 },
  levelPill: {
    borderWidth: 1,
    borderColor: theme.colors.border,
    borderRadius: theme.borderRadius.full,
    backgroundColor: theme.colors.surfaceElevated,
    paddingHorizontal: theme.spacing.sm,
    paddingVertical: 4,
  },
  levelPillText: { ...theme.typography.caption, color: theme.colors.textSecondary, fontWeight: '700' },
  editBtn: { marginTop: theme.spacing.md },
  sectionLabel: {
    fontSize: 11,
    fontWeight: '600',
    letterSpacing: 0.45,
    color: theme.colors.textMuted,
    textTransform: 'uppercase',
    marginBottom: theme.spacing.sm,
  },
  empty: { ...theme.typography.body, color: theme.colors.textMuted, padding: theme.spacing.md },
  playerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: theme.colors.border,
  },
  playerMain: { flex: 1, paddingVertical: theme.spacing.md },
  playerName: { ...theme.typography.subtitle, color: theme.colors.text },
  playerPos: { ...theme.typography.caption, color: theme.colors.textSecondary, marginTop: 2 },
  moveBtn: {
    borderWidth: 1,
    borderColor: theme.colors.border,
    borderRadius: theme.borderRadius.md,
    paddingHorizontal: theme.spacing.sm,
    paddingVertical: 6,
    backgroundColor: theme.colors.surfaceElevated,
  },
  moveBtnText: { ...theme.typography.caption, color: theme.colors.text, fontWeight: '700' },
  movedTag: {
    ...theme.typography.caption,
    color: theme.colors.success,
    fontWeight: '700',
    marginLeft: theme.spacing.xs,
  },
});
