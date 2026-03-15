import React from "react";
import { View, Text, Pressable, StyleSheet } from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { Share2, Download } from "lucide-react-native";
import { GlassCard } from "@/components/shared/GlassCard";
import { colors } from "@/constants/theme";

interface ShareButtonProps {
  label: string;
  icon: "share" | "save";
  onPress: () => void;
}

const ICONS = {
  share: Share2,
  save: Download,
};

export function ShareButton({ label, icon, onPress }: ShareButtonProps) {
  const Icon = ICONS[icon];
  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [styles.wrap, pressed && styles.pressed]}
    >
      <LinearGradient
        colors={[
          "rgba(37,99,235,0.35)",
          "rgba(124,58,237,0.25)",
          "rgba(239,68,68,0.15)",
        ]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={styles.gradient}
      >
        <View style={styles.iconWrap}>
          <Icon size={22} color={colors.accent} strokeWidth={2.5} />
        </View>
        <Text style={styles.label}>{label}</Text>
      </LinearGradient>
    </Pressable>
  );
}

interface ShareButtonsProps {
  onShare: () => void;
  onSave: () => void;
}

export function ShareButtons({ onShare, onSave }: ShareButtonsProps) {
  return (
    <GlassCard variant="subtle" style={styles.card}>
      <View style={styles.row}>
        <ShareButton label="Поделиться" icon="share" onPress={onShare} />
        <ShareButton label="Сохранить" icon="save" onPress={onSave} />
      </View>
    </GlassCard>
  );
}

const styles = StyleSheet.create({
  card: {
    marginBottom: 32,
    borderRadius: 28,
  },
  row: {
    flexDirection: "row",
    gap: 16,
  },
  wrap: {
    flex: 1,
    borderRadius: 20,
    overflow: "hidden",
  },
  pressed: {
    opacity: 0.92,
  },
  gradient: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 18,
    paddingHorizontal: 20,
    gap: 12,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 20,
  },
  iconWrap: {
    width: 44,
    height: 44,
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "rgba(0,0,0,0.2)",
    borderWidth: 1,
    borderColor: colors.border,
  },
  label: {
    color: "#F8FAFC",
    fontSize: 16,
    fontWeight: "800",
    letterSpacing: 0.2,
  },
});
