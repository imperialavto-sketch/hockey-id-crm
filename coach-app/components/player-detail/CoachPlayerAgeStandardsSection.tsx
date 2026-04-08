import React, { useMemo } from "react";
import { StyleSheet, Text, View } from "react-native";
import { SectionCard } from "@/components/ui/SectionCard";
import { DashboardSection } from "@/components/dashboard/DashboardSection";
import { theme } from "@/constants/theme";
import type { CoachAgeStandardsViewModel } from "@/lib/coachAgeStandardsPresentation";
import {
  coachDomainEvidenceLabelRu,
  coachDomainRecencyLineRu,
  domainInterpretationLabelRu,
  type CoachDevelopmentEvidenceRow,
} from "@/lib/coachPlayerDevelopmentEvidence";
import type { DevelopmentDomain } from "@/lib/coachAgeStandardsPresentation";

const SECTION_SUB_BASE =
  "Справочно по возрасту. Полоски — доля отметок в окне live по домену, не оценка уровня.";

type Props = {
  model: CoachAgeStandardsViewModel;
  evidenceByDomain: Record<DevelopmentDomain, CoachDevelopmentEvidenceRow>;
  windowMax: number | undefined;
};

function evidenceTextStyle(row: CoachDevelopmentEvidenceRow): object {
  if (row.phase === "loading" || row.phase === "error") return styles.evidenceMuted;
  if (row.vm.status === "focus_active") return styles.evidenceFocus;
  if (row.vm.status === "observed") return styles.evidenceObserved;
  return styles.evidenceNone;
}

function DomainSignalThermometer({
  row,
  maxAcrossDomains,
}: {
  row: CoachDevelopmentEvidenceRow;
  maxAcrossDomains: number;
}) {
  if (row.phase === "loading") {
    return (
      <View style={styles.thermoWrap}>
        <View style={styles.thermoTrack}>
          <View style={[styles.thermoFill, { width: "0%" }]} />
        </View>
        <Text style={styles.thermoCaption}>Сигналов в окне: …</Text>
      </View>
    );
  }
  if (row.phase === "error") {
    return (
      <View style={styles.thermoWrap}>
        <View style={styles.thermoTrack}>
          <View style={[styles.thermoFill, { width: "0%" }]} />
        </View>
        <Text style={styles.thermoCaption}>Сигналов в окне: —</Text>
      </View>
    );
  }
  const n = row.vm.recentEvidenceCount;
  const denom = Math.max(1, maxAcrossDomains);
  const pct = Math.min(100, Math.round((n / denom) * 100));
  const fillColor =
    row.vm.status === "focus_active"
      ? theme.colors.warning
      : row.vm.status === "observed"
        ? theme.colors.primary
        : theme.colors.textMuted;

  return (
    <View style={styles.thermoWrap}>
      <View style={styles.thermoTrack}>
        <View style={[styles.thermoFill, { width: `${pct}%`, backgroundColor: fillColor }]} />
      </View>
      <Text style={styles.thermoCaption}>Сигналов в окне: {n}</Text>
    </View>
  );
}

export function CoachPlayerAgeStandardsSection({
  model,
  evidenceByDomain,
  windowMax,
}: Props) {
  const maxSignalsAcrossDomains = useMemo(() => {
    let m = 1;
    for (const r of model.rows) {
      const ev = evidenceByDomain[r.domain];
      if (ev?.phase === "ready") {
        m = Math.max(m, ev.vm.recentEvidenceCount);
      }
    }
    return m;
  }, [model.rows, evidenceByDomain]);

  const title = `Стандарты · ${model.ageGroup}`;
  const sectionSub = SECTION_SUB_BASE;

  return (
    <DashboardSection title={title} style={styles.sectionWrap}>
      <Text style={styles.sectionSub}>{sectionSub}</Text>
      <SectionCard elevated style={styles.card}>
        {model.rows.map((row, idx) => {
          const ev = evidenceByDomain[row.domain];
          const label = coachDomainEvidenceLabelRu(ev, windowMax);
          const accentStatus = ev.phase === "ready" ? ev.vm.status : null;

          return (
            <View key={row.domain} style={[styles.row, idx > 0 && styles.rowDivider]}>
              <View
                style={[
                  styles.accent,
                  accentStatus === "focus_active" && styles.accentFocus,
                  accentStatus === "observed" && styles.accentObserved,
                ]}
              />
              <View style={styles.rowBody}>
                <Text style={styles.domainTitle} numberOfLines={2}>
                  {row.titleRu}
                </Text>
                <Text style={styles.interpretationLabel} numberOfLines={1}>
                  {domainInterpretationLabelRu(ev.vm.interpretation)}
                </Text>
                <DomainSignalThermometer
                  row={ev}
                  maxAcrossDomains={maxSignalsAcrossDomains}
                />
                <Text style={styles.description}>{row.descriptionRu}</Text>
                {row.focusHintRu ? (
                  <Text style={styles.focusHint} numberOfLines={3}>
                    {row.focusHintRu}
                  </Text>
                ) : null}
                <Text style={[styles.evidenceLine, evidenceTextStyle(ev)]} numberOfLines={2}>
                  {label}
                </Text>
                <Text style={styles.recencyLine} numberOfLines={1}>
                  {coachDomainRecencyLineRu(ev)}
                </Text>
              </View>
            </View>
          );
        })}
      </SectionCard>
    </DashboardSection>
  );
}

const styles = StyleSheet.create({
  sectionWrap: {
    marginBottom: theme.layout.sectionGap,
  },
  sectionSub: {
    ...theme.typography.caption,
    fontSize: 12,
    color: theme.colors.textMuted,
    lineHeight: 17,
    marginBottom: theme.spacing.sm,
    paddingHorizontal: theme.spacing.xs,
    fontStyle: "italic",
  },
  card: {
    marginBottom: 0,
    borderLeftWidth: 3,
    borderLeftColor: theme.colors.primary,
    backgroundColor: theme.colors.card,
  },
  row: {
    flexDirection: "row",
    alignItems: "stretch",
  },
  rowDivider: {
    marginTop: theme.spacing.md,
    paddingTop: theme.spacing.md,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: theme.colors.border,
  },
  accent: {
    width: 3,
    borderRadius: 2,
    backgroundColor: theme.colors.primary,
    opacity: 0.5,
    marginRight: theme.spacing.sm,
  },
  accentObserved: {
    opacity: 0.85,
    backgroundColor: theme.colors.primary,
  },
  accentFocus: {
    opacity: 1,
    backgroundColor: theme.colors.warning,
  },
  rowBody: {
    flex: 1,
    minWidth: 0,
    gap: theme.spacing.xs,
    paddingRight: theme.spacing.xs,
  },
  domainTitle: {
    ...theme.typography.subtitle,
    fontSize: 16,
    fontWeight: "700",
    color: theme.colors.text,
    letterSpacing: -0.2,
  },
  interpretationLabel: {
    fontSize: 10,
    fontWeight: "600",
    letterSpacing: 0.45,
    textTransform: "uppercase",
    color: theme.colors.textSecondary,
    marginTop: 2,
  },
  description: {
    ...theme.typography.caption,
    fontSize: 13,
    color: theme.colors.textSecondary,
    lineHeight: 20,
  },
  focusHint: {
    ...theme.typography.caption,
    fontSize: 11,
    color: theme.colors.textMuted,
    lineHeight: 17,
    fontStyle: "italic",
    opacity: 0.92,
  },
  evidenceLine: {
    ...theme.typography.caption,
    fontSize: 10,
    lineHeight: 15,
    marginTop: theme.spacing.sm,
  },
  evidenceMuted: {
    color: theme.colors.textMuted,
  },
  evidenceNone: {
    color: theme.colors.textMuted,
  },
  evidenceObserved: {
    color: theme.colors.textSecondary,
  },
  evidenceFocus: {
    color: theme.colors.warning,
    fontWeight: "600",
  },
  recencyLine: {
    fontSize: 9,
    lineHeight: 13,
    color: theme.colors.textMuted,
    opacity: 0.88,
    fontStyle: "italic",
    marginTop: 3,
    paddingLeft: 1,
  },
  thermoWrap: {
    marginTop: 4,
    gap: 4,
  },
  thermoTrack: {
    height: 4,
    borderRadius: 2,
    backgroundColor: theme.colors.surfaceElevated,
    overflow: "hidden",
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: theme.colors.border,
  },
  thermoFill: {
    height: "100%",
    borderRadius: 2,
    backgroundColor: theme.colors.primary,
  },
  thermoCaption: {
    fontSize: 10,
    lineHeight: 14,
    color: theme.colors.textMuted,
  },
});
