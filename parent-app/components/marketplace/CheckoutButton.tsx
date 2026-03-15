import React from "react";
import { Pressable, Text, ActivityIndicator, StyleSheet } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { triggerHaptic } from "@/lib/haptics";
import { colors, spacing, typography, radius } from "@/constants/theme";

const PRESSED_OPACITY = 0.88;

interface CheckoutButtonProps {
  amount: number;
  loading?: boolean;
  disabled?: boolean;
  onPress: () => void;
}

export function CheckoutButton({
  amount,
  loading = false,
  disabled = false,
  onPress,
}: CheckoutButtonProps) {
  const handlePress = () => {
    if (!loading && !disabled) triggerHaptic();
    onPress();
  };

  return (
    <Pressable
      style={({ pressed }) => [
        styles.btn,
        (disabled || loading) && styles.btnDisabled,
        !disabled && !loading && pressed && { opacity: PRESSED_OPACITY },
      ]}
      onPress={handlePress}
      disabled={disabled || loading}
    >
      {loading ? (
        <ActivityIndicator size="small" color="#020617" />
      ) : (
        <>
          <Ionicons name="card" size={22} color="#020617" />
          <Text style={styles.text}>Оплатить</Text>
          <Text style={styles.amount}>{amount.toLocaleString("ru")} ₽</Text>
        </>
      )}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  btn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: spacing.md,
    height: 56,
    backgroundColor: colors.accent,
    borderRadius: radius.sm,
    paddingHorizontal: spacing.xxl,
    marginTop: spacing.xl,
  },
  btnDisabled: {
    opacity: 0.5,
  },
  text: {
    ...typography.body,
    fontWeight: "800",
    color: "#020617",
  },
  amount: {
    ...typography.body,
    fontWeight: "800",
    color: "#020617",
  },
});
