import React from "react";
import { StyleSheet, Text, View } from "react-native";
import { SectionCard } from "@/components/ui/SectionCard";
import { theme } from "@/constants/theme";
import type { VoiceProcessingStatus } from "@/lib/voicePipeline/contracts";
import {
  voiceArtifactStageLabelRu,
  voiceUploadStageLabelRu,
} from "@/lib/voicePipeline/uiHelpers";

function Row({
  label,
  stageLabel,
  detail,
}: {
  label: string;
  stageLabel: string;
  detail?: string | null;
}) {
  return (
    <View style={styles.row}>
      <View style={styles.rowMain}>
        <Text style={styles.rowLabel}>{label}</Text>
        <Text style={styles.rowStage}>{stageLabel}</Text>
      </View>
      {detail ? (
        <Text style={styles.rowDetail} numberOfLines={2}>
          {detail}
        </Text>
      ) : null}
    </View>
  );
}

export function VoiceProcessingProgressCard({
  processing,
  title = "Серверная обработка",
  subtitle,
}: {
  processing: VoiceProcessingStatus;
  title?: string;
  subtitle?: string;
}) {
  const trErr = processing.transcript.error;
  const sumErr = processing.summary.error;

  return (
    <SectionCard elevated style={styles.card}>
      <Text style={styles.kicker}>{title}</Text>
      {subtitle ? <Text style={styles.sub}>{subtitle}</Text> : null}
      <Row
        label="Файл"
        stageLabel={voiceUploadStageLabelRu(processing.upload.status)}
        detail={
          processing.upload.sizeBytes != null
            ? `${processing.upload.mimeType ?? "audio"} · ${Math.round(processing.upload.sizeBytes / 1024)} КБ`
            : processing.upload.mimeType ?? undefined
        }
      />
      <View style={styles.divider} />
      <Row
        label="Расшифровка"
        stageLabel={voiceArtifactStageLabelRu(processing.transcript.status)}
        detail={trErr ?? processing.transcript.text?.slice(0, 140)}
      />
      <View style={styles.divider} />
      <Row
        label="Резюме и акценты"
        stageLabel={voiceArtifactStageLabelRu(processing.summary.status)}
        detail={sumErr ?? processing.summary.text?.slice(0, 140)}
      />
    </SectionCard>
  );
}

const styles = StyleSheet.create({
  card: {
    marginBottom: theme.spacing.lg,
    borderLeftWidth: 4,
    borderLeftColor: theme.colors.primaryMuted,
  },
  kicker: {
    ...theme.typography.caption,
    color: theme.colors.textMuted,
    textTransform: "uppercase",
    letterSpacing: 0.55,
    marginBottom: theme.spacing.xs,
  },
  sub: {
    ...theme.typography.caption,
    color: theme.colors.textSecondary,
    marginBottom: theme.spacing.md,
    lineHeight: 18,
  },
  row: {
    marginBottom: theme.spacing.sm,
  },
  rowMain: {
    flexDirection: "row",
    alignItems: "baseline",
    justifyContent: "space-between",
    gap: theme.spacing.md,
  },
  rowLabel: {
    ...theme.typography.caption,
    fontWeight: "700",
    color: theme.colors.text,
    flex: 1,
  },
  rowStage: {
    ...theme.typography.caption,
    color: theme.colors.primary,
    fontWeight: "600",
  },
  rowDetail: {
    ...theme.typography.caption,
    color: theme.colors.textMuted,
    marginTop: 4,
    lineHeight: 18,
  },
  divider: {
    height: StyleSheet.hairlineWidth,
    backgroundColor: theme.colors.border,
    marginVertical: theme.spacing.sm,
  },
});
