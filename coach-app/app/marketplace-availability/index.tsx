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
import { PrimaryButton } from '@/components/ui/PrimaryButton';
import { SkeletonBlock } from '@/components/ui/SkeletonBlock';
import { theme } from '@/constants/theme';
import {
  fetchMyMarketplaceAvailability,
  NoMarketplaceCoachProfileError,
  type CoachAvailabilitySlot,
} from '@/services/coachAvailabilityService';

const TYPE_LABEL: Record<string, string> = {
  ice: 'Лёд',
  gym: 'Зал',
  private: 'Индив.',
};

function BookedPill({ booked }: { booked: boolean }) {
  return (
    <View style={[styles.statePill, booked ? styles.stateBooked : styles.stateFree]}>
      <Text style={[styles.statePillText, booked && styles.stateBookedText]}>
        {booked ? 'Занят' : 'Свободен'}
      </Text>
    </View>
  );
}

function SlotCard({
  item,
  onPress,
}: {
  item: CoachAvailabilitySlot;
  onPress: () => void;
}) {
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
        <Text style={styles.dateText}>{dateStr}</Text>
        <BookedPill booked={item.isBooked} />
      </View>
      <Text style={styles.timeText}>
        {item.startTime} – {item.endTime}
      </Text>
      <View style={styles.cardFooter}>
        <View style={styles.typePill}>
          <Text style={styles.typePillText}>{TYPE_LABEL[item.type] ?? item.type}</Text>
        </View>
        <Text style={styles.priceText}>{item.price.toLocaleString('ru')} ₽</Text>
      </View>
    </Pressable>
  );
}

export default function MarketplaceAvailabilityListScreen() {
  const router = useRouter();
  const [rows, setRows] = useState<CoachAvailabilitySlot[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [noProfile, setNoProfile] = useState(false);

  const load = useCallback(async () => {
    setError(null);
    setNoProfile(false);
    try {
      const data = await fetchMyMarketplaceAvailability();
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
        <Text style={styles.subHero}>Доступность слотов</Text>
        <SkeletonBlock height={96} style={styles.skel} />
        <SkeletonBlock height={96} style={styles.skel} />
      </ScreenContainer>
    );
  }

  if (noProfile) {
    return (
      <ScreenContainer>
        <HeroTitle title="Маркетплейс" />
        <Text style={styles.subHero}>Доступность</Text>
        <View style={styles.emptyBox}>
          <Text style={styles.emptyTitle}>Профиль не подключён</Text>
          <Text style={styles.emptyText}>
            Управление слотами доступно только независимым тренерам маркетплейса. Расписание школы и
            команды здесь не отображаются.
          </Text>
        </View>
      </ScreenContainer>
    );
  }

  if (error) {
    return (
      <ScreenContainer>
        <HeroTitle title="Маркетплейс" />
        <Text style={styles.subHero}>Доступность</Text>
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
      <Text style={styles.subHero}>Доступность слотов</Text>
      <PrimaryButton
        title="Добавить слот"
        onPress={() => router.push('/marketplace-availability/new' as Href)}
        style={styles.addBtn}
      />
      <FlatList
        data={rows}
        keyExtractor={(item) => item.id}
        contentContainerStyle={
          rows.length === 0 ? styles.listEmpty : styles.list
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
            <Text style={styles.emptyTitle}>Нет слотов</Text>
            <Text style={styles.emptyText}>
              Создайте окна, когда родители смогут забронировать тренировку в маркетплейсе.
            </Text>
          </View>
        }
        renderItem={({ item }) => (
          <SlotCard
            item={item}
            onPress={() =>
              router.push(`/marketplace-availability/${item.id}` as Href)
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
  skel: {
    marginBottom: theme.spacing.md,
    borderRadius: theme.borderRadius.md,
  },
  addBtn: {
    marginBottom: theme.spacing.lg,
  },
  list: {
    paddingBottom: theme.spacing.xl,
    gap: theme.spacing.md,
  },
  listEmpty: { flexGrow: 1 },
  card: {
    backgroundColor: theme.colors.surfaceElevated,
    borderRadius: theme.borderRadius.lg,
    padding: theme.spacing.md,
    marginBottom: theme.spacing.md,
    borderWidth: 1,
    borderColor: theme.colors.cardBorder,
  },
  cardPressed: { opacity: 0.92 },
  cardTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: theme.spacing.xs,
  },
  dateText: {
    ...theme.typography.subtitle,
    color: theme.colors.text,
  },
  timeText: {
    ...theme.typography.body,
    color: theme.colors.textSecondary,
    marginBottom: theme.spacing.sm,
  },
  cardFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  typePill: {
    paddingHorizontal: theme.spacing.sm,
    paddingVertical: 4,
    borderRadius: theme.borderRadius.sm,
    backgroundColor: theme.colors.accentMuted,
  },
  typePillText: {
    fontSize: 12,
    fontWeight: '600',
    color: theme.colors.accent,
  },
  priceText: {
    ...theme.typography.subtitle,
    fontWeight: '700',
    color: theme.colors.primary,
  },
  statePill: {
    paddingHorizontal: theme.spacing.sm,
    paddingVertical: 4,
    borderRadius: theme.borderRadius.sm,
  },
  stateFree: {
    backgroundColor: theme.colors.primaryMuted,
  },
  stateBooked: {
    backgroundColor: 'rgba(255, 77, 106, 0.18)',
  },
  statePillText: {
    fontSize: 12,
    fontWeight: '600',
    color: theme.colors.primary,
  },
  stateBookedText: {
    color: theme.colors.error,
  },
  emptyBox: {
    paddingVertical: theme.spacing.lg,
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
