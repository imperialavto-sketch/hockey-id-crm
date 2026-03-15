import React from "react";
import { View, Text, StyleSheet } from "react-native";
import { colors } from "@/constants/theme";
import type { VideoAnalysisStatus } from "@/types/video-analysis";

const LABELS: Record<VideoAnalysisStatus, string> = {
  draft: "Черновик",
  uploading: "Загружается",
  uploaded: "Загружено",
  processing: "Анализируется",
  completed: "Готово",
  failed: "Ошибка",
};

export function AnalysisStatusBadge({ status }: { status: VideoAnalysisStatus }) {
  return (
    <View style={[styles.badge, status === "completed" && styles.ok, status === "failed" && styles.err]}>
      <Text style={[styles.text, status === "completed" && styles.textOk, status === "failed" && styles.textErr]}>
        {LABELS[status]}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  badge: {
    paddingVertical: 6,
    paddingHorizontal: 10,
    borderRadius: 10,
    backgroundColor: colors.borderLight,
  },
  ok: { backgroundColor: "rgba(34,197,94,0.2)" },
  err: { backgroundColor: "rgba(239,68,68,0.2)" },
  text: { fontSize: 12, fontWeight: "700", color: colors.textSecondary },
  textOk: { color: "#22C55E" },
  textErr: { color: "#EF4444" },
});
