import React, { useState, useCallback } from 'react';
import {
  StyleSheet,
  Text,
  View,
  TextInput,
  Pressable,
  Switch,
  Alert,
  Keyboard,
  ActivityIndicator,
} from 'react-native';
import { useLocalSearchParams, useRouter, useFocusEffect } from 'expo-router';
import { getParamId } from '@/lib/params';
import { ScreenContainer } from '@/components/layout/ScreenContainer';
import { SectionCard } from '@/components/ui/SectionCard';
import { PrimaryButton } from '@/components/ui/PrimaryButton';
import { createCoachNote } from '@/services/coachNotesService';
import { ApiRequestError } from '@/lib/api';
import { DashboardSection } from '@/components/dashboard/DashboardSection';
import { StaggerFadeIn } from '@/components/dashboard/StaggerFadeIn';
import { AddNoteHero } from '@/components/notes/AddNoteHero';
import { getCoachPlayerDetail } from '@/services/coachPlayersService';
import type { PlayerDetailData } from '@/constants/playerDetailData';
import { theme } from '@/constants/theme';

function mapToPlayerDetailData(
  d: Awaited<ReturnType<typeof getCoachPlayerDetail>>
): PlayerDetailData | null {
  if (!d) return null;
  return {
    id: d.id,
    name: d.name,
    number: d.number,
    position: d.position as 'F' | 'D' | 'G',
    team: d.team,
    teamId: d.teamId ?? '',
    level: d.level,
    attendance: {
      attended: d.attendance.attended,
      total: d.attendance.total,
      lastSession: d.attendance.lastSession,
    },
    coachNotes: [],
    recentActivity: [],
  };
}

const NOTE_TYPES = [
  { value: 'practice', label: 'Тренировка' },
  { value: 'game', label: 'Игра' },
  { value: 'development', label: 'Развитие' },
  { value: 'parent-follow-up', label: 'Контакт с родителем' },
] as const;

const FOCUS_TAGS = [
  'Катание',
  'Позиционирование',
  'Усилие',
  'Уверенность',
  'Передачи',
  'Броски',
  'Защита',
  'Коммуникация',
];

export default function AddNoteScreen() {
  const params = useLocalSearchParams<{ playerId: string }>();
  const playerId = getParamId(params.playerId);
  const router = useRouter();
  const [player, setPlayer] = useState<PlayerDetailData | null>(null);
  const [loading, setLoading] = useState(true);

  useFocusEffect(
    useCallback(() => {
      if (!playerId) {
        setPlayer(null);
        setLoading(false);
        return;
      }
      setLoading(true);
      getCoachPlayerDetail(playerId)
        .then((data) => setPlayer(mapToPlayerDetailData(data)))
        .catch(() => setPlayer(null))
        .finally(() => setLoading(false));
    }, [playerId])
  );

  const [noteType, setNoteType] = useState<string>('practice');
  const [selectedTags, setSelectedTags] = useState<Set<string>>(new Set());
  const [noteText, setNoteText] = useState('');
  const [shareWithParent, setShareWithParent] = useState(false);
  const [submitState, setSubmitState] = useState<'idle' | 'loading' | 'error'>('idle');
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const trimmedNote = noteText.trim();
  const canSubmit = trimmedNote.length > 0 && submitState !== 'loading';

  const handleSave = async () => {
    if (!canSubmit || !player) return;
    Keyboard.dismiss();
    setSubmitState('loading');
    setErrorMessage(null);
    try {
      const created = await createCoachNote(player.id, {
        noteType,
        focusTags: Array.from(selectedTags),
        note: trimmedNote,
        shareWithParent,
      });
      setSubmitState('idle');
      const { addRecentlySavedNote } = await import('@/lib/notesCache');
      const date = created.createdAt
        ? new Date(created.createdAt).toLocaleDateString('en-US', {
            month: 'short',
            day: 'numeric',
          })
        : 'Just now';
      addRecentlySavedNote(player.id, {
        id: created.id,
        date,
        text: created.note,
      });
      router.back();
    } catch (err) {
      setSubmitState('error');
      const message =
        err instanceof ApiRequestError
          ? err.message
          : err instanceof Error
            ? err.message
            : 'Не удалось сохранить заметку';
      setErrorMessage(message);
      if (err instanceof ApiRequestError && err.status === 401) {
        Alert.alert(
          'Требуется авторизация',
          'Войдите в аккаунт тренера для сохранения заметок.',
          [{ text: 'OK' }]
        );
      } else {
        Alert.alert('Ошибка', message, [{ text: 'OK' }]);
      }
    }
  };

  const toggleTag = (tag: string) => {
    setSelectedTags((prev) => {
      const next = new Set(prev);
      if (next.has(tag)) next.delete(tag);
      else next.add(tag);
      return next;
    });
  };

  if (!playerId) {
    return (
      <ScreenContainer>
        <View style={styles.notFound}>
          <Text style={styles.notFoundText}>Игрок не найден</Text>
          <PrimaryButton title="Назад" onPress={() => router.back()} />
        </View>
      </ScreenContainer>
    );
  }

  if (loading) {
    return (
      <ScreenContainer>
        <View style={styles.loading}>
          <ActivityIndicator size="small" color={theme.colors.primary} />
          <Text style={styles.loadingText}>Загрузка…</Text>
        </View>
      </ScreenContainer>
    );
  }

  if (!player) {
    return (
      <ScreenContainer>
        <View style={styles.notFound}>
          <Text style={styles.notFoundText}>Игрок не найден</Text>
          <PrimaryButton title="Назад" onPress={() => router.back()} />
        </View>
      </ScreenContainer>
    );
  }

  return (
    <ScreenContainer contentContainerStyle={styles.content}>
      <StaggerFadeIn delay={0}>
        <AddNoteHero player={player} />
      </StaggerFadeIn>

      <StaggerFadeIn delay={60}>
        <DashboardSection title="Профиль">
          <SectionCard elevated>
            <View style={styles.snapshotRow}>
              <View style={styles.snapshotItem}>
                <Text style={styles.snapshotLabel}>Позиция</Text>
                <Text style={styles.snapshotValue}>{player.position}</Text>
              </View>
              <View style={styles.snapshotDivider} />
              <View style={styles.snapshotItem}>
                <Text style={styles.snapshotLabel}>Команда</Text>
                <Text style={styles.snapshotValue}>{player.team}</Text>
              </View>
              <View style={styles.snapshotDivider} />
              <View style={styles.snapshotItem}>
                <Text style={styles.snapshotLabel}>Уровень</Text>
                <Text style={styles.snapshotValue}>{player.level}</Text>
              </View>
            </View>
          </SectionCard>
        </DashboardSection>
      </StaggerFadeIn>

      <StaggerFadeIn delay={120}>
        <DashboardSection title="Тип заметки">
          <SectionCard elevated>
            <View style={styles.typeRow}>
              {NOTE_TYPES.map((opt) => {
                const isSelected = noteType === opt.value;
                return (
                  <Pressable
                    key={opt.value}
                    onPress={() => setNoteType(opt.value)}
                    style={({ pressed }) => [
                      styles.typePill,
                      isSelected && styles.typePillSelected,
                      pressed && styles.pillPressed,
                    ]}
                  >
                    <Text
                      style={[
                        styles.typePillText,
                        isSelected && styles.typePillTextSelected,
                      ]}
                    >
                      {opt.label}
                    </Text>
                  </Pressable>
                );
              })}
            </View>
          </SectionCard>
        </DashboardSection>
      </StaggerFadeIn>

      <StaggerFadeIn delay={180}>
        <DashboardSection title="Фокус">
          <SectionCard elevated>
            <View style={styles.tagsRow}>
              {FOCUS_TAGS.map((tag) => {
                const isSelected = selectedTags.has(tag);
                return (
                  <Pressable
                    key={tag}
                    onPress={() => toggleTag(tag)}
                    style={({ pressed }) => [
                      styles.tagPill,
                      isSelected && styles.tagPillSelected,
                      pressed && styles.pillPressed,
                    ]}
                  >
                    <Text
                      style={[
                        styles.tagPillText,
                        isSelected && styles.tagPillTextSelected,
                      ]}
                    >
                      {tag}
                    </Text>
                  </Pressable>
                );
              })}
            </View>
          </SectionCard>
        </DashboardSection>
      </StaggerFadeIn>

      <StaggerFadeIn delay={240}>
        <DashboardSection title="Текст заметки">
          <SectionCard elevated>
            <TextInput
              style={styles.noteInput}
              placeholder="Например: Хорошая работа на дриллах, продолжать работать над первым шагом"
              placeholderTextColor={theme.colors.textMuted}
              multiline
              numberOfLines={4}
              value={noteText}
              onChangeText={setNoteText}
            />
          </SectionCard>
        </DashboardSection>
      </StaggerFadeIn>

      <StaggerFadeIn delay={300}>
        <DashboardSection title="Доступ">
          <SectionCard elevated>
            <View style={styles.shareRow}>
              <Text style={styles.shareLabel}>Показать родителю</Text>
              <Switch
                value={shareWithParent}
                onValueChange={setShareWithParent}
                trackColor={{
                  false: theme.colors.surfaceElevated,
                  true: theme.colors.primaryMuted,
                }}
                thumbColor={shareWithParent ? theme.colors.primary : theme.colors.textMuted}
              />
            </View>
            <Text style={styles.shareHint}>
              Родитель увидит заметку в приложении
            </Text>
          </SectionCard>
        </DashboardSection>
      </StaggerFadeIn>

      <StaggerFadeIn delay={360}>
        {errorMessage ? (
          <Text style={styles.errorText}>{errorMessage}</Text>
        ) : null}
        <PrimaryButton
          title={submitState === 'loading' ? 'Сохранение…' : 'Сохранить заметку'}
          onPress={handleSave}
          disabled={!canSubmit}
          style={styles.saveBtn}
        />
      </StaggerFadeIn>

      <View style={styles.bottomSpacer} />
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  content: {
    paddingBottom: theme.spacing.xxl,
  },
  loading: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: theme.spacing.sm,
    paddingVertical: theme.spacing.xxl,
  },
  loadingText: {
    ...theme.typography.body,
    color: theme.colors.textMuted,
  },
  notFound: {
    paddingVertical: theme.spacing.xxl,
    alignItems: 'center',
    gap: theme.spacing.lg,
  },
  notFoundText: {
    ...theme.typography.title,
    color: theme.colors.text,
  },
  snapshotRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.spacing.md,
  },
  snapshotItem: {
    flex: 1,
    alignItems: 'center',
  },
  snapshotDivider: {
    width: 1,
    height: 32,
    backgroundColor: theme.colors.border,
  },
  snapshotLabel: {
    fontSize: 11,
    fontWeight: '600',
    letterSpacing: 0.4,
    color: theme.colors.textMuted,
    textTransform: 'uppercase',
    marginBottom: theme.spacing.xs,
  },
  snapshotValue: {
    ...theme.typography.subtitle,
    color: theme.colors.text,
  },
  typeRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: theme.spacing.sm,
  },
  typePill: {
    paddingHorizontal: theme.spacing.md,
    paddingVertical: theme.spacing.sm,
    borderRadius: theme.borderRadius.md,
    backgroundColor: theme.colors.surfaceElevated,
  },
  typePillSelected: {
    backgroundColor: theme.colors.primaryMuted,
  },
  pillPressed: {
    opacity: 0.85,
  },
  typePillText: {
    ...theme.typography.subtitle,
    color: theme.colors.textSecondary,
  },
  typePillTextSelected: {
    color: theme.colors.primary,
    fontWeight: '600',
  },
  tagsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: theme.spacing.sm,
  },
  tagPill: {
    paddingHorizontal: theme.spacing.md,
    paddingVertical: theme.spacing.sm,
    borderRadius: theme.borderRadius.full,
    backgroundColor: theme.colors.surfaceElevated,
  },
  tagPillSelected: {
    backgroundColor: theme.colors.primaryMuted,
  },
  tagPillText: {
    ...theme.typography.caption,
    color: theme.colors.textSecondary,
  },
  tagPillTextSelected: {
    color: theme.colors.primary,
    fontWeight: '600',
  },
  noteInput: {
    ...theme.typography.body,
    color: theme.colors.text,
    minHeight: 100,
    textAlignVertical: 'top',
  },
  shareRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: theme.spacing.sm,
  },
  shareLabel: {
    ...theme.typography.subtitle,
    color: theme.colors.text,
  },
  shareHint: {
    ...theme.typography.caption,
    color: theme.colors.textMuted,
  },
  errorText: {
    ...theme.typography.body,
    color: theme.colors.error,
    marginBottom: theme.spacing.sm,
  },
  saveBtn: {
    marginTop: theme.spacing.sm,
  },
  bottomSpacer: {
    height: theme.spacing.xl,
  },
});
