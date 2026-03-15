import React, { useState, useCallback } from "react";
import {
  View,
  Text,
  FlatList,
  Image,
  Pressable,
  StyleSheet,
  RefreshControl,
  Alert,
} from "react-native";
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withSpring,
} from "react-native-reanimated";
import { useRouter, useFocusEffect } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { EmptyBookingsState } from "@/components/marketplace/EmptyBookingsState";
import { BookingStatusBadge } from "@/components/marketplace/BookingStatusBadge";
import { FlagshipScreen } from "@/components/layout/FlagshipScreen";
import { SkeletonBlock, ErrorStateView } from "@/components/ui";
import { screenReveal, STAGGER } from "@/lib/animations";
import { triggerHaptic } from "@/lib/haptics";
import { getBookings } from "@/services/bookingService";
import { useAuth } from "@/context/AuthContext";
import { colors, spacing, typography, radius } from "@/constants/theme";
import type { Booking } from "@/types/booking";

const PRESSED_OPACITY = 0.88;

const STATUS_LABELS: Record<string, string> = {
  confirmed: "Подтверждено",
  pending: "Ожидает",
  cancelled: "Отменено",
  completed: "Завершено",
};
const FORMAT_LABELS: Record<string, string> = {
  ice: "Лёд",
  gym: "Зал",
  online: "Онлайн",
};

const FORMAT_ICONS: Record<string, keyof typeof Ionicons.glyphMap> = {
  ice: "snow-outline",
  gym: "fitness-outline",
  online: "desktop-outline",
};

function BookingCard({
  booking,
  onPress,
}: {
  booking: Booking;
  onPress: () => void;
}) {
  const scale = useSharedValue(1);
  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));

  const dateFormatted = new Date(
    booking.bookingDate + "T12:00:00"
  ).toLocaleDateString("ru-RU", { day: "numeric", month: "short" });
  const formatIcon = FORMAT_ICONS[booking.format] ?? "calendar-outline";

  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={`Бронирование ${booking.coach.fullName}`}
      onPressIn={() => {
        scale.value = withSpring(0.98, { damping: 15, stiffness: 400 });
      }}
      onPressOut={() => {
        scale.value = withSpring(1);
      }}
      style={({ pressed }) => [styles.cardWrap, pressed && { opacity: PRESSED_OPACITY }]}
    >
      <Animated.View style={[styles.card, animatedStyle]}>
        <View style={styles.cardRow}>
          <View style={styles.avatarWrap}>
            {booking.coach.photoUrl ? (
              <Image
                source={{ uri: booking.coach.photoUrl }}
                style={styles.avatar}
                resizeMode="cover"
              />
            ) : (
              <View style={[styles.avatar, styles.avatarPlaceholder]}>
                <Ionicons name="person" size={24} color={colors.textMuted} />
              </View>
            )}
          </View>
          <View style={styles.cardContent}>
            <Text style={styles.coachName}>{booking.coach.fullName}</Text>
            <Text style={styles.spec}>{booking.coach.specialization}</Text>
            <View style={styles.metaRow}>
              <Ionicons name="calendar-outline" size={14} color={colors.textSecondary} />
              <Text style={styles.meta}>
                {dateFormatted} · {booking.bookingTime}
              </Text>
            </View>
            <View style={styles.footerRow}>
              <View style={styles.formatBadge}>
                <Ionicons name={formatIcon} size={12} color={colors.textSecondary} />
                <Text style={styles.formatText}>
                  {FORMAT_LABELS[booking.format] ?? booking.format}
                </Text>
              </View>
              <Text style={styles.price}>
                {booking.priceBreakdown.totalAmount.toLocaleString("ru")} ₽
              </Text>
            </View>
          </View>
          <BookingStatusBadge
            status={booking.status}
            paymentStatus={booking.paymentStatus}
          />
        </View>
      </Animated.View>
    </Pressable>
  );
}

function BookingsSkeleton() {
  return (
    <View style={styles.skeletonContent}>
      <SkeletonBlock height={120} style={styles.skeletonCard} />
      <SkeletonBlock height={120} style={styles.skeletonCard} />
      <SkeletonBlock height={120} style={styles.skeletonCard} />
      <SkeletonBlock height={120} style={styles.skeletonCard} />
    </View>
  );
}

export default function BookingsListScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { user } = useAuth();
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    setError(false);
    try {
      const data = await getBookings(user?.id);
      setBookings(data);
    } catch {
      setBookings([]);
      setError(true);
    } finally {
      setLoading(false);
    }
  }, [user?.id]);

  useFocusEffect(
    useCallback(() => {
      load();
    }, [load])
  );

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await load();
    setRefreshing(false);
  }, [load]);

  const handleCardPress = useCallback((item: Booking) => {
    triggerHaptic();
    const d = new Date(item.bookingDate + "T12:00:00").toLocaleDateString(
      "ru-RU",
      { day: "numeric", month: "long", year: "numeric" }
    );
    const statusStr = STATUS_LABELS[item.status] ?? item.status;
    const formatStr = FORMAT_LABELS[item.format] ?? item.format;
    const lines = [
      item.coach.specialization,
      `${d} · ${item.bookingTime}`,
      `${item.duration} мин · ${formatStr}`,
      `${item.priceBreakdown.totalAmount.toLocaleString("ru")} ₽`,
      `Статус: ${statusStr}`,
    ];
    Alert.alert(item.coach.fullName, lines.join("\n"), [{ text: "OK" }]);
  }, []);

  const header = (
    <View style={[styles.customHeader, { paddingTop: insets.top + spacing.lg }]}>
      <Pressable
        style={({ pressed }) => [styles.backBtn, pressed && { opacity: PRESSED_OPACITY }]}
        onPress={() => {
          triggerHaptic();
          router.back();
        }}
        accessibilityRole="button"
        accessibilityLabel="Назад"
      >
        <Ionicons name="arrow-back" size={24} color="#ffffff" />
      </Pressable>
      <Text style={styles.headerTitle}>Мои бронирования</Text>
      <View style={styles.headerBtn} />
    </View>
  );

  const listBottomPadding = spacing.xxl + insets.bottom;

  if (loading) {
    return (
      <FlagshipScreen header={header} scroll={false}>
        <View style={styles.paddedContent}>
          <BookingsSkeleton />
        </View>
      </FlagshipScreen>
    );
  }

  if (error) {
    return (
      <FlagshipScreen header={header} scroll={false}>
        <ErrorStateView
          variant="network"
          title="Не удалось загрузить бронирования"
          subtitle="Проверьте подключение и попробуйте снова"
          onAction={load}
          style={styles.errorWrap}
        />
      </FlagshipScreen>
    );
  }

  if (bookings.length === 0) {
    return (
      <FlagshipScreen header={header} scroll={false}>
        <View style={styles.emptyWrap}>
          <EmptyBookingsState
            onFindCoach={() => router.replace("/marketplace/coaches")}
          />
        </View>
      </FlagshipScreen>
    );
  }

  return (
    <FlagshipScreen header={header} scroll={false}>
      <FlatList
        data={bookings}
        keyExtractor={(item) => item.id}
        contentContainerStyle={[
          styles.list,
          { paddingBottom: listBottomPadding },
        ]}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor={colors.accent}
          />
        }
        renderItem={({ item, index }) => (
          <Animated.View entering={screenReveal(STAGGER + index * 40)}>
            <BookingCard
              booking={item}
              onPress={() => handleCardPress(item)}
            />
          </Animated.View>
        )}
      />
    </FlagshipScreen>
  );
}

const styles = StyleSheet.create({
  customHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: spacing.screenPadding,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: colors.surfaceLevel1Border,
  },
  backBtn: {
    width: 40,
    height: 40,
    alignItems: "center",
    justifyContent: "center",
    marginLeft: -8,
  },
  headerTitle: { fontSize: 18, fontWeight: "700", lineHeight: 22, color: "#ffffff" },
  headerBtn: { width: 40, height: 40 },

  paddedContent: {
    flex: 1,
    paddingHorizontal: spacing.screenPadding,
    paddingTop: spacing.lg,
  },
  skeletonContent: { gap: spacing.lg },
  skeletonCard: { borderRadius: radius.lg },

  errorWrap: { flex: 1 },
  emptyWrap: {
    flex: 1,
    justifyContent: "center",
  },

  list: {
    paddingHorizontal: spacing.screenPadding,
    paddingTop: spacing.lg,
  },
  cardWrap: {
    marginBottom: spacing.lg,
  },
  card: {
    backgroundColor: colors.surfaceLevel1,
    borderRadius: radius.lg,
    padding: spacing.lg,
    borderWidth: 1,
    borderColor: colors.surfaceLevel1Border,
    overflow: "hidden",
  },
  cardRow: {
    flexDirection: "row",
    alignItems: "flex-start",
  },
  avatarWrap: {
    marginRight: spacing.lg,
  },
  avatar: {
    width: 56,
    height: 56,
    borderRadius: radius.sm,
  },
  avatarPlaceholder: {
    backgroundColor: colors.surfaceLevel2,
    alignItems: "center",
    justifyContent: "center",
  },
  cardContent: {
    flex: 1,
    minWidth: 0,
  },
  coachName: {
    ...typography.cardTitle,
    color: colors.text,
    marginBottom: spacing.xs,
  },
  spec: {
    ...typography.caption,
    color: colors.textSecondary,
    marginBottom: spacing.sm,
  },
  metaRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.xs,
    marginBottom: spacing.sm,
  },
  meta: {
    ...typography.bodySmall,
    color: colors.textSecondary,
  },
  footerRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  formatBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.xs,
    paddingVertical: spacing.xs,
    paddingHorizontal: spacing.sm,
    backgroundColor: colors.surfaceLevel2,
    borderRadius: 8,
  },
  formatText: {
    ...typography.captionSmall,
    color: colors.textSecondary,
  },
  price: {
    ...typography.body,
    fontWeight: "700",
    color: colors.accent,
  },
});
