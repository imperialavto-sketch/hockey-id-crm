/**
 * Dev prototype: Arena multi-observation review с реальным pipeline (split → multi-intent → resolution → review items).
 * Без handlers, без API, не в production flow.
 */

import React, { useEffect, useMemo, useState } from "react";
import { Platform, Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { ScreenContainer } from "@/components/layout/ScreenContainer";
import { theme } from "@/constants/theme";
import { resolveArenaIntentCandidatesV1 } from "@/dev/arena-candidate-resolution-v1";
import { MULTI_INTENT_AUDIT_ROSTER, parseArenaMultiIntentPrototype } from "@/dev/arena-multi-intent-adapter-v1";
import type { ArenaReviewListItem } from "@/dev/arena-review-items-adapter-v1";
import {
  filterReviewItemsBySection,
  resolutionResultToReviewItems,
} from "@/dev/arena-review-items-adapter-v1";
import {
  ARENA_REVIEW_PROTOTYPE_TRANSCRIPTS,
  type ArenaReviewPrototypeTranscriptSample,
} from "@/dev/arena-review-prototype-transcripts";
import {
  arenaReviewDecisionOutputToJson,
  buildArenaReviewDecisionOutput,
  formatArenaReviewHumanSummary,
} from "@/dev/arena-review-decision-output-v1";
import { splitArenaObservations } from "@/dev/split-arena-observations-v1";

export type ArenaPrototypeDecision =
  | "confirm"
  | "merge"
  | "keep_separate"
  | "assign_player"
  | "convert_team"
  | "keep_note"
  | "discard";

export type ArenaPrototypeDecisionMap = Record<string, ArenaPrototypeDecision | undefined>;

const DECISION_LABELS: Record<ArenaPrototypeDecision, string> = {
  confirm: "Подтвердить",
  merge: "Объединить",
  keep_separate: "Два отдельных",
  assign_player: "Назначить игрока",
  convert_team: "Как команда",
  keep_note: "Заметка",
  discard: "Не сохранять",
};

function decisionsForSection(section: ArenaReviewListItem["section"]): ArenaPrototypeDecision[] {
  switch (section) {
    case "READY_TO_KEEP":
      return ["confirm"];
    case "NEEDS_MERGE_REVIEW":
      return ["merge", "keep_separate"];
    case "NEEDS_ATTENTION":
      return ["assign_player", "convert_team", "keep_note", "discard"];
    default:
      return [];
  }
}

const SECTION_META: {
  section: ArenaReviewListItem["section"];
  title: string;
  subtitle: string;
  borderAccent: string;
}[] = [
  {
    section: "READY_TO_KEEP",
    title: "Готово к сохранению",
    subtitle: "SECTION A — можно подтвердить как есть",
    borderAccent: theme.colors.primary,
  },
  {
    section: "NEEDS_MERGE_REVIEW",
    title: "Объединение сегментов",
    subtitle: "SECTION B — один игрок, два фрагмента",
    borderAccent: theme.colors.warning,
  },
  {
    section: "NEEDS_ATTENTION",
    title: "Нужно решение",
    subtitle: "SECTION C — уточните смысл",
    borderAccent: theme.colors.accent,
  },
];

function intentKindLabel(kind: ArenaReviewListItem["intentKind"]): string {
  switch (kind) {
    case "create_player_observation":
      return "Игрок";
    case "create_team_observation":
      return "Команда";
    default:
      return "Без привязки";
  }
}

function sentimentLabel(s?: ArenaReviewListItem["sentiment"]): string {
  if (s === "positive") return "Тон: положительный";
  if (s === "negative") return "Тон: отрицательный";
  return "Тон: нейтральный";
}

function ReviewCard({
  item,
  decision,
  onSelectDecision,
}: {
  item: ArenaReviewListItem;
  decision: ArenaPrototypeDecision | undefined;
  onSelectDecision: (d: ArenaPrototypeDecision) => void;
}) {
  const accent =
    item.section === "READY_TO_KEEP"
      ? theme.colors.primary
      : item.section === "NEEDS_MERGE_REVIEW"
        ? theme.colors.warning
        : theme.colors.accent;

  const options = decisionsForSection(item.section);

  return (
    <View style={[styles.card, { borderLeftColor: accent }]}>
      <Text style={styles.cardQuote}>«{item.segmentText}»</Text>
      {item.secondarySegmentText ? (
        <Text style={styles.cardQuoteSecondary}>+ «{item.secondarySegmentText}»</Text>
      ) : null}
      <View style={styles.metaRow}>
        <Text style={styles.metaBadge}>{intentKindLabel(item.intentKind)}</Text>
        <Text style={styles.metaText}>{item.playerLabel ?? "—"}</Text>
      </View>
      <Text style={styles.sentiment}>{sentimentLabel(item.sentiment)}</Text>
      {item.reason ? <Text style={styles.reason}>{item.reason}</Text> : null}
      {item.originalTranscript ? (
        <Text style={styles.original} numberOfLines={2}>
          Исходная фраза: {item.originalTranscript}
        </Text>
      ) : null}
      {decision ? (
        <Text style={styles.decisionPicked}>
          Решение: {DECISION_LABELS[decision]}
        </Text>
      ) : null}
      <Text style={styles.hintMuted}>Подсказка (не клик): {item.suggestedActionLabels.join(" · ")}</Text>
      <View style={styles.actionsRow}>
        {options.map((d) => {
          const selected = decision === d;
          return (
            <Pressable
              key={d}
              onPress={() => onSelectDecision(d)}
              style={({ pressed }) => [
                styles.decisionChip,
                selected && styles.decisionChipSelected,
                pressed && styles.decisionChipPressed,
              ]}
            >
              <Text style={[styles.decisionChipText, selected && styles.decisionChipTextSelected]}>
                {DECISION_LABELS[d]}
              </Text>
            </Pressable>
          );
        })}
      </View>
    </View>
  );
}

function runDevPipeline(transcript: string) {
  const roster = MULTI_INTENT_AUDIT_ROSTER;
  const segments = splitArenaObservations({ transcript });
  const candidates = parseArenaMultiIntentPrototype({ transcript, roster });
  const resolution = resolveArenaIntentCandidatesV1({ transcript, candidates });
  const reviewItems = resolutionResultToReviewItems({
    resolution,
    candidates,
    roster,
    originalTranscript: transcript,
  });
  return {
    segmentsCount: segments.length,
    candidatesCount: candidates.length,
    resolution,
    reviewItems,
  };
}

function TranscriptChip({
  sample,
  selected,
  onSelect,
}: {
  sample: ArenaReviewPrototypeTranscriptSample;
  selected: boolean;
  onSelect: () => void;
}) {
  return (
    <Pressable
      onPress={onSelect}
      style={({ pressed }) => [
        styles.chip,
        selected && styles.chipSelected,
        pressed && styles.chipPressed,
      ]}
    >
      <Text style={[styles.chipText, selected && styles.chipTextSelected]}>{sample.label}</Text>
    </Pressable>
  );
}

export default function ArenaReviewPrototypeScreen() {
  const [selectedId, setSelectedId] = useState<string>(
    ARENA_REVIEW_PROTOTYPE_TRANSCRIPTS[0]!.id
  );
  const [decisionMap, setDecisionMap] = useState<ArenaPrototypeDecisionMap>({});
  const [outputVisible, setOutputVisible] = useState(false);

  const selectedSample =
    ARENA_REVIEW_PROTOTYPE_TRANSCRIPTS.find((s) => s.id === selectedId) ??
    ARENA_REVIEW_PROTOTYPE_TRANSCRIPTS[0]!;

  useEffect(() => {
    setDecisionMap({});
    setOutputVisible(false);
  }, [selectedId]);

  const pipeline = useMemo(
    () => runDevPipeline(selectedSample.transcript),
    [selectedSample.transcript]
  );

  const { segmentsCount, candidatesCount, resolution, reviewItems } = pipeline;
  const { kept, merged, ambiguous } = resolution.summary;

  const bySection = useMemo(() => {
    return SECTION_META.map((m) => ({
      ...m,
      items: filterReviewItemsBySection(reviewItems, m.section),
    }));
  }, [reviewItems]);

  const needWork = reviewItems.filter((x) => x.section !== "READY_TO_KEEP").length;

  /** Сколько карточек текущего списка уже имеют выбор */
  const decisionsMade = useMemo(
    () => reviewItems.filter((item) => decisionMap[item.id] !== undefined).length,
    [reviewItems, decisionMap]
  );

  /**
   * Карточки без решения по всему списку (A+B+C): стабильное определение для dev summary.
   */
  const unresolvedCount = reviewItems.length - decisionsMade;

  const decisionOutput = useMemo(
    () =>
      buildArenaReviewDecisionOutput({
        transcript: selectedSample.transcript,
        reviewItems,
        decisionMap,
      }),
    [selectedSample.transcript, reviewItems, decisionMap]
  );

  const humanOutputLines = useMemo(
    () => formatArenaReviewHumanSummary(decisionOutput),
    [decisionOutput]
  );

  const jsonOutput = useMemo(
    () => arenaReviewDecisionOutputToJson(decisionOutput),
    [decisionOutput]
  );

  const selectDecision = (itemId: string, d: ArenaPrototypeDecision) => {
    setDecisionMap((prev) => ({ ...prev, [itemId]: d }));
  };

  return (
    <ScreenContainer>
      <ScrollView
        contentContainerStyle={styles.scroll}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.header}>
          <Text style={styles.headerTitle}>Проверка наблюдений</Text>
          <Text style={styles.headerSubtitle}>
            Post-session review · реальный dev pipeline на этом экране (не production).
          </Text>
        </View>

        <Text style={styles.chipsSectionLabel}>Пример транскрипта</Text>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.chipsRow}
        >
          {ARENA_REVIEW_PROTOTYPE_TRANSCRIPTS.map((s) => (
            <TranscriptChip
              key={s.id}
              sample={s}
              selected={s.id === selectedId}
              onSelect={() => setSelectedId(s.id)}
            />
          ))}
        </ScrollView>

        <View style={styles.debugBox}>
          <Text style={styles.debugTitle}>Dev summary</Text>
          <Text style={styles.debugLine} numberOfLines={3}>
            transcript: {selectedSample.transcript}
          </Text>
          <Text style={styles.debugLine}>
            segments: {segmentsCount} · candidates: {candidatesCount}
          </Text>
          <Text style={styles.debugLine}>
            resolution: kept {kept} · merged {merged} · ambiguous {ambiguous}
          </Text>
          <Text style={styles.debugLine}>
            review cards: {reviewItems.length} · B/C cards: {needWork}
          </Text>
          <Text style={styles.debugLine}>
            decisionsMade: {decisionsMade} · unresolvedCount: {unresolvedCount} (все секции)
          </Text>
        </View>

        {bySection.map(({ section, title, subtitle, borderAccent, items }) => (
          <View key={section} style={styles.sectionBlock}>
            <View style={[styles.sectionRule, { backgroundColor: borderAccent }]} />
            <Text style={styles.sectionTitle}>{title}</Text>
            <Text style={styles.sectionSubtitle}>{subtitle}</Text>
            {items.length === 0 ? (
              <Text style={styles.empty}>Нет элементов в этой секции</Text>
            ) : (
              items.map((item) => (
                <ReviewCard
                  key={item.id}
                  item={item}
                  decision={decisionMap[item.id]}
                  onSelectDecision={(d) => selectDecision(item.id, d)}
                />
              ))
            )}
          </View>
        ))}

        <Pressable
          onPress={() => setOutputVisible((v) => !v)}
          style={({ pressed }) => [styles.outputToggle, pressed && styles.outputTogglePressed]}
        >
          <Text style={styles.outputToggleText}>
            {outputVisible ? "Скрыть результат review" : "Собрать decision output"}
          </Text>
        </Pressable>

        {outputVisible ? (
          <View style={styles.outputPanel}>
            <Text style={styles.outputPanelTitle}>Итог review (dev)</Text>
            <Text style={styles.outputSubTitle}>A. Кратко</Text>
            {humanOutputLines.map((line, idx) => (
              <Text key={`h-${idx}`} style={styles.outputHumanLine}>
                {line}
              </Text>
            ))}
            <Text style={styles.outputSubTitle}>B. По карточкам</Text>
            {decisionOutput.items.map((row) => (
              <Text key={row.id} style={styles.outputItemLine} numberOfLines={3}>
                {row.unresolved
                  ? `• [нет решения] ${row.segmentText.slice(0, 80)}${row.segmentText.length > 80 ? "…" : ""}`
                  : `• ${row.decision} — ${row.segmentText.slice(0, 72)}${row.segmentText.length > 72 ? "…" : ""}`}
              </Text>
            ))}
            <Text style={styles.outputSubTitle}>C. Raw JSON</Text>
            <ScrollView
              style={styles.jsonScroll}
              nestedScrollEnabled
              showsVerticalScrollIndicator
            >
              <Text selectable style={styles.jsonText}>
                {jsonOutput}
              </Text>
            </ScrollView>
          </View>
        ) : null}

        <View style={styles.footerNote}>
          <Text style={styles.footerText}>
            Решения только в локальном state; смена примера сбрасывает выбор и панель output.
            Output пересчитывается из текущего decisionMap. API и production не затрагиваются.
          </Text>
        </View>
      </ScrollView>
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  scroll: {
    paddingBottom: theme.spacing.xxl + 24,
    paddingHorizontal: theme.spacing.md,
  },
  header: {
    marginTop: theme.spacing.md,
    marginBottom: theme.spacing.md,
  },
  headerTitle: {
    ...theme.typography.hero,
    fontSize: 24,
    lineHeight: 30,
    color: theme.colors.text,
    marginBottom: theme.spacing.sm,
  },
  headerSubtitle: {
    fontSize: 15,
    lineHeight: 22,
    color: theme.colors.textSecondary,
  },
  chipsSectionLabel: {
    fontSize: 13,
    fontWeight: "600",
    color: theme.colors.textMuted,
    marginBottom: theme.spacing.sm,
  },
  chipsRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
    paddingBottom: theme.spacing.md,
  },
  chip: {
    paddingVertical: 10,
    paddingHorizontal: 14,
    borderRadius: theme.borderRadius.full,
    backgroundColor: theme.colors.surfaceElevated,
    borderWidth: 1,
    borderColor: theme.colors.border,
  },
  chipSelected: {
    borderColor: theme.colors.primary,
    backgroundColor: theme.colors.primaryMuted,
  },
  chipPressed: {
    opacity: 0.85,
  },
  chipText: {
    fontSize: 13,
    color: theme.colors.textSecondary,
  },
  chipTextSelected: {
    color: theme.colors.primary,
    fontWeight: "600",
  },
  debugBox: {
    backgroundColor: theme.colors.surface,
    borderRadius: theme.borderRadius.md,
    padding: theme.spacing.md,
    marginBottom: theme.layout.sectionGap,
    borderWidth: 1,
    borderColor: theme.colors.cardBorder,
  },
  debugTitle: {
    fontSize: 12,
    fontWeight: "700",
    color: theme.colors.textMuted,
    textTransform: "uppercase",
    letterSpacing: 0.5,
    marginBottom: theme.spacing.sm,
  },
  debugLine: {
    fontSize: 12,
    lineHeight: 18,
    color: theme.colors.textSecondary,
    marginBottom: 4,
  },
  sectionBlock: {
    marginBottom: theme.layout.sectionGap + 8,
  },
  sectionRule: {
    width: 40,
    height: 3,
    borderRadius: 2,
    marginBottom: theme.spacing.sm,
    opacity: 0.85,
  },
  sectionTitle: {
    ...theme.typography.title,
    fontSize: 18,
    color: theme.colors.text,
    marginBottom: 4,
  },
  sectionSubtitle: {
    fontSize: 13,
    color: theme.colors.textMuted,
    marginBottom: theme.spacing.md,
  },
  empty: {
    fontSize: 14,
    color: theme.colors.textMuted,
    fontStyle: "italic",
  },
  card: {
    backgroundColor: theme.colors.surfaceElevated,
    borderRadius: theme.borderRadius.md,
    padding: theme.spacing.md,
    marginBottom: theme.spacing.md,
    borderLeftWidth: 3,
    borderWidth: 1,
    borderColor: theme.colors.cardBorder,
  },
  cardQuote: {
    fontSize: 16,
    lineHeight: 24,
    color: theme.colors.text,
    marginBottom: theme.spacing.sm,
  },
  cardQuoteSecondary: {
    fontSize: 15,
    lineHeight: 22,
    color: theme.colors.textSecondary,
    marginBottom: theme.spacing.sm,
  },
  metaRow: {
    flexDirection: "row",
    alignItems: "center",
    flexWrap: "wrap",
    gap: 8,
    marginBottom: 6,
  },
  metaBadge: {
    fontSize: 12,
    fontWeight: "600",
    color: theme.colors.primary,
    backgroundColor: theme.colors.primaryMuted,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: theme.borderRadius.sm,
    overflow: "hidden",
  },
  metaText: {
    fontSize: 15,
    color: theme.colors.text,
  },
  sentiment: {
    fontSize: 13,
    color: theme.colors.textSecondary,
    marginBottom: theme.spacing.sm,
  },
  reason: {
    fontSize: 13,
    lineHeight: 19,
    color: theme.colors.textMuted,
    marginBottom: theme.spacing.sm,
  },
  original: {
    fontSize: 12,
    color: theme.colors.textMuted,
    marginBottom: theme.spacing.sm,
  },
  decisionPicked: {
    fontSize: 13,
    fontWeight: "600",
    color: theme.colors.textSecondary,
    marginTop: theme.spacing.sm,
    marginBottom: 6,
  },
  hintMuted: {
    fontSize: 11,
    lineHeight: 16,
    color: theme.colors.textMuted,
    marginBottom: theme.spacing.sm,
    opacity: 0.85,
  },
  actionsRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
    marginTop: 4,
  },
  decisionChip: {
    paddingVertical: 7,
    paddingHorizontal: 11,
    borderRadius: theme.borderRadius.sm,
    backgroundColor: theme.colors.surface,
    borderWidth: 1,
    borderColor: theme.colors.border,
  },
  decisionChipSelected: {
    borderColor: "rgba(59, 130, 246, 0.45)",
    backgroundColor: "rgba(59, 130, 246, 0.08)",
  },
  decisionChipPressed: {
    opacity: 0.88,
  },
  decisionChipText: {
    fontSize: 12,
    color: theme.colors.textSecondary,
  },
  decisionChipTextSelected: {
    color: theme.colors.text,
    fontWeight: "500",
  },
  outputToggle: {
    alignSelf: "flex-start",
    marginBottom: theme.spacing.md,
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: theme.borderRadius.md,
    backgroundColor: theme.colors.surfaceElevated,
    borderWidth: 1,
    borderColor: theme.colors.border,
  },
  outputTogglePressed: {
    opacity: 0.9,
  },
  outputToggleText: {
    fontSize: 14,
    fontWeight: "600",
    color: theme.colors.textSecondary,
  },
  outputPanel: {
    marginBottom: theme.spacing.lg,
    padding: theme.spacing.md,
    borderRadius: theme.borderRadius.md,
    backgroundColor: theme.colors.surface,
    borderWidth: 1,
    borderColor: theme.colors.cardBorder,
  },
  outputPanelTitle: {
    fontSize: 16,
    fontWeight: "700",
    color: theme.colors.text,
    marginBottom: theme.spacing.sm,
  },
  outputSubTitle: {
    fontSize: 12,
    fontWeight: "700",
    color: theme.colors.textMuted,
    textTransform: "uppercase",
    letterSpacing: 0.4,
    marginTop: theme.spacing.md,
    marginBottom: 6,
  },
  outputHumanLine: {
    fontSize: 14,
    lineHeight: 22,
    color: theme.colors.textSecondary,
  },
  outputItemLine: {
    fontSize: 12,
    lineHeight: 18,
    color: theme.colors.textMuted,
    marginBottom: 4,
  },
  jsonScroll: {
    maxHeight: 220,
    marginTop: 6,
    borderRadius: theme.borderRadius.sm,
    backgroundColor: theme.colors.background,
    padding: theme.spacing.sm,
  },
  jsonText: {
    fontSize: 10,
    lineHeight: 14,
    color: theme.colors.textSecondary,
    ...Platform.select({
      ios: { fontFamily: "Menlo" },
      default: { fontFamily: "monospace" },
    }),
  },
  footerNote: {
    marginTop: theme.spacing.sm,
    padding: theme.spacing.md,
    borderRadius: theme.borderRadius.md,
    backgroundColor: theme.colors.surface,
  },
  footerText: {
    fontSize: 13,
    color: theme.colors.textMuted,
    lineHeight: 20,
  },
});
