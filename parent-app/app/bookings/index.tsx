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
import Animated from "react-native-reanimated";
import { useRouter, useFocusEffect } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { EmptyBookingsState } from "@/components/marketplace/EmptyBookingsState";
import { FlagshipScreen } from "@/components/layout/FlagshipScreen";
import { SkeletonBlock, ErrorStateView, GhostButton } from "@/components/ui";
import { screenReveal, STAGGER } from "@/lib/animations";
import { triggerHaptic } from "@/lib/haptics";
import {
  getMarketplaceSlotBookingsMe,
  getCoachById,
  cancelMarketplaceSlotBooking,
  type MarketplaceSlotBookingRow,
} from "@/services/marketplaceService";
import { useAuth } from "@/context/AuthContext";
import { MarketplaceBookingAuthState } from "@/components/marketplace/MarketplaceBookingAuthState";
import { ApiRequestError } from "@/lib/api";
import {
  parentBookingPillTone,
  parentBookingStatusLabelRu,
  parentCanCancelMarketplaceBooking,
  parentMarketplaceBookingCrossHint,
  parentPaymentPillTone,
  parentPaymentStatusLabelRu,
} from "@/lib/marketplaceBookingLifecycle";
import { colors, spacing, typography, radius } from "@/constants/theme";

const PRESSED_OPACITY = 0.88;

const TYPE_LABELS: Record<string, string> = {
  ice: "Лёд",
  gym: "Зал",
  private: "Индив.",
};

function formatCardAmount(n: number, fallback: number): string {
  const v = Number.isFinite(n) ? n : fallback;
  const x = Number.isFinite(v) ? Math.max(0, Math.floor(v)) : 0;
  return x.toLocaleString("ru");
}

function formatCardPaidAt(iso: string | null): string | null {
  if (!iso?.trim()) return null;
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return null;
  return d.toLocaleString("ru-RU", {
    day: "numeric",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function PaymentStatusPill({ paymentStatus }: { paymentStatus: string }) {
  const label = parentPaymentStatusLabelRu(paymentStatus);
  const tone = parentPaymentPillTone(paymentStatus);
  return (
    <View
      style={[
        styles.paymentPill,
        tone === "paid" && styles.paymentPillPaid,
        tone === "refunded" && styles.paymentPillRefunded,
        tone === "failed" && styles.paymentPillFailed,
        tone === "pending" && styles.paymentPillPending,
        (tone === "unpaid" || tone === "unknown") && styles.paymentPillUnpaid,
      ]}
    >
      <Text style={styles.paymentPillText}>{label}</Text>
    </View>
  );
}

function BookingStatusPill({ status }: { status: string }) {
  const label = parentBookingStatusLabelRu(status);
  const tone = parentBookingPillTone(status);
  return (
    <View
      style={[
        styles.bookingPill,
        tone === "pending" && styles.bookingPillPending,
        tone === "confirmed" && styles.bookingPillConfirmed,
        tone === "cancelled" && styles.bookingPillCancelled,
        tone === "unknown" && styles.bookingPillUnknown,
      ]}
    >
      <Text style={styles.bookingPillText}>{label}</Text>
    </View>
  );
}

type Row = MarketplaceSlotBookingRow & {
  coachName: string;
  coachPhoto: string | null;
};

function MarketplaceBookingCard({
  row,
  onCancel,
}: {
  row: Row;
  onCancel: () => void;
}) {
  const dateFormatted =
    row.date.length >= 10
      ? new Date(`${row.date}T12:00:00`).toLocaleDateString("ru-RU", {
          day: "numeric",
          month: "short",
        })
      : row.date;
  const canCancel = parentCanCancelMarketplaceBooking(row.status);
  const paidLine = formatCardPaidAt(row.paidAt);
  const crossHint = parentMarketplaceBookingCrossHint({
    status: row.status,
    paymentStatus: row.paymentStatus,
  });

  return (
    <View style={styles.cardWrap}>
      <View style={styles.card}>
        <View style={styles.cardRow}>
          <View style={styles.avatarWrap}>
            {row.coachPhoto ? (
              <Image
                source={{ uri: row.coachPhoto }}
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
            <Text style={styles.coachName} numberOfLines={1}>
              {row.coachName}
            </Text>
            <View style={styles.metaRow}>
              <Ionicons name="calendar-outline" size={14} color={colors.textSecondary} />
              <Text style={styles.meta}>
                {dateFormatted} · {row.startTime}–{row.endTime}
              </Text>
            </View>
            <View style={styles.footerRow}>
              <View style={styles.formatBadge}>
                <Text style={styles.formatText}>
                  {TYPE_LABELS[row.type] ?? row.type}
                </Text>
              </View>
              <Text style={styles.price}>
                {formatCardAmount(row.amountSnapshot, row.price)} ₽
              </Text>
            </View>
            <Text style={styles.statusSectionCaption}>Статус брони</Text>
            <View style={styles.statusRow}>
              <BookingStatusPill status={row.status} />
            </View>
            <Text style={styles.statusSectionCaption}>Оплата</Text>
            <View style={styles.statusRow}>
              <PaymentStatusPill paymentStatus={row.paymentStatus} />
            </View>
            {paidLine ? (
              <Text style={styles.paidAtLine}>Оплачено: {paidLine}</Text>
            ) : null}
            {crossHint ? <Text style={styles.crossHint}>{crossHint}</Text> : null}
            {canCancel && (
              <View style={styles.cancelBtnWrap}>
                <GhostButton label="Отменить бронь" onPress={onCancel} />
              </View>
            )}
          </View>
        </View>
      </View>
    </View>
  );
}

function BookingsSkeleton() {
  return (
    <View style={styles.skeletonContent}>
      <SkeletonBlock height={120} style={styles.skeletonCard} />
      <SkeletonBlock height={120} style={styles.skeletonCard} />
      <SkeletonBlock height={120} style={styles.skeletonCard} />
    </View>
  );
}

export default function BookingsListScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const {
    isLoading: authLoading,
    isAuthenticated,
    hasMarketplaceApiAuth,
    token,
  } = useAuth();
  const [rows, setRows] = useState<Row[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState(false);
  const [listAuthIssue, setListAuthIssue] = useState<
    "none" | "session_expired" | "forbidden"
  >("none");

  const load = useCallback(async () => {
    if (authLoading) {
      setLoading(true);
      return;
    }
    setLoading(true);
    setError(false);
    if (!isAuthenticated) {
      setRows([]);
      setListAuthIssue("none");
      setLoading(false);
      return;
    }
    if (!hasMarketplaceApiAuth) {
      setRows([]);
      setListAuthIssue("none");
      setLoading(false);
      return;
    }
    setListAuthIssue("none");
    try {
      const raw = await getMarketplaceSlotBookingsMe();
      const coachIds = [...new Set(raw.map((r) => r.coachId))];
      const coachMap = new Map<string, { name: string; photo: string | null }>();
      await Promise.all(
        coachIds.map(async (cid) => {
          try {
            const c = await getCoachById(cid);
            coachMap.set(cid, {
              name: c?.fullName ?? "Тренер",
              photo: c?.photoUrl ?? null,
            });
          } catch {
            coachMap.set(cid, { name: "Тренер", photo: null });
          }
        })
      );
      setRows(
        raw.map((r) => ({
          ...r,
          coachName: coachMap.get(r.coachId)?.name ?? "Тренер",
          coachPhoto: coachMap.get(r.coachId)?.photo ?? null,
        }))
      );
    } catch (e) {
      setRows([]);
      if (e instanceof ApiRequestError) {
        if (e.status === 401) {
          setListAuthIssue("session_expired");
          setError(false);
          setLoading(false);
          return;
        }
        if (e.status === 403) {
          setListAuthIssue("forbidden");
          setError(false);
          setLoading(false);
          return;
        }
      }
      setError(true);
    } finally {
      setLoading(false);
    }
  }, [authLoading, isAuthenticated, hasMarketplaceApiAuth, token]);

  useFocusEffect(
    useCallback(() => {
      void load();
    }, [load])
  );

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await load();
    setRefreshing(false);
  }, [load]);

  const confirmCancel = (row: Row) => {
    Alert.alert("Отменить бронь?", "Слот снова станет доступен другим.", [
      { text: "Нет", style: "cancel" },
      {
        text: "Отменить",
        style: "destructive",
        onPress: async () => {
          triggerHaptic();
          const res = await cancelMarketplaceSlotBooking(row.id);
          if (!res.ok) {
            if (res.status === 401) {
              Alert.alert(
                "Сессия истекла",
                "Войдите снова, чтобы управлять бронированиями.",
                [
                  { text: "Отмена", style: "cancel" },
                  { text: "Войти", onPress: () => router.push("/(auth)/login") },
                ]
              );
              return;
            }
            if (res.status === 403) {
              Alert.alert("Нет доступа", res.error || "Операция недоступна.");
              return;
            }
            Alert.alert("Не удалось отменить", res.error);
            return;
          }
          load();
        },
      },
    ]);
  };

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

  if (authLoading || loading) {
    return (
      <FlagshipScreen header={header} scroll={false}>
        <View style={styles.paddedContent}>
          <BookingsSkeleton />
        </View>
      </FlagshipScreen>
    );
  }

  if (!isAuthenticated) {
    return (
      <FlagshipScreen header={header} scroll={false}>
        <MarketplaceBookingAuthState
          kind={listAuthIssue === "session_expired" ? "session_expired" : "login_required"}
          onPrimary={() => router.push("/(auth)/login")}
          secondaryLabel="К тренерам"
          onSecondary={() => router.replace("/marketplace/coaches")}
        />
      </FlagshipScreen>
    );
  }

  if (!hasMarketplaceApiAuth) {
    return (
      <FlagshipScreen header={header} scroll={false}>
        <MarketplaceBookingAuthState
          kind="phone_confirmation_required"
          onPrimary={() => router.push("/(auth)/login")}
          secondaryLabel="К тренерам"
          onSecondary={() => router.replace("/marketplace/coaches")}
        />
      </FlagshipScreen>
    );
  }

  if (listAuthIssue === "forbidden") {
    return (
      <FlagshipScreen header={header} scroll={false}>
        <MarketplaceBookingAuthState
          kind="forbidden"
          onPrimary={() => router.push("/(auth)/login")}
          secondaryLabel="К тренерам"
          onSecondary={() => router.replace("/marketplace/coaches")}
        />
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

  if (rows.length === 0) {
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
        data={rows}
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
            <MarketplaceBookingCard
              row={item}
              onCancel={() => confirmCancel(item)}
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
    flex: 1,
  },
  footerRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: spacing.sm,
  },
  formatBadge: {
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
  statusSectionCaption: {
    ...typography.captionSmall,
    fontWeight: "600",
    color: colors.textMuted,
    marginTop: spacing.sm,
    marginBottom: spacing.xs,
    textTransform: "uppercase",
    letterSpacing: 0.4,
  },
  statusRow: {
    marginBottom: spacing.xs,
    flexDirection: "row",
    flexWrap: "wrap",
    gap: spacing.sm,
    alignItems: "center",
  },
  bookingPill: {
    alignSelf: "flex-start",
    paddingVertical: 6,
    paddingHorizontal: spacing.sm,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: colors.surfaceLevel1Border,
    backgroundColor: colors.surfaceLevel1,
  },
  bookingPillPending: {
    borderColor: colors.warning,
    backgroundColor: "rgba(245, 166, 35, 0.12)",
  },
  bookingPillConfirmed: {
    borderColor: colors.accent,
    backgroundColor: colors.accentSoft,
  },
  bookingPillCancelled: {
    borderColor: colors.textMuted,
    backgroundColor: colors.surfaceLevel2,
    opacity: 0.95,
  },
  bookingPillUnknown: {
    borderStyle: "dashed",
  },
  bookingPillText: {
    ...typography.captionSmall,
    fontWeight: "600",
    color: colors.text,
  },
  paymentPill: {
    alignSelf: "flex-start",
    paddingVertical: 4,
    paddingHorizontal: spacing.sm,
    borderRadius: 8,
    backgroundColor: colors.surfaceLevel2,
    borderWidth: 1,
    borderColor: colors.surfaceLevel1Border,
  },
  paymentPillPaid: {
    backgroundColor: "rgba(34, 197, 94, 0.15)",
    borderColor: "rgba(34, 197, 94, 0.35)",
  },
  paymentPillRefunded: {
    backgroundColor: colors.surfaceLevel2,
    borderColor: colors.textMuted,
  },
  paymentPillFailed: {
    backgroundColor: "rgba(239, 68, 68, 0.12)",
    borderColor: "rgba(239, 68, 68, 0.35)",
  },
  paymentPillPending: {
    backgroundColor: colors.accentSoft,
    borderColor: colors.accent,
  },
  paymentPillUnpaid: {
    backgroundColor: colors.surfaceLevel2,
    borderColor: colors.surfaceLevel1Border,
  },
  paymentPillText: {
    ...typography.captionSmall,
    fontWeight: "600",
    color: colors.textSecondary,
  },
  paidAtLine: {
    ...typography.captionSmall,
    color: colors.textMuted,
    marginBottom: spacing.xs,
  },
  crossHint: {
    ...typography.captionSmall,
    color: colors.textSecondary,
    marginBottom: spacing.sm,
    lineHeight: 18,
  },
  cancelBtnWrap: { marginTop: spacing.sm },
});
