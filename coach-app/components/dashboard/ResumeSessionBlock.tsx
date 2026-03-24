import React, { useState, useCallback } from "react";
import {
  StyleSheet,
  Text,
  View,
  Alert,
} from "react-native";
import { useRouter } from "expo-router";
import { useFocusEffect } from "@react-navigation/native";
import { DashboardSection } from "@/components/dashboard/DashboardSection";
import { SectionCard } from "@/components/ui/SectionCard";
import { PrimaryButton } from "@/components/ui/PrimaryButton";
import {
  getResumeSessionSummary,
  COACH_INPUT_ROUTE,
  type ResumeSessionSummary,
} from "@/lib/resumeSessionHelpers";
import { resetSessionDraftOnly } from "@/lib/coachInputStorage";
import { theme } from "@/constants/theme";

function pluralObservation(n: number): string {
  const m10 = n % 10;
  const m100 = n % 100;
  if (m10 === 1 && m100 !== 11) return "наблюдение";
  if (m10 >= 2 && m10 <= 4 && (m100 < 10 || m100 >= 20)) return "наблюдения";
  return "наблюдений";
}

function pluralPlayer(n: number): string {
  const m10 = n % 10;
  const m100 = n % 100;
  if (m10 === 1 && m100 !== 11) return "игрок";
  if (m10 >= 2 && m10 <= 4 && (m100 < 10 || m100 >= 20)) return "игрока";
  return "игроков";
}

export function ResumeSessionBlock() {
  const router = useRouter();
  const [summary, setSummary] = useState<ResumeSessionSummary | null>(null);

  useFocusEffect(
    useCallback(() => {
      getResumeSessionSummary().then(setSummary);
    }, [])
  );

  const handleContinue = useCallback(() => {
    router.push(COACH_INPUT_ROUTE as Parameters<typeof router.push>[0]);
  }, [router]);

  const handleReset = useCallback(() => {
    Alert.alert(
      "Сбросить сессию",
      "Незавершённая тренировка будет удалена. Несохранённые наблюдения будут потеряны. Начать заново?",
      [
        { text: "Отмена", style: "cancel" },
        {
          text: "Сбросить",
          style: "destructive",
          onPress: async () => {
            await resetSessionDraftOnly();
            setSummary(null);
          },
        },
      ]
    );
  }, []);

  if (!summary) return null;

  return (
    <DashboardSection title="Продолжить тренировку">
      <SectionCard elevated style={styles.card}>
      <Text style={styles.status}>{summary.summaryLine}</Text>
      <Text style={styles.stats}>
        {summary.observationCount} {pluralObservation(summary.observationCount)} ·{" "}
        {summary.playerCount} {pluralPlayer(summary.playerCount)}
      </Text>
      <Text style={styles.hint}>
        Вы можете продолжить с того места, где остановились
      </Text>
      <View style={styles.actions}>
        <PrimaryButton
          title="Продолжить"
          variant="primary"
          onPress={handleContinue}
          style={styles.primaryBtn}
        />
        <PrimaryButton
          title="Сбросить сессию"
          variant="ghost"
          onPress={handleReset}
          style={styles.secondaryBtn}
          textStyle={styles.secondaryBtnText}
        />
      </View>
    </SectionCard>
    </DashboardSection>
  );
}

const styles = StyleSheet.create({
  card: {
    borderLeftWidth: 4,
    borderLeftColor: theme.colors.accent,
  },
  status: {
    ...theme.typography.subtitle,
    color: theme.colors.text,
    marginBottom: theme.spacing.xs,
  },
  stats: {
    ...theme.typography.caption,
    color: theme.colors.textSecondary,
    marginBottom: theme.spacing.sm,
  },
  hint: {
    ...theme.typography.body,
    fontSize: 14,
    color: theme.colors.textMuted,
    marginBottom: theme.spacing.md,
  },
  actions: {
    flexDirection: "row",
    alignItems: "center",
    gap: theme.spacing.sm,
    flexWrap: "wrap",
  },
  primaryBtn: {
    minWidth: 120,
  },
  secondaryBtn: {
    paddingVertical: theme.spacing.xs,
    paddingHorizontal: theme.spacing.sm,
  },
  secondaryBtnText: {
    fontSize: 14,
    color: theme.colors.textMuted,
  },
});
