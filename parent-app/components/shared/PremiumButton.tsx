import React from "react";
import {
  View,
  Text,
  Pressable,
  StyleSheet,
  ActivityIndicator,
} from "react-native";
import { LinearGradient } from "expo-linear-gradient";

interface PremiumButtonProps {
  label: string;
  onPress: () => void;
  variant?: "primary" | "secondary" | "outline";
  loading?: boolean;
  icon?: React.ReactNode;
}

export function PremiumButton({
  label,
  onPress,
  variant = "primary",
  loading = false,
  icon,
}: PremiumButtonProps) {
  const isPrimary = variant === "primary";
  const isOutline = variant === "outline";

  const content = (
    <>
      {loading ? (
        <ActivityIndicator size="small" color="#fff" />
      ) : (
        <>
          {icon}
          <Text
            style={[
              styles.text,
              isOutline && styles.textOutline,
              icon ? styles.textWithIcon : undefined,
            ]}
          >
            {label}
          </Text>
        </>
      )}
    </>
  );

  if (isPrimary) {
    return (
      <Pressable
        onPress={onPress}
        disabled={loading}
        style={({ pressed }) => [
          styles.pressable,
          pressed && styles.pressed,
        ]}
      >
        <LinearGradient
          colors={["#2563EB", "#3B82F6", "#EF4444"]}
          start={{ x: 0, y: 0.5 }}
          end={{ x: 1, y: 0.5 }}
          style={styles.gradient}
        >
          {content}
        </LinearGradient>
      </Pressable>
    );
  }

  if (isOutline) {
    return (
      <Pressable
        onPress={onPress}
        disabled={loading}
        style={({ pressed }) => [
          styles.pressable,
          styles.outline,
          pressed && styles.pressed,
        ]}
      >
        {content}
      </Pressable>
    );
  }

  return (
    <Pressable
      onPress={onPress}
      disabled={loading}
      style={({ pressed }) => [
        styles.pressable,
        styles.secondary,
        pressed && styles.pressed,
      ]}
    >
      {content}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  pressable: {
    borderRadius: 16,
    overflow: "hidden",
    minHeight: 52,
    justifyContent: "center",
    alignItems: "center",
  },
  gradient: {
    flex: 1,
    width: "100%",
    minHeight: 52,
    justifyContent: "center",
    alignItems: "center",
    flexDirection: "row",
    gap: 10,
  },
  secondary: {
    backgroundColor: "rgba(255,255,255,0.1)",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.14)",
  },
  outline: {
    backgroundColor: "transparent",
    borderWidth: 2,
    borderColor: "#2563EB",
  },
  text: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "800",
  },
  textOutline: {
    color: "#2563EB",
  },
  textWithIcon: {
    marginLeft: 4,
  },
  pressed: {
    opacity: 0.88,
  },
});
