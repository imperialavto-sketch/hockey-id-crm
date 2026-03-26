import React, { useCallback, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  Pressable,
  Alert,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  ActivityIndicator,
} from 'react-native';
import { useLocalSearchParams, useRouter, useFocusEffect } from 'expo-router';
import { ScreenContainer } from '@/components/layout/ScreenContainer';
import { PrimaryButton } from '@/components/ui/PrimaryButton';
import { SectionCard } from '@/components/ui/SectionCard';
import { theme } from '@/constants/theme';
import {
  fetchMyMarketplaceAvailability,
  patchMarketplaceAvailability,
  deleteMarketplaceAvailability,
  NoMarketplaceCoachProfileError,
  type CoachAvailabilitySlot,
  type CreateAvailabilityPayload,
} from '@/services/coachAvailabilityService';
import { ApiRequestError } from '@/lib/api';

const TYPES: Array<{ value: CreateAvailabilityPayload['type']; label: string }> = [
  { value: 'ice', label: 'Лёд' },
  { value: 'gym', label: 'Зал' },
  { value: 'private', label: 'Индив.' },
];

const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;
const TIME_RE = /^([01]?\d|2[0-3]):([0-5]\d)$/;

function validateForm(
  date: string,
  startTime: string,
  endTime: string,
  priceStr: string,
  type: CreateAvailabilityPayload['type']
): string | null {
  const d = date.trim();
  if (!DATE_RE.test(d)) {
    return 'Дата: формат ГГГГ-ММ-ДД';
  }
  const st = startTime.trim();
  const et = endTime.trim();
  if (!TIME_RE.test(st) || !TIME_RE.test(et)) {
    return 'Время: формат ЧЧ:ММ (24 ч)';
  }
  const [sh, sm] = st.split(':').map((x) => parseInt(x, 10));
  const [eh, em] = et.split(':').map((x) => parseInt(x, 10));
  const smin = sh * 60 + sm;
  const emin = eh * 60 + em;
  if (smin >= emin) {
    return 'Время начала должно быть раньше окончания';
  }
  const price = parseInt(priceStr.replace(/\s/g, ''), 10);
  if (!Number.isFinite(price) || price < 0) {
    return 'Цена: целое число от 0';
  }
  if (!type) return 'Выберите тип площадки';
  return null;
}

export default function EditMarketplaceSlotScreen() {
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id: string }>();
  const [slot, setSlot] = useState<CoachAvailabilitySlot | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);

  const [date, setDate] = useState('');
  const [startTime, setStartTime] = useState('');
  const [endTime, setEndTime] = useState('');
  const [price, setPrice] = useState('');
  const [type, setType] = useState<CreateAvailabilityPayload['type']>('ice');
  const [clientError, setClientError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);

  const load = useCallback(async () => {
    if (!id || typeof id !== 'string') {
      setSlot(null);
      setLoadError('Некорректный id');
      setLoading(false);
      return;
    }
    setLoadError(null);
    try {
      const all = await fetchMyMarketplaceAvailability();
      const found = all.find((s) => s.id === id) ?? null;
      setSlot(found);
      if (found) {
        setDate(found.date);
        setStartTime(found.startTime);
        setEndTime(found.endTime);
        setPrice(String(found.price));
        setType(
          found.type === 'gym' || found.type === 'private' || found.type === 'ice'
            ? found.type
            : 'ice'
        );
      } else {
        setLoadError('Слот не найден');
      }
    } catch (e) {
      if (e instanceof NoMarketplaceCoachProfileError) {
        setLoadError('Профиль маркетплейса не найден');
      } else {
        setLoadError(e instanceof Error ? e.message : 'Ошибка');
      }
      setSlot(null);
    } finally {
      setLoading(false);
    }
  }, [id]);

  useFocusEffect(
    useCallback(() => {
      setLoading(true);
      load();
    }, [load])
  );

  const save = async () => {
    if (!id || !slot) return;
    setClientError(null);
    const v = validateForm(date, startTime, endTime, price, type);
    if (v) {
      setClientError(v);
      return;
    }
    setSaving(true);
    try {
      const updated = await patchMarketplaceAvailability(id, {
        date: date.trim(),
        startTime: startTime.trim(),
        endTime: endTime.trim(),
        type,
        price: parseInt(price.replace(/\s/g, ''), 10),
      });
      setSlot(updated);
      router.back();
    } catch (e) {
      const msg =
        e instanceof ApiRequestError
          ? e.message
          : e instanceof Error
            ? e.message
            : 'Ошибка';
      if (e instanceof ApiRequestError && e.status === 409) {
        Alert.alert('Конфликт', msg);
      } else {
        Alert.alert('Не удалось сохранить', msg);
      }
    } finally {
      setSaving(false);
    }
  };

  const confirmDelete = () => {
    if (!id || !slot) return;
    if (slot.isBooked) {
      Alert.alert(
        'Слот занят',
        'Сначала отмените бронь в разделе «Маркетплейс · брони», затем удалите слот.'
      );
      return;
    }
    Alert.alert('Удалить слот?', 'Действие необратимо.', [
      { text: 'Отмена', style: 'cancel' },
      {
        text: 'Удалить',
        style: 'destructive',
        onPress: async () => {
          setDeleting(true);
          try {
            await deleteMarketplaceAvailability(id);
            router.back();
          } catch (e) {
            const msg =
              e instanceof ApiRequestError
                ? e.message
                : e instanceof Error
                  ? e.message
                  : 'Ошибка';
            Alert.alert('Не удалось удалить', msg);
          } finally {
            setDeleting(false);
          }
        },
      },
    ]);
  };

  if (loading) {
    return (
      <ScreenContainer scroll={false}>
        <View style={styles.centered}>
          <ActivityIndicator size="large" color={theme.colors.primary} />
        </View>
      </ScreenContainer>
    );
  }

  if (loadError || !slot) {
    return (
      <ScreenContainer>
        <Text style={styles.errorText}>{loadError ?? 'Слот не найден'}</Text>
      </ScreenContainer>
    );
  }

  return (
    <ScreenContainer scroll={false}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        style={styles.flex}
      >
        <ScrollView
          keyboardShouldPersistTaps="handled"
          contentContainerStyle={styles.scrollContent}
        >
          <View style={styles.statusRow}>
            <Text style={styles.statusLabel}>Статус брони</Text>
            <View
              style={[
                styles.badge,
                slot.isBooked ? styles.badgeBooked : styles.badgeFree,
              ]}
            >
              <Text
                style={[
                  styles.badgeText,
                  slot.isBooked && styles.badgeTextBooked,
                ]}
              >
                {slot.isBooked ? 'Занят родителем' : 'Свободен'}
              </Text>
            </View>
          </View>

          <SectionCard>
            <Text style={styles.sectionTitle}>Дата</Text>
            <TextInput
              value={date}
              onChangeText={setDate}
              placeholder="ГГГГ-ММ-ДД"
              placeholderTextColor={theme.colors.textMuted}
              style={styles.input}
              autoCapitalize="none"
            />
          </SectionCard>

          <SectionCard>
            <Text style={styles.sectionTitle}>Время</Text>
            <Text style={styles.label}>Начало</Text>
            <TextInput
              value={startTime}
              onChangeText={setStartTime}
              style={styles.input}
            />
            <Text style={[styles.label, styles.labelSpaced]}>Окончание</Text>
            <TextInput
              value={endTime}
              onChangeText={setEndTime}
              style={styles.input}
            />
          </SectionCard>

          <SectionCard>
            <Text style={styles.sectionTitle}>Тип</Text>
            <View style={styles.typeRow}>
              {TYPES.map((t) => (
                <Pressable
                  key={t.value}
                  onPress={() => setType(t.value)}
                  style={[
                    styles.typeChip,
                    type === t.value && styles.typeChipOn,
                  ]}
                >
                  <Text
                    style={[
                      styles.typeChipText,
                      type === t.value && styles.typeChipTextOn,
                    ]}
                  >
                    {t.label}
                  </Text>
                </Pressable>
              ))}
            </View>
          </SectionCard>

          <SectionCard>
            <Text style={styles.sectionTitle}>Цена, ₽</Text>
            <TextInput
              value={price}
              onChangeText={setPrice}
              style={styles.input}
              keyboardType="number-pad"
            />
          </SectionCard>

          {clientError ? <Text style={styles.errorInline}>{clientError}</Text> : null}

          <PrimaryButton
            title={saving ? 'Сохранение…' : 'Сохранить'}
            onPress={save}
            disabled={saving || deleting}
            style={styles.submitBtn}
          />

          <PrimaryButton
            title={deleting ? 'Удаление…' : 'Удалить слот'}
            onPress={confirmDelete}
            disabled={saving || deleting || slot.isBooked}
            variant="outline"
            style={styles.deleteBtn}
          />
          {slot.isBooked ? (
            <Text style={styles.deleteHint}>
              Удаление недоступно: сначала отмените бронь в маркетплейсе.
            </Text>
          ) : null}
        </ScrollView>
      </KeyboardAvoidingView>
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  sectionTitle: {
    ...theme.typography.subtitle,
    color: theme.colors.text,
    marginBottom: theme.spacing.md,
  },
  flex: { flex: 1 },
  centered: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    minHeight: 200,
  },
  scrollContent: {
    paddingBottom: theme.spacing.xxl,
  },
  statusRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: theme.spacing.lg,
  },
  statusLabel: {
    ...theme.typography.caption,
    color: theme.colors.textMuted,
  },
  badge: {
    paddingHorizontal: theme.spacing.md,
    paddingVertical: 6,
    borderRadius: theme.borderRadius.full,
  },
  badgeFree: {
    backgroundColor: theme.colors.primaryMuted,
  },
  badgeBooked: {
    backgroundColor: 'rgba(255, 77, 106, 0.18)',
  },
  badgeText: {
    fontSize: 12,
    fontWeight: '600',
    color: theme.colors.primary,
  },
  badgeTextBooked: {
    color: theme.colors.error,
  },
  label: {
    ...theme.typography.caption,
    color: theme.colors.textSecondary,
    marginBottom: theme.spacing.xs,
  },
  labelSpaced: { marginTop: theme.spacing.md },
  input: {
    backgroundColor: theme.colors.surfaceElevated,
    borderWidth: 1,
    borderColor: theme.colors.cardBorder,
    borderRadius: theme.borderRadius.md,
    paddingHorizontal: theme.spacing.md,
    paddingVertical: theme.spacing.md,
    color: theme.colors.text,
    fontSize: 16,
  },
  typeRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: theme.spacing.sm,
  },
  typeChip: {
    paddingVertical: theme.spacing.sm,
    paddingHorizontal: theme.spacing.lg,
    borderRadius: theme.borderRadius.full,
    backgroundColor: theme.colors.surfaceElevated,
    borderWidth: 1,
    borderColor: theme.colors.cardBorder,
  },
  typeChipOn: {
    borderColor: theme.colors.primary,
    backgroundColor: theme.colors.primaryMuted,
  },
  typeChipText: {
    ...theme.typography.caption,
    fontWeight: '600',
    color: theme.colors.textSecondary,
  },
  typeChipTextOn: {
    color: theme.colors.primary,
  },
  errorInline: {
    ...theme.typography.caption,
    color: theme.colors.error,
    marginBottom: theme.spacing.md,
  },
  errorText: {
    ...theme.typography.body,
    color: theme.colors.error,
  },
  submitBtn: { marginTop: theme.spacing.sm },
  deleteBtn: { marginTop: theme.spacing.md },
  deleteHint: {
    ...theme.typography.caption,
    color: theme.colors.textMuted,
    marginTop: theme.spacing.sm,
    textAlign: 'center',
  },
});
