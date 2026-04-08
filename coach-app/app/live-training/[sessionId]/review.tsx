/** PHASE 3: `COACH_CANONICAL_LIVE_FLOW` (`docs/PHASE_3_APP_FLOW_LOCK.md`). */
import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { ActivityIndicator, Alert, Pressable, StyleSheet, Text, View } from "react-native";
import Reanimated from "react-native-reanimated";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { useLocalSearchParams, useRouter } from "expo-router";
import { screenReveal } from "@/lib/animations";
import { coachHapticSuccess } from "@/lib/coachHaptics";
import { FlagshipScreen } from "@/components/layout/FlagshipScreen";
import { GlassCardV2 } from "@/components/ui/GlassCardV2";
import { PrimaryButton } from "@/components/ui/PrimaryButton";
import {
  LiveTrainingDraftEditModal,
  type LiveTrainingDraftSavePhase,
} from "@/components/live-training/LiveTrainingDraftEditModal";
import { theme } from "@/constants/theme";
import {
  buildReviewScheduleGroupLabelRu,
  buildReviewStageCoachLine,
} from "@/lib/arenaAssistantBehavior";
import {
  resolveLiveTrainingScheduleRouteContext,
  scheduleRouteContextToArena,
  scheduleRouteQuerySuffix,
} from "@/lib/liveTrainingScheduleRouteContext";
import { ReviewGuidanceAwarenessSection } from "@/components/live-training/ReviewGuidanceAwarenessSection";
import { ReviewReportPlanningContextSection } from "@/components/live-training/ReviewReportPlanningContextSection";
import { LiveTrainingReviewMeaningSnapshot } from "@/components/live-training/LiveTrainingReviewMeaningSnapshot";
import { buildArenaReviewIntelligenceBullets } from "@/lib/arenaCoachIntelligence";
import { accumulateDevelopmentFromDrafts } from "@/lib/arenaDevelopmentMapping";
import {
  buildReviewDecisionBundle,
  type ReviewDecisionGroupLayerVm,
  type ReviewDecisionHeroVm,
  type ReviewDecisionNextActionVm,
  type ReviewDecisionPriorityPlayerVm,
} from "@/lib/arenaReviewDecision";
import { ApiRequestError } from "@/lib/api";
import { formatLiveTrainingMode } from "@/lib/liveTrainingUi";
import { formatLiveTrainingDraftCategory } from "@/lib/liveTrainingDraftCategoryLabel";
import {
  buildLiveTrainingDraftProvenanceHints,
  countDraftsWithProvenanceHints,
} from "@/lib/liveTrainingDraftProvenanceHints";
import {
  buildLiveTrainingDraftReviewStrategy,
  type LiveTrainingDraftReviewStrategy,
} from "@/lib/liveTrainingDraftReviewStrategy";
import {
  coachReviewCategoryLabelRu,
  pickCoachAttentionHintLines,
} from "@/lib/liveTrainingCoachDecisionUi";
import {
  buildLiveTrainingReviewAcceleration,
  filterDraftsByReviewMode,
  LIVE_TRAINING_REVIEW_FILTER_LABELS,
  liveTrainingReviewFilterEmptyHint,
  type LiveTrainingReviewAcceleration,
  type LiveTrainingReviewFilterMode,
} from "@/lib/liveTrainingReviewAcceleration";
import {
  buildLiveTrainingReviewHumanSummary,
  type LiveTrainingReviewHumanSummary,
} from "@/lib/liveTrainingReviewHumanSummary";
import {
  buildLiveTrainingConfirmConfidence,
  type LiveTrainingConfirmConfidence,
} from "@/lib/liveTrainingConfirmConfidence";
import {
  buildLiveTrainingReviewClosureQuality,
  type LiveTrainingReviewClosureQuality,
} from "@/lib/liveTrainingReviewClosureQuality";
import { buildLiveGuidanceAwareness } from "@/lib/liveTrainingGuidanceAwareness";
import { buildLiveMicroGuidanceFromPlanningSnapshot } from "@/lib/liveTrainingMicroGuidance";
import { buildLiveTrainingReviewReportPlanningVm } from "@/lib/liveTrainingReviewReportPlanningContext";
import { createClientMutationId } from "@/lib/liveTrainingClientMutationId";
import { trackLiveTrainingEvent } from "@/lib/liveTrainingTelemetry";
import {
  applyLiveTrainingDraftSuggestionMerge,
  confirmLiveTrainingSession,
  deleteLiveTrainingDraft,
  getLiveTrainingReviewState,
  getLiveTrainingSession,
  patchLiveTrainingDraft,
} from "@/services/liveTrainingService";
import { getCoachPlayers } from "@/services/coachPlayersService";
import type {
  LiveTrainingDraftCorrectionSuggestion,
  LiveTrainingDraftCorrectionSuggestionSourceLayer,
  LiveTrainingObservationDraft,
  LiveTrainingSession,
} from "@/types/liveTraining";

function correctionSuggestionSourceLabelRu(
  layer: LiveTrainingDraftCorrectionSuggestionSourceLayer
): string {
  switch (layer) {
    case "focus_block":
      return "Из фокуса";
    case "main_block":
      return "Из основного блока";
    case "reinforcement_block":
      return "Из закрепления";
    case "warmup_block":
      return "Из разминки";
    case "snapshot":
      return "Из контекста";
    default: {
      const _exhaustive: never = layer;
      return _exhaustive;
    }
  }
}

/** Один общий подзаголовок, только если у всех подсказок один и тот же sourceLayer. */
function correctionSuggestionsGroupSourceCaption(
  items: LiveTrainingDraftCorrectionSuggestion[]
): string | null {
  if (items.length === 0) return null;
  const first = items[0].sourceLayer;
  if (!first) return null;
  for (let i = 1; i < items.length; i += 1) {
    if (items[i].sourceLayer !== first) return null;
  }
  return correctionSuggestionSourceLabelRu(first);
}

function suggestionSortTier(s: LiveTrainingDraftCorrectionSuggestion): number {
  const p = s.suggestionPriority;
  if (p === "high") return 3;
  if (p === "low") return 1;
  return 2;
}

/** PHASE 35: high → medium → low; внутри tier — как пришло с сервера. */
function sortCorrectionSuggestionsByPriority(
  items: LiveTrainingDraftCorrectionSuggestion[]
): LiveTrainingDraftCorrectionSuggestion[] {
  return [...items].sort((a, b) => suggestionSortTier(b) - suggestionSortTier(a));
}

function correctionSuggestionPriorityA11y(
  p: LiveTrainingDraftCorrectionSuggestion["suggestionPriority"]
): string {
  if (p === "high") return "Важнее остальных.";
  if (p === "medium") return "Стоит проверить.";
  if (p === "low") return "Можно применить.";
  return "";
}

function correctionSuggestionConfidenceA11y(
  c: LiveTrainingDraftCorrectionSuggestion["suggestionConfidence"]
): string {
  if (c === "high") return "Высокая уверенность.";
  if (c === "medium") return "Средняя уверенность.";
  if (c === "low") return "Слабее сигнал.";
  return "";
}

function suggestionValueOpacity(
  c: LiveTrainingDraftCorrectionSuggestion["suggestionConfidence"]
): number {
  if (c === "medium") return 0.9;
  if (c === "low") return 0.78;
  return 1;
}

function sentimentLabel(s: LiveTrainingObservationDraft["sentiment"]): string {
  if (s === "positive") return "Плюс";
  if (s === "negative") return "Минус";
  return "Нейтрально";
}

function ruObservationCountLabel(n: number): string {
  const k = n % 10;
  const k100 = n % 100;
  if (k === 1 && k100 !== 11) return `${n} наблюдение`;
  if (k >= 2 && k <= 4 && (k100 < 12 || k100 > 14)) return `${n} наблюдения`;
  return `${n} наблюдений`;
}

function coachReviewPriorityTier(d: LiveTrainingObservationDraft): number {
  const p = d.coachDecision?.reviewPriority;
  if (p === "high") return 3;
  if (p === "medium") return 2;
  return 1;
}

/** Приоритетные наблюдения выше в списке (без смены API). */
function sortDraftsByCoachReviewPriority(
  drafts: LiveTrainingObservationDraft[]
): LiveTrainingObservationDraft[] {
  return [...drafts].sort((a, b) => coachReviewPriorityTier(b) - coachReviewPriorityTier(a));
}

function DraftReviewStrategyCue({ strategy }: { strategy: LiveTrainingDraftReviewStrategy }) {
  const s = strategy;
  const labelVisual =
    s.tone === "positive"
      ? { color: theme.colors.primary, opacity: 0.92 as const }
      : s.tone === "attention"
        ? { color: theme.colors.warning, opacity: 0.84 as const }
        : { color: theme.colors.text, opacity: 0.9 as const };
  return (
    <View
      style={styles.reviewStrategyWrap}
      accessibilityRole="text"
      accessibilityLabel={[s.label, s.reason].filter(Boolean).join(". ")}
    >
      <Text style={[styles.reviewStrategyLabel, labelVisual]} numberOfLines={1}>
        {s.label}
      </Text>
      {s.reason ? (
        <Text style={styles.reviewStrategyReason} numberOfLines={1}>
          {s.reason}
        </Text>
      ) : null}
    </View>
  );
}

function draftGlassVariant(
  draft: LiveTrainingObservationDraft,
  strategy: LiveTrainingDraftReviewStrategy
): "default" | "highlight" | "success" {
  if (draft.needsReview) return "default";
  if (strategy.strategy === "ready_as_is") return "success";
  return "default";
}

function DraftProvenanceHints({ draft }: { draft: LiveTrainingObservationDraft }) {
  const hints = buildLiveTrainingDraftProvenanceHints(draft.needsReview, draft.provenance ?? null);
  if (hints.length === 0) return null;
  return (
    <View style={styles.provenanceWrap} accessibilityRole="text">
      {hints.map((line, idx) => (
        <Text key={`prov-${idx}-${line.slice(0, 24)}`} style={styles.provenanceHint}>
          {line}
        </Text>
      ))}
    </View>
  );
}

function playerCaptionForFilteredRow(d: LiveTrainingObservationDraft): string {
  if (d.playerNameRaw?.trim()) return d.playerNameRaw.trim();
  if (d.playerId) return "Игрок";
  return "Без привязки к игроку";
}

function DraftReviewCard({
  draft,
  sessionId,
  onAfterApply,
  onPress,
  playerCaption,
  showConfidenceInMeta,
  showReviewVisitHint,
}: {
  draft: LiveTrainingObservationDraft;
  sessionId: string;
  onAfterApply: () => Promise<void>;
  onPress: () => void;
  playerCaption: string | null;
  showConfidenceInMeta: boolean;
  /** PHASE 38: карточку уже открывали / chip в этом заходе */
  showReviewVisitHint?: boolean;
}) {
  const strategy = useMemo(() => buildLiveTrainingDraftReviewStrategy(draft), [draft]);
  const variant = draftGlassVariant(draft, strategy);
  const needsLeftAccent = draft.needsReview;
  const cd = draft.coachDecision;
  const categoryLabel = coachReviewCategoryLabelRu(cd?.reviewCategory);
  const arenaCoachHints = useMemo(
    () => pickCoachAttentionHintLines(cd?.coachAttentionReasons, 2),
    [cd?.coachAttentionReasons]
  );
  const glassContentStyle = useMemo(() => {
    return needsLeftAccent ? styles.draftGlassNeedsReview : undefined;
  }, [needsLeftAccent]);

  const cardBody = (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [styles.draftPressable, pressed && styles.draftBlockPressed]}
    >
      <GlassCardV2 variant={variant} padding="md" glow={false} contentStyle={glassContentStyle}>
        <View style={styles.draftStatusRow}>
          {draft.needsReview ? (
            <View style={styles.draftStatusPillAttention}>
              <Text style={styles.draftStatusPillAttentionText}>Проверка</Text>
            </View>
          ) : strategy.strategy === "ready_as_is" ? (
            <View style={styles.draftStatusPillCalm}>
              <Text style={styles.draftStatusPillCalmText}>К фиксации</Text>
            </View>
          ) : null}
          {categoryLabel ? (
            <View style={styles.draftArenaCategoryPill}>
              <Text style={styles.draftArenaCategoryPillText}>{categoryLabel}</Text>
            </View>
          ) : null}
          {cd?.repeatedConcernInSession ? (
            <Text style={styles.draftArenaRepeatBadge} accessibilityLabel="Повтор в сессии">
              ↻
            </Text>
          ) : null}
          {showReviewVisitHint ? (
            <Text style={styles.draftSessionVisitHint} numberOfLines={1}>
              Уже смотрели в этом проходе
            </Text>
          ) : null}
        </View>
        {playerCaption != null ? <Text style={styles.draftPlayer}>{playerCaption}</Text> : null}
        <Text style={styles.draftText}>{draft.sourceText}</Text>
        <DraftReviewStrategyCue strategy={strategy} />
        {arenaCoachHints.length > 0 ? (
          <Text style={styles.draftArenaCoachHints} numberOfLines={2}>
            {arenaCoachHints.join(" · ")}
          </Text>
        ) : null}
        <DraftProvenanceHints draft={draft} />
        <DraftQuickCorrections draft={draft} sessionId={sessionId} onAfterApply={onAfterApply} />
        <Text style={styles.draftMeta}>
          {formatLiveTrainingDraftCategory(draft.category)} · {sentimentLabel(draft.sentiment)}
          {showConfidenceInMeta && draft.confidence != null
            ? ` · уверенность ${Math.round(draft.confidence * 100)}%`
            : ""}
        </Text>
        <Text style={styles.tapHint}>Нажмите для правки</Text>
      </GlassCardV2>
    </Pressable>
  );

  return <View style={styles.draftRevealWrap}>{cardBody}</View>;
}

function ReviewClosureQualitySection({ payload }: { payload: LiveTrainingReviewClosureQuality }) {
  const borderLeftColor =
    payload.quality === "strong"
      ? theme.colors.primary
      : payload.quality === "acceptable"
        ? theme.colors.textMuted
        : theme.colors.warning;

  return (
    <View accessibilityRole="text" accessibilityLabel={`${payload.label}. ${payload.lines.join(" ")}`}>
      <GlassCardV2
        padding="lg"
        contentStyle={[styles.closureQualityCardAccent, { borderLeftColor }]}
      >
        <Text style={styles.closureQualityKicker}>Передача в аналитику</Text>
        <Text style={styles.closureQualityLabel}>{payload.label}</Text>
        {payload.lines.map((line, i) => (
          <Text key={`cq-${i}-${line.slice(0, 12)}`} style={styles.closureQualityLine}>
            {line}
          </Text>
        ))}
      </GlassCardV2>
    </View>
  );
}

function ConfirmReadinessSection({
  confidence,
  onApplyRecommendedFilter,
}: {
  confidence: LiveTrainingConfirmConfidence;
  onApplyRecommendedFilter?: () => void;
}) {
  const borderLeftColor =
    confidence.readiness === "ready"
      ? theme.colors.primary
      : confidence.readiness === "blocked"
        ? theme.colors.warning
        : theme.colors.textMuted;

  const filterKey = confidence.recommendedFilter;
  const filterLabel =
    filterKey != null ? LIVE_TRAINING_REVIEW_FILTER_LABELS[filterKey] : null;

  return (
    <GlassCardV2
      padding="lg"
      contentStyle={[styles.confirmReadinessCardAccent, { borderLeftColor }]}
    >
      <Text style={styles.confirmReadinessKicker}>Готовность к подтверждению</Text>
      <Text style={styles.confirmReadinessLabel}>{confidence.label}</Text>
      {confidence.reasons.map((r, i) => (
        <Text key={i} style={styles.confirmReadinessReason}>
          {r}
        </Text>
      ))}
      {filterLabel != null && onApplyRecommendedFilter ? (
        <Pressable
          onPress={onApplyRecommendedFilter}
          style={({ pressed }) => [styles.confirmReadinessFilterHint, pressed && styles.confirmReadinessFilterPressed]}
          accessibilityRole="button"
          accessibilityLabel={`Открыть фильтр ${filterLabel}`}
        >
          <Text style={styles.confirmReadinessFilterHintText}>Сначала откройте: {filterLabel}</Text>
        </Pressable>
      ) : null}
    </GlassCardV2>
  );
}

function ReviewHumanSummarySection({ summary }: { summary: LiveTrainingReviewHumanSummary }) {
  const borderLeftColor =
    summary.tone === "ready"
      ? theme.colors.primary
      : summary.tone === "attention"
        ? theme.colors.warning
        : theme.colors.textMuted;

  return (
    <GlassCardV2
      padding="lg"
      contentStyle={[styles.humanSummaryCardAccent, { borderLeftColor }]}
    >
      <Text style={styles.humanSummaryKicker}>Сводка перед подтверждением</Text>
      <Text style={styles.humanSummaryHeadline}>{summary.headline}</Text>
      {summary.lines.map((line, i) => (
        <Text key={i} style={styles.humanSummaryLine}>
          {line}
        </Text>
      ))}
      {summary.highlights?.map((h, i) => (
        <Text key={`hl-${i}`} style={styles.humanSummaryHighlight}>
          {h}
        </Text>
      ))}
      {summary.nudge ? <Text style={styles.humanSummaryNudge}>{summary.nudge}</Text> : null}
    </GlassCardV2>
  );
}

function ReviewAccelerationBar({
  acceleration,
  filterMode,
  onSelect,
}: {
  acceleration: LiveTrainingReviewAcceleration;
  filterMode: LiveTrainingReviewFilterMode;
  onSelect: (m: LiveTrainingReviewFilterMode) => void;
}) {
  const { counts } = acceleration;
  const items: Array<{ mode: LiveTrainingReviewFilterMode; label: string; count: number; disabled?: boolean }> = [
    { mode: "all", label: "Все", count: counts.totalCount },
    {
      mode: "needs_review",
      label: LIVE_TRAINING_REVIEW_FILTER_LABELS.needs_review,
      count: counts.needsReviewCount,
      disabled: counts.needsReviewCount === 0,
    },
    {
      mode: "quick_fixes",
      label: LIVE_TRAINING_REVIEW_FILTER_LABELS.quick_fixes,
      count: counts.quickFixCount,
      disabled: counts.quickFixCount === 0,
    },
    {
      mode: "no_player",
      label: LIVE_TRAINING_REVIEW_FILTER_LABELS.no_player,
      count: counts.noPlayerCount,
      disabled: counts.noPlayerCount === 0,
    },
    {
      mode: "context_helped",
      label: LIVE_TRAINING_REVIEW_FILTER_LABELS.context_helped,
      count: counts.contextHelpedCount,
      disabled: counts.contextHelpedCount === 0,
    },
    {
      mode: "broad_category",
      label: LIVE_TRAINING_REVIEW_FILTER_LABELS.broad_category,
      count: counts.broadCategoryCount,
      disabled: counts.broadCategoryCount === 0,
    },
  ];

  return (
    <GlassCardV2 padding="lg" style={styles.accelerationCard}>
      <Text style={styles.accelerationTitle}>Быстрый проход</Text>
      <Text style={styles.accelerationHint}>Фильтр только меняет список ниже. Сводка сверху — по всей сессии.</Text>
      <View style={styles.accelerationChipRow}>
        {items.map(({ mode, label, count, disabled }) => {
          const active = filterMode === mode;
          return (
            <Pressable
              key={mode}
              disabled={disabled && mode !== "all"}
              onPress={() => onSelect(mode)}
              style={({ pressed }) => [
                styles.accelerationChip,
                active && styles.accelerationChipActive,
                disabled && mode !== "all" && styles.accelerationChipDisabled,
                pressed && !disabled && styles.accelerationChipPressed,
              ]}
              accessibilityRole="button"
              accessibilityState={{ selected: active, disabled: Boolean(disabled && mode !== "all") }}
              accessibilityLabel={`${label}, ${count}`}
            >
              <Text
                style={[
                  styles.accelerationChipText,
                  active && styles.accelerationChipTextActive,
                  disabled && mode !== "all" && styles.accelerationChipTextDisabled,
                ]}
                numberOfLines={2}
              >
                {label} ({count})
              </Text>
            </Pressable>
          );
        })}
      </View>
    </GlassCardV2>
  );
}

function decisionPriorityRowAccent(tone: ReviewDecisionPriorityPlayerVm["tone"]) {
  if (tone === "hot") {
    return {
      borderLeftWidth: 3,
      borderLeftColor: theme.colors.warning,
      paddingLeft: theme.spacing.sm,
    } as const;
  }
  if (tone === "warm") {
    return {
      borderLeftWidth: 3,
      borderLeftColor: theme.colors.primary,
      paddingLeft: theme.spacing.sm,
    } as const;
  }
  return {
    borderLeftWidth: 2,
    borderLeftColor: "rgba(255,255,255,0.12)",
    paddingLeft: theme.spacing.sm,
  } as const;
}

function ReviewDecisionGroupLayerSection({ layer }: { layer: ReviewDecisionGroupLayerVm }) {
  return (
    <GlassCardV2 padding="lg" contentStyle={styles.decisionGroupCardAccent}>
      <Text style={styles.decisionGroupEyebrow}>Сегмент</Text>
      <Text style={styles.decisionGroupSummary}>{layer.summary}</Text>
      {layer.domainsLine ? (
        <Text style={styles.decisionGroupDomains}>{layer.domainsLine}</Text>
      ) : null}
    </GlassCardV2>
  );
}

function ReviewDecisionHeroSection({ hero }: { hero: ReviewDecisionHeroVm }) {
  return (
    <GlassCardV2 padding="lg" contentStyle={styles.decisionHeroCardAccent}>
      <Text style={styles.decisionHeroEyebrow}>Главный фокус</Text>
      {hero.needsReviewBanner ? (
        <Text style={styles.decisionHeroBanner}>Сначала строки с «проверка» — решение за тобой.</Text>
      ) : null}
      {hero.kind === "player" ? (
        <>
          <Text style={styles.decisionHeroName}>{hero.playerLabel}</Text>
          {hero.zonesLine ? <Text style={styles.decisionHeroZones}>{hero.zonesLine}</Text> : null}
          <Text style={styles.decisionHeroThink}>{hero.thinkLine}</Text>
        </>
      ) : (
        <>
          <Text style={styles.decisionHeroSessionHeadline}>{hero.headline}</Text>
          <Text style={styles.decisionHeroThink}>{hero.thinkLine}</Text>
        </>
      )}
      {hero.arenaCatch ? (
        <Text style={styles.decisionHeroArena} accessibilityRole="text">
          Арена: {hero.arenaCatch}
        </Text>
      ) : null}
    </GlassCardV2>
  );
}

function ReviewDecisionPrioritySection({ players }: { players: ReviewDecisionPriorityPlayerVm[] }) {
  if (players.length === 0) return null;
  return (
    <GlassCardV2 padding="lg" contentStyle={styles.decisionPriorityCardAccent}>
      <Text style={styles.decisionSectionEyebrow}>Кому нужно внимание</Text>
      {players.map((p) => (
        <View
          key={p.playerId}
          style={[styles.decisionPriorityRow, decisionPriorityRowAccent(p.tone)]}
          accessibilityRole="text"
          accessibilityLabel={`${p.playerLabel}. ${p.zonesLine ?? ""}. ${p.statusLine}`}
        >
          <Text style={styles.decisionPriorityName}>{p.playerLabel}</Text>
          {p.zonesLine ? <Text style={styles.decisionPriorityZones}>{p.zonesLine}</Text> : null}
          <Text style={styles.decisionPriorityStatus}>{p.statusLine}</Text>
        </View>
      ))}
    </GlassCardV2>
  );
}

function ReviewDecisionNextActionsSection({
  actions,
  filterMode,
  onApplyFilter,
  onOpenActions,
}: {
  actions: ReviewDecisionNextActionVm[];
  filterMode: LiveTrainingReviewFilterMode;
  onApplyFilter: (m: LiveTrainingReviewFilterMode) => void;
  onOpenActions: () => void;
}) {
  if (actions.length === 0) return null;
  return (
    <GlassCardV2 padding="lg" style={styles.decisionNextCard}>
      <Text style={styles.decisionSectionEyebrow}>Что сделать дальше</Text>
      {actions.map((a) => {
        if (a.href === "/actions") {
          return (
            <Pressable
              key={a.id}
              onPress={onOpenActions}
              style={({ pressed }) => [styles.decisionNextRow, pressed && styles.decisionNextPressed]}
              accessibilityRole="button"
              accessibilityLabel={`${a.title}. ${a.subtitle ?? ""}`}
            >
              <Text style={styles.decisionNextTitle}>{a.title}</Text>
              {a.subtitle ? <Text style={styles.decisionNextSub}>{a.subtitle}</Text> : null}
            </Pressable>
          );
        }
        if (a.filter) {
          const active = filterMode === a.filter;
          const label = LIVE_TRAINING_REVIEW_FILTER_LABELS[a.filter];
          return (
            <Pressable
              key={a.id}
              onPress={() => onApplyFilter(a.filter!)}
              style={({ pressed }) => [styles.decisionNextRow, pressed && styles.decisionNextPressed]}
              accessibilityRole="button"
              accessibilityLabel={`${a.title}. ${a.subtitle ?? ""}. Фильтр ${label}`}
            >
              <Text style={styles.decisionNextTitle}>{a.title}</Text>
              {a.subtitle ? <Text style={styles.decisionNextSub}>{a.subtitle}</Text> : null}
              {active ? (
                <Text style={styles.decisionNextActiveHint}>Список ниже — этот фильтр уже включён</Text>
              ) : (
                <Text style={styles.decisionNextTapHint}>Открыть «{label}»</Text>
              )}
            </Pressable>
          );
        }
        return (
          <View key={a.id} style={styles.decisionNextRow} accessibilityRole="text">
            <Text style={styles.decisionNextTitle}>{a.title}</Text>
            {a.subtitle ? <Text style={styles.decisionNextSub}>{a.subtitle}</Text> : null}
          </View>
        );
      })}
      <Text style={styles.decisionNextFooter}>Зафиксировать тренировку — кнопка внизу.</Text>
    </GlassCardV2>
  );
}

function DraftQuickCorrections({
  draft,
  sessionId,
  onAfterApply,
}: {
  draft: LiveTrainingObservationDraft;
  sessionId: string;
  onAfterApply: () => Promise<void>;
}) {
  const mountedRef = useRef(true);
  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
    };
  }, []);

  const suggestions = useMemo(
    () => sortCorrectionSuggestionsByPriority(draft.correctionSuggestions ?? []),
    [draft.correctionSuggestions]
  );
  const [busyId, setBusyId] = useState<string | null>(null);
  if (suggestions.length === 0) return null;

  const groupSourceCaption = correctionSuggestionsGroupSourceCaption(suggestions);
  const showPerChipSource = groupSourceCaption == null;
  const groupCaptionAllHigh = Boolean(
    groupSourceCaption &&
      suggestions.every((x) => x.suggestionPriority === "high")
  );

  const applyOne = async (s: LiveTrainingDraftCorrectionSuggestion) => {
    setBusyId(s.id);
    const mid = createClientMutationId();
    trackLiveTrainingEvent("lt_patch_draft_attempt", {
      sessionId,
      draftId: draft.id,
      ingestClientMutationId: mid,
      uiPhase: "saving",
      quickApply: true,
      suggestionId: s.id,
    });
    try {
      await applyLiveTrainingDraftSuggestionMerge(sessionId, draft, s, mid);
      trackLiveTrainingEvent("lt_patch_draft_success", {
        sessionId,
        draftId: draft.id,
        ingestClientMutationId: mid,
        uiPhase: "saved",
        quickApply: true,
        suggestionId: s.id,
      });
      await onAfterApply();
    } catch (e) {
      trackLiveTrainingEvent("lt_patch_draft_fail", {
        sessionId,
        draftId: draft.id,
        ingestClientMutationId: mid,
        uiPhase: "error",
        quickApply: true,
        suggestionId: s.id,
        status: e instanceof ApiRequestError ? e.status : null,
      });
      if (mountedRef.current) {
        Alert.alert(
          "Не удалось применить",
          e instanceof ApiRequestError
            ? e.message
            : "Попробуйте снова или откройте полную правку."
        );
      }
    } finally {
      if (mountedRef.current) setBusyId(null);
    }
  };

  return (
    <View style={styles.quickCorrectionsWrap}>
      <Text style={styles.quickCorrectionsKicker}>Быстрые правки по разбору</Text>
      {groupSourceCaption ? (
        <Text style={styles.quickCorrectionsSourceCaption}>
          {groupSourceCaption}
          {groupCaptionAllHigh ? (
            <Text style={styles.quickChipPriorityHint}> · важно</Text>
          ) : null}
        </Text>
      ) : null}
      <View style={styles.quickChipRow}>
        {suggestions.map((s) => {
          const loading = busyId === s.id;
          const blocked = busyId != null;
          const borderColor =
            s.tone === "attention"
              ? theme.colors.warning
              : s.tone === "positive"
                ? theme.colors.primary
                : "rgba(255,255,255,0.16)";
          const chipSource =
            showPerChipSource && s.sourceLayer
              ? correctionSuggestionSourceLabelRu(s.sourceLayer)
              : null;
          const showPriorityHintChip =
            s.suggestionPriority === "high" && !groupCaptionAllHigh;
          const a11ySource = groupSourceCaption ?? chipSource;
          const a11yPri = correctionSuggestionPriorityA11y(s.suggestionPriority);
          const a11yConf = correctionSuggestionConfidenceA11y(s.suggestionConfidence);
          const a11yExtra = [a11yPri, a11yConf].filter(Boolean).join(" ");
          const a11yLabel = [a11ySource ? `${s.label}: ${s.value}. ${a11ySource}` : `${s.label}: ${s.value}`, a11yExtra]
            .filter(Boolean)
            .join(" ");
          const confOpacity = suggestionValueOpacity(s.suggestionConfidence);
          const pri = s.suggestionPriority;
          return (
            <Pressable
              key={s.id}
              disabled={blocked}
              onPress={() => void applyOne(s)}
              style={({ pressed }) => [
                styles.quickChip,
                { borderColor },
                (pressed || loading) && styles.quickChipPressed,
              ]}
              accessibilityRole="button"
              accessibilityLabel={a11yLabel}
            >
              {loading ? (
                <ActivityIndicator size="small" color={theme.colors.primary} />
              ) : (
                <View style={styles.quickChipBody}>
                  <View
                    style={[
                      styles.quickChipPriorityBar,
                      pri === "high" && styles.quickChipPriorityBarHigh,
                      pri === "medium" && styles.quickChipPriorityBarMedium,
                      (pri === "low" || pri === undefined) && styles.quickChipPriorityBarLow,
                    ]}
                    accessibilityElementsHidden
                    importantForAccessibility="no-hide-descendants"
                  />
                  <View style={styles.quickChipContent}>
                    {chipSource ? (
                      <Text style={styles.quickChipSourceLine} numberOfLines={1}>
                        {chipSource}
                        {showPriorityHintChip ? (
                          <Text style={styles.quickChipPriorityHint}> · важно</Text>
                        ) : null}
                      </Text>
                    ) : showPriorityHintChip ? (
                      <Text style={styles.quickChipSourceLine} numberOfLines={1}>
                        <Text style={styles.quickChipPriorityHint}>Важно</Text>
                      </Text>
                    ) : null}
                    <View style={styles.quickChipTextRow}>
                      <Text style={styles.quickChipLabel}>{s.label}: </Text>
                      <Text style={[styles.quickChipValue, { opacity: confOpacity }]} numberOfLines={2}>
                        {s.value}
                      </Text>
                    </View>
                  </View>
                </View>
              )}
            </Pressable>
          );
        })}
      </View>
    </View>
  );
}

export default function LiveTrainingReviewScreen() {
  const routeParams = useLocalSearchParams<Record<string, string | string[]>>();
  const sessionId = routeParams.sessionId;
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const sid = typeof sessionId === "string" ? sessionId : sessionId?.[0];

  const [session, setSession] = useState<LiveTrainingSession | null>(null);
  const scheduleRouteCtx = useMemo(
    () =>
      resolveLiveTrainingScheduleRouteContext(
        session,
        routeParams as Record<string, string | string[] | undefined>
      ),
    [
      session,
      routeParams.ltSlot,
      routeParams.ltGid,
      routeParams.ltGnm,
      routeParams.ltS0,
      routeParams.ltS1,
      routeParams.ltSk,
    ]
  );
  const scheduleQuerySuffixStr = useMemo(
    () => scheduleRouteQuerySuffix(scheduleRouteCtx),
    [scheduleRouteCtx]
  );
  const mountedRef = useRef(true);
  const sidRef = useRef(sid);
  sidRef.current = sid;

  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
    };
  }, []);

  const [loading, setLoading] = useState(true);
  const [confirming, setConfirming] = useState(false);
  const [error, setError] = useState<string | null>(null);
  /** PHASE 6: по умолчанию только очередь исключений; `all` — fallback «показать всё». */
  const [reviewListScope, setReviewListScope] = useState<"exceptions" | "all">("exceptions");
  const [review, setReview] = useState<Awaited<ReturnType<typeof getLiveTrainingReviewState>>>(null);
  const [teamName, setTeamName] = useState("");
  const [modeLabel, setModeLabel] = useState("");
  const [editingId, setEditingId] = useState<string | null>(null);
  const editingIdRef = useRef<string | null>(null);
  const patchMutationIdRef = useRef<string | null>(null);
  /** Один ingestClientMutationId от тапа «Быстро подтвердить» до POST confirm (идемпотентность CRM) */
  const fastConfirmPrefetchIngestIdRef = useRef<string | null>(null);
  useEffect(() => {
    setReviewListScope("exceptions");
  }, [sid]);

  useEffect(() => {
    editingIdRef.current = editingId;
  }, [editingId]);
  useEffect(() => {
    patchMutationIdRef.current = null;
  }, [editingId]);

  /** PHASE 38: локальный прогресс захода (сброс при перезагрузке экрана) */
  const [reviewSessionProgress, setReviewSessionProgress] = useState({
    openedDraftIds: [] as string[],
    touchedDraftIds: [] as string[],
    quickAppliedDraftIds: [] as string[],
  });
  /** Состав сегмента для групповой смены (GET coach players — без смены live-training API). */
  const [groupSessionPlayerIds, setGroupSessionPlayerIds] = useState<string[] | null>(null);

  const appendTouched = useCallback((id: string | null) => {
    if (!id) return;
    setReviewSessionProgress((p) => ({
      ...p,
      touchedDraftIds: p.touchedDraftIds.includes(id) ? p.touchedDraftIds : [...p.touchedDraftIds, id],
    }));
  }, []);
  const [savingDraft, setSavingDraft] = useState(false);
  const [modalSavePhase, setModalSavePhase] = useState<LiveTrainingDraftSavePhase>("idle");
  const [modalSaveError, setModalSaveError] = useState<string | null>(null);
  const [filterMode, setFilterMode] = useState<LiveTrainingReviewFilterMode>("all");
  const [reviewSecondaryOpen, setReviewSecondaryOpen] = useState(false);

  useEffect(() => {
    setModalSavePhase("idle");
    setModalSaveError(null);
  }, [editingId]);

  const editingDraft = useMemo(
    () => review?.drafts.find((d) => d.id === editingId) ?? null,
    [review, editingId]
  );

  useEffect(() => {
    if (editingId && review && !editingDraft) {
      setEditingId(null);
    }
  }, [editingId, review, editingDraft]);

  useEffect(() => {
    const slot = session?.planningSnapshot?.scheduleSlotContext;
    const gid = slot?.groupId?.trim();
    const teamId = session?.teamId;
    if (!gid || !teamId) {
      setGroupSessionPlayerIds(null);
      return;
    }
    let cancelled = false;
    void getCoachPlayers(teamId, gid)
      .then((players) => {
        if (!cancelled) setGroupSessionPlayerIds(players.map((p) => p.id));
      })
      .catch(() => {
        if (!cancelled) setGroupSessionPlayerIds(null);
      });
    return () => {
      cancelled = true;
    };
  }, [session?.teamId, session?.planningSnapshot?.scheduleSlotContext?.groupId]);

  const load = useCallback(async () => {
    if (!sid) return;
    const reqSid = sid;
    setLoading(true);
    setError(null);
    setSession(null);
    const qp = routeParams as Record<string, string | string[] | undefined>;
    try {
      const loaded = await getLiveTrainingSession(reqSid);
      if (!mountedRef.current || sidRef.current !== reqSid) return;
      if (!loaded) {
        setSession(null);
        setError("Сессия не найдена");
        setReview(null);
        return;
      }
      const navSuffix = scheduleRouteQuerySuffix(
        resolveLiveTrainingScheduleRouteContext(loaded, qp)
      );
      if (loaded.status === "live") {
        router.replace(
          `/live-training/${reqSid}/live${navSuffix}` as Parameters<typeof router.replace>[0]
        );
        return;
      }
      if (loaded.status === "confirmed") {
        router.replace(
          `/live-training/${reqSid}/complete${navSuffix}` as Parameters<typeof router.replace>[0]
        );
        return;
      }
      if (loaded.status === "cancelled") {
        setSession(null);
        setError("Эта тренировка отменена");
        setReview(null);
        return;
      }
      setSession(loaded);
      setTeamName(loaded.teamName);
      setModeLabel(formatLiveTrainingMode(loaded.mode));
      const state = await getLiveTrainingReviewState(reqSid, { reviewListScope });
      if (!mountedRef.current || sidRef.current !== reqSid) return;
      if (!state) {
        setSession(null);
        setError("Не удалось загрузить состояние проверки");
        setReview(null);
        return;
      }
      setReview(state);
      trackLiveTrainingEvent("lt_review_open", {
        sessionId: reqSid,
        toConfirmCount: state.reviewSummary.toConfirmCount,
        needsReviewCount: state.reviewSummary.needsReviewCount,
        unassignedCount: state.reviewSummary.unassignedCount,
        excludedCount: state.reviewSummary.excludedCount,
        draftsTotal: state.drafts.length,
        uiPhase: "loaded",
      });
    } catch (e) {
      if (!mountedRef.current || sidRef.current !== reqSid) return;
      setSession(null);
      setError(
        e instanceof ApiRequestError
          ? e.message
          : "Не удалось загрузить данные. Проверьте сеть."
      );
    } finally {
      if (mountedRef.current && sidRef.current === reqSid) {
        setLoading(false);
      }
    }
  }, [
    router,
    sid,
    routeParams.ltSlot,
    routeParams.ltGid,
    routeParams.ltGnm,
    routeParams.ltS0,
    routeParams.ltS1,
    routeParams.ltSk,
    reviewListScope,
  ]);

  useEffect(() => {
    void load();
  }, [load]);

  const contextAssistDraftCount = useMemo(
    () => countDraftsWithProvenanceHints(review?.drafts ?? []),
    [review?.drafts]
  );

  const reviewAcceleration = useMemo(
    () => buildLiveTrainingReviewAcceleration(review?.drafts ?? []),
    [review?.drafts]
  );

  const filteredDrafts = useMemo(() => {
    const raw = filterDraftsByReviewMode(review?.drafts ?? [], filterMode);
    return sortDraftsByCoachReviewPriority(raw);
  }, [review?.drafts, filterMode]);

  const reviewGroupLabel = useMemo(
    () =>
      scheduleRouteCtx
        ? buildReviewScheduleGroupLabelRu(
            scheduleRouteContextToArena(scheduleRouteCtx)
          )
        : null,
    [scheduleRouteCtx]
  );

  const humanReviewSummary = useMemo(() => {
    if (!review) return null;
    return buildLiveTrainingReviewHumanSummary({
      reviewSummary: review.reviewSummary,
      preConfirmSummary: review.preConfirmSummary,
      accelerationCounts: reviewAcceleration.counts,
    });
  }, [review, reviewAcceleration.counts]);

  const reviewRosterNameById = useMemo(() => {
    const m: Record<string, string> = {};
    for (const p of review?.roster ?? []) {
      m[p.id] = p.name;
    }
    return m;
  }, [review?.roster]);

  const reviewDevelopmentAcc = useMemo(
    () => accumulateDevelopmentFromDrafts(review?.drafts ?? []),
    [review?.drafts]
  );

  const groupReviewForDecision = useMemo(() => {
    const slot = session?.planningSnapshot?.scheduleSlotContext;
    if (!slot?.groupId?.trim() || !groupSessionPlayerIds?.length) return null;
    return {
      groupLabel: slot.groupName?.trim() || "Группа",
      playerIdsInGroup: groupSessionPlayerIds,
    };
  }, [session?.planningSnapshot?.scheduleSlotContext, groupSessionPlayerIds]);

  const reviewDecision = useMemo(() => {
    if (!review) return null;
    const topName = review.preConfirmSummary.topDraftPlayers[0]?.playerName?.trim();
    const topFirst = topName ? topName.split(/\s+/)[0] ?? null : null;
    return buildReviewDecisionBundle({
      drafts: review.drafts,
      rosterNameById: reviewRosterNameById,
      devAcc: reviewDevelopmentAcc,
      reviewSummary: review.reviewSummary,
      preConfirmSummary: review.preConfirmSummary,
      intelBullets: buildArenaReviewIntelligenceBullets(review.drafts),
      coachLine: buildReviewStageCoachLine({
        needsReviewCount: review.reviewSummary.needsReviewCount,
        toConfirmCount: review.reviewSummary.toConfirmCount,
        topDraftPlayerFirstName: topFirst,
        scheduleGroupLabel: buildReviewScheduleGroupLabelRu(
          scheduleRouteContextToArena(scheduleRouteCtx)
        ),
      }),
      accelerationCounts: reviewAcceleration.counts,
      touchedDraftIds: new Set(reviewSessionProgress.touchedDraftIds),
      quickAppliedDraftIds: new Set(reviewSessionProgress.quickAppliedDraftIds),
      groupReview: groupReviewForDecision,
    });
  }, [
    review,
    reviewRosterNameById,
    reviewDevelopmentAcc,
    reviewAcceleration.counts,
    reviewSessionProgress.touchedDraftIds,
    reviewSessionProgress.quickAppliedDraftIds,
    scheduleRouteCtx,
    groupReviewForDecision,
  ]);

  const confirmConfidence = useMemo(() => {
    if (!review) return null;
    return buildLiveTrainingConfirmConfidence({
      reviewSummary: review.reviewSummary,
      accelerationCounts: reviewAcceleration.counts,
    });
  }, [review, reviewAcceleration.counts]);

  const fastConfirmEligible = useMemo(() => {
    if (!review) return false;
    const rs = review.reviewSummary;
    const total = rs.totalActiveDraftCount ?? review.drafts.length;
    if (reviewListScope === "exceptions") {
      if (total === 0) return false;
      return rs.toConfirmCount === 0;
    }
    return (
      review.drafts.length > 0 &&
      rs.needsReviewCount === 0 &&
      rs.unassignedCount === 0
    );
  }, [review, reviewListScope]);

  const reportPlanningVm = useMemo(
    () => buildLiveTrainingReviewReportPlanningVm(session?.planningSnapshot),
    [session?.planningSnapshot]
  );

  const liveMicroGuidance = useMemo(
    () =>
      buildLiveMicroGuidanceFromPlanningSnapshot(
        session?.planningSnapshot,
        session?.planningSnapshot?.startPriorities
      ),
    [session?.planningSnapshot]
  );

  const guidanceAwareness = useMemo(
    () => buildLiveGuidanceAwareness(liveMicroGuidance, review?.drafts ?? []),
    [liveMicroGuidance, review?.drafts]
  );

  const closureQuality = useMemo(() => {
    if (!review || !confirmConfidence) return null;
    return buildLiveTrainingReviewClosureQuality({
      reviewSummary: review.reviewSummary,
      accelerationCounts: reviewAcceleration.counts,
      confirmReadiness: confirmConfidence.readiness,
      drafts: review.drafts,
      progress: {
        touchedDraftIds: new Set(reviewSessionProgress.touchedDraftIds),
        quickAppliedDraftIds: new Set(reviewSessionProgress.quickAppliedDraftIds),
      },
    });
  }, [
    review,
    reviewAcceleration.counts,
    confirmConfidence,
    reviewSessionProgress.touchedDraftIds,
    reviewSessionProgress.quickAppliedDraftIds,
  ]);

  const { byPlayerId, unassignedReviewed, needsReviewList } = useMemo(() => {
    const drafts = review?.drafts ?? [];
    const needs = drafts.filter((d) => d.needsReview);
    const ok = drafts.filter((d) => !d.needsReview);
    const map = new Map<string, LiveTrainingObservationDraft[]>();
    const unassigned: LiveTrainingObservationDraft[] = [];
    for (const d of ok) {
      if (d.playerId) {
        const list = map.get(d.playerId) ?? [];
        list.push(d);
        map.set(d.playerId, list);
      } else {
        unassigned.push(d);
      }
    }
    return {
      byPlayerId: map,
      unassignedReviewed: unassigned,
      needsReviewList: needs,
    };
  }, [review]);

  const needsReviewListSorted = useMemo(
    () => sortDraftsByCoachReviewPriority(needsReviewList),
    [needsReviewList]
  );

  const unassignedReviewedSorted = useMemo(
    () => sortDraftsByCoachReviewPriority(unassignedReviewed),
    [unassignedReviewed]
  );

  const byPlayerSortedEntries = useMemo(
    () =>
      Array.from(byPlayerId.entries()).map(([playerId, list]) => [
        playerId,
        sortDraftsByCoachReviewPriority(list),
      ] as const),
    [byPlayerId]
  );

  const openEditor = useCallback((id: string) => {
    setReviewSessionProgress((p) => ({
      ...p,
      openedDraftIds: p.openedDraftIds.includes(id) ? p.openedDraftIds : [...p.openedDraftIds, id],
    }));
    setEditingId(id);
  }, []);

  const afterQuickApplyForDraft = useCallback(
    (draftId: string) => async () => {
      setReviewSessionProgress((p) => ({
        ...p,
        quickAppliedDraftIds: p.quickAppliedDraftIds.includes(draftId)
          ? p.quickAppliedDraftIds
          : [...p.quickAppliedDraftIds, draftId],
      }));
      await load();
    },
    [load]
  );

  const handleModalSave = useCallback(
    async (patch: {
      sourceText: string;
      playerId: string | null;
      category: string;
      sentiment: LiveTrainingObservationDraft["sentiment"];
      needsReview: boolean;
    }) => {
      if (!sid || !editingId) return;
      const reqSid = sid;
      setModalSavePhase("saving");
      setModalSaveError(null);
      const opMutationId = patchMutationIdRef.current ?? createClientMutationId();
      patchMutationIdRef.current = opMutationId;
      trackLiveTrainingEvent("lt_patch_draft_attempt", {
        sessionId: reqSid,
        draftId: editingId,
        ingestClientMutationId: opMutationId,
        uiPhase: "saving",
        quickApply: false,
      });
      try {
        await patchLiveTrainingDraft(reqSid, editingId, { ...patch, clientMutationId: opMutationId });
        if (!mountedRef.current || sidRef.current !== reqSid) return;
        trackLiveTrainingEvent("lt_patch_draft_success", {
          sessionId: reqSid,
          draftId: editingId,
          ingestClientMutationId: opMutationId,
          uiPhase: "saved",
          quickApply: false,
        });
        setModalSavePhase("saved");
        patchMutationIdRef.current = null;
        appendTouched(editingId);
        await load();
        if (!mountedRef.current || sidRef.current !== reqSid) return;
        setTimeout(() => {
          if (!mountedRef.current || sidRef.current !== reqSid) return;
          setEditingId(null);
          setModalSavePhase("idle");
          setModalSaveError(null);
        }, 650);
      } catch (err) {
        if (!mountedRef.current || sidRef.current !== reqSid) return;
        trackLiveTrainingEvent("lt_patch_draft_fail", {
          sessionId: reqSid,
          draftId: editingId,
          ingestClientMutationId: opMutationId,
          uiPhase: "error",
          quickApply: false,
          status: err instanceof ApiRequestError ? err.status : null,
        });
        setModalSavePhase("error");
        setModalSaveError(
          err instanceof ApiRequestError
            ? err.message
            : "Не удалось сохранить. Попробуйте снова."
        );
      }
    },
    [sid, editingId, load, appendTouched]
  );

  const handleModalDeleteRequest = useCallback(() => {
    if (!sid || !editingId) return;
    const draftId = editingId;
    const runDelete = (deleteMutationId?: string) => {
      const mid = deleteMutationId ?? createClientMutationId();
      const reqSid = sid;
      void (async () => {
        setSavingDraft(true);
        trackLiveTrainingEvent("lt_delete_draft_attempt", {
          sessionId: reqSid,
          draftId,
          ingestClientMutationId: mid,
          uiPhase: "deleting",
        });
        try {
          await deleteLiveTrainingDraft(reqSid, draftId, { clientMutationId: mid });
          if (!mountedRef.current || sidRef.current !== reqSid) return;
          trackLiveTrainingEvent("lt_delete_draft_success", {
            sessionId: reqSid,
            draftId,
            ingestClientMutationId: mid,
            uiPhase: "deleted",
          });
          appendTouched(draftId);
          await load();
          if (!mountedRef.current || sidRef.current !== reqSid) return;
          setEditingId(null);
        } catch (err) {
          if (!mountedRef.current || sidRef.current !== reqSid) return;
          trackLiveTrainingEvent("lt_delete_draft_fail", {
            sessionId: reqSid,
            draftId,
            ingestClientMutationId: mid,
            uiPhase: "error",
            status: err instanceof ApiRequestError ? err.status : null,
          });
          const msg =
            err instanceof ApiRequestError
              ? err.message
              : "Не удалось удалить. Попробуйте снова.";
          Alert.alert("Ошибка", msg, [
            { text: "Закрыть", style: "cancel" },
            { text: "Повторить", onPress: () => runDelete(mid) },
          ]);
        } finally {
          if (mountedRef.current) setSavingDraft(false);
        }
      })();
    };
    Alert.alert(
      "Удалить наблюдение?",
      "Оно не будет учтено при подтверждении тренировки и не попадёт в аналитику.",
      [
        { text: "Отмена", style: "cancel" },
        {
          text: "Удалить",
          style: "destructive",
          onPress: () => runDelete(),
        },
      ]
    );
  }, [sid, editingId, load, appendTouched]);

  const onConfirm = useCallback(
    (source: "primary" | "fast") => {
      if (!sid) return;
      if (source === "primary") {
        fastConfirmPrefetchIngestIdRef.current = null;
      }
      if (source === "fast") {
        const prefetchIngestId = createClientMutationId();
        fastConfirmPrefetchIngestIdRef.current = prefetchIngestId;
        trackLiveTrainingEvent("lt_review_fast_confirm_tap", {
          sessionId: sid,
          ingestClientMutationId: prefetchIngestId,
          uiPhase: "intent",
        });
      }
      Alert.alert(
        "Подтвердить тренировку",
        "Наблюдения будут сохранены как подтверждённые (черновики зафиксированы). Продолжить?",
        [
          { text: "Отмена", style: "cancel" },
          {
            text: "Подтвердить",
            onPress: async () => {
              const reqSid = sid;
              const confirmMutationId =
                source === "fast" && fastConfirmPrefetchIngestIdRef.current
                  ? fastConfirmPrefetchIngestIdRef.current
                  : createClientMutationId();
              fastConfirmPrefetchIngestIdRef.current = null;
              setConfirming(true);
              trackLiveTrainingEvent("lt_confirm_attempt", {
                sessionId: reqSid,
                source,
                ingestClientMutationId: confirmMutationId,
                uiPhase: "confirming",
              });
              try {
                await confirmLiveTrainingSession(reqSid, { clientMutationId: confirmMutationId });
                if (!mountedRef.current || sidRef.current !== reqSid) return;
                trackLiveTrainingEvent("lt_confirm_success", {
                  sessionId: reqSid,
                  source,
                  ingestClientMutationId: confirmMutationId,
                  uiPhase: "confirmed",
                });
                coachHapticSuccess();
                router.replace(
                  `/live-training/${reqSid}/complete${scheduleQuerySuffixStr}` as Parameters<
                    typeof router.replace
                  >[0]
                );
              } catch (err) {
                if (!mountedRef.current || sidRef.current !== reqSid) return;
                trackLiveTrainingEvent("lt_confirm_fail", {
                  sessionId: reqSid,
                  source,
                  ingestClientMutationId: confirmMutationId,
                  uiPhase: "error",
                  status: err instanceof ApiRequestError ? err.status : null,
                });
                const msg =
                  err instanceof ApiRequestError
                    ? err.message
                    : "Не удалось подтвердить. Попробуйте снова.";
                Alert.alert("Ошибка", msg);
              } finally {
                if (mountedRef.current) setConfirming(false);
              }
            },
          },
        ]
      );
    },
    [router, sid, scheduleQuerySuffixStr]
  );

  if (!sid) {
    return (
      <FlagshipScreen scroll={false}>
        <Text style={styles.error}>Некорректная ссылка</Text>
      </FlagshipScreen>
    );
  }

  if (loading) {
    return (
      <FlagshipScreen scroll={false}>
        <View style={styles.center}>
          <ActivityIndicator color={theme.colors.primary} />
          <Text style={styles.muted}>Загрузка…</Text>
        </View>
      </FlagshipScreen>
    );
  }

  if (error || !review) {
    return (
      <FlagshipScreen>
        <Text style={styles.error}>{error ?? "Нет данных"}</Text>
        <PrimaryButton title="Обновить" variant="outline" onPress={() => void load()} animatedPress />
      </FlagshipScreen>
    );
  }

  return (
    <FlagshipScreen
      contentContainerStyle={{
        ...styles.content,
        paddingBottom:
          theme.layout.screenBottom +
          theme.spacing.xl +
          72 +
          Math.max(insets.bottom, theme.spacing.sm),
      }}
      footer={
        <View
          style={[
            styles.confirmFooter,
            { paddingBottom: Math.max(insets.bottom, theme.spacing.sm) },
          ]}
        >
          <PrimaryButton
            title={confirming ? "Сохранение…" : "Подтвердить тренировку"}
            onPress={() => onConfirm("primary")}
            disabled={confirming}
            animatedPress
            glow={false}
            style={styles.cta}
          />
        </View>
      }
    >
      <Reanimated.View entering={screenReveal(0)}>
        <Text style={styles.meta}>
          {teamName} · {modeLabel}
        </Text>
        {reviewGroupLabel ? (
          <Text style={styles.reviewScheduleCtx}>{reviewGroupLabel}</Text>
        ) : null}
      </Reanimated.View>

      {session?.sessionMeaningJson ? (
        <LiveTrainingReviewMeaningSnapshot meaning={session.sessionMeaningJson} />
      ) : null}

      <GlassCardV2 padding="sm">
        <Text style={styles.primaryStripLine}>
          Требует проверки: {review.reviewSummary.needsReviewCount} · К подтверждению:{" "}
          {review.reviewSummary.toConfirmCount}
        </Text>
        {review.reviewSummary.reviewListScope === "exceptions" &&
        typeof review.reviewSummary.totalActiveDraftCount === "number" &&
        review.reviewSummary.totalActiveDraftCount > review.reviewSummary.toConfirmCount ? (
          <Text style={styles.primaryStripMuted}>
            Ещё{" "}
            {review.reviewSummary.totalActiveDraftCount - review.reviewSummary.toConfirmCount}{" "}
            {review.reviewSummary.totalActiveDraftCount - review.reviewSummary.toConfirmCount === 1
              ? "наблюдение без ручной проверки"
              : "наблюдений без ручной проверки"}
          </Text>
        ) : null}
        <Pressable
          onPress={() =>
            setReviewListScope((s) => (s === "exceptions" ? "all" : "exceptions"))
          }
          style={({ pressed }) => [
            styles.primaryStripLinkWrap,
            pressed && styles.primaryStripLinkPressed,
          ]}
          accessibilityRole="button"
          accessibilityLabel={
            reviewListScope === "exceptions"
              ? "Показать все черновики"
              : "Показать только требующие внимания"
          }
        >
          <Text style={styles.primaryStripLink}>
            {reviewListScope === "exceptions"
              ? "Показать все черновики"
              : "Только требующие внимания"}
          </Text>
        </Pressable>
        {review.reviewSummary.needsReviewCount > 0 ? (
          <Pressable
            onPress={() => {
              setFilterMode("needs_review");
              setReviewSecondaryOpen(false);
            }}
            style={({ pressed }) => [
              styles.primaryStripLinkWrap,
              pressed && styles.primaryStripLinkPressed,
            ]}
            accessibilityRole="button"
            accessibilityLabel="Показать наблюдения, требующие проверки"
          >
            <Text style={styles.primaryStripLink}>Открыть список</Text>
          </Pressable>
        ) : null}
      </GlassCardV2>

      {fastConfirmEligible ? (
        <GlassCardV2 padding="md" contentStyle={styles.fastConfirmCardAccent}>
          <Text style={styles.fastConfirmKicker}>Быстрое подтверждение</Text>
          <Text style={styles.fastConfirmBody}>
            Все наблюдения без пометки «проверка» и с привязкой к игроку — можно сразу зафиксировать тренировку.
          </Text>
          <PrimaryButton
            title={confirming ? "Сохранение…" : "Быстро подтвердить тренировку"}
            onPress={() => onConfirm("fast")}
            disabled={confirming}
            animatedPress
            glow={false}
          />
        </GlassCardV2>
      ) : null}

      <Text style={styles.summaryHint}>
        Нажмите на наблюдение, чтобы открыть правку (игрок, категория, текст).
      </Text>

      {review.drafts.length > 0 ? (
        <ReviewAccelerationBar
          acceleration={reviewAcceleration}
          filterMode={filterMode}
          onSelect={setFilterMode}
        />
      ) : null}

      {review.drafts.length === 0 ? (
        <GlassCardV2 padding="lg" style={styles.card}>
          <Text style={styles.emptyTitle}>Нет черновиков</Text>
          <Text style={styles.emptyText}>
            На активной тренировке не было зафиксировано наблюдений, либо сессия завершена без событий (тогда могли
            подставиться демо-данные). Фиксируйте голосом или вручную на экране тренировки до «Завершить».
          </Text>
        </GlassCardV2>
      ) : null}

      {filterMode !== "all" && sid ? (
        <View style={styles.listSection}>
          <Text style={styles.kicker}>
            {LIVE_TRAINING_REVIEW_FILTER_LABELS[
              filterMode as Exclude<LiveTrainingReviewFilterMode, "all">
            ]}
          </Text>
          {filteredDrafts.length === 0 ? (
            <Text style={styles.filterEmptyText}>{liveTrainingReviewFilterEmptyHint(filterMode)}</Text>
          ) : (
            filteredDrafts.map((d, i) => (
              <DraftReviewCard
                key={d.id}
                draft={d}
                sessionId={sid}
                onAfterApply={afterQuickApplyForDraft(d.id)}
                onPress={() => openEditor(d.id)}
                playerCaption={playerCaptionForFilteredRow(d)}
                showConfidenceInMeta
                showReviewVisitHint={
                  reviewSessionProgress.touchedDraftIds.includes(d.id) ||
                  reviewSessionProgress.quickAppliedDraftIds.includes(d.id)
                }
              />
            ))
          )}
        </View>
      ) : null}

      {filterMode === "all" && needsReviewList.length > 0 && sid ? (
        <View style={styles.listSection}>
          <Text style={styles.kicker}>Требует проверки</Text>
          {needsReviewListSorted.map((d, i) => (
            <DraftReviewCard
              key={d.id}
              draft={d}
              sessionId={sid}
              onAfterApply={afterQuickApplyForDraft(d.id)}
              onPress={() => openEditor(d.id)}
              playerCaption={d.playerNameRaw?.trim() || "Без привязки к игроку"}
              showConfidenceInMeta
              showReviewVisitHint={
                reviewSessionProgress.touchedDraftIds.includes(d.id) ||
                reviewSessionProgress.quickAppliedDraftIds.includes(d.id)
              }
            />
          ))}
        </View>
      ) : null}

      {filterMode === "all" ? (
        <View style={styles.listSection}>
          <Text style={styles.kicker}>По игрокам</Text>
          {byPlayerId.size === 0 ? (
            <Text style={styles.muted}>Нет наблюдений с привязкой к игроку (после проверки).</Text>
          ) : (
            byPlayerSortedEntries.map(([playerId, list]) => {
              const title = list[0]?.playerNameRaw?.trim() || `Игрок ${playerId}`;
              return (
                <View key={playerId} style={styles.playerGroup}>
                  <Text style={styles.playerGroupTitle}>{title}</Text>
                  {list.map((d, j) => (
                    <DraftReviewCard
                      key={d.id}
                      draft={d}
                      sessionId={sid}
                      onAfterApply={afterQuickApplyForDraft(d.id)}
                      onPress={() => openEditor(d.id)}
                      playerCaption={null}
                      showConfidenceInMeta={false}
                      showReviewVisitHint={
                        reviewSessionProgress.touchedDraftIds.includes(d.id) ||
                        reviewSessionProgress.quickAppliedDraftIds.includes(d.id)
                      }
                    />
                  ))}
                </View>
              );
            })
          )}
        </View>
      ) : null}

      {filterMode === "all" && unassignedReviewed.length > 0 && sid ? (
        <View style={styles.listSection}>
          <Text style={styles.kicker}>Без привязки к игроку</Text>
          {unassignedReviewedSorted.map((d, i) => (
            <DraftReviewCard
              key={d.id}
              draft={d}
              sessionId={sid}
              onAfterApply={afterQuickApplyForDraft(d.id)}
              onPress={() => openEditor(d.id)}
              playerCaption={null}
              showConfidenceInMeta={false}
              showReviewVisitHint={
                reviewSessionProgress.touchedDraftIds.includes(d.id) ||
                reviewSessionProgress.quickAppliedDraftIds.includes(d.id)
              }
            />
          ))}
        </View>
      ) : null}

      <Pressable
        onPress={() => setReviewSecondaryOpen((o) => !o)}
        style={({ pressed }) => [
          styles.reviewSecondaryToggle,
          pressed && styles.reviewSecondaryTogglePressed,
        ]}
        accessibilityRole="button"
        accessibilityState={{ expanded: reviewSecondaryOpen }}
        accessibilityLabel={
          reviewSecondaryOpen
            ? "Скрыть план, стратегию и дополнительные сводки"
            : "Показать план, стратегию и дополнительные сводки"
        }
      >
        <Text style={styles.reviewSecondaryToggleText}>
          {reviewSecondaryOpen ? "Скрыть детали" : "План, стратегия и доп. сводки"}
        </Text>
        <Ionicons
          name={reviewSecondaryOpen ? "chevron-up" : "chevron-down"}
          size={20}
          color={theme.colors.textSecondary}
        />
      </Pressable>

      {reviewSecondaryOpen ? (
        <View style={styles.reviewSecondaryBlock}>
          {reviewDecision ? (
            <>
              <ReviewDecisionHeroSection hero={reviewDecision.hero} />
              <ReviewDecisionPrioritySection players={reviewDecision.priorityPlayers} />
              <ReviewDecisionNextActionsSection
                actions={reviewDecision.nextActions}
                filterMode={filterMode}
                onApplyFilter={setFilterMode}
                onOpenActions={() =>
                  router.push("/actions" as Parameters<typeof router.push>[0])
                }
              />
            </>
          ) : null}

          <GlassCardV2 padding="lg" style={styles.summaryCard}>
            <Text style={styles.kicker}>Сводка</Text>
            <Text style={styles.preConfirmMain}>
              К подтверждению:{" "}
              <Text style={styles.preConfirmEm}>{review.reviewSummary.toConfirmCount}</Text>
              {" · "}
              Игроков:{" "}
              <Text style={styles.preConfirmEm}>{review.preConfirmSummary.playersWithDraftsCount}</Text>
            </Text>
            <Text style={styles.preConfirmLine}>
              Проверка: {review.reviewSummary.needsReviewCount} · Без игрока:{" "}
              {review.reviewSummary.unassignedCount}
              {review.reviewSummary.excludedCount > 0
                ? ` · Исключено: ${review.reviewSummary.excludedCount}`
                : ""}
            </Text>
            <Text style={styles.preConfirmLine}>
              Готово без пометки «проверка»: {review.confirmedCount}
            </Text>
            {contextAssistDraftCount > 0 ? (
              <Text style={styles.contextAssistSummary}>
                План тренировки помог при разборе {ruObservationCountLabel(contextAssistDraftCount)}
              </Text>
            ) : null}
            {review.preConfirmSummary.topDraftPlayers.length > 0 ? (
              <Text style={styles.topDraftsLine} numberOfLines={2}>
                Больше всего наблюдений:{" "}
                {review.preConfirmSummary.topDraftPlayers
                  .slice(0, 3)
                  .map((p) => `${p.playerName} (${p.draftCount})`)
                  .join(" · ")}
              </Text>
            ) : null}
          </GlassCardV2>

          {reportPlanningVm ? (
            <ReviewReportPlanningContextSection model={reportPlanningVm} />
          ) : null}
          {guidanceAwareness ? <ReviewGuidanceAwarenessSection model={guidanceAwareness} /> : null}

          {humanReviewSummary ? (
            <ReviewHumanSummarySection summary={humanReviewSummary} />
          ) : null}

          {confirmConfidence ? (
            <ConfirmReadinessSection
              confidence={confirmConfidence}
              onApplyRecommendedFilter={
                confirmConfidence.recommendedFilter
                  ? () => setFilterMode(confirmConfidence.recommendedFilter!)
                  : undefined
              }
            />
          ) : null}

          {closureQuality ? (
            <ReviewClosureQualitySection payload={closureQuality} />
          ) : null}

          <Text style={styles.summaryHintSecondary}>
            Нажмите на наблюдение, чтобы исправить игрока, категорию, тональность или текст. Категория и тональность
            могут подставляться по фразе; на тренировке приоритет у явного выбора тренера.
          </Text>
        </View>
      ) : null}

      <LiveTrainingDraftEditModal
        visible={editingId != null && editingDraft != null}
        draft={editingDraft}
        roster={review.roster}
        saving={savingDraft || modalSavePhase === "saving"}
        savePhase={modalSavePhase}
        saveErrorMessage={modalSaveError}
        onClose={() => {
          if (savingDraft || modalSavePhase === "saving") return;
          const id = editingIdRef.current;
          if (id) appendTouched(id);
          setEditingId(null);
        }}
        onSave={handleModalSave}
        onDelete={handleModalDeleteRequest}
      />
    </FlagshipScreen>
  );
}

const styles = StyleSheet.create({
  content: {
    gap: theme.spacing.md,
  },
  confirmFooter: {
    paddingHorizontal: theme.spacing.md,
    paddingTop: theme.spacing.sm,
    backgroundColor: theme.colors.surface,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: theme.colors.border,
  },
  primaryStripLine: {
    ...theme.typography.body,
    fontSize: 14,
    lineHeight: 20,
    color: theme.colors.text,
    fontWeight: "600",
  },
  primaryStripMuted: {
    ...theme.typography.caption,
    marginTop: theme.spacing.xs,
    color: theme.colors.textSecondary,
    lineHeight: 18,
  },
  primaryStripLinkWrap: {
    marginTop: theme.spacing.xs,
    alignSelf: "flex-start",
    paddingVertical: theme.spacing.xs,
  },
  primaryStripLinkPressed: { opacity: 0.72 },
  primaryStripLink: {
    ...theme.typography.caption,
    color: theme.colors.primary,
    fontWeight: "700",
    textDecorationLine: "underline",
  },
  reviewSecondaryToggle: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingVertical: theme.spacing.sm,
    paddingHorizontal: theme.spacing.xs,
  },
  reviewSecondaryTogglePressed: { opacity: 0.82 },
  reviewSecondaryToggleText: {
    ...theme.typography.subtitle,
    fontSize: 14,
    color: theme.colors.textSecondary,
    fontWeight: "600",
    flex: 1,
    paddingRight: theme.spacing.sm,
  },
  reviewSecondaryBlock: {
    gap: theme.spacing.md,
  },
  summaryHintSecondary: {
    ...theme.typography.caption,
    color: theme.colors.textMuted,
    lineHeight: 18,
  },
  center: {
    paddingTop: theme.spacing.xl,
    alignItems: "center",
    gap: theme.spacing.sm,
  },
  meta: {
    ...theme.typography.subtitle,
    color: theme.colors.text,
    fontWeight: "600",
    marginBottom: theme.spacing.xs,
  },
  reviewScheduleCtx: {
    ...theme.typography.caption,
    color: theme.colors.textSecondary,
    marginBottom: theme.layout.sectionGap,
    fontWeight: "600",
  },
  decisionHeroCardAccent: {
    borderLeftWidth: 4,
    borderLeftColor: theme.colors.primary,
    paddingLeft: theme.spacing.sm,
  },
  decisionGroupCardAccent: {
    borderLeftWidth: 3,
    borderLeftColor: theme.colors.textSecondary,
    paddingLeft: theme.spacing.sm,
  },
  decisionGroupEyebrow: {
    ...theme.typography.caption,
    color: theme.colors.textSecondary,
    fontWeight: "700",
    letterSpacing: 0.4,
    textTransform: "uppercase",
    marginBottom: theme.spacing.xs,
  },
  decisionGroupSummary: {
    ...theme.typography.body,
    color: theme.colors.text,
    lineHeight: 20,
    fontWeight: "500",
  },
  decisionGroupDomains: {
    ...theme.typography.caption,
    color: theme.colors.textSecondary,
    marginTop: theme.spacing.xs,
    lineHeight: 18,
  },
  decisionHeroEyebrow: {
    ...theme.typography.caption,
    color: theme.colors.primary,
    fontWeight: "800",
    letterSpacing: 0.5,
    textTransform: "uppercase",
    marginBottom: theme.spacing.xs,
  },
  decisionHeroBanner: {
    ...theme.typography.caption,
    color: theme.colors.warning,
    fontWeight: "600",
    marginBottom: theme.spacing.sm,
  },
  decisionHeroName: {
    fontSize: 26,
    fontWeight: "800",
    color: theme.colors.text,
    letterSpacing: -0.3,
    marginBottom: 4,
  },
  decisionHeroSessionHeadline: {
    fontSize: 20,
    fontWeight: "700",
    color: theme.colors.text,
    marginBottom: theme.spacing.xs,
  },
  decisionHeroZones: {
    ...theme.typography.subtitle,
    fontSize: 15,
    color: theme.colors.textSecondary,
    marginBottom: theme.spacing.sm,
    lineHeight: 22,
  },
  decisionHeroThink: {
    ...theme.typography.body,
    color: theme.colors.text,
    lineHeight: 22,
    fontWeight: "500",
  },
  decisionHeroArena: {
    ...theme.typography.caption,
    color: theme.colors.textSecondary,
    marginTop: theme.spacing.sm,
    lineHeight: 18,
    fontStyle: "italic",
  },
  decisionPriorityCardAccent: {},
  decisionSectionEyebrow: {
    ...theme.typography.caption,
    color: theme.colors.textSecondary,
    fontWeight: "700",
    letterSpacing: 0.45,
    textTransform: "uppercase",
    marginBottom: theme.spacing.sm,
  },
  decisionPriorityRow: {
    marginBottom: theme.spacing.sm,
    paddingVertical: theme.spacing.xs,
  },
  decisionPriorityName: {
    ...theme.typography.subtitle,
    fontSize: 16,
    fontWeight: "700",
    color: theme.colors.text,
  },
  decisionPriorityZones: {
    ...theme.typography.body,
    fontSize: 14,
    color: theme.colors.textSecondary,
    marginTop: 2,
    lineHeight: 20,
  },
  decisionPriorityStatus: {
    ...theme.typography.caption,
    color: theme.colors.textSecondary,
    marginTop: 2,
  },
  decisionNextCard: {
    marginBottom: 0,
  },
  decisionNextRow: {
    marginBottom: theme.spacing.md,
    paddingVertical: theme.spacing.xs,
  },
  decisionNextPressed: {
    opacity: 0.85,
  },
  decisionNextTitle: {
    ...theme.typography.subtitle,
    fontSize: 16,
    fontWeight: "700",
    color: theme.colors.primary,
  },
  decisionNextSub: {
    ...theme.typography.body,
    color: theme.colors.textSecondary,
    marginTop: 4,
    lineHeight: 20,
  },
  decisionNextTapHint: {
    ...theme.typography.caption,
    color: theme.colors.primary,
    marginTop: 4,
    opacity: 0.85,
  },
  decisionNextActiveHint: {
    ...theme.typography.caption,
    color: theme.colors.textSecondary,
    marginTop: 4,
  },
  decisionNextFooter: {
    ...theme.typography.caption,
    color: theme.colors.textSecondary,
    marginTop: theme.spacing.xs,
  },
  summaryCard: {
    marginBottom: theme.spacing.md,
  },
  fastConfirmCardAccent: {
    borderLeftWidth: 4,
    borderLeftColor: theme.colors.primary,
    paddingLeft: theme.spacing.sm,
  },
  fastConfirmKicker: {
    ...theme.typography.caption,
    color: theme.colors.textSecondary,
    textTransform: "uppercase",
    letterSpacing: 0.5,
    marginBottom: theme.spacing.xs,
  },
  fastConfirmBody: {
    ...theme.typography.body,
    color: theme.colors.text,
    lineHeight: 22,
    marginBottom: theme.spacing.md,
  },
  humanSummaryCardAccent: {
    borderLeftWidth: 4,
    paddingLeft: theme.spacing.sm,
  },
  humanSummaryKicker: {
    ...theme.typography.caption,
    color: theme.colors.textSecondary,
    textTransform: "uppercase",
    letterSpacing: 0.5,
    marginBottom: 6,
  },
  humanSummaryHeadline: {
    ...theme.typography.subtitle,
    fontWeight: "700",
    color: theme.colors.text,
    marginBottom: theme.spacing.sm,
    lineHeight: 22,
  },
  humanSummaryLine: {
    ...theme.typography.body,
    color: theme.colors.text,
    lineHeight: 22,
    marginBottom: 6,
  },
  humanSummaryHighlight: {
    ...theme.typography.caption,
    color: theme.colors.primary,
    fontWeight: "600",
    marginTop: 4,
    lineHeight: 18,
  },
  humanSummaryNudge: {
    ...theme.typography.caption,
    color: theme.colors.textSecondary,
    fontStyle: "italic",
    marginTop: theme.spacing.sm,
    lineHeight: 18,
  },
  confirmReadinessCardAccent: {
    borderLeftWidth: 4,
    paddingLeft: theme.spacing.sm,
  },
  confirmReadinessKicker: {
    ...theme.typography.caption,
    color: theme.colors.textSecondary,
    textTransform: "uppercase",
    letterSpacing: 0.5,
    marginBottom: 6,
  },
  confirmReadinessLabel: {
    ...theme.typography.subtitle,
    fontWeight: "700",
    color: theme.colors.text,
    marginBottom: theme.spacing.sm,
    lineHeight: 22,
  },
  confirmReadinessReason: {
    ...theme.typography.body,
    color: theme.colors.text,
    lineHeight: 22,
    marginBottom: 4,
  },
  confirmReadinessFilterHint: {
    marginTop: theme.spacing.sm,
    paddingVertical: theme.spacing.xs,
  },
  confirmReadinessFilterPressed: {
    opacity: 0.75,
  },
  confirmReadinessFilterHintText: {
    ...theme.typography.caption,
    color: theme.colors.primary,
    fontWeight: "700",
    textDecorationLine: "underline",
  },
  closureQualityCardAccent: {
    borderLeftWidth: 4,
    paddingLeft: theme.spacing.sm,
  },
  closureQualityKicker: {
    ...theme.typography.caption,
    color: theme.colors.textSecondary,
    textTransform: "uppercase",
    letterSpacing: 0.5,
    marginBottom: 6,
  },
  closureQualityLabel: {
    ...theme.typography.subtitle,
    fontWeight: "700",
    color: theme.colors.text,
    marginBottom: theme.spacing.xs,
    lineHeight: 22,
  },
  closureQualityLine: {
    ...theme.typography.body,
    color: theme.colors.textSecondary,
    lineHeight: 20,
    fontSize: 14,
    marginBottom: 4,
  },
  preConfirmMain: {
    ...theme.typography.body,
    color: theme.colors.text,
    marginBottom: theme.spacing.xs,
  },
  preConfirmEm: {
    fontWeight: "700",
    color: theme.colors.primary,
  },
  preConfirmLine: {
    ...theme.typography.caption,
    color: theme.colors.textSecondary,
    lineHeight: 18,
    marginBottom: 4,
  },
  topDraftsLine: {
    ...theme.typography.caption,
    color: theme.colors.text,
    marginTop: theme.spacing.sm,
    lineHeight: 18,
  },
  contextAssistSummary: {
    ...theme.typography.caption,
    color: theme.colors.textSecondary,
    lineHeight: 18,
    marginTop: 2,
    fontStyle: "italic",
  },
  summaryHint: {
    ...theme.typography.caption,
    color: theme.colors.textSecondary,
    lineHeight: 18,
    marginBottom: theme.spacing.md,
  },
  accelerationCard: {
    marginBottom: 0,
  },
  listSection: {
    marginBottom: theme.spacing.md,
  },
  draftRevealWrap: {
    alignSelf: "stretch",
  },
  draftPressable: {
    alignSelf: "stretch",
  },
  draftGlassNeedsReview: {
    borderLeftWidth: 3,
    borderLeftColor: theme.colors.warning,
    paddingLeft: theme.spacing.sm,
  },
  draftArenaCategoryPill: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: theme.borderRadius.sm,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: "rgba(148, 163, 184, 0.35)",
    backgroundColor: "rgba(148, 163, 184, 0.08)",
  },
  draftArenaCategoryPillText: {
    ...theme.typography.caption,
    fontSize: 10,
    fontWeight: "600",
    color: theme.colors.textSecondary,
  },
  draftArenaRepeatBadge: {
    ...theme.typography.caption,
    fontSize: 11,
    color: theme.colors.textMuted,
    opacity: 0.85,
  },
  draftArenaCoachHints: {
    ...theme.typography.caption,
    fontSize: 11,
    lineHeight: 15,
    color: theme.colors.textSecondary,
    marginTop: 4,
  },
  draftStatusRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    alignItems: "center",
    gap: theme.spacing.sm,
    marginBottom: theme.spacing.xs,
  },
  draftStatusPillAttention: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: theme.borderRadius.sm,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: "rgba(245, 158, 11, 0.45)",
    backgroundColor: "rgba(245, 158, 11, 0.1)",
  },
  draftStatusPillAttentionText: {
    ...theme.typography.caption,
    fontSize: 10,
    fontWeight: "700",
    color: theme.colors.warning,
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },
  draftStatusPillCalm: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: theme.borderRadius.sm,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: "rgba(59, 130, 246, 0.35)",
    backgroundColor: "rgba(59, 130, 246, 0.08)",
  },
  draftStatusPillCalmText: {
    ...theme.typography.caption,
    fontSize: 10,
    fontWeight: "700",
    color: theme.colors.textSecondary,
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },
  draftSessionVisitHint: {
    ...theme.typography.caption,
    fontSize: 11,
    lineHeight: 14,
    color: theme.colors.textSecondary,
    fontStyle: "italic",
    flex: 1,
    minWidth: 0,
  },
  accelerationTitle: {
    ...theme.typography.subtitle,
    fontWeight: "600",
    marginBottom: 4,
  },
  accelerationHint: {
    ...theme.typography.caption,
    color: theme.colors.textSecondary,
    lineHeight: 16,
    marginBottom: theme.spacing.sm,
  },
  accelerationChipRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
  },
  accelerationChip: {
    paddingVertical: 8,
    paddingHorizontal: 10,
    borderRadius: 18,
    borderWidth: StyleSheet.hairlineWidth * 2,
    borderColor: "rgba(255,255,255,0.14)",
    backgroundColor: "rgba(255,255,255,0.04)",
    maxWidth: "100%",
  },
  accelerationChipActive: {
    borderColor: theme.colors.primary,
    backgroundColor: theme.colors.primaryMuted,
  },
  accelerationChipDisabled: {
    opacity: 0.45,
  },
  accelerationChipPressed: {
    opacity: 0.85,
  },
  accelerationChipText: {
    ...theme.typography.caption,
    fontSize: 12,
    color: theme.colors.text,
    fontWeight: "500",
  },
  accelerationChipTextActive: {
    color: theme.colors.primary,
    fontWeight: "700",
  },
  accelerationChipTextDisabled: {
    color: theme.colors.textMuted,
  },
  filterEmptyText: {
    ...theme.typography.body,
    color: theme.colors.textSecondary,
    lineHeight: 22,
  },
  card: {
    marginBottom: 0,
  },
  kicker: {
    ...theme.typography.caption,
    color: theme.colors.textSecondary,
    textTransform: "uppercase",
    letterSpacing: 0.6,
    marginBottom: theme.spacing.sm,
  },
  playerGroup: {
    marginBottom: theme.spacing.md,
  },
  playerGroupTitle: {
    ...theme.typography.subtitle,
    fontWeight: "700",
    color: theme.colors.text,
    marginBottom: theme.spacing.sm,
  },
  draftBlockPressed: {
    opacity: 0.88,
  },
  tapHint: {
    ...theme.typography.caption,
    color: theme.colors.primary,
    marginTop: 6,
    fontWeight: "600",
  },
  draftPlayer: {
    ...theme.typography.subtitle,
    fontSize: 15,
    fontWeight: "700",
    color: theme.colors.primary,
    marginBottom: 6,
  },
  draftText: {
    ...theme.typography.body,
    fontSize: 16,
    lineHeight: 24,
    color: theme.colors.text,
  },
  reviewStrategyWrap: {
    marginTop: 6,
    marginBottom: 2,
  },
  reviewStrategyLabel: {
    ...theme.typography.caption,
    fontSize: 12,
    lineHeight: 16,
    fontWeight: "600",
  },
  reviewStrategyReason: {
    ...theme.typography.caption,
    fontSize: 11,
    lineHeight: 14,
    color: theme.colors.textSecondary,
    marginTop: 2,
  },
  draftMeta: {
    ...theme.typography.caption,
    color: theme.colors.textSecondary,
    marginTop: 6,
  },
  provenanceWrap: {
    marginTop: 6,
    gap: 2,
  },
  provenanceHint: {
    ...theme.typography.caption,
    fontSize: 12,
    lineHeight: 16,
    color: theme.colors.textSecondary,
  },
  quickCorrectionsWrap: {
    marginTop: 8,
    marginBottom: 2,
  },
  quickCorrectionsKicker: {
    ...theme.typography.caption,
    fontSize: 11,
    color: theme.colors.textSecondary,
    marginBottom: 6,
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },
  quickCorrectionsSourceCaption: {
    ...theme.typography.caption,
    fontSize: 11,
    lineHeight: 14,
    color: theme.colors.textSecondary,
    marginBottom: 6,
  },
  quickChipRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
  },
  quickChipBody: {
    flexDirection: "row",
    alignItems: "stretch",
  },
  quickChipPriorityBar: {
    width: 3,
    borderRadius: 2,
    marginRight: 10,
    minHeight: 28,
    alignSelf: "stretch",
  },
  quickChipPriorityBarHigh: {
    backgroundColor: theme.colors.primary,
    opacity: 0.42,
  },
  quickChipPriorityBarMedium: {
    backgroundColor: theme.colors.textMuted,
    opacity: 0.38,
  },
  quickChipPriorityBarLow: {
    backgroundColor: theme.colors.textMuted,
    opacity: 0.16,
  },
  quickChipContent: {
    flex: 1,
    minWidth: 0,
  },
  quickChipPriorityHint: {
    fontSize: 10,
    lineHeight: 13,
    fontWeight: "600",
    color: theme.colors.primary,
    opacity: 0.88,
  },
  quickChip: {
    maxWidth: "100%",
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 20,
    borderWidth: StyleSheet.hairlineWidth * 2,
    backgroundColor: "rgba(0,0,0,0.22)",
  },
  quickChipPressed: {
    opacity: 0.78,
  },
  quickChipSourceLine: {
    ...theme.typography.caption,
    fontSize: 10,
    lineHeight: 13,
    color: theme.colors.textSecondary,
    marginBottom: 3,
  },
  quickChipTextRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    alignItems: "center",
    maxWidth: 280,
  },
  quickChipLabel: {
    ...theme.typography.caption,
    fontSize: 12,
    fontWeight: "600",
    color: theme.colors.textSecondary,
  },
  quickChipValue: {
    ...theme.typography.caption,
    fontSize: 12,
    color: theme.colors.text,
    flexShrink: 1,
  },
  cta: {
    marginTop: theme.spacing.sm,
  },
  emptyTitle: {
    ...theme.typography.subtitle,
    fontWeight: "600",
    marginBottom: theme.spacing.sm,
  },
  emptyText: {
    ...theme.typography.body,
    color: theme.colors.textSecondary,
    lineHeight: 22,
  },
  error: {
    ...theme.typography.body,
    color: theme.colors.error,
  },
  muted: {
    ...theme.typography.body,
    color: theme.colors.textSecondary,
  },
});
