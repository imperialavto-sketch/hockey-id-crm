import React from "react";
import { colors } from "@/constants/theme";
import { View, Text, Pressable, StyleSheet } from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import {
  Share2,
  Download,
  GitCompare,
  Sparkles,
} from "lucide-react-native";
import { GlassCard } from "@/components/shared/GlassCard";

const ACTIONS: { id: string; label: string; Icon: React.ElementType }[] = [
  { id: "share", label: "Share Card", Icon: Share2 },
  { id: "save", label: "Save Image", Icon: Download },
  { id: "compare", label: "Compare", Icon: GitCompare },
  { id: "generate", label: "Generate New", Icon: Sparkles },
];

interface CardActionRowProps {
  onShare: () => void;
  onSave: () => void;
  onCompare: () => void;
  onGenerate: () => void;
}

export function CardActionRow({
  onShare,
  onSave,
  onCompare,
  onGenerate,
}: CardActionRowProps) {
  const handlers: Record<string, () => void> = {
    share: onShare,
    save: onSave,
    compare: onCompare,
    generate: onGenerate,
  };

  return (
    <GlassCard variant="subtle">
      <View style={styles.grid}>
        {ACTIONS.map(({ id, label, Icon }) => (
          <Pressable
            key={id}
            onPress={handlers[id]}
            style={({ pressed }) => [
              styles.action,
              pressed && styles.actionPressed,
            ]}
          >
            <LinearGradient
              colors={["rgba(37,99,235,0.2)", "rgba(124,58,237,0.15)"]}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={styles.iconWrap}
            >
              <Icon size={18} color={colors.accent} strokeWidth={2.5} />
            </LinearGradient>
            <Text style={styles.actionLabel}>{label}</Text>
          </Pressable>
        ))}
      </View>
    </GlassCard>
  );
}

const styles = StyleSheet.create({
  grid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 10,
  },
  action: {
    flex: 1,
    minWidth: "47%",
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    paddingVertical: 12,
    paddingHorizontal: 14,
    backgroundColor: "rgba(255,255,255,0.03)",
    borderRadius: 14,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.05)",
  },
  actionPressed: {
    opacity: 0.9,
    backgroundColor: "rgba(255,255,255,0.06)",
  },
  iconWrap: {
    width: 40,
    height: 40,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderColor: colors.border,
  },
  actionLabel: {
    color: "#F8FAFC",
    fontSize: 13,
    fontWeight: "700",
    letterSpacing: 0.05,
  },
});
