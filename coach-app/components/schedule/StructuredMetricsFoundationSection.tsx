/**
 * Секция структурированных метрик (Hockey ID foundation) на карточке тренировки.
 * Данные: `GET`/`PATCH` `.../structured-metrics` через `coachScheduleService`; черновик осей — локально (`StructuredMetricsDraftMap`).
 *
 * **Storybook:** завести истории по состояниям `loading`, `error`+retry, `empty`, список игроков (≥2 `playerId`),
 * `saving`, `saveSucceeded`, полосы подсказок (applicable / matches_existing / conflicts_existing; quick + live/Арена). Прокидывать `copy`
 * из фикстуры или мока `StructuredMetricsFoundationCopy` со всеми строками.
 *
 * **Снапшоты:** ключи списка — `playerId`; для стабильности не подставлять случайные id; при необходимости мокать время
 * на уровне родителя (секция сама даты не рендерит).
 */

import React, { useMemo } from 'react';
import {
  View,
  Text,
  Pressable,
  ActivityIndicator,
  StyleSheet,
} from 'react-native';
import { PrimaryButton } from '@/components/ui/PrimaryButton';
import { theme } from '@/constants/theme';
import type {
  TrainingEvaluation,
  TrainingStructuredMetricsPlayer,
  VoiceBehavioralMapEntry,
} from '@/services/coachScheduleService';
import type {
  StructuredMetricsAxisDraft,
  StructuredMetricsDraftMap,
} from '@/lib/structuredMetricsSessionUi';
import {
  buildBehavioralSuggestionMap,
  formatBehavioralAxesShort,
  isBehavioralSuggestionVoiceVsQuickConflict,
  type BehavioralSuggestionDisplaySource,
  type PlayerBehavioralStructuredSuggestion,
  type VoiceBehavioralByPlayer,
} from '@/lib/behavioralStructuredSuggestions';
import { formatBehavioralAxisExplainShort } from '@/lib/behavioralExplainabilityUi';

const AXES = [1, 2, 3, 4, 5] as const;

type AxisField = keyof StructuredMetricsAxisDraft;

function liveBehavioralExplainLine(
  liveExplainability: VoiceBehavioralMapEntry['explainability'] | undefined,
  displaySource: BehavioralSuggestionDisplaySource,
  targets: { focus?: number; discipline?: number }
): string | null {
  if (!liveExplainability || displaySource === 'quick_evaluation') {
    return null;
  }
  const parts: string[] = [];
  if (
    targets.focus != null &&
    liveExplainability.focus &&
    liveExplainability.focus.totalSignals > 0
  ) {
    const s = formatBehavioralAxisExplainShort(liveExplainability.focus);
    if (s) parts.push(`Конц.: ${s}`);
  }
  if (
    targets.discipline != null &&
    liveExplainability.discipline &&
    liveExplainability.discipline.totalSignals > 0
  ) {
    const s = formatBehavioralAxisExplainShort(liveExplainability.discipline);
    if (s) parts.push(`Дисц.: ${s}`);
  }
  return parts.length > 0 ? parts.join(' · ') : null;
}

/** Все пользовательские строки секции (родитель собирает из `COACH_SESSION_DETAIL_COPY` и констант авторизации). */
export interface StructuredMetricsFoundationCopy {
  /** Заголовок секции (uppercase-kicker в UI). */
  sectionTitle: string;
  /** Подзаголовок под заголовком (роль слоя / подсказка). */
  sectionSubtitle?: string;
  /** Текст рядом со спиннером при `loading`. */
  loading: string;
  /** Сообщение об ошибке загрузки (поле контракта COPY; текст ошибки на экране задаётся через prop `error`). */
  loadFailed: string;
  /** Пустой список игроков после успешной загрузки. */
  empty: string;
  /** Подпись кнопки сохранения. */
  saveCta: string;
  /** Подпись кнопки во время сохранения. */
  saving: string;
  /** Краткое подтверждение после успешного сохранения. */
  savedHint: string;
  /** Подпись оси: коньки. */
  iceSkating: string;
  /** Подпись оси: передача. */
  icePassing: string;
  /** Подпись оси: бросок. */
  iceShooting: string;
  /** Подпись оси: позиционирование. */
  tacPositioning: string;
  /** Подпись оси: решения. */
  tacDecisions: string;
  /** Подпись оси: выносливость. */
  ofpEndurance: string;
  /** Подпись оси: скорость. */
  ofpSpeed: string;
  /** Подпись оси: фокус (поведенческая). */
  behFocus: string;
  /** Подпись оси: дисциплина (поведенческая). */
  behDiscipline: string;
  /** Подсказка, когда сохранение недоступно (`!canSave`). */
  hintNoChanges: string;
  /** Eyebrow блока предложения (быстрая оценка + анализ тренировки). */
  structuredSuggestionFromQuickEyebrow: string;
  /** CTA применить предложение. */
  structuredSuggestionApply: string;
  /** Состояние «применяю» на CTA. */
  structuredSuggestionApplying: string;
  /** Бейдж источника: только quick-оценки. */
  structuredSuggestionSourceQuick: string;
  /** Бейдж источника: подтверждено после тренировки (live/Арена). */
  structuredSuggestionSourceVoice: string;
  /** Бейдж источника: слияние наблюдений и быстрой оценки. */
  structuredSuggestionSourceMerged: string;
  /** Лид-текст: можно применить значения. */
  structuredSuggestionApplicableLead: string;
  /** Лид-текст: предложенные оси при конфликте. */
  structuredSuggestionProposedLead: string;
  /** Текст: совпадает с черновиком. */
  structuredSuggestionMatches: string;
  /** Бейдж конфликта источников (наблюдения vs быстрая оценка). */
  structuredSuggestionConflictSourcesBadge: string;
  /** Тело: конфликт наблюдений и быстрой оценки. */
  structuredSuggestionConflictVoiceQuick: string;
  /** Тело: конфликт с Hockey ID / существующими метриками. */
  structuredSuggestionConflictHockeyId: string;
  /** Сообщение об ошибке применения предложения (показывается родителем через `suggestionApplyError`). */
  structuredSuggestionApplyFailed: string;
  /** Источник строки explainability (эфир / живая тренировка). */
  structuredSuggestionExplainSource: string;
  /** Легенда знаков + / − у explainability. */
  structuredSuggestionExplainLegend: string;
  /** Повторить (загрузку / после ошибки). */
  retryCta: string;
  /** Подсказка при сетевой ошибке (не для строки авторизации). */
  networkRetryHint: string;
  /** Текст «нужна авторизация», сравнивается с `error` / `saveError` для UI. */
  authLine: string;
}

export type StructuredMetricsFoundationSectionProps = {
  /** Локализованные строки (см. `StructuredMetricsFoundationCopy`). */
  copy: StructuredMetricsFoundationCopy;
  /** Игроки и серверные значения метрик (`GET .../structured-metrics`). */
  players: TrainingStructuredMetricsPlayer[];
  /** Первичная загрузка блока метрик. */
  loading: boolean;
  /** Ошибка загрузки или авторизации; при `copy.authLine` скрывается сетевая подсказка. */
  error: string | null;
  /** Повторить загрузку метрик. */
  onRetry: () => void;
  /** Черновик оценок 1–5 по осям на игрока. */
  draftByPlayer: StructuredMetricsDraftMap;
  /** Обновление черновика (toggle оси через `setAxis` внутри секции). */
  setDraftByPlayer: React.Dispatch<
    React.SetStateAction<StructuredMetricsDraftMap>
  >;
  /** Сохранить патч на сервер (`PATCH .../structured-metrics`). */
  onSave: () => void;
  /** Идёт сохранение патча. */
  saving: boolean;
  /** Ошибка последнего сохранения. */
  saveError: string | null;
  /** Успешное сохранение (краткий хинт в UI). */
  saveSucceeded: boolean;
  /** Есть ли отличия черновика от сервера / непустой патч (кнопка save). */
  canSave: boolean;
  /** Оценки тренировки для расчёта behavioral-предложений (`buildBehavioralSuggestionMap`). */
  evaluations: TrainingEvaluation[];
  /** Применить предложенные focus/discipline к игроку (обычно частичный PATCH). */
  onApplyBehavioralSuggestion: (
    playerId: string,
    behavioral: { focus?: number; discipline?: number }
  ) => void | Promise<void>;
  /** Для какого игрока сейчас крутится apply suggestion. */
  applyingSuggestionPlayerId: string | null;
  /** Ошибка последнего apply suggestion. */
  suggestionApplyError: string | null;
  /** Поведенческие подсказки из live/Арена по `playerId` (сигналы тренировки). */
  voiceBehavioralByPlayer: VoiceBehavioralByPlayer;
};

function setAxis(
  setDraft: StructuredMetricsFoundationSectionProps['setDraftByPlayer'],
  playerId: string,
  field: AxisField,
  value: number
) {
  setDraft((prev) => {
    const row = { ...(prev[playerId] ?? {}) };
    const cur = row[field];
    row[field] = cur === value ? null : value;
    return { ...prev, [playerId]: row };
  });
}

/** Одна ось: подпись и ряд пилюль 1–5 (повторное нажатие снимает значение). */
function AxisRow({
  label,
  value,
  disabled,
  onPick,
}: {
  label: string;
  value: number | null | undefined;
  disabled: boolean;
  onPick: (n: number) => void;
}) {
  return (
    <>
      <Text style={styles.evalLabel}>{label}</Text>
      <View style={styles.evalBtns}>
        {AXES.map((n) => (
          <Pressable
            key={n}
            onPress={() => onPick(n)}
            disabled={disabled}
            style={[
              styles.evalPill,
              value === n && styles.evalPillActive,
              disabled && styles.evalPillDisabled,
            ]}
          >
            <Text
              style={[
                styles.evalPillText,
                value === n && styles.evalPillTextActive,
              ]}
            >
              {n}
            </Text>
          </Pressable>
        ))}
      </View>
    </>
  );
}

/**
 * Структурированные метрики по игрокам: оси льда / тактики / ОФП / поведение, сохранение патча, полосы подсказок (quick + live/Арена).
 * Обёртка `SectionCard` задаётся на экране (`schedule/[id].tsx`).
 */
export function StructuredMetricsFoundationSection({
  copy,
  players,
  loading,
  error,
  onRetry,
  draftByPlayer,
  setDraftByPlayer,
  onSave,
  saving,
  saveError,
  saveSucceeded,
  canSave,
  evaluations,
  onApplyBehavioralSuggestion,
  applyingSuggestionPlayerId,
  suggestionApplyError,
  voiceBehavioralByPlayer,
}: StructuredMetricsFoundationSectionProps) {
  const suggestionByPlayer = useMemo(
    () =>
      buildBehavioralSuggestionMap(
        players,
        evaluations,
        draftByPlayer,
        voiceBehavioralByPlayer
      ),
    [players, evaluations, draftByPlayer, voiceBehavioralByPlayer]
  );

  return (
    <>
      <Text style={styles.sectionKicker}>{copy.sectionTitle}</Text>
      {copy.sectionSubtitle ? (
        <Text style={styles.sectionSubtitle}>{copy.sectionSubtitle}</Text>
      ) : null}
      {loading ? (
        <View style={styles.evalLoadingRow}>
          <ActivityIndicator size="small" color={theme.colors.primary} />
          <Text style={styles.rowMuted}>{copy.loading}</Text>
        </View>
      ) : error ? (
        <View style={styles.errBlock}>
          <Text style={styles.attErr}>{error}</Text>
          {error !== copy.authLine ? (
            <Text style={styles.errorHintSmall}>{copy.networkRetryHint}</Text>
          ) : null}
          <PrimaryButton
            title={copy.retryCta}
            variant="outline"
            onPress={onRetry}
            style={styles.inlineRetryBtn}
          />
        </View>
      ) : players.length === 0 ? (
        <Text style={styles.rowMuted}>{copy.empty}</Text>
      ) : (
        <View>
          {players.map((row) => {
            const d = draftByPlayer[row.playerId] ?? {};
            const disabled = saving;
            const sug = suggestionByPlayer.get(row.playerId);
            return (
              <View key={row.playerId} style={styles.evalPlayerBlock}>
                <Text style={styles.evalPlayerName} numberOfLines={1}>
                  {row.name}
                </Text>
                {sug && sug.status !== 'empty' ? (
                  <SuggestionStrip
                    copy={copy}
                    suggestion={sug}
                    liveExplainability={
                      voiceBehavioralByPlayer.get(row.playerId)?.explainability
                    }
                    disabled={disabled}
                    applying={applyingSuggestionPlayerId === row.playerId}
                    onApply={() =>
                      void onApplyBehavioralSuggestion(
                        row.playerId,
                        sug.applicableBehavioral
                      )
                    }
                  />
                ) : null}
                <AxisRow
                  label={copy.iceSkating}
                  value={d.skating}
                  disabled={disabled}
                  onPick={(n) =>
                    setAxis(setDraftByPlayer, row.playerId, 'skating', n)
                  }
                />
                <AxisRow
                  label={copy.icePassing}
                  value={d.passing}
                  disabled={disabled}
                  onPick={(n) =>
                    setAxis(setDraftByPlayer, row.playerId, 'passing', n)
                  }
                />
                <AxisRow
                  label={copy.iceShooting}
                  value={d.shooting}
                  disabled={disabled}
                  onPick={(n) =>
                    setAxis(setDraftByPlayer, row.playerId, 'shooting', n)
                  }
                />
                <AxisRow
                  label={copy.tacPositioning}
                  value={d.positioning}
                  disabled={disabled}
                  onPick={(n) =>
                    setAxis(setDraftByPlayer, row.playerId, 'positioning', n)
                  }
                />
                <AxisRow
                  label={copy.tacDecisions}
                  value={d.decisionMaking}
                  disabled={disabled}
                  onPick={(n) =>
                    setAxis(
                      setDraftByPlayer,
                      row.playerId,
                      'decisionMaking',
                      n
                    )
                  }
                />
                <AxisRow
                  label={copy.ofpEndurance}
                  value={d.endurance}
                  disabled={disabled}
                  onPick={(n) =>
                    setAxis(setDraftByPlayer, row.playerId, 'endurance', n)
                  }
                />
                <AxisRow
                  label={copy.ofpSpeed}
                  value={d.speed}
                  disabled={disabled}
                  onPick={(n) =>
                    setAxis(setDraftByPlayer, row.playerId, 'speed', n)
                  }
                />
                <AxisRow
                  label={copy.behFocus}
                  value={d.focus}
                  disabled={disabled}
                  onPick={(n) =>
                    setAxis(setDraftByPlayer, row.playerId, 'focus', n)
                  }
                />
                <AxisRow
                  label={copy.behDiscipline}
                  value={d.discipline}
                  disabled={disabled}
                  onPick={(n) =>
                    setAxis(setDraftByPlayer, row.playerId, 'discipline', n)
                  }
                />
              </View>
            );
          })}
          <PrimaryButton
            title={saving ? copy.saving : copy.saveCta}
            variant="outline"
            onPress={onSave}
            disabled={saving || !canSave}
            animatedPress
            style={styles.reportSaveBtn}
          />
          {players.length > 0 && !canSave && !saving ? (
            <Text style={styles.hintBelowSave}>{copy.hintNoChanges}</Text>
          ) : null}
          {saveError ? (
            <>
              <Text style={styles.attErr}>{saveError}</Text>
              {saveError !== copy.authLine ? (
                <Text style={styles.errorHintSmall}>{copy.networkRetryHint}</Text>
              ) : null}
            </>
          ) : null}
          {saveSucceeded ? (
            <Text style={styles.reportSavedText}>{copy.savedHint}</Text>
          ) : null}
          {suggestionApplyError ? (
            <Text style={styles.attErr}>{suggestionApplyError}</Text>
          ) : null}
        </View>
      )}
    </>
  );
}

function sourceLabelForSuggestion(
  copy: StructuredMetricsFoundationCopy,
  displaySource: PlayerBehavioralStructuredSuggestion['displaySource']
): string {
  switch (displaySource) {
    case 'voice_reviewed':
      return copy.structuredSuggestionSourceVoice;
    case 'voice_and_quick_merged':
      return copy.structuredSuggestionSourceMerged;
    default:
      return copy.structuredSuggestionSourceQuick;
  }
}

/** Источник + счётчики + легенда; только при непустой строке explainability. */
function BehavioralExplainabilityContext({
  copy,
  line,
}: {
  copy: StructuredMetricsFoundationCopy;
  line: string;
}) {
  return (
    <View style={styles.suggestionExplainBlock}>
      <Text style={styles.suggestionExplainSource}>
        {copy.structuredSuggestionExplainSource}
      </Text>
      <Text style={styles.suggestionExplainCounts}>{line}</Text>
      <Text style={styles.suggestionExplainLegend}>
        {copy.structuredSuggestionExplainLegend}
      </Text>
    </View>
  );
}

function SourcePill({
  label,
  variant,
}: {
  label: string;
  variant: 'source' | 'warning';
}) {
  return (
    <View
      style={[
        styles.suggestionPill,
        variant === 'warning' && styles.suggestionPillWarning,
      ]}
    >
      <Text
        style={[
          styles.suggestionPillText,
          variant === 'warning' && styles.suggestionPillTextWarning,
        ]}
      >
        {label}
      </Text>
    </View>
  );
}

/** UI подсказки поведения (quick / после тренировки / merged) для одного игрока. */
function SuggestionStrip({
  copy,
  suggestion,
  liveExplainability,
  disabled,
  applying,
  onApply,
}: {
  copy: StructuredMetricsFoundationCopy;
  suggestion: PlayerBehavioralStructuredSuggestion;
  liveExplainability: VoiceBehavioralMapEntry['explainability'] | undefined;
  disabled: boolean;
  applying: boolean;
  onApply: () => void;
}) {
  const voiceVsQuick = isBehavioralSuggestionVoiceVsQuickConflict(suggestion);
  const axesToApply = formatBehavioralAxesShort(suggestion.applicableBehavioral);
  const axesProposed = formatBehavioralAxesShort(suggestion.suggested);

  const explainApplicable = liveBehavioralExplainLine(
    liveExplainability,
    suggestion.displaySource,
    suggestion.applicableBehavioral
  );
  const explainFromSuggested = liveBehavioralExplainLine(
    liveExplainability,
    suggestion.displaySource,
    suggestion.suggested
  );

  return (
    <View style={styles.suggestionBox}>
      <Text style={styles.suggestionEyebrow}>
        {copy.structuredSuggestionFromQuickEyebrow}
      </Text>
      {suggestion.status === 'applicable' ? (
        <>
          <SourcePill
            label={sourceLabelForSuggestion(copy, suggestion.displaySource)}
            variant="source"
          />
          <Text style={styles.suggestionLine}>
            {copy.structuredSuggestionApplicableLead}{' '}
            <Text style={styles.suggestionEmphasis}>{axesToApply}</Text>
          </Text>
          {explainApplicable ? (
            <BehavioralExplainabilityContext
              copy={copy}
              line={explainApplicable}
            />
          ) : null}
          <Pressable
            onPress={onApply}
            disabled={disabled || applying}
            style={[
              styles.suggestionApplyBtn,
              (disabled || applying) && styles.suggestionApplyBtnDisabled,
            ]}
            accessibilityRole="button"
            accessibilityState={{
              disabled: disabled || applying,
              busy: applying,
            }}
            accessibilityLabel={`${copy.structuredSuggestionApply}. ${axesToApply}`}
          >
            <Text style={styles.suggestionApplyBtnText}>
              {applying
                ? copy.structuredSuggestionApplying
                : copy.structuredSuggestionApply}
            </Text>
          </Pressable>
        </>
      ) : suggestion.status === 'matches_existing' ? (
        <>
          <SourcePill
            label={sourceLabelForSuggestion(copy, suggestion.displaySource)}
            variant="source"
          />
          <Text style={styles.suggestionMuted}>{copy.structuredSuggestionMatches}</Text>
          {explainFromSuggested ? (
            <BehavioralExplainabilityContext
              copy={copy}
              line={explainFromSuggested}
            />
          ) : null}
        </>
      ) : suggestion.status === 'conflicts_existing' ? (
        voiceVsQuick ? (
          <>
            <SourcePill
              label={copy.structuredSuggestionConflictSourcesBadge}
              variant="warning"
            />
            <Text style={styles.suggestionConflictBody}>
              {copy.structuredSuggestionConflictVoiceQuick}
            </Text>
          </>
        ) : (
          <>
            <SourcePill
              label={sourceLabelForSuggestion(copy, suggestion.displaySource)}
              variant="source"
            />
            {axesProposed ? (
              <Text style={styles.suggestionLine}>
                {copy.structuredSuggestionProposedLead}{' '}
                <Text style={styles.suggestionEmphasis}>{axesProposed}</Text>
              </Text>
            ) : null}
            {explainFromSuggested ? (
              <BehavioralExplainabilityContext
                copy={copy}
                line={explainFromSuggested}
              />
            ) : null}
            <Text style={styles.suggestionConflictBody}>
              {copy.structuredSuggestionConflictHockeyId}
            </Text>
          </>
        )
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  sectionKicker: {
    fontSize: 11,
    fontWeight: '600',
    letterSpacing: 0.45,
    color: theme.colors.textMuted,
    textTransform: 'uppercase',
    marginBottom: theme.spacing.xs,
  },
  sectionSubtitle: {
    ...theme.typography.caption,
    color: theme.colors.textMuted,
    lineHeight: 18,
    marginBottom: theme.spacing.md,
  },
  evalLoadingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.spacing.sm,
    paddingVertical: theme.spacing.sm,
  },
  rowMuted: {
    ...theme.typography.caption,
    color: theme.colors.textMuted,
    lineHeight: 18,
  },
  errBlock: {
    marginTop: theme.spacing.xs,
  },
  attErr: {
    ...theme.typography.caption,
    color: theme.colors.error,
  },
  errorHintSmall: {
    ...theme.typography.caption,
    color: theme.colors.textMuted,
    lineHeight: 18,
    marginTop: theme.spacing.xs,
    marginBottom: theme.spacing.sm,
  },
  inlineRetryBtn: {
    alignSelf: 'flex-start',
    minWidth: 160,
  },
  evalPlayerBlock: {
    paddingVertical: theme.spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.cardBorder,
  },
  evalPlayerName: {
    ...theme.typography.subtitle,
    color: theme.colors.text,
    marginBottom: theme.spacing.sm,
  },
  suggestionBox: {
    marginBottom: theme.spacing.sm,
    padding: theme.spacing.sm,
    borderRadius: theme.borderRadius.md,
    backgroundColor: theme.colors.surfaceElevated,
    borderWidth: 1,
    borderColor: theme.colors.cardBorder,
  },
  suggestionEyebrow: {
    ...theme.typography.caption,
    fontSize: 10,
    fontWeight: '700',
    letterSpacing: 0.4,
    color: theme.colors.primary,
    textTransform: 'uppercase',
    marginBottom: theme.spacing.sm,
  },
  suggestionPill: {
    alignSelf: 'flex-start',
    paddingVertical: 3,
    paddingHorizontal: 10,
    borderRadius: theme.borderRadius.full,
    backgroundColor: theme.colors.primaryMuted,
    borderWidth: 1,
    borderColor: 'rgba(59, 130, 246, 0.35)',
    marginBottom: theme.spacing.sm,
  },
  suggestionPillWarning: {
    backgroundColor: 'rgba(245, 166, 35, 0.12)',
    borderColor: 'rgba(245, 166, 35, 0.45)',
  },
  suggestionPillText: {
    fontSize: 11,
    fontWeight: '600',
    color: theme.colors.primary,
    letterSpacing: 0.2,
  },
  suggestionPillTextWarning: {
    color: theme.colors.warning,
  },
  suggestionLine: {
    ...theme.typography.caption,
    color: theme.colors.textSecondary,
    lineHeight: 20,
    marginBottom: theme.spacing.sm,
  },
  suggestionEmphasis: {
    color: theme.colors.text,
    fontWeight: '600',
  },
  suggestionConflictBody: {
    ...theme.typography.caption,
    color: theme.colors.textMuted,
    lineHeight: 20,
  },
  suggestionMuted: {
    ...theme.typography.caption,
    color: theme.colors.textMuted,
    lineHeight: 18,
  },
  suggestionExplainBlock: {
    marginTop: 6,
    marginBottom: 4,
    paddingLeft: 10,
    borderLeftWidth: 2,
    borderLeftColor: 'rgba(59, 130, 246, 0.35)',
  },
  suggestionExplainSource: {
    ...theme.typography.caption,
    fontSize: 10,
    fontWeight: '600',
    color: theme.colors.textMuted,
    lineHeight: 14,
    letterSpacing: 0.15,
  },
  suggestionExplainCounts: {
    ...theme.typography.caption,
    fontSize: 11,
    color: theme.colors.textMuted,
    lineHeight: 16,
    marginTop: 2,
  },
  suggestionExplainLegend: {
    ...theme.typography.caption,
    fontSize: 10,
    color: theme.colors.textMuted,
    lineHeight: 14,
    marginTop: 4,
    opacity: 0.92,
  },
  suggestionMutedSecond: {
    marginTop: 4,
  },
  suggestionApplyBtn: {
    alignSelf: 'flex-start',
    paddingVertical: theme.spacing.xs,
    paddingHorizontal: theme.spacing.md,
    borderRadius: theme.borderRadius.md,
    backgroundColor: theme.colors.primaryMuted,
    borderWidth: 1,
    borderColor: theme.colors.primary,
  },
  suggestionApplyBtnDisabled: {
    opacity: 0.45,
  },
  suggestionApplyBtnText: {
    ...theme.typography.caption,
    color: theme.colors.primary,
    fontWeight: '700',
  },
  evalLabel: {
    ...theme.typography.caption,
    color: theme.colors.textSecondary,
    marginBottom: theme.spacing.xs,
    marginTop: theme.spacing.xs,
  },
  evalBtns: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: theme.spacing.xs,
  },
  evalPill: {
    minWidth: 36,
    paddingVertical: theme.spacing.xs,
    paddingHorizontal: theme.spacing.sm,
    borderRadius: theme.borderRadius.sm,
    borderWidth: 1,
    borderColor: theme.colors.cardBorder,
    backgroundColor: theme.colors.surfaceElevated,
    alignItems: 'center',
  },
  evalPillActive: {
    borderColor: theme.colors.primary,
    backgroundColor: theme.colors.primaryMuted,
  },
  evalPillDisabled: { opacity: 0.5 },
  evalPillText: {
    ...theme.typography.caption,
    color: theme.colors.textSecondary,
    fontWeight: '600',
  },
  evalPillTextActive: { color: theme.colors.primary },
  reportSaveBtn: {
    marginTop: theme.spacing.md,
  },
  hintBelowSave: {
    ...theme.typography.caption,
    color: theme.colors.textMuted,
    marginTop: theme.spacing.sm,
    lineHeight: 18,
  },
  reportSavedText: {
    ...theme.typography.caption,
    color: theme.colors.primary,
    marginTop: theme.spacing.sm,
    fontWeight: '600',
  },
});
