import React, { useState, useCallback } from "react";
import {
  StyleSheet,
  Text,
  View,
  Pressable,
  ActivityIndicator,
} from "react-native";
import { useRouter } from "expo-router";
import { useFocusEffect } from "@react-navigation/native";
import { SectionCard } from "@/components/ui/SectionCard";
import {
  getCoachHomePriorities,
  type CoachHomePriorityItem,
  type CoachHomePriorityType,
} from "@/lib/coachHomePrioritiesHelpers";
import { theme } from "@/constants/theme";

const TYPE_LABELS: Record<CoachHomePriorityType, string> = {
  player_attention: "Требует внимания",
  report_ready: "Готов отчёт",
  parent_draft: "Сообщение",
  session_followup: "Следующий шаг",
};

function PriorityRow({
  item,
  onPress,
}: {
  item: CoachHomePriorityItem;
  onPress: () => void;
}) {
  const label = TYPE_LABELS[item.type];
  return (
    <Pressable
      style={({ pressed }) => [styles.row, pressed && styles.pressed]}
      onPress={onPress}
    >
      <View style={styles.rowContent}>
        <Text style={styles.typeLabel}>{label}</Text>
        <Text style={styles.title} numberOfLines={1}>
          {item.title}
        </Text>
        <Text style={styles.subtitle} numberOfLines={1}>
          {item.subtitle}
        </Text>
      </View>
      <Text style={styles.cta}>{item.ctaLabel}</Text>
    </Pressable>
  );
}

export function CoachHomePrioritiesBlock() {
  const router = useRouter();
  const [items, setItems] = useState<CoachHomePriorityItem[]>([]);
  const [loading, setLoading] = useState(true);

  useFocusEffect(
    useCallback(() => {
      setLoading(true);
      getCoachHomePriorities().then((data) => {
        setItems(data);
        setLoading(false);
      });
    }, [])
  );

  if (loading) {
    return (
      <SectionCard elevated style={styles.card}>
        <View style={styles.loading}>
          <ActivityIndicator size="small" color={theme.colors.primary} />
          <Text style={styles.loadingText}>Загрузка…</Text>
        </View>
      </SectionCard>
    );
  }

  if (items.length === 0) {
    return (
      <SectionCard elevated style={styles.card}>
        <Text style={styles.emptyTitle}>Пока нет срочных приоритетов</Text>
        <Text style={styles.emptySubtitle}>
          Запишите тренировку
        </Text>
      </SectionCard>
    );
  }

  return (
    <SectionCard elevated style={styles.card}>
      {items.map((item, i) => (
        <View key={`${item.playerId}-${item.type}`}>
          {i > 0 && <View style={styles.rowBorder} />}
          <PriorityRow
            item={item}
            onPress={() => router.push(item.ctaRoute as Parameters<typeof router.push>[0])}
          />
        </View>
      ))}
    </SectionCard>
  );
}

const styles = StyleSheet.create({
  card: {
    borderLeftWidth: 4,
    borderLeftColor: theme.colors.primary,
  },
  loading: {
    flexDirection: "row",
    alignItems: "center",
    gap: theme.spacing.sm,
    paddingVertical: theme.spacing.md,
  },
  loadingText: {
    ...theme.typography.body,
    color: theme.colors.textMuted,
  },
  emptyTitle: {
    ...theme.typography.subtitle,
    color: theme.colors.text,
    marginBottom: theme.spacing.xs,
  },
  emptySubtitle: {
    ...theme.typography.caption,
    color: theme.colors.textMuted,
  },
  row: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingVertical: theme.spacing.sm,
  },
  rowBorder: {
    borderTopWidth: 1,
    borderTopColor: theme.colors.border,
  },
  rowContent: {
    flex: 1,
    marginRight: theme.spacing.md,
  },
  typeLabel: {
    fontSize: 11,
    fontWeight: "600",
    color: theme.colors.primary,
    textTransform: "uppercase",
    letterSpacing: 0.3,
    marginBottom: 2,
  },
  title: {
    ...theme.typography.subtitle,
    color: theme.colors.text,
  },
  subtitle: {
    ...theme.typography.caption,
    color: theme.colors.textSecondary,
    marginTop: 2,
  },
  cta: {
    fontSize: 14,
    fontWeight: "600",
    color: theme.colors.primary,
  },
  pressed: {
    opacity: 0.8,
  },
});
