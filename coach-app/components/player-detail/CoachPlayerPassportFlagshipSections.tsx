import React from "react";
import { ActivityIndicator, Pressable, StyleSheet, Text, View } from "react-native";
import type { DevelopmentDomain } from "../../../src/lib/player-development/ageDevelopmentFramework";
import { SectionCard } from "@/components/ui/SectionCard";
import { PrimaryButton } from "@/components/ui/PrimaryButton";
import { theme } from "@/constants/theme";
import type {
  DevelopmentZoneActionKind,
  PassportCoachDecisionRowVm,
  PassportCoachPrimaryStripVm,
  PassportDevelopmentSnapshotVm,
  PassportDevelopmentTrendVm,
  PassportZoneTrend,
} from "@/lib/coachPlayerPassportPresentation";

function trendGlyph(t: PassportZoneTrend): string {
  if (t === "down") return "↓";
  if (t === "up") return "↑";
  return "→";
}

function trendColor(t: PassportZoneTrend) {
  if (t === "down") return theme.colors.warning;
  if (t === "up") return theme.colors.primary;
  return theme.colors.textMuted;
}

function trendPillStyle(tone: PassportDevelopmentTrendVm["tone"]) {
  if (tone === "better") {
    return { bg: theme.colors.primaryMuted, border: theme.colors.primary, text: theme.colors.primary };
  }
  if (tone === "worse") {
    return { bg: theme.colors.warningMuted, border: theme.colors.warning, text: theme.colors.warning };
  }
  return {
    bg: "rgba(92, 109, 126, 0.2)",
    border: theme.colors.textMuted,
    text: theme.colors.textSecondary,
  };
}

type DevProps = {
  model: PassportDevelopmentSnapshotVm;
  onZoneAction?: (domain: DevelopmentDomain, kind: DevelopmentZoneActionKind) => void;
};

/** Единый блок «зоны развития» под hero — направление, не только список. */
export function CoachPlayerPassportDevelopmentSnapshot({ model, onZoneAction }: DevProps) {
  const showTrend = model.phase === "ready" && model.trend != null;
  const showGroup = model.phase === "ready" && !!model.groupContextLine;

  return (
    <View style={styles.devWrap}>
      <Text style={styles.devEyebrow}>Направление развития</Text>
      <Text style={styles.devSubcaption}>Оценка Арены · что усилить и куда нажать</Text>
      {showTrend ? (
        <View
          style={[
            styles.trendPill,
            {
              backgroundColor: trendPillStyle(model.trend!.tone).bg,
              borderColor: trendPillStyle(model.trend!.tone).border,
            },
          ]}
        >
          <Text style={[styles.trendPillText, { color: trendPillStyle(model.trend!.tone).text }]}>
            {model.trend!.label}
          </Text>
        </View>
      ) : null}
      {showGroup ? (
        <Text style={styles.groupHint} numberOfLines={2}>
          {model.groupContextLine}
        </Text>
      ) : null}
      <SectionCard elevated style={styles.devCard}>
        {model.phase === "loading" ? (
          <View style={styles.loadingRow}>
            <ActivityIndicator size="small" color={theme.colors.primary} />
            <Text style={styles.muted}>Считаем снимок по отметкам…</Text>
          </View>
        ) : model.phase === "error" ? (
          <Text style={styles.muted}>Снимок по доменам недоступен.</Text>
        ) : model.emptyMessage &&
          model.attentionRows.length === 0 &&
          model.strengthRows.length === 0 &&
          model.lowDataRows.length === 0 ? (
          <Text style={styles.bodyLine}>{model.emptyMessage}</Text>
        ) : (
          <>
            {model.attentionRows.length > 0 ? (
              <View style={styles.block}>
                <Text style={styles.blockKicker}>1 · Сейчас внимание</Text>
                <Text style={styles.blockHint}>Нажми строку — сразу в действие</Text>
                {model.attentionRows.map((row) => (
                  <Pressable
                    key={`a-${row.domain}`}
                    onPress={() => onZoneAction?.(row.domain, row.actionKind)}
                    disabled={!onZoneAction}
                    style={({ pressed }) => [styles.zonePress, pressed && styles.zonePressIn]}
                  >
                    <View style={styles.zoneRow}>
                      <Text style={[styles.zoneTrend, { color: trendColor(row.trend) }]}>
                        {trendGlyph(row.trend)}
                      </Text>
                      <View style={styles.zoneBody}>
                        <Text style={styles.attentionLabel}>{row.label}</Text>
                        <Text style={styles.zoneMeta}>
                          {row.actionLabel} · {row.actionHint}
                        </Text>
                      </View>
                      <Text style={styles.zoneChevron}>›</Text>
                    </View>
                  </Pressable>
                ))}
              </View>
            ) : null}
            {model.strengthRows.length > 0 ? (
              <View style={[styles.block, model.attentionRows.length > 0 && styles.blockGap]}>
                <Text style={styles.blockKicker}>2 · Сильные стороны</Text>
                {model.strengthRows.map((row) => (
                  <Pressable
                    key={`s-${row.domain}`}
                    onPress={() => onZoneAction?.(row.domain, row.actionKind)}
                    disabled={!onZoneAction}
                    style={({ pressed }) => [styles.zonePress, pressed && styles.zonePressIn]}
                  >
                    <View style={styles.zoneRow}>
                      <Text style={[styles.zoneTrend, { color: trendColor(row.trend) }]}>
                        {trendGlyph(row.trend)}
                      </Text>
                      <View style={styles.zoneBody}>
                        <Text style={styles.strengthLabel}>{row.label}</Text>
                        <Text style={styles.zoneMeta}>
                          {row.actionLabel} · {row.actionHint}
                        </Text>
                      </View>
                      <Text style={styles.zoneChevron}>›</Text>
                    </View>
                  </Pressable>
                ))}
              </View>
            ) : null}
            {model.lowDataRows.length > 0 ? (
              <View
                style={[
                  styles.block,
                  (model.attentionRows.length > 0 || model.strengthRows.length > 0) &&
                    styles.blockGap,
                ]}
              >
                <Text style={styles.blockKicker}>3 · Мало данных</Text>
                {model.lowDataRows.map((row) => (
                  <Pressable
                    key={`l-${row.domain}`}
                    onPress={() => onZoneAction?.(row.domain, row.actionKind)}
                    disabled={!onZoneAction}
                    style={({ pressed }) => [styles.zonePress, pressed && styles.zonePressIn]}
                  >
                    <View style={styles.zoneRow}>
                      <Text style={[styles.zoneTrend, { color: trendColor(row.trend) }]}>
                        {trendGlyph(row.trend)}
                      </Text>
                      <View style={styles.zoneBody}>
                        <Text style={styles.lowDataLabel}>{row.label}</Text>
                        <Text style={styles.zoneMeta}>
                          {row.actionLabel} · {row.actionHint}
                        </Text>
                      </View>
                      <Text style={styles.zoneChevron}>›</Text>
                    </View>
                  </Pressable>
                ))}
              </View>
            ) : null}
            {model.emptyMessage &&
            (model.attentionRows.length > 0 ||
              model.strengthRows.length > 0 ||
              model.lowDataRows.length > 0) ? (
              <Text style={[styles.footerNote, styles.blockGap]}>{model.emptyMessage}</Text>
            ) : null}
          </>
        )}
      </SectionCard>
    </View>
  );
}

type DecisionProps = {
  rows: PassportCoachDecisionRowVm[];
  primaryStrip: PassportCoachPrimaryStripVm | null;
  onNavigate: (target: PassportCoachPrimaryStripVm["target"]) => void;
  onOpenActions: () => void;
  onOpenNotes: () => void;
};

function sourceLabel(source: PassportCoachDecisionRowVm["source"]): string {
  if (source === "queue") return "Очередь";
  if (source === "live") return "Смены";
  return "Фокус";
}

/** Что сделать дальше — один главный шаг + короткий хвост. */
export function CoachPlayerPassportCoachLayer({
  rows,
  primaryStrip,
  onNavigate,
  onOpenActions,
  onOpenNotes,
}: DecisionProps) {
  const tailRows = primaryStrip ? rows.slice(1) : rows;

  return (
    <View style={styles.decWrap}>
      <Text style={styles.decEyebrow}>Следующий шаг</Text>
      <Text style={styles.decSubcaption}>Без длинного отчёта — одно действие</Text>
      <SectionCard elevated style={styles.decCard}>
        {rows.length === 0 ? (
          <Text style={styles.muted}>
            Пока пусто: добавь задачу или зафиксируй смену в Арене.
          </Text>
        ) : (
          <>
            {primaryStrip ? (
              <View style={styles.primaryStrip}>
                <Text style={styles.primaryHeadline} numberOfLines={3}>
                  {primaryStrip.headline}
                </Text>
                <PrimaryButton
                  animatedPress
                  title={primaryStrip.ctaLabel}
                  onPress={() => onNavigate(primaryStrip.target)}
                  style={styles.primaryCta}
                />
              </View>
            ) : null}
            {tailRows.length > 0 ? (
              <View style={primaryStrip ? styles.tailAfterStrip : undefined}>
                {tailRows.map((r, idx) => (
                  <View key={r.id} style={[styles.decRow, idx > 0 && styles.decRowDivider]}>
                    <View style={[styles.decAccent, decAccentColor(r.source)]} />
                    <View style={styles.decRowBody}>
                      <Text style={styles.decSource}>{sourceLabel(r.source)}</Text>
                      <Text style={styles.decTitle} numberOfLines={2}>
                        {r.title}
                      </Text>
                      {r.detail ? (
                        <Text style={styles.decDetail} numberOfLines={1}>
                          {r.detail}
                        </Text>
                      ) : null}
                    </View>
                  </View>
                ))}
              </View>
            ) : null}
            <View style={styles.decCtaRow}>
              <PrimaryButton
                animatedPress
                title="Все задачи"
                variant="outline"
                onPress={onOpenActions}
                style={styles.decCtaHalf}
              />
              <PrimaryButton
                animatedPress
                title="Заметки"
                variant="outline"
                onPress={onOpenNotes}
                style={styles.decCtaHalf}
              />
            </View>
          </>
        )}
      </SectionCard>
    </View>
  );
}

function decAccentColor(source: PassportCoachDecisionRowVm["source"]) {
  if (source === "queue") return { backgroundColor: theme.colors.warning };
  if (source === "live") return { backgroundColor: theme.colors.primary };
  return { backgroundColor: theme.colors.textMuted };
}

const styles = StyleSheet.create({
  devWrap: {
    marginBottom: theme.layout.sectionGap,
  },
  devEyebrow: {
    ...theme.typography.caption,
    fontSize: 11,
    fontWeight: "800",
    letterSpacing: 0.55,
    textTransform: "uppercase",
    color: theme.colors.primary,
    marginBottom: 4,
    paddingHorizontal: theme.spacing.xs,
  },
  devSubcaption: {
    fontSize: 12,
    color: theme.colors.textMuted,
    marginBottom: theme.spacing.sm + 2,
    paddingHorizontal: theme.spacing.xs,
    lineHeight: 17,
  },
  trendPill: {
    marginHorizontal: theme.spacing.xs,
    marginBottom: theme.spacing.md,
    paddingVertical: 9,
    paddingHorizontal: 13,
    borderRadius: theme.borderRadius.md,
    borderWidth: 1,
  },
  trendPillText: {
    fontSize: 13,
    fontWeight: "600",
    lineHeight: 18,
  },
  groupHint: {
    fontSize: 12,
    color: theme.colors.textSecondary,
    marginBottom: theme.spacing.md,
    paddingHorizontal: theme.spacing.xs,
    lineHeight: 17,
  },
  devCard: {
    borderLeftWidth: 4,
    borderLeftColor: theme.colors.accent,
    backgroundColor: theme.colors.surfaceElevated,
    marginBottom: 0,
    borderWidth: 1,
    borderColor: theme.colors.cardBorder,
  },
  loadingRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: theme.spacing.sm,
    paddingVertical: theme.spacing.xs,
  },
  muted: {
    ...theme.typography.body,
    fontSize: 14,
    color: theme.colors.textMuted,
    lineHeight: 20,
  },
  bodyLine: {
    ...theme.typography.body,
    fontSize: 15,
    fontWeight: "500",
    color: theme.colors.textSecondary,
    lineHeight: 22,
  },
  block: {},
  blockGap: {
    marginTop: theme.spacing.md,
    paddingTop: theme.spacing.md,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: theme.colors.border,
  },
  blockKicker: {
    ...theme.typography.caption,
    fontSize: 10,
    fontWeight: "800",
    letterSpacing: 0.45,
    textTransform: "uppercase",
    color: theme.colors.textMuted,
    marginBottom: 6,
  },
  blockHint: {
    fontSize: 11,
    color: theme.colors.textMuted,
    marginBottom: theme.spacing.sm,
    lineHeight: 15,
  },
  zonePress: {
    marginBottom: 8,
    borderRadius: theme.borderRadius.md,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.06)',
    backgroundColor: 'rgba(255, 255, 255, 0.02)',
    paddingHorizontal: theme.spacing.sm,
    paddingVertical: theme.spacing.xs,
  },
  zonePressIn: {
    opacity: 0.9,
    transform: [{ scale: 0.985 }],
  },
  zoneRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: theme.spacing.sm,
    paddingVertical: 4,
  },
  zoneBody: {
    flex: 1,
    minWidth: 0,
  },
  zoneMeta: {
    fontSize: 12,
    color: theme.colors.textSecondary,
    marginTop: 3,
    lineHeight: 16,
  },
  zoneChevron: {
    fontSize: 22,
    fontWeight: "300",
    color: theme.colors.textMuted,
    marginLeft: 4,
  },
  zoneTrend: {
    fontSize: 18,
    fontWeight: "800",
    width: 22,
    textAlign: "center",
  },
  attentionLabel: {
    fontSize: 18,
    fontWeight: "800",
    color: theme.colors.text,
    letterSpacing: -0.2,
    lineHeight: 24,
  },
  strengthLabel: {
    fontSize: 17,
    fontWeight: "700",
    color: theme.colors.primary,
    lineHeight: 22,
  },
  lowDataLabel: {
    fontSize: 16,
    fontWeight: "600",
    color: theme.colors.textSecondary,
    lineHeight: 21,
  },
  footerNote: {
    ...theme.typography.caption,
    color: theme.colors.textMuted,
    lineHeight: 18,
  },
  decWrap: {
    marginBottom: theme.layout.sectionGap,
  },
  decEyebrow: {
    ...theme.typography.caption,
    fontSize: 11,
    fontWeight: "800",
    letterSpacing: 0.55,
    textTransform: "uppercase",
    color: theme.colors.textMuted,
    marginBottom: 4,
    paddingHorizontal: theme.spacing.xs,
  },
  decSubcaption: {
    fontSize: 12,
    color: theme.colors.textMuted,
    marginBottom: theme.spacing.sm + 2,
    paddingHorizontal: theme.spacing.xs,
    lineHeight: 17,
  },
  decCard: {
    marginBottom: 0,
    backgroundColor: theme.colors.surfaceElevated,
    borderWidth: 1,
    borderColor: theme.colors.cardBorder,
    borderLeftWidth: 3,
    borderLeftColor: 'rgba(74, 158, 255, 0.35)',
  },
  primaryStrip: {
    paddingBottom: theme.spacing.sm,
  },
  primaryHeadline: {
    fontSize: 16,
    fontWeight: "700",
    color: theme.colors.text,
    lineHeight: 22,
    marginBottom: theme.spacing.sm,
  },
  primaryCta: {
    marginBottom: 0,
  },
  tailAfterStrip: {
    marginTop: theme.spacing.md,
    paddingTop: theme.spacing.md,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: theme.colors.border,
  },
  decRow: {
    flexDirection: "row",
    alignItems: "stretch",
  },
  decRowDivider: {
    marginTop: theme.spacing.md,
    paddingTop: theme.spacing.md,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: theme.colors.border,
  },
  decAccent: {
    width: 3,
    borderRadius: 2,
    marginRight: theme.spacing.sm,
  },
  decRowBody: {
    flex: 1,
    minWidth: 0,
  },
  decSource: {
    ...theme.typography.caption,
    fontSize: 10,
    fontWeight: "700",
    letterSpacing: 0.35,
    textTransform: "uppercase",
    color: theme.colors.textMuted,
    marginBottom: 4,
  },
  decTitle: {
    fontSize: 14,
    fontWeight: "600",
    color: theme.colors.text,
    lineHeight: 20,
  },
  decDetail: {
    ...theme.typography.caption,
    color: theme.colors.textSecondary,
    marginTop: 3,
    lineHeight: 17,
  },
  decCtaRow: {
    flexDirection: "row",
    gap: theme.spacing.sm,
    marginTop: theme.spacing.md,
    paddingTop: theme.spacing.md,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: theme.colors.border,
  },
  decCtaHalf: {
    flex: 1,
    marginBottom: 0,
  },
});
