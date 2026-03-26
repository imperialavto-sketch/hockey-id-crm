import React, { useMemo, useState, useCallback } from "react";
import { StyleSheet, Text, View, type ViewStyle } from "react-native";
import { useRouter, useFocusEffect } from "expo-router";
import { ScreenContainer } from "@/components/layout/ScreenContainer";
import { SectionCard } from "@/components/ui/SectionCard";
import { PrimaryButton } from "@/components/ui/PrimaryButton";
import { PressableFeedback } from "@/components/ui/PressableFeedback";
import { StaggerFadeIn } from "@/components/dashboard/StaggerFadeIn";
import {
  CoachListHero,
  CoachListSkeletonCard,
  formatCoachListContextDate,
} from "@/components/lists/CoachListScreenPrimitives";
import { CoachDetailLoadingBody } from "@/components/details/CoachDetailScreenPrimitives";
import {
  getCoachActionItems,
  type ActionStatus,
  type CoachActionItem,
} from "@/lib/coachActionHelpers";
import { isEndpointUnavailable, clearEndpointUnavailable, COACH_ENDPOINTS } from "@/lib/endpointAvailability";
import { isAuthRequiredError } from "@/lib/coachAuth";
import { coachHapticSelection } from "@/lib/coachHaptics";
import { theme } from "@/constants/theme";

function tasksCountRu(n: number): string {
  const m10 = n % 10;
  const m100 = n % 100;
  if (m10 === 1 && m100 !== 11) return `${n} задача`;
  if (m10 >= 2 && m10 <= 4 && (m100 < 10 || m100 >= 20)) return `${n} задачи`;
  return `${n} задач`;
}

function tasksWordBare(n: number): string {
  const m10 = n % 10;
  const m100 = n % 100;
  if (m10 === 1 && m100 !== 11) return "задача";
  if (m10 >= 2 && m10 <= 4 && (m100 < 10 || m100 >= 20)) return "задачи";
  return "задач";
}

function priorityShortLabel(p: CoachActionItem["priority"]): string {
  if (p === 1) return "Высокий";
  if (p === 2) return "Средний";
  return "Ниже срочности";
}

/** UX-ярлык статуса без изменения доменных значений API */
function statusFlowLabel(status: ActionStatus): string {
  if (status === "Требует внимания") return "Нужно действие";
  if (status === "Есть спад") return "В процессе";
  return "На разборе";
}

type InboxStats = {
  total: number;
  highPriority: number;
  statusRequiresAttention: number;
  statusSlump: number;
  statusReview: number;
};

function computeInboxStats(items: CoachActionItem[]): InboxStats {
  return {
    total: items.length,
    highPriority: items.filter((i) => i.priority === 1).length,
    statusRequiresAttention: items.filter((i) => i.status === "Требует внимания").length,
    statusSlump: items.filter((i) => i.status === "Есть спад").length,
    statusReview: items.filter((i) => i.status === "Нужен разбор").length,
  };
}

function buildSummaryLines(params: {
  items: CoachActionItem[];
  filteredCount: number;
  hasActiveFilters: boolean;
  stats: InboxStats;
}): { primary: string; secondary: string | null } {
  const { items, filteredCount, hasActiveFilters, stats } = params;
  const n = items.length;

  if (n === 0) {
    return {
      primary:
        "Здесь собираются сигналы по игрокам из аналитики. Отдельные задачи вы задаёте из переписки и голоса — они ведут в привычные экраны черновика.",
      secondary: null,
    };
  }

  const primary = hasActiveFilters
    ? `Показано ${filteredCount} из ${n} ${tasksWordBare(n)}.`
    : "Приоритет и статус подсказывают, с чего начать; группы ниже отсортированы по срочности.";

  let secondary: string | null = null;
  if (stats.highPriority > 0) {
    secondary = `${stats.highPriority} ${tasksWordBare(stats.highPriority)} с высоким приоритетом.`;
  } else if (!hasActiveFilters && stats.statusRequiresAttention === 0) {
    secondary = "Срочных пометок нет — можно пройти список сверху вниз.";
  }

  return { primary, secondary };
}

/** Очень мягкая подсказка */
function buildNextStepHint(stats: InboxStats, hasActiveFilters: boolean): string | null {
  if (stats.total === 0) return null;
  if (hasActiveFilters) return "При необходимости расширьте список сбросом фильтров.";
  if (stats.statusRequiresAttention > 0) return "Удобно начать с блока «Требуют внимания».";
  if (stats.highPriority > 0) return "Высокий приоритет остаётся визуально заметным в карточках.";
  return "Откройте игрока, чтобы уточнить контекст и продолжить работу.";
}

function ActionsErrorCard({ message, onRetry }: { message: string; onRetry: () => void }) {
  return (
    <SectionCard elevated style={styles.errorCard}>
      <Text style={styles.errorHeading}>Сейчас не удалось загрузить задачи</Text>
      <Text style={styles.errorBody}>
        Список на сервере не пропадает. Проверьте сеть и попробуйте снова.
      </Text>
      {message ? (
        <Text style={styles.errorDetail} numberOfLines={4}>
          {message}
        </Text>
      ) : null}
      <PrimaryButton animatedPress title="Попробовать снова" variant="outline" onPress={onRetry} style={styles.errorRetry} />
    </SectionCard>
  );
}

function statusTone(priority: CoachActionItem["priority"]): "danger" | "warning" | "info" {
  if (priority === 1) return "danger";
  if (priority === 2) return "warning";
  return "info";
}

type PriorityFilter = "all" | "important" | "other";
type StatusFilter = "all" | CoachActionItem["status"];

function Pill({
  label,
  active,
  onPress,
}: {
  label: string;
  active: boolean;
  onPress: () => void;
}) {
  return (
    <PressableFeedback
      style={[styles.pill, active && styles.pillActive]}
      onPress={() => {
        coachHapticSelection();
        onPress();
      }}
    >
      <Text style={[styles.pillText, active && styles.pillTextActive]}>{label}</Text>
    </PressableFeedback>
  );
}

function SummaryMetricChip({ label }: { label: string }) {
  return (
    <View style={styles.metricChip}>
      <Text style={styles.metricChipText} numberOfLines={2}>
        {label}
      </Text>
    </View>
  );
}

function SummaryMetrics({
  total,
  attention,
  inSlump,
  inReview,
}: {
  total: number;
  attention: number;
  inSlump: number;
  inReview: number;
}) {
  const chips: string[] = [`Всего: ${total}`];
  chips.push(`Внимание: ${attention}`);
  if (inSlump > 0) chips.push(`В работе: ${inSlump}`);
  if (inReview > 0) chips.push(`На разборе: ${inReview}`);
  return (
    <View style={styles.metricChipRow}>
      {chips.map((c) => (
        <SummaryMetricChip key={c} label={c} />
      ))}
    </View>
  );
}

function GroupHeader({ title, hint, isFirst }: { title: string; hint?: string; isFirst?: boolean }) {
  return (
    <View style={[styles.groupHeader, !isFirst && styles.groupHeaderAfterPrevious]}>
      <Text style={styles.groupHeaderTitle}>{title}</Text>
      {hint ? (
        <Text style={styles.groupHeaderHint} numberOfLines={2}>
          {hint}
        </Text>
      ) : null}
    </View>
  );
}

function TaskCard({
  item,
  showTopBorder,
  onOpen,
}: {
  item: CoachActionItem;
  showTopBorder: boolean;
  onOpen: () => void;
}) {
  const tone = statusTone(item.priority);
  const summary =
    item.actionLine?.trim() || "Краткое описание появится из данных игрока — откройте карточку.";
  const flow = statusFlowLabel(item.status);

  return (
    <SectionCard
      elevated
      style={StyleSheet.flatten([styles.taskCardOuter, showTopBorder ? styles.taskCardMarginTop : {}]) as ViewStyle}
    >
      <View style={styles.taskCardRow}>
        <View
          style={[
            styles.taskAccent,
            tone === "danger" && styles.taskAccentDanger,
            tone === "warning" && styles.taskAccentWarning,
            tone === "info" && styles.taskAccentInfo,
          ]}
        />
        <View style={styles.taskCardInner}>
          <PressableFeedback style={styles.taskCardPress} onPress={onOpen}>
            <View style={styles.taskChips}>
              <View style={[styles.priorityPill, tone === "danger" && styles.priorityPillDanger]}>
                <Text style={[styles.priorityPillText, tone === "danger" && styles.priorityPillTextDanger]}>
                  {priorityShortLabel(item.priority)}
                </Text>
              </View>
              <View style={styles.sourcePill}>
                <Text style={styles.sourcePillText}>Сигнал по игроку</Text>
              </View>
            </View>

            <Text style={styles.taskSummary} numberOfLines={4}>
              {summary}
            </Text>

            <View style={styles.playerRow}>
              <Text style={styles.playerLabel}>Игрок</Text>
              <Text style={styles.playerName} numberOfLines={2}>
                {item.playerName?.trim() || "Без имени"}
              </Text>
            </View>

            <View style={styles.taskMetaRow}>
              <View
                style={[
                  styles.flowBadge,
                  tone === "danger" && styles.flowBadgeDanger,
                  tone === "warning" && styles.flowBadgeWarning,
                  tone === "info" && styles.flowBadgeInfo,
                ]}
              >
                <Text
                  style={[
                    styles.flowBadgeText,
                    tone === "danger" && styles.flowBadgeTextDanger,
                    tone === "warning" && styles.flowBadgeTextWarning,
                    tone === "info" && styles.flowBadgeTextInfo,
                  ]}
                  numberOfLines={1}
                >
                  {flow}
                </Text>
              </View>
              <Text style={styles.domainStatusMuted} numberOfLines={2}>
                {item.status}
              </Text>
            </View>
          </PressableFeedback>

          <View style={styles.taskCtaRow}>
            <PrimaryButton animatedPress title="К игроку" variant="primary" onPress={onOpen} style={styles.taskCtaPrimary} />
          </View>
        </View>
      </View>
    </SectionCard>
  );
}

const EYEBROW = "Действия";
const SCREEN_TITLE = "Задачи тренера";
const HERO_SUBTITLE_LOADED =
  "Центр сигналов по игрокам: срочное сверху, затем работа и разбор. Карточка открывает профиль — переписка и голос в своих разделах.";
const HERO_SUBTITLE_ERROR =
  "Когда соединение восстановится, здесь снова появятся актуальные задачи по игрокам.";

function sortActionItems(list: CoachActionItem[]): CoachActionItem[] {
  return [...list].sort((a, b) => {
    if (a.priority !== b.priority) return a.priority - b.priority;
    return a.playerName.localeCompare(b.playerName, "ru");
  });
}

export default function ActionsScreen() {
  const router = useRouter();
  const [items, setItems] = useState<CoachActionItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadedOnce, setLoadedOnce] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [priorityFilter, setPriorityFilter] = useState<PriorityFilter>("all");
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("all");

  const fetchItems = useCallback((opts?: { silent?: boolean }) => {
    const silent = opts?.silent === true;
    if (!silent) setLoading(true);
    setError(null);
    return getCoachActionItems()
      .then((data) => {
        setItems(data);
        setError(null);
        setLoadedOnce(true);
      })
      .catch((err) => {
        setItems([]);
        setError(
          isAuthRequiredError(err)
            ? "Нужна авторизация в приложении."
            : "Не удалось загрузить список."
        );
      })
      .finally(() => setLoading(false));
  }, []);

  useFocusEffect(
    useCallback(() => {
      void fetchItems({ silent: loadedOnce });
    }, [fetchItems, loadedOnce])
  );

  const dateLabel = formatCoachListContextDate();

  const filteredItems = useMemo(() => {
    const filtered = items
      .filter((it) => {
        if (priorityFilter === "all") return true;
        const isImportant = it.priority === 1;
        return priorityFilter === "important" ? isImportant : !isImportant;
      })
      .filter((it) => (statusFilter === "all" ? true : it.status === statusFilter));
    return sortActionItems(filtered);
  }, [items, priorityFilter, statusFilter]);

  const hasActiveFilters = priorityFilter !== "all" || statusFilter !== "all";

  const inboxStats = useMemo(() => computeInboxStats(items), [items]);

  const countLabel = useMemo(() => {
    if (items.length === 0) return "Очередь пуста";
    if (hasActiveFilters) {
      return `${filteredItems.length} из ${items.length} ${tasksWordBare(items.length)}`;
    }
    return tasksCountRu(items.length);
  }, [items.length, filteredItems.length, hasActiveFilters]);

  const summaryLines = useMemo(
    () =>
      buildSummaryLines({
        items,
        filteredCount: filteredItems.length,
        hasActiveFilters,
        stats: inboxStats,
      }),
    [items, filteredItems.length, hasActiveFilters, inboxStats]
  );

  const nextStepHint = useMemo(
    () => buildNextStepHint(inboxStats, hasActiveFilters),
    [inboxStats, hasActiveFilters]
  );

  const { attentionRows, slumpRows, reviewRows } = useMemo(() => {
    return {
      attentionRows: filteredItems.filter((i) => i.status === "Требует внимания"),
      slumpRows: filteredItems.filter((i) => i.status === "Есть спад"),
      reviewRows: filteredItems.filter((i) => i.status === "Нужен разбор"),
    };
  }, [filteredItems]);

  if (loading && !loadedOnce) {
    return (
      <ScreenContainer contentContainerStyle={styles.content}>
        <StaggerFadeIn preset="snappy" delay={0}>
          <CoachDetailLoadingBody
            eyebrow={EYEBROW}
            title={SCREEN_TITLE}
            subtitle="Подтягиваем очередь сигналов по игрокам."
          />
        </StaggerFadeIn>
        <StaggerFadeIn preset="snappy" delay={16}>
          <CoachListSkeletonCard />
        </StaggerFadeIn>
        <View style={styles.bottomSpacer} />
      </ScreenContainer>
    );
  }

  if (error) {
    return (
      <ScreenContainer contentContainerStyle={styles.content}>
        <StaggerFadeIn preset="snappy" delay={0}>
          <CoachListHero
            eyebrow={EYEBROW}
            title={SCREEN_TITLE}
            dateLabel={dateLabel}
            countLabel="—"
            subtitle={HERO_SUBTITLE_ERROR}
          />
        </StaggerFadeIn>
        <StaggerFadeIn preset="snappy" delay={16}>
          <ActionsErrorCard message={error} onRetry={() => void fetchItems()} />
        </StaggerFadeIn>
        <View style={styles.bottomSpacer} />
      </ScreenContainer>
    );
  }

  return (
    <ScreenContainer contentContainerStyle={styles.content}>
      <StaggerFadeIn preset="snappy" delay={0}>
        <CoachListHero
          eyebrow={EYEBROW}
          title={SCREEN_TITLE}
          dateLabel={dateLabel}
          countLabel={countLabel}
          subtitle={HERO_SUBTITLE_LOADED}
        />
      </StaggerFadeIn>

      <StaggerFadeIn preset="snappy" delay={10}>
        <SectionCard elevated style={styles.summaryCard}>
          <Text style={styles.summaryKicker}>Сводка</Text>
          {items.length > 0 ? (
            <SummaryMetrics
              total={inboxStats.total}
              attention={inboxStats.statusRequiresAttention}
              inSlump={inboxStats.statusSlump}
              inReview={inboxStats.statusReview}
            />
          ) : null}
          <Text style={[styles.summaryPrimary, items.length > 0 && styles.summaryPrimaryAfterStats]}>
            {summaryLines.primary}
          </Text>
          {summaryLines.secondary ? (
            <Text style={styles.summarySecondary}>{summaryLines.secondary}</Text>
          ) : null}
          {items.length > 0 && nextStepHint ? (
            <Text style={styles.summaryNextMuted}>{nextStepHint}</Text>
          ) : null}
        </SectionCard>
      </StaggerFadeIn>

      <StaggerFadeIn preset="snappy" delay={14}>
        <View style={styles.section}>
          <SectionCard elevated style={styles.controlsCard}>
            <Text style={styles.controlsTitle}>Быстрые переходы</Text>
            <Text style={styles.controlsHint}>Сообщения и голос — откуда часто появляются отдельные поручения.</Text>
            <View style={styles.quickRow}>
              <PrimaryButton
                animatedPress
                title="Сообщения"
                variant="outline"
                onPress={() => router.push("/(tabs)/messages" as Parameters<typeof router.push>[0])}
                style={styles.quickBtn}
              />
              <PrimaryButton
                animatedPress
                title="Голос"
                variant="outline"
                onPress={() => router.push("/voice-note")}
                style={styles.quickBtn}
              />
              <PrimaryButton
                animatedPress
                title="Тренировка"
                variant="outline"
                onPress={() => router.push("/dev/coach-input")}
                style={styles.quickBtn}
              />
            </View>

            <View style={styles.controlsDivider} />

            <Text style={styles.controlsTitle}>Фильтры</Text>
            <Text style={styles.controlsHintMuted}>По приоритету или доменному статусу из списка.</Text>
            <View style={styles.pillsRow}>
              <Pill label="Все" active={priorityFilter === "all"} onPress={() => setPriorityFilter("all")} />
              <Pill label="Важные" active={priorityFilter === "important"} onPress={() => setPriorityFilter("important")} />
              <Pill label="Остальные" active={priorityFilter === "other"} onPress={() => setPriorityFilter("other")} />
            </View>
            <View style={styles.pillsRow}>
              <Pill label="Все статусы" active={statusFilter === "all"} onPress={() => setStatusFilter("all")} />
              <Pill
                label="Требует внимания"
                active={statusFilter === "Требует внимания"}
                onPress={() => setStatusFilter("Требует внимания")}
              />
              <Pill label="Есть спад" active={statusFilter === "Есть спад"} onPress={() => setStatusFilter("Есть спад")} />
              <Pill
                label="Нужен разбор"
                active={statusFilter === "Нужен разбор"}
                onPress={() => setStatusFilter("Нужен разбор")}
              />
            </View>
            {hasActiveFilters ? (
              <PrimaryButton
                animatedPress
                title="Сбросить фильтры"
                variant="ghost"
                onPress={() => {
                  setPriorityFilter("all");
                  setStatusFilter("all");
                }}
                style={styles.resetBtn}
                textStyle={styles.resetBtnText}
              />
            ) : null}
          </SectionCard>

          {items.length === 0 ? (
            <SectionCard elevated style={styles.emptyCard}>
              <View style={styles.emptyAccent} />
              <Text style={styles.emptyTitle}>
                {isEndpointUnavailable(COACH_ENDPOINTS.ACTIONS) ? "Раздел пока настраивается" : "Пока нет задач в очереди"}
              </Text>
              <Text style={styles.emptyText}>
                {isEndpointUnavailable(COACH_ENDPOINTS.ACTIONS)
                  ? "Когда данные будут доступны, здесь появятся сигналы по игрокам."
                  : "Сюда попадают позиции из аналитики игроков. Дополнительно вы можете зафиксировать действие из диалога с родителем (кнопка в треде) или из голосовой заметки — они откроют привычный черновик задачи."}
              </Text>
              <View style={styles.emptyActions}>
                {isEndpointUnavailable(COACH_ENDPOINTS.ACTIONS) ? (
                  <PrimaryButton
                    animatedPress
                    title="Проверить снова"
                    variant="outline"
                    onPress={() => {
                      clearEndpointUnavailable(COACH_ENDPOINTS.ACTIONS);
                      void fetchItems();
                    }}
                  />
                ) : (
                  <>
                    <PrimaryButton
                      animatedPress
                      title="Сообщения"
                      onPress={() => router.push("/(tabs)/messages" as Parameters<typeof router.push>[0])}
                    />
                    <PrimaryButton
                      animatedPress
                      title="Голосовая заметка"
                      variant="outline"
                      onPress={() => router.push("/voice-note")}
                    />
                    <PrimaryButton
                      animatedPress
                      title="Черновики родителям"
                      variant="outline"
                      onPress={() => router.push("/parent-drafts")}
                    />
                  </>
                )}
              </View>
            </SectionCard>
          ) : filteredItems.length === 0 ? (
            <SectionCard elevated style={styles.listShellCard}>
              <Text style={styles.emptyTitle}>Ничего не подошло под фильтры</Text>
              <Text style={styles.emptyText}>
                Полный список из {items.length} {tasksWordBare(items.length)} доступен после сброса фильтров.
              </Text>
              <PrimaryButton
                animatedPress
                title="Сбросить фильтры"
                variant="outline"
                onPress={() => {
                  setPriorityFilter("all");
                  setStatusFilter("all");
                }}
                style={styles.emptyCta}
              />
            </SectionCard>
          ) : (
            <View style={styles.listOuter}>
              {attentionRows.length > 0 ? (
                <>
                  <GroupHeader
                    isFirst
                    title="Требуют внимания"
                    hint="Срочный слой — логично открыть первым."
                  />
                  {attentionRows.map((item, i) => (
                    <TaskCard
                      key={`${item.playerId}-attention`}
                      item={item}
                      showTopBorder={i > 0}
                      onOpen={() => router.push(`/player/${item.playerId}`)}
                    />
                  ))}
                </>
              ) : null}
              {slumpRows.length > 0 ? (
                <>
                  <GroupHeader
                    isFirst={attentionRows.length === 0}
                    title="В работе"
                    hint="Есть спад — продолжайте в карточке игрока."
                  />
                  {slumpRows.map((item, i) => (
                    <TaskCard
                      key={`${item.playerId}-slump`}
                      item={item}
                      showTopBorder={i > 0}
                      onOpen={() => router.push(`/player/${item.playerId}`)}
                    />
                  ))}
                </>
              ) : null}
              {reviewRows.length > 0 ? (
                <>
                  <GroupHeader
                    isFirst={attentionRows.length === 0 && slumpRows.length === 0}
                    title="На разборе"
                    hint="Без срочной метки — можно пройти позже."
                  />
                  {reviewRows.map((item, i) => (
                    <TaskCard
                      key={`${item.playerId}-review`}
                      item={item}
                      showTopBorder={i > 0}
                      onOpen={() => router.push(`/player/${item.playerId}`)}
                    />
                  ))}
                </>
              ) : null}
            </View>
          )}
        </View>
      </StaggerFadeIn>

      <View style={styles.bottomSpacer} />
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  content: {
    paddingBottom: theme.spacing.xxl,
  },
  section: {
    marginBottom: theme.spacing.xl,
  },
  summaryCard: {
    marginBottom: theme.spacing.lg,
    borderLeftWidth: 4,
    borderLeftColor: theme.colors.primary,
  },
  summaryKicker: {
    ...theme.typography.caption,
    color: theme.colors.textMuted,
    textTransform: "uppercase",
    letterSpacing: 0.55,
    marginBottom: theme.spacing.sm,
  },
  metricChipRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: theme.spacing.sm,
    marginBottom: theme.spacing.md,
  },
  metricChip: {
    paddingHorizontal: theme.spacing.sm,
    paddingVertical: 6,
    borderRadius: theme.borderRadius.full,
    backgroundColor: theme.colors.primaryMuted,
    borderWidth: 1,
    borderColor: theme.colors.cardBorder,
    maxWidth: "100%",
  },
  metricChipText: {
    fontSize: 12,
    fontWeight: "600",
    color: theme.colors.textSecondary,
  },
  summaryPrimary: {
    ...theme.typography.caption,
    color: theme.colors.textSecondary,
    lineHeight: 21,
  },
  summaryPrimaryAfterStats: {
    marginTop: theme.spacing.xs,
  },
  summarySecondary: {
    ...theme.typography.caption,
    color: theme.colors.textMuted,
    lineHeight: 20,
    marginTop: theme.spacing.sm,
  },
  summaryNextMuted: {
    ...theme.typography.caption,
    color: theme.colors.textMuted,
    lineHeight: 19,
    marginTop: theme.spacing.md,
    fontStyle: "italic",
  },
  controlsCard: {
    marginBottom: theme.spacing.lg,
    borderLeftWidth: 3,
    borderLeftColor: theme.colors.border,
  },
  controlsTitle: {
    ...theme.typography.caption,
    color: theme.colors.textMuted,
    textTransform: "uppercase",
    letterSpacing: 0.55,
    marginBottom: theme.spacing.xs,
  },
  controlsHint: {
    ...theme.typography.caption,
    color: theme.colors.textMuted,
    lineHeight: 19,
    marginBottom: theme.spacing.sm,
  },
  controlsHintMuted: {
    ...theme.typography.caption,
    color: theme.colors.textMuted,
    lineHeight: 19,
    marginBottom: theme.spacing.md,
    opacity: 0.95,
  },
  quickRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: theme.spacing.sm,
    marginBottom: theme.spacing.sm,
  },
  quickBtn: {
    flexGrow: 1,
    minWidth: 96,
  },
  controlsDivider: {
    height: 1,
    backgroundColor: theme.colors.border,
    marginVertical: theme.spacing.md,
    opacity: 0.8,
  },
  pillsRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: theme.spacing.sm,
    marginBottom: theme.spacing.sm,
  },
  pill: {
    borderWidth: 1,
    borderColor: theme.colors.border,
    backgroundColor: "transparent",
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: theme.borderRadius.full,
  },
  pillActive: {
    borderColor: theme.colors.primary,
    backgroundColor: theme.colors.primaryMuted,
  },
  pillText: { ...theme.typography.caption, color: theme.colors.textMuted },
  pillTextActive: { color: theme.colors.primary, fontWeight: "600" },
  resetBtn: { paddingVertical: 10, alignSelf: "flex-start" },
  resetBtnText: { fontSize: 12 },
  listOuter: {
    marginBottom: theme.spacing.md,
    gap: 0,
  },
  listShellCard: {
    borderLeftWidth: 4,
    borderLeftColor: theme.colors.warning,
  },
  groupHeader: {
    paddingTop: theme.spacing.sm,
    paddingBottom: theme.spacing.sm,
  },
  groupHeaderAfterPrevious: {
    marginTop: theme.spacing.lg,
    paddingTop: theme.spacing.md,
    borderTopWidth: 1,
    borderTopColor: theme.colors.border,
  },
  groupHeaderTitle: {
    ...theme.typography.caption,
    fontWeight: "700",
    color: theme.colors.text,
    textTransform: "uppercase",
    letterSpacing: 0.5,
    marginBottom: 4,
  },
  groupHeaderHint: {
    ...theme.typography.caption,
    color: theme.colors.textMuted,
    lineHeight: 18,
  },
  taskCardOuter: {
    marginBottom: theme.spacing.md,
    borderLeftWidth: 3,
    borderLeftColor: theme.colors.primary,
    overflow: "hidden",
  },
  taskCardMarginTop: {
    marginTop: theme.spacing.sm,
  },
  taskCardRow: {
    flexDirection: "row",
    alignItems: "stretch",
  },
  taskAccent: {
    width: 4,
    alignSelf: "stretch",
    backgroundColor: theme.colors.accent,
    opacity: 0.75,
  },
  taskAccentDanger: {
    backgroundColor: theme.colors.error,
    opacity: 0.85,
  },
  taskAccentWarning: {
    backgroundColor: theme.colors.warning,
    opacity: 0.8,
  },
  taskAccentInfo: {
    backgroundColor: theme.colors.accent,
    opacity: 0.65,
  },
  taskCardInner: {
    flex: 1,
    minWidth: 0,
    paddingVertical: theme.spacing.sm,
    paddingRight: theme.spacing.sm,
    paddingLeft: theme.spacing.sm,
  },
  taskCardPress: {
    marginBottom: theme.spacing.sm,
  },
  taskChips: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: theme.spacing.xs,
    alignItems: "center",
    marginBottom: theme.spacing.sm,
  },
  priorityPill: {
    paddingHorizontal: theme.spacing.sm,
    paddingVertical: 4,
    borderRadius: theme.borderRadius.sm,
    backgroundColor: theme.colors.surfaceElevated,
    borderWidth: 1,
    borderColor: theme.colors.border,
  },
  priorityPillDanger: {
    backgroundColor: theme.colors.primaryMuted,
    borderColor: theme.colors.cardBorder,
  },
  priorityPillText: {
    fontSize: 10,
    fontWeight: "700",
    letterSpacing: 0.35,
    color: theme.colors.textSecondary,
    textTransform: "uppercase",
  },
  priorityPillTextDanger: {
    color: theme.colors.primary,
  },
  sourcePill: {
    paddingHorizontal: theme.spacing.sm,
    paddingVertical: 4,
    borderRadius: theme.borderRadius.sm,
    backgroundColor: theme.colors.background,
    borderWidth: 1,
    borderColor: theme.colors.cardBorder,
  },
  sourcePillText: {
    fontSize: 10,
    fontWeight: "600",
    letterSpacing: 0.3,
    color: theme.colors.textMuted,
    textTransform: "uppercase",
  },
  taskSummary: {
    ...theme.typography.subtitle,
    fontSize: 16,
    lineHeight: 22,
    color: theme.colors.text,
    marginBottom: theme.spacing.sm,
  },
  playerRow: {
    marginBottom: theme.spacing.sm,
  },
  playerLabel: {
    fontSize: 10,
    fontWeight: "600",
    letterSpacing: 0.4,
    color: theme.colors.textMuted,
    textTransform: "uppercase",
    marginBottom: 2,
  },
  playerName: {
    ...theme.typography.body,
    color: theme.colors.textSecondary,
    fontWeight: "600",
  },
  taskMetaRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    alignItems: "center",
    gap: theme.spacing.sm,
  },
  flowBadge: {
    paddingHorizontal: theme.spacing.sm,
    paddingVertical: 4,
    borderRadius: theme.borderRadius.sm,
    backgroundColor: "rgba(245, 166, 35, 0.15)",
  },
  flowBadgeDanger: {
    backgroundColor: "rgba(255, 77, 106, 0.15)",
  },
  flowBadgeWarning: {
    backgroundColor: "rgba(245, 166, 35, 0.15)",
  },
  flowBadgeInfo: {
    backgroundColor: "rgba(74, 158, 255, 0.12)",
  },
  flowBadgeText: {
    fontSize: 11,
    fontWeight: "600",
    color: theme.colors.warning,
  },
  flowBadgeTextDanger: {
    color: theme.colors.error,
  },
  flowBadgeTextWarning: {
    color: theme.colors.warning,
  },
  flowBadgeTextInfo: {
    color: theme.colors.accent,
  },
  domainStatusMuted: {
    flex: 1,
    minWidth: 0,
    fontSize: 11,
    color: theme.colors.textMuted,
  },
  taskCtaRow: {
    flexDirection: "row",
    gap: theme.spacing.sm,
    alignItems: "center",
  },
  taskCtaPrimary: {
    flex: 1,
    alignSelf: "stretch",
  },
  emptyTitle: {
    ...theme.typography.subtitle,
    color: theme.colors.text,
    marginBottom: theme.spacing.xs,
  },
  emptyText: {
    ...theme.typography.caption,
    color: theme.colors.textMuted,
    marginBottom: theme.spacing.md,
    lineHeight: 20,
  },
  emptyCta: {
    alignSelf: "flex-start",
  },
  emptyCard: {
    borderLeftWidth: 4,
    borderLeftColor: theme.colors.border,
    position: "relative",
    overflow: "hidden",
  },
  emptyAccent: {
    position: "absolute",
    top: -18,
    right: -18,
    width: 88,
    height: 88,
    borderRadius: 44,
    backgroundColor: theme.colors.primaryMuted,
    opacity: 0.35,
  },
  emptyActions: {
    gap: theme.spacing.sm,
    alignSelf: "stretch",
  },
  errorCard: {
    borderLeftWidth: 4,
    borderLeftColor: theme.colors.accent,
  },
  errorHeading: {
    ...theme.typography.subtitle,
    color: theme.colors.text,
    marginBottom: theme.spacing.xs,
  },
  errorBody: {
    ...theme.typography.caption,
    color: theme.colors.textSecondary,
    lineHeight: 20,
    marginBottom: theme.spacing.sm,
  },
  errorDetail: {
    ...theme.typography.caption,
    color: theme.colors.textMuted,
    lineHeight: 19,
    marginBottom: theme.spacing.md,
  },
  errorRetry: {
    alignSelf: "flex-start",
  },
  bottomSpacer: {
    height: theme.spacing.xl,
  },
});
