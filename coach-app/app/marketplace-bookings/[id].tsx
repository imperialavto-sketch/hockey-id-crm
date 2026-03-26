import React, { useCallback, useRef, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Alert,
  ActivityIndicator,
  ScrollView,
} from 'react-native';
import { useLocalSearchParams, useFocusEffect } from 'expo-router';
import { ScreenContainer } from '@/components/layout/ScreenContainer';
import { PrimaryButton } from '@/components/ui/PrimaryButton';
import { theme } from '@/constants/theme';
import {
  fetchCoachMarketplaceBookings,
  patchCoachMarketplaceBooking,
  postCoachMarketplaceBookingMarkPaid,
  postCoachMarketplaceBookingMarkRefunded,
  NoMarketplaceCoachProfileError,
  type CoachMarketplaceBooking,
} from '@/services/coachMarketplaceBookingsService';
import { ApiRequestError } from '@/lib/api';
import {
  coachBookingStatusLabelRu,
  coachDetailCompletedLines,
  coachDetailUnavailableNotes,
  coachPaymentStatusLabelRu,
  getCoachMarketplaceBookingActions,
} from '@/lib/marketplaceBookingLifecycle';

function formatMoneyAmount(n: number): string {
  const v = Number.isFinite(n) ? Math.max(0, n) : 0;
  return v.toLocaleString('ru');
}

function formatPaidAtLine(iso: string | null): string | null {
  if (!iso || typeof iso !== 'string') return null;
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return null;
  return d.toLocaleString('ru-RU', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

function errorMessage(e: unknown): string {
  if (e instanceof ApiRequestError) return e.message;
  if (e instanceof Error) return e.message;
  return 'Ошибка';
}

const TYPE_LABEL: Record<string, string> = {
  ice: 'Лёд',
  gym: 'Зал',
  private: 'Индив.',
};

export default function CoachMarketplaceBookingDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const [booking, setBooking] = useState<CoachMarketplaceBooking | null>(null);
  const [loading, setLoading] = useState(true);
  const [acting, setActing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const actingRef = useRef(false);

  const beginActing = useCallback(() => {
    if (actingRef.current) return false;
    actingRef.current = true;
    setActing(true);
    return true;
  }, []);

  const endActing = useCallback(() => {
    actingRef.current = false;
    setActing(false);
  }, []);

  const load = useCallback(async () => {
    if (!id || typeof id !== 'string') {
      setBooking(null);
      setLoading(false);
      return;
    }
    setError(null);
    try {
      const all = await fetchCoachMarketplaceBookings();
      setBooking(all.find((b) => b.id === id) ?? null);
    } catch (e) {
      if (e instanceof NoMarketplaceCoachProfileError) {
        setBooking(null);
        setError('Профиль маркетплейса не найден');
      } else {
        setBooking(null);
        setError(e instanceof Error ? e.message : 'Ошибка загрузки');
      }
    } finally {
      setLoading(false);
    }
  }, [id]);

  const silentRefresh = useCallback(async () => {
    if (!id || typeof id !== 'string') return;
    try {
      const all = await fetchCoachMarketplaceBookings();
      const found = all.find((b) => b.id === id);
      if (found) setBooking(found);
    } catch {
      /* keep current row */
    }
  }, [id]);

  useFocusEffect(
    useCallback(() => {
      setLoading(true);
      void load();
    }, [load])
  );

  const runPatch = async (status: 'confirmed' | 'cancelled') => {
    if (!booking || !beginActing()) return;
    try {
      const updated = await patchCoachMarketplaceBooking(booking.id, status);
      setBooking(updated);
      await silentRefresh();
    } catch (e) {
      Alert.alert('Не удалось обновить', errorMessage(e));
    } finally {
      endActing();
    }
  };

  const confirmBooking = () => {
    if (actingRef.current) return;
    Alert.alert('Подтвердить бронь?', 'Родитель увидит статус «Подтверждено».', [
      { text: 'Отмена', style: 'cancel' },
      {
        text: 'Подтвердить',
        onPress: () => void runPatch('confirmed'),
      },
    ]);
  };

  const runMarkPaid = async () => {
    if (!booking || !beginActing()) return;
    try {
      const updated = await postCoachMarketplaceBookingMarkPaid(booking.id, {
        paymentMethod: 'manual',
      });
      setBooking(updated);
      await silentRefresh();
    } catch (e) {
      Alert.alert('Не удалось отметить оплату', errorMessage(e));
    } finally {
      endActing();
    }
  };

  const markPaidConfirm = () => {
    if (actingRef.current) return;
    Alert.alert(
      'Отметить оплачено?',
      'Используйте после получения оплаты вне приложения (наличные, перевод и т.д.).',
      [
        { text: 'Отмена', style: 'cancel' },
        { text: 'Оплачено', onPress: () => void runMarkPaid() },
      ]
    );
  };

  const runMarkRefunded = async () => {
    if (!booking || !beginActing()) return;
    try {
      const updated = await postCoachMarketplaceBookingMarkRefunded(booking.id);
      setBooking(updated);
      await silentRefresh();
    } catch (e) {
      Alert.alert('Не удалось отметить возврат', errorMessage(e));
    } finally {
      endActing();
    }
  };

  const markRefundedConfirm = () => {
    if (actingRef.current) return;
    Alert.alert(
      'Отметить возврат?',
      'Статус оплаты сменится на «Возврат». Для броней, где оплата уже получена.',
      [
        { text: 'Отмена', style: 'cancel' },
        {
          text: 'Возврат',
          style: 'destructive',
          onPress: () => void runMarkRefunded(),
        },
      ]
    );
  };

  const cancelBooking = () => {
    if (actingRef.current) return;
    Alert.alert(
      'Отменить бронь?',
      'Слот снова станет свободным в расписании маркетплейса.',
      [
        { text: 'Нет', style: 'cancel' },
        {
          text: 'Отменить бронь',
          style: 'destructive',
          onPress: () => void runPatch('cancelled'),
        },
      ]
    );
  };

  if (loading) {
    return (
      <ScreenContainer scroll={false}>
        <View style={styles.centered}>
          <ActivityIndicator size="large" color={theme.colors.primary} />
          <Text style={styles.loadingHint}>Загрузка брони…</Text>
        </View>
      </ScreenContainer>
    );
  }

  if (error || !booking) {
    return (
      <ScreenContainer>
        <Text style={styles.errorTitle}>Не удалось открыть бронь</Text>
        <Text style={styles.errorText}>{error ?? 'Запись не найдена'}</Text>
        <PrimaryButton title="Повторить" onPress={() => void load()} style={styles.retryBtn} />
      </ScreenContainer>
    );
  }

  const dateStr =
    booking.date.length >= 10
      ? new Date(`${booking.date}T12:00:00`).toLocaleDateString('ru-RU', {
          weekday: 'long',
          day: 'numeric',
          month: 'long',
          year: 'numeric',
        })
      : booking.date;

  const actions = getCoachMarketplaceBookingActions(booking);
  const paidAtFormatted = formatPaidAtLine(booking.paidAt);
  const amountLabel = formatMoneyAmount(booking.amountSnapshot);
  const completedLines = coachDetailCompletedLines(booking);
  const unavailableNotes = coachDetailUnavailableNotes(booking, actions);

  return (
    <ScreenContainer>
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
      >
        <View style={styles.twoCol}>
          <View style={[styles.statusCard, styles.statusCardBooking]}>
            <Text style={styles.statusCardKicker}>Бронирование</Text>
            <Text style={styles.statusCardValue}>
              {coachBookingStatusLabelRu(booking.status)}
            </Text>
          </View>
          <View style={[styles.statusCard, styles.statusCardPayment]}>
            <Text style={styles.statusCardKicker}>Оплата</Text>
            <Text style={styles.statusCardValue}>
              {coachPaymentStatusLabelRu(booking.paymentStatus)}
            </Text>
          </View>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Дата и время</Text>
          <Text style={styles.row}>
            {dateStr} · {booking.startTime} – {booking.endTime}
          </Text>
          <Text style={styles.rowMuted}>
            Формат: {TYPE_LABEL[booking.type] ?? booking.type} · сумма при брони: {amountLabel}{' '}
            ₽
          </Text>
          <Text style={styles.slotIdLine} selectable>
            ID слота: {booking.slotId}
          </Text>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Родитель</Text>
          <Text style={styles.row}>{booking.parentName}</Text>
          <Text style={styles.rowMuted}>{booking.parentPhone}</Text>
        </View>

        {booking.playerId ? (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Игрок</Text>
            <Text style={styles.rowMuted} selectable>
              {booking.playerId}
            </Text>
          </View>
        ) : null}

        {booking.message ? (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Сообщение</Text>
            <Text style={styles.message}>{booking.message}</Text>
          </View>
        ) : null}

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Детали оплаты</Text>
          {paidAtFormatted ? (
            <Text style={styles.rowMuted}>Отметка «оплачено»: {paidAtFormatted}</Text>
          ) : (
            <Text style={styles.rowMuted}>Отметки оплаты пока нет</Text>
          )}
          {booking.paymentMethod ? (
            <Text style={styles.rowMuted}>Способ: {booking.paymentMethod}</Text>
          ) : null}
          {booking.paymentReference ? (
            <Text style={styles.rowMuted} selectable>
              Референс: {booking.paymentReference}
            </Text>
          ) : null}
        </View>

        <View style={styles.actions}>
          <Text style={styles.actionsTitle}>Действия</Text>
          <Text style={styles.actionsSub}>
            Доступно только то, что разрешено для текущей брони и оплаты.
          </Text>

          {actions.canConfirm && (
            <PrimaryButton
              title={acting ? '…' : 'Подтвердить бронь'}
              onPress={confirmBooking}
              disabled={acting}
              style={styles.btn}
            />
          )}
          {actions.canCancel && (
            <PrimaryButton
              title={acting ? '…' : 'Отменить бронь'}
              onPress={cancelBooking}
              disabled={acting}
              variant="outline"
              style={styles.btn}
            />
          )}
          {actions.canMarkPaid && (
            <PrimaryButton
              title={acting ? '…' : 'Отметить оплату полученной'}
              onPress={markPaidConfirm}
              disabled={acting}
              variant="outline"
              style={styles.btn}
            />
          )}
          {actions.canMarkRefunded && (
            <PrimaryButton
              title={acting ? '…' : 'Отметить возврат оплаты'}
              onPress={markRefundedConfirm}
              disabled={acting}
              variant="outline"
              style={styles.btn}
            />
          )}

          {completedLines.length > 0 ? (
            <View style={styles.noteBlock}>
              <Text style={styles.noteTitle}>Уже выполнено</Text>
              {completedLines.map((line) => (
                <Text key={line} style={styles.noteLine}>
                  · {line}
                </Text>
              ))}
            </View>
          ) : null}

          {unavailableNotes.length > 0 ? (
            <View style={styles.noteBlockMuted}>
              <Text style={styles.noteTitleMuted}>Без действий сейчас</Text>
              {unavailableNotes.map((line) => (
                <Text key={line} style={styles.noteLineMuted}>
                  {line}
                </Text>
              ))}
            </View>
          ) : null}
        </View>
      </ScrollView>
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  scrollContent: {
    paddingBottom: theme.spacing.xxl,
  },
  centered: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    minHeight: 200,
    gap: theme.spacing.md,
  },
  loadingHint: {
    ...theme.typography.caption,
    color: theme.colors.textMuted,
  },
  errorTitle: {
    ...theme.typography.title,
    color: theme.colors.text,
    marginBottom: theme.spacing.sm,
  },
  errorText: {
    ...theme.typography.body,
    color: theme.colors.error,
    marginBottom: theme.spacing.lg,
  },
  retryBtn: {
    alignSelf: 'flex-start',
  },
  twoCol: {
    flexDirection: 'row',
    gap: theme.spacing.sm,
    marginBottom: theme.spacing.lg,
  },
  statusCard: {
    flex: 1,
    padding: theme.spacing.md,
    borderRadius: theme.borderRadius.lg,
    borderWidth: 1,
    borderColor: theme.colors.cardBorder,
  },
  statusCardBooking: {
    backgroundColor: theme.colors.surfaceElevated,
  },
  statusCardPayment: {
    backgroundColor: theme.colors.surface,
  },
  statusCardKicker: {
    ...theme.typography.caption,
    color: theme.colors.textMuted,
    marginBottom: theme.spacing.xs,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  statusCardValue: {
    ...theme.typography.subtitle,
    color: theme.colors.text,
    lineHeight: 22,
  },
  section: {
    marginBottom: theme.spacing.lg,
  },
  sectionTitle: {
    ...theme.typography.caption,
    color: theme.colors.textMuted,
    marginBottom: theme.spacing.sm,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  row: {
    ...theme.typography.subtitle,
    color: theme.colors.text,
  },
  rowMuted: {
    ...theme.typography.body,
    color: theme.colors.textSecondary,
    marginTop: theme.spacing.xs,
  },
  slotIdLine: {
    ...theme.typography.caption,
    color: theme.colors.textMuted,
    marginTop: theme.spacing.sm,
  },
  message: {
    ...theme.typography.body,
    color: theme.colors.text,
    lineHeight: 22,
  },
  actions: {
    marginTop: theme.spacing.md,
    gap: theme.spacing.md,
  },
  actionsTitle: {
    ...theme.typography.title,
    color: theme.colors.text,
  },
  actionsSub: {
    ...theme.typography.caption,
    color: theme.colors.textMuted,
    marginTop: -theme.spacing.xs,
    marginBottom: theme.spacing.xs,
    lineHeight: 18,
  },
  btn: {
    width: '100%',
  },
  noteBlock: {
    padding: theme.spacing.md,
    borderRadius: theme.borderRadius.md,
    backgroundColor: theme.colors.primaryMuted,
    borderWidth: 1,
    borderColor: theme.colors.primary,
  },
  noteTitle: {
    ...theme.typography.caption,
    fontWeight: '700',
    color: theme.colors.primary,
    marginBottom: theme.spacing.xs,
  },
  noteLine: {
    ...theme.typography.caption,
    color: theme.colors.text,
    marginTop: 4,
  },
  noteBlockMuted: {
    padding: theme.spacing.md,
    borderRadius: theme.borderRadius.md,
    backgroundColor: theme.colors.surfaceElevated,
    borderWidth: 1,
    borderColor: theme.colors.cardBorder,
  },
  noteTitleMuted: {
    ...theme.typography.caption,
    fontWeight: '600',
    color: theme.colors.textMuted,
    marginBottom: theme.spacing.xs,
  },
  noteLineMuted: {
    ...theme.typography.caption,
    color: theme.colors.textSecondary,
    lineHeight: 18,
  },
});
