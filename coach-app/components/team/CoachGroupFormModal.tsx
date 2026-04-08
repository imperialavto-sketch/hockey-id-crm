import React, { useCallback, useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Modal,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { theme } from '@/constants/theme';
import { COACH_GROUP_COLOR_PRESETS } from '@/lib/coachGroupUi';
import {
  createCoachTeamGroup,
  updateCoachTeamGroup,
  type CoachTeamGroupListItem,
} from '@/services/coachTeamGroupsService';
import { PrimaryButton } from '@/components/ui/PrimaryButton';
import { isAuthRequiredError } from '@/lib/coachAuth';
import { ApiRequestError } from '@/lib/api';

type Props = {
  visible: boolean;
  onClose: () => void;
  teamId: string;
  /** null = создать */
  editGroup: CoachTeamGroupListItem | null;
  onSaved: () => void;
};

export function CoachGroupFormModal({
  visible,
  onClose,
  teamId,
  editGroup,
  onSaved,
}: Props) {
  const [name, setName] = useState('');
  const [levelStr, setLevelStr] = useState('1');
  const [color, setColor] = useState<string | null>(COACH_GROUP_COLOR_PRESETS[0] ?? '#3B82F6');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!visible) return;
    if (editGroup) {
      setName(editGroup.name);
      setLevelStr(String(editGroup.level ?? 1));
      setColor(
        editGroup.color?.trim() ||
          COACH_GROUP_COLOR_PRESETS[0] ||
          '#3B82F6'
      );
    } else {
      setName('');
      setLevelStr('1');
      setColor(COACH_GROUP_COLOR_PRESETS[0] ?? '#3B82F6');
    }
    setError(null);
  }, [visible, editGroup]);

  const submit = useCallback(async () => {
    const n = name.trim();
    if (!n) {
      setError('Укажите название');
      return;
    }
    let level = 1;
    if (levelStr.trim()) {
      const p = parseInt(levelStr, 10);
      if (!Number.isFinite(p)) {
        setError('Уровень — целое число');
        return;
      }
      level = p;
    }
    setSaving(true);
    setError(null);
    try {
      if (editGroup) {
        await updateCoachTeamGroup(editGroup.id, {
          name: n,
          level,
          color,
        });
      } else {
        await createCoachTeamGroup({
          teamId,
          name: n,
          level,
          color,
        });
      }
      onSaved();
      onClose();
    } catch (e) {
      setError(
        isAuthRequiredError(e)
          ? 'Требуется авторизация'
          : e instanceof ApiRequestError
            ? e.message
            : e instanceof Error
              ? e.message
              : 'Ошибка сохранения'
      );
    } finally {
      setSaving(false);
    }
  }, [name, levelStr, color, editGroup, teamId, onSaved, onClose]);

  return (
    <Modal visible={visible} animationType="slide" transparent onRequestClose={onClose}>
      <View style={styles.root}>
        <Pressable style={styles.backdrop} onPress={onClose} />
        <View style={styles.sheet}>
          <Text style={styles.title}>
            {editGroup ? 'Редактировать группу' : 'Новая группа'}
          </Text>
          {error ? <Text style={styles.error}>{error}</Text> : null}
          <Text style={styles.label}>Название *</Text>
          <TextInput
            value={name}
            onChangeText={setName}
            placeholder="Например: А"
            placeholderTextColor={theme.colors.textMuted}
            style={styles.input}
            editable={!saving}
          />
          <Text style={styles.label}>Уровень (опционально)</Text>
          <TextInput
            value={levelStr}
            onChangeText={setLevelStr}
            keyboardType="number-pad"
            placeholder="1"
            placeholderTextColor={theme.colors.textMuted}
            style={styles.input}
            editable={!saving}
          />
          <Text style={styles.label}>Цвет</Text>
          <View style={styles.presets}>
            {COACH_GROUP_COLOR_PRESETS.map((c) => (
              <Pressable
                key={c}
                onPress={() => setColor(c)}
                style={[
                  styles.presetDot,
                  { backgroundColor: c },
                  color === c && styles.presetDotActive,
                ]}
              />
            ))}
          </View>
          {saving ? (
            <ActivityIndicator color={theme.colors.primary} style={styles.spin} />
          ) : (
            <PrimaryButton title="Сохранить" onPress={submit} style={styles.btn} />
          )}
          <Pressable onPress={onClose} style={styles.cancel} disabled={saving}>
            <Text style={styles.cancelText}>Отмена</Text>
          </Pressable>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
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
    padding: theme.spacing.lg,
    paddingBottom: theme.spacing.xxl,
    borderTopWidth: 1,
    borderColor: theme.colors.border,
  },
  title: {
    ...theme.typography.subtitle,
    color: theme.colors.text,
    marginBottom: theme.spacing.md,
  },
  error: {
    ...theme.typography.caption,
    color: theme.colors.error,
    marginBottom: theme.spacing.sm,
  },
  label: {
    fontSize: 11,
    fontWeight: '600',
    color: theme.colors.textMuted,
    textTransform: 'uppercase',
    marginBottom: theme.spacing.xs,
  },
  input: {
    borderWidth: 1,
    borderColor: theme.colors.border,
    borderRadius: theme.borderRadius.md,
    paddingHorizontal: theme.spacing.md,
    paddingVertical: theme.spacing.sm,
    color: theme.colors.text,
    marginBottom: theme.spacing.md,
  },
  presets: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: theme.spacing.sm,
    marginBottom: theme.spacing.lg,
  },
  presetDot: {
    width: 36,
    height: 36,
    borderRadius: 18,
    borderWidth: 2,
    borderColor: 'transparent',
  },
  presetDotActive: {
    borderColor: theme.colors.text,
  },
  spin: { marginVertical: theme.spacing.md },
  btn: { marginBottom: theme.spacing.sm },
  cancel: { alignItems: 'center', paddingVertical: theme.spacing.sm },
  cancelText: {
    ...theme.typography.body,
    color: theme.colors.textSecondary,
    fontWeight: '600',
  },
});
