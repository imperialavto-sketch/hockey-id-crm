import React, { useMemo } from "react";
import { ActivityIndicator, StyleSheet, Text, View } from "react-native";
import { SectionCard } from "@/components/ui/SectionCard";
import { DashboardSection } from "@/components/dashboard/DashboardSection";
import { theme } from "@/constants/theme";
import { formatLiveTrainingMode } from "@/lib/liveTrainingUi";
import type { LiveTrainingMode } from "@/types/liveTraining";
import type {
  PlayerLiveTrainingSignalItem,
  PlayerLiveTrainingSignalsBundle,
} from "@/services/coachPlayersService";
import {
  buildLiveExplainabilityEvalContextBody,
  type BehavioralExplainabilityAxes,
} from "@/lib/behavioralExplainabilityUi";

const SECTION_TITLE = "Что зафиксировано на тренировках";
const SECTION_SUB =
  "Сводка по всем подтверждённым сессиям; динамика и таймлайн — по последним записям (окно до 30 сигналов).";

const BEHAVIOR_DOMAIN = "behavior";
const METRIC_ATTENTION = "attention";
const METRIC_DISCIPLINE = "discipline";

/** Сводка концентрация/дисциплина по окну latestSignals (без отдельного API). */
function aggregateBehaviorExplainabilityFromLatestSignals(
  latest: PlayerLiveTrainingSignalItem[]
): BehavioralExplainabilityAxes {
  type Acc = { p: number; n: number; u: number; lastMs: number };
  const attention: Acc = { p: 0, n: 0, u: 0, lastMs: 0 };
  const discipline: Acc = { p: 0, n: 0, u: 0, lastMs: 0 };

  for (const s of latest) {
    if (s.metricDomain !== BEHAVIOR_DOMAIN) continue;
    const bucket =
      s.metricKey === METRIC_ATTENTION
        ? attention
        : s.metricKey === METRIC_DISCIPLINE
          ? discipline
          : null;
    if (!bucket) continue;
    const t = Date.parse(s.createdAt);
    const ms = Number.isFinite(t) ? t : 0;
    if (ms >= bucket.lastMs) bucket.lastMs = ms;
    if (s.signalDirection === "positive") bucket.p += 1;
    else if (s.signalDirection === "negative") bucket.n += 1;
    else bucket.u += 1;
  }

  const out: BehavioralExplainabilityAxes = {};
  const attTotal = attention.p + attention.n + attention.u;
  if (attTotal > 0) {
    out.focus = {
      positiveCount: attention.p,
      negativeCount: attention.n,
      neutralCount: attention.u,
      totalSignals: attTotal,
      lastSignalAt: new Date(attention.lastMs || 0).toISOString(),
    };
  }
  const discTotal = discipline.p + discipline.n + discipline.u;
  if (discTotal > 0) {
    out.discipline = {
      positiveCount: discipline.p,
      negativeCount: discipline.n,
      neutralCount: discipline.u,
      totalSignals: discTotal,
      lastSignalAt: new Date(discipline.lastMs || 0).toISOString(),
    };
  }
  return out;
}

const BEHAVIOR_SUMMARY_PREFIX = "По наблюдениям тренировок:";

function formatShortRu(iso: string): string {
  try {
    return new Date(iso).toLocaleString("ru-RU", {
      day: "numeric",
      month: "short",
      hour: "2-digit",
      minute: "2-digit",
    });
  } catch {
    return iso;
  }
}

function formatSessionDayRu(iso: string | null): string {
  if (!iso) return "—";
  try {
    return new Date(iso).toLocaleDateString("ru-RU", {
      day: "numeric",
      month: "short",
      year: "numeric",
    });
  } catch {
    return iso;
  }
}

function directionBadgeStyle(dir: string) {
  if (dir === "positive") return { bg: theme.colors.primaryMuted, color: theme.colors.primary };
  if (dir === "negative") return { bg: "rgba(245, 166, 35, 0.12)", color: theme.colors.warning };
  return { bg: theme.colors.surfaceElevated, color: theme.colors.textSecondary };
}

function joinDomainLabels(items: Array<{ domainLabelRu: string; count: number }>): string {
  if (!items.length) return "—";
  return items.map((x) => `${x.domainLabelRu} (${x.count})`).join(", ");
}

function sessionsWordRu(n: number): string {
  const m10 = n % 10;
  const m100 = n % 100;
  if (m10 === 1 && m100 !== 11) return "тренировка";
  if (m10 >= 2 && m10 <= 4 && (m100 < 10 || m100 >= 20)) return "тренировки";
  return "тренировок";
}

type Props = {
  loading: boolean;
  bundle: PlayerLiveTrainingSignalsBundle | null;
  loadError: string | null;
};

export function PlayerLiveTrainingSignalsSection({ loading, bundle, loadError }: Props) {
  const total = bundle?.summary.totalSignals ?? 0;
  const trend = bundle?.trendSummary;
  const timeline = bundle?.timeline ?? [];

  const behaviorSummaryBody = useMemo(() => {
    if (!bundle?.latestSignals?.length) return null;
    const axes = aggregateBehaviorExplainabilityFromLatestSignals(bundle.latestSignals);
    return buildLiveExplainabilityEvalContextBody(axes);
  }, [bundle?.latestSignals]);

  return (
    <DashboardSection title={SECTION_TITLE}>
      <Text style={styles.sectionSub}>{SECTION_SUB}</Text>
      <SectionCard elevated style={styles.card}>
        {loading ? (
          <View style={styles.loadingRow}>
            <ActivityIndicator size="small" color={theme.colors.primary} />
            <Text style={styles.muted}>Загрузка…</Text>
          </View>
        ) : loadError ? (
          <Text style={styles.errorText}>{loadError}</Text>
        ) : total === 0 ? (
          <Text style={styles.emptyText}>
            Пока нет сигналов. После live training завершите тренировку, подтвердите наблюдения на проверке —
            тогда здесь появятся фиксации по этому игроку.
          </Text>
        ) : (
          <>
            {behaviorSummaryBody ? (
              <Text style={styles.behaviorSummaryLine}>
                {BEHAVIOR_SUMMARY_PREFIX} {behaviorSummaryBody}
              </Text>
            ) : null}
            {/* A — сводка всего времени */}
            <View style={styles.countersRow}>
              <View style={styles.counterChip}>
                <Text style={styles.counterValue}>{bundle!.summary.totalSignals}</Text>
                <Text style={styles.counterLabel}>всего</Text>
              </View>
              <View style={styles.counterChip}>
                <Text style={[styles.counterValue, styles.counterPos]}>
                  {bundle!.summary.positiveCount}
                </Text>
                <Text style={styles.counterLabel}>позитивных</Text>
              </View>
              <View style={styles.counterChip}>
                <Text style={[styles.counterValue, styles.counterNeg]}>
                  {bundle!.summary.negativeCount}
                </Text>
                <Text style={styles.counterLabel}>требуют внимания</Text>
              </View>
            </View>
            {bundle!.summary.neutralCount > 0 ? (
              <Text style={styles.neutralHint}>
                Нейтральных наблюдений (всего): {bundle!.summary.neutralCount}
              </Text>
            ) : null}

            <View style={styles.layerDivider} />

            {/* B — тренд по окну */}
            <Text style={styles.layerKicker}>В последних записях</Text>
            <Text style={styles.layerHint}>
              Окно: до {trend?.recentSignalsCount ?? 0} сигналов,{" "}
              {trend?.recentSessionCount ?? 0} {sessionsWordRu(trend?.recentSessionCount ?? 0)}
            </Text>
            {trend?.insufficientForPatterns ? (
              <Text style={styles.trendPlaceholder}>
                Динамика и устойчивые паттерны появятся после нескольких подтверждённых тренировок и большего числа
                сигналов в этом окне. Пока смотрите отдельные записи и таймлайн ниже.
              </Text>
            ) : (
              <View style={styles.trendBlock}>
                <View style={styles.trendRow}>
                  <Text style={styles.trendLabel}>Чаще всего позитив</Text>
                  <Text style={styles.trendValue}>
                    {joinDomainLabels(trend!.dominantPositiveDomains)}
                  </Text>
                </View>
                <View style={styles.trendRow}>
                  <Text style={styles.trendLabel}>Чаще требует внимания</Text>
                  <Text style={styles.trendValue}>
                    {joinDomainLabels(trend!.dominantNegativeDomains)}
                  </Text>
                </View>
                {trend!.repeatedAttentionAreas.length > 0 ? (
                  <View style={styles.trendRow}>
                    <Text style={styles.trendLabel}>Повторяется в последних тренировках</Text>
                    <Text style={styles.trendValue}>
                      {joinDomainLabels(
                        trend!.repeatedAttentionAreas.map((a) => ({
                          domainLabelRu: a.domainLabelRu,
                          count: a.negativeCount,
                        }))
                      )}
                    </Text>
                  </View>
                ) : null}
              </View>
            )}

            <View style={styles.layerDivider} />

            {/* C — таймлайн сессий */}
            <Text style={styles.layerKicker}>Недавние live training</Text>
            <Text style={styles.layerHint}>
              До 5 сессий из текущего окна сигналов; для каждой — краткая разбивка.
            </Text>
            {timeline.length === 0 ? (
              <Text style={styles.timelineEmpty}>Нет данных для таймлайна в этом окне.</Text>
            ) : (
              timeline.map((row, idx) => {
                const modeLabel = formatLiveTrainingMode(row.sessionMode as LiveTrainingMode);
                const topLine =
                  row.topDomains.length > 0
                    ? row.topDomains.map((d) => `${d.domainLabelRu} (${d.count})`).join(" · ")
                    : "—";
                const isLast = idx === timeline.length - 1;
                return (
                  <View key={row.sessionId} style={[styles.timelineRow, isLast && styles.timelineRowLast]}>
                    <View style={styles.timelineTop}>
                      <Text style={styles.timelineDate}>{formatSessionDayRu(row.startedAt)}</Text>
                      <Text style={styles.timelineMode}>{modeLabel}</Text>
                    </View>
                    <Text style={styles.timelineCounts}>
                      Сигналов: {row.totalSignals} · Позитив: {row.positiveCount} · Внимание:{" "}
                      {row.negativeCount} · Наблюдения: {row.neutralCount}
                    </Text>
                    <Text style={styles.timelineDomains} numberOfLines={2}>
                      Чаще в теме: {topLine}
                    </Text>
                  </View>
                );
              })
            )}

            <View style={styles.layerDivider} />

            {/* D — последние записи */}
            <Text style={styles.layerKicker}>Последние записи</Text>
            <Text style={styles.layerHint}>Три самых свежих сигнала.</Text>
            {bundle!.latestSignals.map((sig, idx) => {
              const badge = directionBadgeStyle(sig.signalDirection);
              const modeLabel = formatLiveTrainingMode(sig.sessionMode as LiveTrainingMode);
              const isLast = idx === bundle!.latestSignals.length - 1;
              return (
                <View
                  key={sig.id}
                  style={[styles.item, isLast && styles.itemLast]}
                >
                  <View style={styles.itemTop}>
                    <Text style={styles.itemDomain} numberOfLines={1}>
                      {sig.domainLabelRu} · {sig.topicLabelRu}
                    </Text>
                    <View style={[styles.badge, { backgroundColor: badge.bg }]}>
                      <Text style={[styles.badgeText, { color: badge.color }]} numberOfLines={1}>
                        {sig.directionLabelRu}
                      </Text>
                    </View>
                  </View>
                  <Text style={styles.itemEvidence} numberOfLines={4}>
                    {sig.evidenceText}
                  </Text>
                  <Text style={styles.itemMeta}>
                    Live Training · {modeLabel} · {formatShortRu(sig.createdAt)}
                  </Text>
                </View>
              );
            })}
          </>
        )}
      </SectionCard>
    </DashboardSection>
  );
}

const styles = StyleSheet.create({
  sectionSub: {
    ...theme.typography.caption,
    color: theme.colors.textMuted,
    lineHeight: 18,
    marginBottom: theme.spacing.sm,
    paddingHorizontal: theme.spacing.xs,
  },
  card: {
    marginTop: theme.spacing.xs,
  },
  loadingRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: theme.spacing.sm,
    paddingVertical: theme.spacing.md,
  },
  muted: {
    ...theme.typography.body,
    color: theme.colors.textMuted,
  },
  errorText: {
    ...theme.typography.body,
    color: theme.colors.error,
    paddingVertical: theme.spacing.sm,
  },
  emptyText: {
    ...theme.typography.body,
    color: theme.colors.textMuted,
    lineHeight: 22,
    paddingVertical: theme.spacing.sm,
  },
  behaviorSummaryLine: {
    ...theme.typography.caption,
    fontSize: 11,
    lineHeight: 16,
    color: theme.colors.textMuted,
    marginBottom: theme.spacing.sm,
  },
  countersRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: theme.spacing.sm,
    marginBottom: theme.spacing.sm,
  },
  counterChip: {
    paddingVertical: theme.spacing.sm,
    paddingHorizontal: theme.spacing.md,
    borderRadius: theme.borderRadius.md,
    borderWidth: 1,
    borderColor: theme.colors.border,
    backgroundColor: theme.colors.surfaceElevated,
    minWidth: 88,
  },
  counterValue: {
    fontSize: 20,
    fontWeight: "700",
    color: theme.colors.text,
    fontVariant: ["tabular-nums"],
  },
  counterPos: {
    color: theme.colors.primary,
  },
  counterNeg: {
    color: theme.colors.warning,
  },
  counterLabel: {
    ...theme.typography.caption,
    color: theme.colors.textMuted,
    marginTop: 2,
  },
  neutralHint: {
    ...theme.typography.caption,
    color: theme.colors.textSecondary,
    marginBottom: theme.spacing.xs,
  },
  layerDivider: {
    height: StyleSheet.hairlineWidth,
    backgroundColor: theme.colors.border,
    marginVertical: theme.spacing.md,
  },
  layerKicker: {
    fontSize: 11,
    fontWeight: "700",
    letterSpacing: 0.5,
    color: theme.colors.textMuted,
    textTransform: "uppercase",
    marginBottom: theme.spacing.xs,
  },
  layerHint: {
    ...theme.typography.caption,
    color: theme.colors.textSecondary,
    lineHeight: 18,
    marginBottom: theme.spacing.sm,
  },
  trendPlaceholder: {
    ...theme.typography.body,
    color: theme.colors.textMuted,
    lineHeight: 22,
    paddingVertical: theme.spacing.xs,
  },
  trendBlock: {
    gap: theme.spacing.sm,
  },
  trendRow: {
    paddingVertical: theme.spacing.xs,
    paddingHorizontal: theme.spacing.sm,
    borderRadius: theme.borderRadius.md,
    backgroundColor: theme.colors.surfaceElevated,
    borderWidth: 1,
    borderColor: theme.colors.border,
  },
  trendLabel: {
    ...theme.typography.caption,
    color: theme.colors.textMuted,
    marginBottom: 4,
    fontWeight: "600",
  },
  trendValue: {
    ...theme.typography.body,
    color: theme.colors.text,
    lineHeight: 20,
  },
  timelineEmpty: {
    ...theme.typography.caption,
    color: theme.colors.textMuted,
    paddingVertical: theme.spacing.sm,
  },
  timelineRow: {
    marginBottom: theme.spacing.md,
    paddingBottom: theme.spacing.md,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: theme.colors.border,
  },
  timelineRowLast: {
    marginBottom: 0,
    paddingBottom: 0,
    borderBottomWidth: 0,
  },
  timelineTop: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: theme.spacing.sm,
    marginBottom: 4,
  },
  timelineDate: {
    ...theme.typography.subtitle,
    fontWeight: "600",
    color: theme.colors.text,
  },
  timelineMode: {
    ...theme.typography.caption,
    color: theme.colors.primary,
    fontWeight: "600",
  },
  timelineCounts: {
    ...theme.typography.caption,
    color: theme.colors.textSecondary,
    marginBottom: 4,
    lineHeight: 18,
  },
  timelineDomains: {
    ...theme.typography.caption,
    color: theme.colors.textMuted,
    lineHeight: 18,
  },
  item: {
    marginBottom: theme.spacing.lg,
    paddingBottom: theme.spacing.md,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: theme.colors.border,
  },
  itemLast: {
    marginBottom: 0,
    paddingBottom: 0,
    borderBottomWidth: 0,
  },
  itemTop: {
    flexDirection: "row",
    alignItems: "flex-start",
    justifyContent: "space-between",
    gap: theme.spacing.sm,
    marginBottom: theme.spacing.xs,
  },
  itemDomain: {
    ...theme.typography.caption,
    fontWeight: "600",
    color: theme.colors.text,
    flex: 1,
    minWidth: 0,
  },
  badge: {
    paddingHorizontal: theme.spacing.sm,
    paddingVertical: 4,
    borderRadius: theme.borderRadius.sm,
    maxWidth: "48%",
  },
  badgeText: {
    fontSize: 10,
    fontWeight: "700",
    letterSpacing: 0.2,
  },
  itemEvidence: {
    ...theme.typography.body,
    color: theme.colors.textSecondary,
    lineHeight: 22,
    marginBottom: theme.spacing.xs,
  },
  itemMeta: {
    ...theme.typography.caption,
    color: theme.colors.textMuted,
  },
});
