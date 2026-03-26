import React, { useCallback, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  Pressable,
  RefreshControl,
} from 'react-native';
import { useRouter, useFocusEffect, type Href } from 'expo-router';
import { ScreenContainer } from '@/components/layout/ScreenContainer';
import { HeroTitle } from '@/components/ui/HeroTitle';
import { SkeletonBlock } from '@/components/ui/SkeletonBlock';
import { theme } from '@/constants/theme';
import {
  fetchCoachMarketplaceBookings,
  NoMarketplaceCoachProfileError,
  type CoachMarketplaceBooking,
} from '@/services/coachMarketplaceBookingsService';
import {
  coachListBookingStatusShortRu,
  coachListPaymentShortRu,
  normalizeMarketplaceBookingStatus,
  normalizeMarketplacePaymentStatus,
} from '@/lib/marketplaceBookingLifecycle';

const TYPE_LABEL: Record<string, string> = {
  ice: 'Лёд',
  gym: 'Зал',
  private: 'Индив.',
};

function StatusPill({ status }: { status: string }) {
  const label = coachListBookingStatusShortRu(status);
  const s = normalizeMarketplaceBookingStatus(status);
  const isPending = s === 'pending';
  const isCancelled = s === 'cancelled';
  return (
    <View
      style={[
        styles.pill,
        isPending && styles.pillPending,
        s === 'confirmed' && styles.pillOk,
        isCancelled && styles.pillCancelled,
      ]}
    >
      <Text style={styles.pillText}>{label}</Text>
    </View>
  );
}

function PaymentPill({ paymentStatus }: { paymentStatus: string }) {
  const label = coachListPaymentShortRu(paymentStatus);
  const p = normalizeMarketplacePaymentStatus(paymentStatus);
  const paid = p === 'paid';
  const refunded = p === 'refunded';
  const failed = p === 'failed';
  const pend = p === 'pending';
  const unpaid = p === 'unpaid';
  const unknown = !paid && !refunded && !failed && !pend && !unpaid;
  return (
    <View
      style={[
        styles.payPill,
        paid && styles.payPillPaid,
        refunded && styles.payPillMuted,
        failed && styles.payPillFailed,
        pend && styles.payPillPending,
        (unpaid || unknown) && styles.payPillDefault,
      ]}
    >
      <Text style={styles.payPillText}>{label}</Text>
    </View>
  );
}

function BookingRow({ item, onPress }: { item: CoachMarketplaceBooking; onPress: () => void }) {
  const dateStr =
    item.date.length >= 10
      ? new Date(`${item.date}T12:00:00`).toLocaleDateString('ru-RU', {
          weekday: 'short',
          day: 'numeric',
          month: 'short',
        })
      : item.date;
  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [styles.card, pressed && styles.cardPressed]}
    >
      <View style={styles.cardTop}>
        <Text style={styles.parentName} numberOfLines={1}>
          {item.parentName}
        </Text>
        <View style={styles.pillRow}>
          <StatusPill status={item.status} />
          <PaymentPill paymentStatus={item.paymentStatus} />
        </View>
      </View>
      <Text style={styles.phone}>{item.parentPhone}</Text>
      {item.playerId ? (
        <Text style={styles.playerHint}>Игрок: id {item.playerId.slice(0, 8)}…</Text>
      ) : null}
      <View style={styles.metaRow}>
        <Text style={styles.meta}>
          {dateStr} · {item.startTime}–{item.endTime}
        </Text>
      </View>
      <View style={styles.footer}>
        <Text style={styles.type}>{TYPE_LABEL[item.type] ?? item.type}</Text>
        <Text style={styles.price}>
          {(Number.isFinite(item.amountSnapshot)
            ? Math.max(0, Math.floor(item.amountSnapshot))
            : 0
          ).toLocaleString('ru')}{' '}
          ₽
        </Text>
      </View>
    </Pressable>
  );
}

export default function CoachMarketplaceBookingsScreen() {
  const router = useRouter();
  const [rows, setRows] = useState<CoachMarketplaceBooking[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [noProfile, setNoProfile] = useState(false);

  const load = useCallback(async () => {
    setError(null);
    setNoProfile(false);
    try {
      const data = await fetchCoachMarketplaceBookings();
      setRows(data);
    } catch (e) {
      if (e instanceof NoMarketplaceCoachProfileError) {
        setRows([]);
        setNoProfile(true);
        return;
      }
      setRows([]);
      setError(e instanceof Error ? e.message : 'Ошибка загрузки');
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      let cancelled = false;
      (async () => {
        setLoading(true);
        await load();
        if (!cancelled) setLoading(false);
      })();
      return () => {
        cancelled = true;
      };
    }, [load])
  );

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await load();
    setRefreshing(false);
  }, [load]);

  if (loading) {
    return (
      <ScreenContainer scroll={false}>
        <HeroTitle title="Маркетплейс" />
        <Text style={styles.subHero}>Бронирования слотов</Text>
        <SkeletonBlock height={88} style={styles.skel} />
        <SkeletonBlock height={88} style={styles.skel} />
        <SkeletonBlock height={88} style={styles.skel} />
      </ScreenContainer>
    );
  }

  if (noProfile) {
    return (
      <ScreenContainer>
        <HeroTitle title="Маркетплейс" />
        <Text style={styles.subHero}>Частные тренировки</Text>
        <View style={styles.emptyBox}>
          <Text style={styles.emptyTitle}>Профиль маркетплейса не подключён</Text>
          <Text style={styles.emptyText}>
            Этот раздел только для независимых тренеров с оформленным профилем в маркетплейсе.
            Школьные команды и расписание школы здесь не отображаются.
          </Text>
        </View>
      </ScreenContainer>
    );
  }

  if (error) {
    return (
      <ScreenContainer>
        <HeroTitle title="Маркетплейс" />
        <Text style={styles.subHero}>Бронирования</Text>
        <Text style={styles.errorText}>{error}</Text>
        <Pressable onPress={load} style={styles.retryBtn}>
          <Text style={styles.retryLabel}>Повторить</Text>
        </Pressable>
      </ScreenContainer>
    );
  }

  return (
    <ScreenContainer scroll={false}>
      <HeroTitle title="Маркетплейс" />
      <Text style={styles.subHero}>Бронирования слотов</Text>
      <FlatList
        data={rows}
        keyExtractor={(item) => item.id}
        contentContainerStyle={
          rows.length === 0 ? styles.listEmpty : styles.list
        }
        ListHeaderComponent={
          rows.length > 0 ? (
            <Text style={styles.listLegend}>
              Метки: бронь (слева) · оплата (справа)
            </Text>
          ) : null
        }
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor={theme.colors.primary}
          />
        }
        ListEmptyComponent={
          <View style={styles.emptyBox}>
            <Text style={styles.emptyTitle}>Пока нет заявок</Text>
            <Text style={styles.emptyText}>
              Когда родитель забронирует ваш слот, заявка появится здесь.
            </Text>
          </View>
        }
        renderItem={({ item }) => (
          <BookingRow
            item={item}
            onPress={() =>
              router.push(`/marketplace-bookings/${item.id}` as Href)
            }
          />
        )}
      />
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  subHero: {
    ...theme.typography.subtitle,
    color: theme.colors.textSecondary,
    marginTop: -theme.spacing.md,
    marginBottom: theme.spacing.lg,
  },
  listLegend: {
    ...theme.typography.caption,
    color: theme.colors.textMuted,
    marginBottom: theme.spacing.sm,
  },
  skel: {
    marginBottom: theme.spacing.md,
    borderRadius: theme.borderRadius.md,
  },
  list: {
    paddingBottom: theme.spacing.xl,
    gap: theme.spacing.md,
  },
  listEmpty: {
    flexGrow: 1,
  },
  card: {
    backgroundColor: theme.colors.surfaceElevated,
    borderRadius: theme.borderRadius.lg,
    padding: theme.spacing.md,
    marginBottom: theme.spacing.md,
    borderWidth: 1,
    borderColor: theme.colors.cardBorder,
  },
  cardPressed: { opacity: 0.9 },
  cardTop: {
    marginBottom: theme.spacing.xs,
    gap: theme.spacing.xs,
  },
  pillRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: theme.spacing.xs,
    alignItems: 'center',
  },
  parentName: {
    ...theme.typography.subtitle,
    color: theme.colors.text,
  },
  payPill: {
    paddingHorizontal: theme.spacing.sm,
    paddingVertical: 4,
    borderRadius: theme.borderRadius.sm,
    backgroundColor: theme.colors.surface,
    borderWidth: 1,
    borderColor: theme.colors.cardBorder,
  },
  payPillPaid: {
    backgroundColor: 'rgba(34, 197, 94, 0.18)',
    borderColor: 'rgba(34, 197, 94, 0.4)',
  },
  payPillMuted: {
    opacity: 0.85,
  },
  payPillFailed: {
    backgroundColor: 'rgba(239, 68, 68, 0.12)',
    borderColor: 'rgba(239, 68, 68, 0.35)',
  },
  payPillPending: {
    backgroundColor: theme.colors.primaryMuted,
    borderColor: theme.colors.primary,
  },
  payPillDefault: {
    opacity: 0.95,
  },
  payPillText: {
    fontSize: 11,
    fontWeight: '600',
    color: theme.colors.textSecondary,
  },
  phone: {
    ...theme.typography.caption,
    color: theme.colors.textSecondary,
    marginBottom: theme.spacing.xs,
  },
  playerHint: {
    ...theme.typography.caption,
    color: theme.colors.textMuted,
    marginBottom: theme.spacing.sm,
  },
  metaRow: { marginBottom: theme.spacing.sm },
  meta: {
    ...theme.typography.body,
    color: theme.colors.text,
  },
  footer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  type: {
    ...theme.typography.caption,
    color: theme.colors.textSecondary,
  },
  price: {
    ...theme.typography.subtitle,
    color: theme.colors.primary,
    fontWeight: '700',
  },
  pill: {
    paddingHorizontal: theme.spacing.sm,
    paddingVertical: 4,
    borderRadius: theme.borderRadius.sm,
    backgroundColor: theme.colors.accentMuted,
  },
  pillPending: {
    backgroundColor: 'rgba(245, 166, 35, 0.2)',
  },
  pillOk: {
    backgroundColor: theme.colors.primaryMuted,
  },
  pillCancelled: {
    backgroundColor: 'rgba(255, 77, 106, 0.15)',
  },
  pillText: {
    fontSize: 12,
    fontWeight: '600',
    color: theme.colors.text,
  },
  emptyBox: {
    paddingVertical: theme.spacing.xl,
  },
  emptyTitle: {
    ...theme.typography.title,
    color: theme.colors.text,
    marginBottom: theme.spacing.sm,
  },
  emptyText: {
    ...theme.typography.body,
    color: theme.colors.textSecondary,
    lineHeight: 22,
  },
  errorText: {
    ...theme.typography.body,
    color: theme.colors.error,
    marginBottom: theme.spacing.md,
  },
  retryBtn: {
    alignSelf: 'flex-start',
    paddingVertical: theme.spacing.sm,
    paddingHorizontal: theme.spacing.lg,
    borderRadius: theme.borderRadius.md,
    backgroundColor: theme.colors.primaryMuted,
  },
  retryLabel: {
    ...theme.typography.subtitle,
    color: theme.colors.primary,
  },
});
