import React from "react";
import { ScrollView, StyleSheet, Text } from "react-native";
import type { Router } from "expo-router";
import { SectionCard } from "@/components/ui/SectionCard";
import { PrimaryButton } from "@/components/ui/PrimaryButton";
import { theme } from "@/constants/theme";
import {
  VOICE_LOOP_NEXT_SECTION_LEAD,
  VOICE_LOOP_NEXT_SECTION_TITLE,
  VOICE_MATERIALS_HUB_REFRESH_HINT,
  voiceCompletionSummaryLines,
  voiceServerSuccessHeadline,
  voiceServerSuccessLead,
} from "@/lib/voiceMvp/voiceStarterCompletionCopy";

type Props = {
  router: Router;
  variant: "report" | "action";
  hadAiBreakdown: boolean;
};

/**
 * Единый success-экран после POST отчёта/задачи из voice starter.
 */
export function VoiceStarterServerSuccessPanel({ router, variant, hadAiBreakdown }: Props) {
  const listPath = variant === "report" ? "/reports" : "/actions";
  const listLabel = variant === "report" ? "К списку отчётов" : "К списку задач";

  return (
    <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
      <SectionCard elevated style={styles.heroCard}>
        <Text style={styles.successEyebrow}>Готово</Text>
        <Text style={styles.title}>{voiceServerSuccessHeadline(variant)}</Text>
        <Text style={styles.sub}>{voiceServerSuccessLead(variant)}</Text>
      </SectionCard>

      <SectionCard elevated style={styles.summaryCard}>
        <Text style={styles.kicker}>Итог</Text>
        {voiceCompletionSummaryLines({ kind: variant, hadAiBreakdown }).map((line) => (
          <Text key={line} style={styles.summaryLine}>
            • {line}
          </Text>
        ))}
      </SectionCard>

      <SectionCard elevated style={styles.nextCard}>
        <Text style={styles.kicker}>{VOICE_LOOP_NEXT_SECTION_TITLE}</Text>
        <Text style={styles.nextLead}>{VOICE_LOOP_NEXT_SECTION_LEAD}</Text>
        <Text style={styles.refreshHint}>{VOICE_MATERIALS_HUB_REFRESH_HINT}</Text>
        <PrimaryButton title="Новая голосовая заметка" onPress={() => router.push("/voice-note")} style={styles.btn} />
        <PrimaryButton
          title="Созданные материалы"
          variant="outline"
          onPress={() => router.push("/created")}
          style={styles.btn}
        />
        <PrimaryButton
          title={listLabel}
          variant="outline"
          onPress={() => router.replace(listPath)}
          style={styles.btn}
        />
        <PrimaryButton
          title="Сообщения"
          variant="outline"
          onPress={() => router.push("/(tabs)/messages")}
          style={styles.btn}
        />
      </SectionCard>

      <SectionCard elevated style={styles.footerCard}>
        <PrimaryButton title="Закрыть экран" variant="ghost" onPress={() => router.back()} />
      </SectionCard>
    </ScrollView>
  );
}

/** Компактный блок «куда дальше» для локальных completion (coach-input и др.). */
export function VoiceLoopNextStepsCard({ router }: { router: Router }) {
  const listPath = "/reports";
  return (
    <SectionCard elevated style={styles.nextCard}>
      <Text style={styles.kicker}>{VOICE_LOOP_NEXT_SECTION_TITLE}</Text>
      <Text style={styles.nextLead}>{VOICE_LOOP_NEXT_SECTION_LEAD}</Text>
      <Text style={styles.refreshHint}>{VOICE_MATERIALS_HUB_REFRESH_HINT}</Text>
      <PrimaryButton title="Новая голосовая заметка" onPress={() => router.push("/voice-note")} style={styles.btn} />
      <PrimaryButton
        title="Созданные материалы"
        variant="outline"
        onPress={() => router.push("/created")}
        style={styles.btn}
      />
      <PrimaryButton
        title="Сообщения"
        variant="outline"
        onPress={() => router.push("/(tabs)/messages")}
        style={styles.btn}
      />
      <PrimaryButton title="К отчётам" variant="outline" onPress={() => router.push(listPath)} style={styles.btn} />
      <PrimaryButton title="К задачам" variant="outline" onPress={() => router.push("/actions")} style={styles.btn} />
    </SectionCard>
  );
}

const styles = StyleSheet.create({
  content: { paddingBottom: theme.spacing.xxl },
  heroCard: {
    marginBottom: theme.spacing.md,
    borderLeftWidth: 3,
    borderLeftColor: theme.colors.primary,
    backgroundColor: theme.colors.surfaceElevated,
  },
  summaryCard: {
    marginBottom: theme.spacing.md,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: theme.colors.border,
  },
  nextCard: {
    marginBottom: theme.spacing.md,
    backgroundColor: theme.colors.surfaceElevated,
  },
  footerCard: {
    marginBottom: theme.spacing.md,
  },
  successEyebrow: {
    ...theme.typography.heroEyebrow,
    color: theme.colors.success,
    marginBottom: theme.spacing.xs,
  },
  title: {
    ...theme.typography.title,
    color: theme.colors.text,
    marginBottom: theme.spacing.sm,
  },
  sub: {
    ...theme.typography.caption,
    color: theme.colors.textSecondary,
    lineHeight: 20,
  },
  kicker: {
    ...theme.typography.caption,
    color: theme.colors.textMuted,
    textTransform: "uppercase",
    letterSpacing: 0.55,
    marginBottom: theme.spacing.sm,
  },
  summaryLine: {
    ...theme.typography.body,
    color: theme.colors.text,
    lineHeight: 22,
    marginBottom: theme.spacing.xs,
  },
  nextLead: {
    ...theme.typography.caption,
    color: theme.colors.textMuted,
    lineHeight: 18,
    marginBottom: theme.spacing.sm,
  },
  refreshHint: {
    ...theme.typography.caption,
    fontSize: 12,
    color: theme.colors.textSecondary,
    lineHeight: 17,
    marginBottom: theme.spacing.md,
  },
  btn: { marginBottom: theme.spacing.sm },
});
