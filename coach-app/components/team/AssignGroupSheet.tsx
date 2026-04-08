import React, { useCallback, useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Modal,
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { theme } from '@/constants/theme';
import {
  assignCoachPlayerToGroup,
  listCoachTeamGroups,
  type CoachTeamGroupListItem,
} from '@/services/coachTeamGroupsService';
import { coachHapticSelection, coachHapticSuccess } from '@/lib/coachHaptics';
import { isAuthRequiredError } from '@/lib/coachAuth';
import { ApiRequestError } from '@/lib/api';

type AssignGroupSheetProps = {
  visible: boolean;
  onClose: () => void;
  teamId: string | null | undefined;
  playerId: string;
  playerName?: string | null;
  currentGroupId?: string | null;
  currentGroupName?: string | null;
  /** После успешного назначения */
  onAssigned?: (nextGroupId: string | null) => void;
};

export function AssignGroupSheet({
  visible,
  onClose,
  teamId,
  playerId,
  playerName,
  currentGroupId,
  currentGroupName,
  onAssigned,
}: AssignGroupSheetProps) {
  const [groups, setGroups] = useState<CoachTeamGroupListItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!visible || !teamId) {
      setGroups([]);
      return;
    }
    setLoading(true);
    setError(null);
    listCoachTeamGroups(teamId)
      .then(setGroups)
      .catch((e) => {
        setGroups([]);
        setError(
          isAuthRequiredError(e)
            ? 'Требуется авторизация'
            : e instanceof Error
              ? e.message
              : 'Не удалось загрузить группы'
        );
      })
      .finally(() => setLoading(false));
  }, [visible, teamId]);

  const pick = useCallback(
    async (groupId: string | null) => {
      if (!playerId || saving) return;
      setSaving(true);
      setError(null);
      coachHapticSelection();
      try {
        await assignCoachPlayerToGroup(playerId, groupId);
        coachHapticSuccess();
        onAssigned?.(groupId);
        onClose();
      } catch (e) {
        const msg =
          e instanceof ApiRequestError
            ? e.message
            : e instanceof Error
              ? e.message
              : 'Не удалось сохранить';
        setError(msg);
      } finally {
        setSaving(false);
      }
    },
    [playerId, saving, onAssigned, onClose]
  );

  return (
    <Modal
      visible={visible}
      animationType="slide"
      transparent
      onRequestClose={onClose}
    >
      <View style={styles.modalRoot}>
        <Pressable style={styles.backdrop} onPress={onClose} accessibilityRole="button" />
        <View style={styles.sheet}>
        <View style={styles.handle} />
        <Text style={styles.title}>Перевести игрока</Text>
        {playerName?.trim() ? (
          <Text style={styles.subtitle}>
            {playerName.trim()} · {currentGroupId ? currentGroupName?.trim() || 'Группа' : 'Без группы'}
          </Text>
        ) : null}
        {error ? <Text style={styles.error}>{error}</Text> : null}
        {loading ? (
          <ActivityIndicator color={theme.colors.primary} style={styles.loader} />
        ) : (
          <>
            <Pressable
              style={({ pressed }) => [
                styles.row,
                currentGroupId == null && styles.rowCurrent,
                pressed && styles.rowPressed,
              ]}
              onPress={() => pick(null)}
              disabled={saving}
            >
              <Text style={styles.rowText}>Без группы</Text>
              {currentGroupId == null ? <Text style={styles.currentTag}>сейчас</Text> : null}
            </Pressable>
            {groups.map((g) => (
              <Pressable
                key={g.id}
                style={({ pressed }) => [
                  styles.row,
                  currentGroupId === g.id && styles.rowCurrent,
                  pressed && styles.rowPressed,
                ]}
                onPress={() => pick(g.id)}
                disabled={saving}
              >
                <View
                  style={[
                    styles.dot,
                    { backgroundColor: g.color?.trim() || theme.colors.primary },
                  ]}
                />
                <Text style={styles.rowText}>{g.name}</Text>
                <Text style={styles.count}>{g.playersCount}</Text>
                {currentGroupId === g.id ? <Text style={styles.currentTag}>сейчас</Text> : null}
              </Pressable>
            ))}
          </>
        )}
        <Pressable style={styles.cancelBtn} onPress={onClose} disabled={saving}>
          <Text style={styles.cancelText}>Отмена</Text>
        </Pressable>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  modalRoot: {
    flex: 1,
  },
  backdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.5)',
  },
  sheet: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: theme.colors.surface,
    borderTopLeftRadius: theme.borderRadius.xl,
    borderTopRightRadius: theme.borderRadius.xl,
    paddingHorizontal: theme.spacing.lg,
    paddingBottom: theme.spacing.xxl,
    paddingTop: theme.spacing.sm,
    borderTopWidth: 1,
    borderColor: theme.colors.border,
  },
  handle: {
    alignSelf: 'center',
    width: 40,
    height: 4,
    borderRadius: 2,
    backgroundColor: theme.colors.border,
    marginBottom: theme.spacing.md,
  },
  title: {
    ...theme.typography.subtitle,
    color: theme.colors.text,
    marginBottom: 4,
  },
  subtitle: {
    ...theme.typography.caption,
    color: theme.colors.textSecondary,
    marginBottom: theme.spacing.md,
  },
  error: {
    ...theme.typography.caption,
    color: theme.colors.error,
    marginBottom: theme.spacing.sm,
  },
  loader: { marginVertical: theme.spacing.lg },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.spacing.sm,
    paddingVertical: theme.spacing.md,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: theme.colors.border,
  },
  rowPressed: { opacity: 0.85 },
  rowCurrent: {
    backgroundColor: theme.colors.surfaceElevated,
  },
  dot: {
    width: 10,
    height: 10,
    borderRadius: 5,
  },
  rowText: {
    flex: 1,
    ...theme.typography.body,
    color: theme.colors.text,
  },
  count: {
    ...theme.typography.caption,
    color: theme.colors.textMuted,
  },
  currentTag: {
    ...theme.typography.caption,
    color: theme.colors.primary,
    fontWeight: '700',
    marginLeft: theme.spacing.xs,
  },
  cancelBtn: {
    marginTop: theme.spacing.lg,
    alignItems: 'center',
    paddingVertical: theme.spacing.md,
  },
  cancelText: {
    ...theme.typography.body,
    color: theme.colors.textSecondary,
    fontWeight: '600',
  },
});
