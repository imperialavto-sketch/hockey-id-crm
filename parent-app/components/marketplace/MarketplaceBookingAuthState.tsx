import React from "react";
import { View, Text, StyleSheet } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { PrimaryButton, GhostButton } from "@/components/ui";
import { colors, spacing, typography } from "@/constants/theme";

export type MarketplaceBookingAuthKind =
  | "login_required"
  | "phone_confirmation_required"
  | "session_expired"
  | "forbidden";

const COPY: Record<
  MarketplaceBookingAuthKind,
  { title: string; subtitle: string; primary: string; icon: keyof typeof Ionicons.glyphMap }
> = {
  login_required: {
    title: "Требуется вход",
    subtitle:
      "Войдите в аккаунт родителя, чтобы бронировать занятия у тренеров маркетплейса и видеть свои брони.",
    primary: "Войти",
    icon: "log-in-outline",
  },
  phone_confirmation_required: {
    title: "Подтвердите телефон",
    subtitle:
      "Для бронирования в маркетплейсе войдите по номеру телефона с SMS-кодом — так бронь привяжется к вашему аккаунту.",
    primary: "Войти по телефону",
    icon: "phone-portrait-outline",
  },
  session_expired: {
    title: "Сессия истекла",
    subtitle: "Войдите снова, чтобы продолжить работу с бронированиями.",
    primary: "Войти снова",
    icon: "time-outline",
  },
  forbidden: {
    title: "Нет доступа",
    subtitle:
      "Этот раздел доступен только родительскому аккаунту. Если вы вошли под другой ролью, переключите профиль.",
    primary: "К входу",
    icon: "shield-outline",
  },
};

type Props = {
  kind: MarketplaceBookingAuthKind;
  onPrimary: () => void;
  secondaryLabel?: string;
  onSecondary?: () => void;
};

export function MarketplaceBookingAuthState({
  kind,
  onPrimary,
  secondaryLabel,
  onSecondary,
}: Props) {
  const c = COPY[kind];
  return (
    <View style={styles.wrap}>
      <Ionicons name={c.icon} size={48} color={colors.textMuted} />
      <Text style={styles.title}>{c.title}</Text>
      <Text style={styles.subtitle}>{c.subtitle}</Text>
      <PrimaryButton label={c.primary} onPress={onPrimary} />
      {secondaryLabel && onSecondary ? (
        <GhostButton label={secondaryLabel} onPress={onSecondary} />
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    flex: 1,
    justifyContent: "center",
    paddingHorizontal: spacing.xxl,
    gap: spacing.lg,
    alignItems: "center",
  },
  title: { ...typography.h2, color: colors.text, textAlign: "center" },
  subtitle: {
    ...typography.bodySmall,
    color: colors.textSecondary,
    textAlign: "center",
    lineHeight: 20,
    marginBottom: spacing.sm,
  },
});
