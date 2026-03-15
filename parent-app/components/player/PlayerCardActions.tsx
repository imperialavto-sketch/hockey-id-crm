import React from "react";
import { View, Text, Pressable, StyleSheet, Platform } from "react-native";
import { BlurView } from "expo-blur";
import { Share2, Download, Sparkles, RotateCcw } from "lucide-react-native";

interface PlayerCardActionsProps {
  onShare?: () => void;
  onSave?: () => void;
  onGenerate?: () => void;
  onRevealAgain?: () => void;
}

const ACTIONS = [
  { key: "share", label: "Поделиться", icon: Share2, prop: "onShare" },
  { key: "save", label: "Сохранить", icon: Download, prop: "onSave" },
  { key: "generate", label: "Создать карточку", icon: Sparkles, prop: "onGenerate" },
  { key: "reveal", label: "Ещё раз", icon: RotateCcw, prop: "onRevealAgain" },
] as const;

export function PlayerCardActions({
  onShare,
  onSave,
  onGenerate,
  onRevealAgain,
}: PlayerCardActionsProps) {
  const handlers = { onShare, onSave, onGenerate, onRevealAgain };

  const content = (
    <View style={styles.inner}>
      <View style={styles.row}>
        {ACTIONS.map(({ key, label, icon: Icon, prop }) => {
          const onPress = handlers[prop as keyof typeof handlers];
          return (
            <Pressable
              key={key}
              onPress={onPress}
              style={({ pressed }) => [
                styles.btn,
                key === "share" && styles.btnPrimary,
                pressed && styles.pressed,
              ]}
            >
              <Icon
                size={20}
                color={key === "share" ? "#020617" : "#F8FAFC"}
                strokeWidth={2.5}
              />
              <Text
                style={[
                  styles.btnLabel,
                  key === "share" && styles.btnLabelPrimary,
                ]}
                numberOfLines={1}
              >
                {label}
              </Text>
            </Pressable>
          );
        })}
      </View>
    </View>
  );

  if (Platform.OS === "web") {
    return (
      <View style={[styles.container, styles.webFallback]}>{content}</View>
    );
  }

  return (
    <BlurView intensity={20} tint="dark" style={styles.container}>
      {content}
    </BlurView>
  );
}

const styles = StyleSheet.create({
  container: {
    borderRadius: 24,
    overflow: "hidden",
    backgroundColor: "rgba(255,255,255,0.06)",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.08)",
    shadowColor: "#000",
    shadowOpacity: 0.35,
    shadowRadius: 40,
    shadowOffset: { width: 0, height: 10 },
    elevation: 12,
  },
  webFallback: {
    backgroundColor: "rgba(255,255,255,0.06)",
  },
  inner: {
    padding: 16,
  },
  row: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 12,
  },
  btn: {
    flex: 1,
    minWidth: "45%",
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 10,
    paddingVertical: 16,
    paddingHorizontal: 20,
    borderRadius: 16,
    backgroundColor: "rgba(255,255,255,0.04)",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.08)",
  },
  btnPrimary: {
    backgroundColor: "#3B82F6",
    borderColor: "rgba(59,130,246,0.4)",
  },
  btnLabel: {
    color: "#FFFFFF",
    fontSize: 15,
    fontWeight: "700",
  },
  btnLabelPrimary: {
    color: "#020617",
  },
  pressed: {
    opacity: 0.85,
  },
});
