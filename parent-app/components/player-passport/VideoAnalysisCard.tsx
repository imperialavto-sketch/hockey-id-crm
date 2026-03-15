import { View, Text, StyleSheet } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import type { PlayerVideoAnalysis } from "@/types";

interface VideoAnalysisCardProps {
  item: PlayerVideoAnalysis;
}

function formatDate(iso: string): string {
  const d = new Date(iso);
  return d.toLocaleDateString("ru-RU", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

export function VideoAnalysisCard({ item }: VideoAnalysisCardProps) {
  return (
    <View style={styles.card}>
      <View style={styles.preview}>
        <View style={styles.previewPlaceholder}>
          <Ionicons name="videocam" size={40} color="rgba(255,255,255,0.5)" />
          <Text style={styles.previewDate}>{formatDate(item.createdAt)}</Text>
        </View>
      </View>
      {item.analysisText ? (
        <Text style={styles.summary} numberOfLines={3}>
          {item.analysisText}
        </Text>
      ) : null}
      {(item.strengths ?? []).length > 0 && (
        <View style={styles.section}>
          <Text style={styles.label}>Сильные стороны</Text>
          {(item.strengths ?? []).slice(0, 3).map((s, i) => (
            <View key={i} style={styles.listRow}>
              <Ionicons name="checkmark-circle" size={14} color="#22c55e" />
              <Text style={styles.listText}>{s}</Text>
            </View>
          ))}
        </View>
      )}
      {(item.growthAreas ?? []).length > 0 && (
        <View style={styles.section}>
          <Text style={styles.label}>Зоны роста</Text>
          {(item.growthAreas ?? []).slice(0, 3).map((s, i) => (
            <View key={i} style={styles.listRow}>
              <Ionicons name="trending-up" size={14} color="#3b82f6" />
              <Text style={styles.listText}>{s}</Text>
            </View>
          ))}
        </View>
      )}
      {(item.recommendations ?? []).length > 0 && (
        <View style={styles.section}>
          <Text style={styles.label}>Рекомендации</Text>
          {(item.recommendations ?? []).slice(0, 3).map((s, i) => (
            <View key={i} style={styles.listRow}>
              <Text style={styles.bullet}>•</Text>
              <Text style={styles.listText}>{s}</Text>
            </View>
          ))}
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: "rgba(30, 41, 59, 0.6)",
    borderRadius: 16,
    overflow: "hidden",
    marginBottom: 12,
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.06)",
  },
  preview: {
    height: 120,
    backgroundColor: "rgba(0, 0, 0, 0.3)",
  },
  previewPlaceholder: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
  },
  previewDate: {
    fontSize: 12,
    color: "rgba(255, 255, 255, 0.5)",
  },
  summary: {
    fontSize: 14,
    color: "rgba(255, 255, 255, 0.9)",
    lineHeight: 20,
    padding: 16,
    paddingBottom: 0,
  },
  section: {
    paddingHorizontal: 16,
    paddingTop: 12,
    paddingBottom: 4,
  },
  label: {
    fontSize: 12,
    fontWeight: "600",
    color: "rgba(255, 255, 255, 0.5)",
    marginBottom: 6,
  },
  listRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    marginBottom: 4,
    gap: 8,
  },
  bullet: {
    fontSize: 14,
    color: "#3b82f6",
  },
  listText: {
    flex: 1,
    fontSize: 13,
    color: "rgba(255, 255, 255, 0.85)",
    lineHeight: 18,
  },
});
