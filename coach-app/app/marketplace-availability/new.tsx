import React, { useState } from 'react';
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
} from 'react-native';
import { useRouter } from 'expo-router';
import { ScreenContainer } from '@/components/layout/ScreenContainer';
import { PrimaryButton } from '@/components/ui/PrimaryButton';
import { SectionCard } from '@/components/ui/SectionCard';
import { theme } from '@/constants/theme';
import {
  createMarketplaceAvailability,
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

export default function NewMarketplaceSlotScreen() {
  const router = useRouter();
  const [date, setDate] = useState('');
  const [startTime, setStartTime] = useState('10:00');
  const [endTime, setEndTime] = useState('11:00');
  const [price, setPrice] = useState('3000');
  const [type, setType] = useState<CreateAvailabilityPayload['type']>('ice');
  const [clientError, setClientError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const submit = async () => {
    setClientError(null);
    const v = validateForm(date, startTime, endTime, price, type);
    if (v) {
      setClientError(v);
      return;
    }
    setSubmitting(true);
    try {
      await createMarketplaceAvailability({
        date: date.trim(),
        startTime: startTime.trim(),
        endTime: endTime.trim(),
        type,
        price: parseInt(price.replace(/\s/g, ''), 10),
      });
      router.back();
    } catch (e) {
      const msg =
        e instanceof ApiRequestError
          ? e.message
          : e instanceof Error
            ? e.message
            : 'Не удалось создать слот';
      if (e instanceof ApiRequestError && e.status === 409) {
        Alert.alert('Конфликт', msg);
      } else if (e instanceof ApiRequestError && e.status === 403) {
        Alert.alert('Нет доступа', msg);
      } else {
        Alert.alert('Ошибка', msg);
      }
    } finally {
      setSubmitting(false);
    }
  };

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
          <Text style={styles.hint}>
            Слот появится в маркетплейсе для родителей. Школьное расписание не затрагивается.
          </Text>

          <SectionCard>
            <Text style={styles.sectionTitle}>Дата</Text>
            <TextInput
              value={date}
              onChangeText={setDate}
              placeholder="2025-03-30"
              placeholderTextColor={theme.colors.textMuted}
              style={styles.input}
              autoCapitalize="none"
              autoCorrect={false}
            />
          </SectionCard>

          <SectionCard>
            <Text style={styles.sectionTitle}>Время</Text>
            <Text style={styles.label}>Начало</Text>
            <TextInput
              value={startTime}
              onChangeText={setStartTime}
              placeholder="10:00"
              placeholderTextColor={theme.colors.textMuted}
              style={styles.input}
            />
            <Text style={[styles.label, styles.labelSpaced]}>Окончание</Text>
            <TextInput
              value={endTime}
              onChangeText={setEndTime}
              placeholder="11:00"
              placeholderTextColor={theme.colors.textMuted}
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
              placeholder="3000"
              placeholderTextColor={theme.colors.textMuted}
              style={styles.input}
              keyboardType="number-pad"
            />
          </SectionCard>

          {clientError ? <Text style={styles.errorInline}>{clientError}</Text> : null}

          <PrimaryButton
            title={submitting ? 'Сохранение…' : 'Создать слот'}
            onPress={submit}
            disabled={submitting}
            style={styles.submitBtn}
          />
        </ScrollView>
      </KeyboardAvoidingView>
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  scrollContent: {
    paddingBottom: theme.spacing.xxl,
  },
  sectionTitle: {
    ...theme.typography.subtitle,
    color: theme.colors.text,
    marginBottom: theme.spacing.md,
  },
  hint: {
    ...theme.typography.caption,
    color: theme.colors.textMuted,
    marginBottom: theme.spacing.lg,
    lineHeight: 18,
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
  submitBtn: {
    marginTop: theme.spacing.md,
  },
});
