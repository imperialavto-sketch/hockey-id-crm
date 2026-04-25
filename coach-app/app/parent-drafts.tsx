import React, { useState, useCallback, useMemo } from "react";
import { StyleSheet, Text, View, Alert } from "react-native";
import { useRouter, useFocusEffect } from "expo-router";
import * as Clipboard from "expo-clipboard";
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
import {
  getParentDrafts,
  type ParentDraftItem,
} from "@/lib/parentDraftHelpers";
import { isEndpointUnavailable, clearEndpointUnavailable, COACH_ENDPOINTS } from "@/lib/endpointAvailability";
import { isAuthRequiredError } from "@/lib/coachAuth";
import { theme } from "@/constants/theme";
import { hasParentDraftVoiceNoteLink, VOICE_PROVENANCE } from "@/lib/voiceProvenanceCopy";
import { LIVE_TRAINING_START_ROUTE } from "@/services/liveTrainingService";

const RECENT_DAYS = 7;

function pluralDraft(n: number): string {
  const m10 = n % 10;
  const m100 = n % 100;
  if (m10 === 1 && m100 !== 11) return "черновик";
  if (m10 >= 2 && m10 <= 4 && (m100 < 10 || m100 >= 20)) return "черновика";
  return "черновиков";
}

function draftsCountRu(n: number): string {
  return `${n} ${pluralDraft(n)}`;
}

function parseDraftDate(iso?: string | null): Date | null {
  if (!iso || typeof iso !== "string") return null;
  const d = new Date(iso);
  return Number.isNaN(d.getTime()) ? null : d;
}

function isWithinRecentDays(d: Date, days: number): boolean {
  const now = Date.now();
  const ms = days * 24 * 60 * 60 * 1000;
  return now - d.getTime() <= ms && d.getTime() <= now;
}

function formatDraftWhen(iso?: string | null): string | null {
  const d = parseDraftDate(iso);
  if (!d) return null;
  const now = new Date();
  const sameDay =
    d.getFullYear() === now.getFullYear() &&
    d.getMonth() === now.getMonth() &&
    d.getDate() === now.getDate();
  if (sameDay) {
    return `Сегодня, ${d.toLocaleTimeString("ru-RU", { hour: "2-digit", minute: "2-digit" })}`;
  }
  return d.toLocaleString("ru-RU", {
    day: "numeric",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function sourceLabel(source: ParentDraftItem["source"]): string | null {
  if (source === "session_draft") return "Контекст: тренировка / сессия";
  if (source === "parent_draft") return "Сообщение родителю";
  return null;
}

type DraftSummary = {
  total: number;
  missingPlayer: number;
  withPlayer: number;
  recentWithDate: number;
  hasAnyUpdatedAt: boolean;
};

function computeDraftSummary(drafts: ParentDraftItem[]): DraftSummary {
  const missingPlayer = drafts.filter((d) => !d.playerId).length;
  const withPlayer = drafts.length - missingPlayer;
  const hasAnyUpdatedAt = drafts.some((d) => parseDraftDate(d.updatedAt));
  const recentWithDate = drafts.filter((d) => {
    if (!d.playerId) return false;
    const dt = parseDraftDate(d.updatedAt);
    return dt ? isWithinRecentDays(dt, RECENT_DAYS) : false;
  }).length;
  return {
    total: drafts.length,
    missingPlayer,
    withPlayer,
    recentWithDate,
    hasAnyUpdatedAt,
  };
}

function buildSummaryLines(
  stats: DraftSummary
): { primary: string; secondary: string | null } {
  if (stats.total === 0) {
    return {
      primary:
        "Здесь появляются тексты для родителей — из голосовых заметок, тренировочного потока и сценариев после наблюдений.",
      secondary: null,
    };
  }

  const parts: string[] = [`Всего ${draftsCountRu(stats.total)}.`];
  if (stats.withPlayer === stats.total && stats.total > 0) {
    parts.push("Все можно открыть для отправки родителю из карточки игрока.");
  } else if (stats.withPlayer > 0) {
    parts.push(
      `${draftsCountRu(stats.withPlayer)} можно открыть для отправки родителю из карточки игрока.`
    );
  }
  if (stats.missingPlayer > 0) {
    parts.push(
      `${draftsCountRu(stats.missingPlayer)} без привязки к игроку — отправка из карточки недоступна, копирование работает.`
    );
  }
  const primary = parts.join(" ");

  let secondary: string | null = null;
  if (stats.hasAnyUpdatedAt && stats.recentWithDate > 0) {
    secondary = `Недавно обновлялись (до ${RECENT_DAYS} дн.): ${stats.recentWithDate}.`;
  } else if (stats.missingPlayer === 0 && stats.withPlayer === stats.total) {
    secondary = "Все черновики привязаны к игрокам — доступен поток «открыть → проверить → отправить».";
  }

  return { primary, secondary };
}

function buildNextStepHint(stats: DraftSummary): string | null {
  if (stats.total === 0) return null;
  if (stats.missingPlayer > 0) {
    return "Следующий шаг: разберите черновики без игрока — скопируйте текст или обновите список позже.";
  }
  return "Следующий шаг: откройте черновик сверху, проверьте формулировки и перейдите к отправке.";
}

function DraftsErrorCard({ message, onRetry }: { message: string; onRetry: () => void }) {
  return (
    <SectionCard elevated style={styles.errorCard}>
      <Text style={styles.errorHeading}>Список сейчас не загрузился</Text>
      <Text style={styles.errorBody}>
        Черновики на сервере сохранены. Проверьте сеть или попробуйте ещё раз чуть позже.
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

function SummaryStatChip({ label }: { label: string }) {
  return (
    <View style={styles.statChip}>
      <Text style={styles.statChipText} numberOfLines={2}>
        {label}
      </Text>
    </View>
  );
}

function DraftGroupHeader({ title, hint, isFirst }: { title: string; hint?: string; isFirst?: boolean }) {
  return (
    <View style={[styles.groupHeader, !isFirst && styles.groupHeaderAfterPrevious]}>
      <Text style={styles.groupTitle}>{title}</Text>
      {hint ? (
        <Text style={styles.groupHint} numberOfLines={3}>
          {hint}
        </Text>
      ) : null}
    </View>
  );
}

function sortDraftsInGroup(items: ParentDraftItem[]): ParentDraftItem[] {
  return [...items].sort((a, b) => {
    const ad = parseDraftDate(a.updatedAt);
    const bd = parseDraftDate(b.updatedAt);
    if (ad && bd && ad.getTime() !== bd.getTime()) return bd.getTime() - ad.getTime();
    if (ad && !bd) return -1;
    if (!ad && bd) return 1;
    return a.playerName.localeCompare(b.playerName, "ru");
  });
}

function partitionDrafts(drafts: ParentDraftItem[]): {
  attention: ParentDraftItem[];
  recent: ParentDraftItem[];
  rest: ParentDraftItem[];
  hasAnyUpdatedAt: boolean;
} {
  const attention = sortDraftsInGroup(drafts.filter((d) => !d.playerId));
  const withPlayer = drafts.filter((d) => d.playerId);
  const hasAnyUpdatedAt = withPlayer.some((d) => parseDraftDate(d.updatedAt));

  if (!hasAnyUpdatedAt) {
    return {
      attention,
      recent: [],
      rest: sortDraftsInGroup(withPlayer),
      hasAnyUpdatedAt: false,
    };
  }

  const recent: ParentDraftItem[] = [];
  const rest: ParentDraftItem[] = [];
  for (const d of withPlayer) {
    const dt = parseDraftDate(d.updatedAt);
    if (dt && isWithinRecentDays(dt, RECENT_DAYS)) recent.push(d);
    else rest.push(d);
  }
  return {
    attention,
    recent: sortDraftsInGroup(recent),
    rest: sortDraftsInGroup(rest),
    hasAnyUpdatedAt: true,
  };
}

function DraftRow({
  item,
  onOpenShare,
  onCopy,
  onOpenPlayer,
  onOpenReport,
  copiedId,
  showTopBorder,
}: {
  item: ParentDraftItem;
  onOpenShare: () => void;
  onCopy: () => void;
  onOpenPlayer: () => void;
  onOpenReport: () => void;
  copiedId: string | null;
  showTopBorder: boolean;
}) {
  const isCopied = copiedId === item.id;
  const needsPlayer = !item.playerId;
  const preview =
    item.message?.trim() || "Текст можно открыть в карточке отправки или скопировать целиком.";
  const msgLen = item.message?.trim().length ?? 0;
  const when = formatDraftWhen(item.updatedAt);
  const ctx = sourceLabel(item.source);
  const showVoiceNoteProvenance = hasParentDraftVoiceNoteLink(item.source, item.voiceNoteId);

  const metaBits: string[] = [];
  if (when) metaBits.push(when);
  if (msgLen > 0) metaBits.push(`~${msgLen} симв.`);

  return (
    <View style={[styles.row, showTopBorder && styles.rowBorder]}>
      <View style={[styles.rowAccent, needsPlayer ? styles.rowAccentAttention : styles.rowAccentOk]} />
      <View style={styles.rowInner}>
        <View style={styles.rowMain}>
          <View style={styles.rowTopRow}>
            <Text style={styles.rowKicker} numberOfLines={1}>
              Черновик
            </Text>
            <View style={styles.rowTopTrailing}>
              {showVoiceNoteProvenance ? (
                <Text
                  style={styles.provenancePill}
                  accessibilityLabel={VOICE_PROVENANCE.DETAIL_DESCRIPTION}
                >
                  {VOICE_PROVENANCE.PILL_LABEL}
                </Text>
              ) : null}
              {needsPlayer ? (
                <View style={styles.attentionPill}>
                  <Text style={styles.attentionPillText}>Нужен игрок</Text>
                </View>
              ) : null}
            </View>
          </View>
          <Text style={styles.rowName} numberOfLines={2}>
            {item.playerName.trim() || "Игрок"}
          </Text>
          {ctx ? (
            <Text style={styles.rowContext} numberOfLines={2}>
              {ctx}
            </Text>
          ) : null}
          {metaBits.length > 0 ? (
            <Text style={styles.rowMeta} numberOfLines={2}>
              {metaBits.join(" · ")}
            </Text>
          ) : null}
          <Text style={styles.rowPreview} numberOfLines={4}>
            {preview}
          </Text>
          <Text style={styles.rowFlowHint} numberOfLines={3}>
            {needsPlayer
              ? "Привязка к игроку появится после обновления данных. Пока — только копирование."
              : "Карточка отправки откроет текст и поможет перейти к диалогу с родителем."}
          </Text>

          {item.playerId ? (
            <View style={styles.linkRow}>
              <PressableFeedback onPress={onOpenPlayer} style={styles.linkHit}>
                <Text style={styles.linkText} numberOfLines={1}>
                  Профиль игрока
                </Text>
              </PressableFeedback>
              <Text style={styles.linkSep}>·</Text>
              <PressableFeedback onPress={onOpenReport} style={styles.linkHit}>
                <Text style={styles.linkText} numberOfLines={1}>
                  Отчёт
                </Text>
              </PressableFeedback>
            </View>
          ) : null}

          <View style={styles.rowActions}>
            <PrimaryButton
              animatedPress
              title={item.playerId ? "К отправке" : "Нет игрока"}
              variant={item.playerId ? "primary" : "outline"}
              onPress={onOpenShare}
              disabled={!item.playerId}
              style={
                !item.playerId
                  ? { ...styles.rowBtnPrimary, ...styles.rowBtnDisabled }
                  : styles.rowBtnPrimary
              }
            />
            <PrimaryButton
              animatedPress
              title={isCopied ? "Скопировано" : "Копировать"}
              variant="outline"
              onPress={onCopy}
              disabled={isCopied}
              style={styles.rowBtnSecondary}
            />
          </View>
        </View>
      </View>
    </View>
  );
}

const EYEBROW = "Родителям";
const SCREEN_TITLE = "Черновики ответов";
const HERO_SUBTITLE_LOADED =
  "Центр черновиков: проверка текста, переход к игроку, отчёту и отправке родителю.";
const HERO_SUBTITLE_ERROR =
  "Когда список снова откроется, здесь появятся сохранённые черновики сообщений для родителей.";

export default function ParentDraftsScreen() {
  const router = useRouter();
  const [drafts, setDrafts] = useState<ParentDraftItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadedOnce, setLoadedOnce] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [copiedId, setCopiedId] = useState<string | null>(null);

  const fetchDrafts = useCallback((opts?: { silent?: boolean }) => {
    const silent = opts?.silent === true;
    if (!silent) setLoading(true);
    setError(null);
    return getParentDrafts()
      .then((data) => {
        setDrafts(data);
        setError(null);
        setLoadedOnce(true);
      })
      .catch((err) => {
        setDrafts([]);
        setError(
          isAuthRequiredError(err)
            ? "Нужна авторизация в приложении."
            : "Не удалось получить черновики."
        );
      })
      .finally(() => setLoading(false));
  }, []);

  useFocusEffect(useCallback(() => {
    void fetchDrafts({ silent: loadedOnce });
  }, [fetchDrafts, loadedOnce]));

  const handleCopy = async (item: ParentDraftItem) => {
    try {
      await Clipboard.setStringAsync(item.message);
      setCopiedId(item.id);
      setTimeout(() => setCopiedId(null), 2000);
    } catch {
      Alert.alert("Не получилось скопировать", "Попробуйте ещё раз чуть позже.");
    }
  };

  const dateLabel = formatCoachListContextDate();

  const sortedDrafts = useMemo(() => {
    return [...drafts].sort((a, b) => {
      const aMiss = a.playerId ? 1 : 0;
      const bMiss = b.playerId ? 1 : 0;
      if (aMiss !== bMiss) return aMiss - bMiss;
      const ad = parseDraftDate(a.updatedAt);
      const bd = parseDraftDate(b.updatedAt);
      if (ad && bd) return bd.getTime() - ad.getTime();
      if (ad && !bd) return -1;
      if (!ad && bd) return 1;
      return a.playerName.localeCompare(b.playerName, "ru");
    });
  }, [drafts]);

  const groups = useMemo(() => partitionDrafts(sortedDrafts), [sortedDrafts]);

  const summaryStats = useMemo(() => computeDraftSummary(drafts), [drafts]);
  const summaryLines = useMemo(() => buildSummaryLines(summaryStats), [summaryStats]);
  const nextStepHint = useMemo(() => buildNextStepHint(summaryStats), [summaryStats]);

  const statChips = useMemo(() => {
    if (drafts.length === 0) return [];
    const chips: string[] = [`Всего: ${drafts.length}`];
    if (summaryStats.missingPlayer > 0) {
      chips.push(`Внимание: ${summaryStats.missingPlayer}`);
    }
    if (summaryStats.hasAnyUpdatedAt && summaryStats.recentWithDate > 0) {
      chips.push(`Недавние: ${summaryStats.recentWithDate}`);
    }
    if (summaryStats.withPlayer > 0 && summaryStats.missingPlayer > 0) {
      chips.push(`К отправке: ${summaryStats.withPlayer}`);
    }
    return chips;
  }, [drafts.length, summaryStats]);

  const countLabel =
    drafts.length > 0 ? draftsCountRu(drafts.length) : "Очередь пуста";

  if (loading) {
    return (
      <ScreenContainer contentContainerStyle={styles.content}>
        <StaggerFadeIn preset="snappy" delay={0}>
          <CoachListHero
            eyebrow={EYEBROW}
            title={SCREEN_TITLE}
            dateLabel={dateLabel}
            countLabel="Загрузка…"
            subtitle="Подтягиваем список черновиков для родителей."
          />
        </StaggerFadeIn>
        <StaggerFadeIn preset="snappy" delay={14}>
          <CoachListSkeletonCard />
        </StaggerFadeIn>
        <StaggerFadeIn preset="snappy" delay={22}>
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
          <DraftsErrorCard message={error} onRetry={() => void fetchDrafts()} />
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
          {statChips.length > 0 ? (
            <View style={styles.statRow}>
              {statChips.map((c) => (
                <SummaryStatChip key={c} label={c} />
              ))}
            </View>
          ) : null}
          <Text style={styles.summaryPrimary}>{summaryLines.primary}</Text>
          {summaryLines.secondary ? (
            <Text style={styles.summarySecondary}>{summaryLines.secondary}</Text>
          ) : null}
          {drafts.length > 0 && nextStepHint ? (
            <Text style={styles.summaryNext}>{nextStepHint}</Text>
          ) : null}
        </SectionCard>
      </StaggerFadeIn>

      <StaggerFadeIn preset="snappy" delay={14}>
        <View style={styles.section}>
          {drafts.length === 0 ? (
            <SectionCard elevated style={styles.listCard}>
              <View style={styles.emptyAccent} />
              <Text style={styles.emptyTitle}>
                {isEndpointUnavailable(COACH_ENDPOINTS.PARENT_DRAFTS)
                  ? "Раздел пока настраивается"
                  : "Черновиков пока нет"}
              </Text>
              <Text style={styles.emptyText}>
                {isEndpointUnavailable(COACH_ENDPOINTS.PARENT_DRAFTS)
                  ? "Когда данные будут доступны, здесь появятся подготовленные ответы родителям."
                  : "Тексты появляются, когда вы фиксируете наблюдения и follow-up: голосовая заметка, тренировочный поток, сценарии после сессии. Отчёты и переписка с родителями остаются в своих разделах — черновик подтянется сюда, когда система его сохранит."}
              </Text>
              <View style={styles.emptyActions}>
                {isEndpointUnavailable(COACH_ENDPOINTS.PARENT_DRAFTS) ? (
                  <PrimaryButton
                    animatedPress
                    title="Проверить снова"
                    variant="outline"
                    onPress={() => {
                      clearEndpointUnavailable(COACH_ENDPOINTS.PARENT_DRAFTS);
                      void fetchDrafts();
                    }}
                  />
                ) : (
                  <>
                    <PrimaryButton
                      animatedPress
                      title="Голосовая заметка"
                      onPress={() => router.push("/voice-note")}
                    />
                    <PrimaryButton
                      animatedPress
                      title="Сообщения"
                      variant="outline"
                      onPress={() => router.push("/(tabs)/messages")}
                    />
                    <PrimaryButton
                      animatedPress
                      title="Живая тренировка (Arena)"
                      variant="outline"
                      onPress={() =>
                        router.push(LIVE_TRAINING_START_ROUTE as Parameters<typeof router.push>[0])
                      }
                    />
                  </>
                )}
              </View>
            </SectionCard>
          ) : (
            <>
              <SectionCard elevated style={styles.quickCard}>
                <Text style={styles.quickTitle}>Добавить черновики</Text>
                <Text style={styles.quickHint}>
                  Те же сценарии, из которых появляются тексты для родителей.
                </Text>
                <View style={styles.quickRow}>
                  <PrimaryButton
                    animatedPress
                    title="Голосовая заметка"
                    variant="outline"
                    onPress={() => router.push("/voice-note")}
                    style={styles.quickBtn}
                  />
                  <PrimaryButton
                    animatedPress
                    title="Сообщения"
                    variant="outline"
                    onPress={() => router.push("/(tabs)/messages")}
                    style={styles.quickBtn}
                  />
                  <PrimaryButton
                    animatedPress
                    title="Живая тренировка (Arena)"
                    variant="outline"
                    onPress={() =>
                      router.push(LIVE_TRAINING_START_ROUTE as Parameters<typeof router.push>[0])
                    }
                    style={styles.quickBtn}
                  />
                </View>
              </SectionCard>

              <SectionCard elevated style={styles.listCard}>
                {groups.attention.length > 0 ? (
                  <>
                    <DraftGroupHeader
                      isFirst
                      title="Требуют внимания"
                      hint="Нет привязки к игроку — обновите список позже или скопируйте текст."
                    />
                    {groups.attention.map((item, i) => (
                      <DraftRow
                        key={item.id}
                        item={item}
                        showTopBorder={i > 0}
                        onOpenShare={() => {
                          if (!item.playerId) return;
                          router.push(`/player/${item.playerId}/share-report`);
                        }}
                        onCopy={() => handleCopy(item)}
                        onOpenPlayer={() => {
                          if (!item.playerId) return;
                          router.push(`/player/${item.playerId}`);
                        }}
                        onOpenReport={() => {
                          if (!item.playerId) return;
                          router.push(`/player/${item.playerId}/report`);
                        }}
                        copiedId={copiedId}
                      />
                    ))}
                  </>
                ) : null}

                {groups.recent.length > 0 && groups.hasAnyUpdatedAt ? (
                  <>
                    <DraftGroupHeader
                      isFirst={groups.attention.length === 0}
                      title="Недавние"
                      hint={`Обновлялись за последние ${RECENT_DAYS} дней (если дата пришла с сервера).`}
                    />
                    {groups.recent.map((item, i) => (
                      <DraftRow
                        key={item.id}
                        item={item}
                        showTopBorder={i > 0}
                        onOpenShare={() => {
                          if (!item.playerId) return;
                          router.push(`/player/${item.playerId}/share-report`);
                        }}
                        onCopy={() => handleCopy(item)}
                        onOpenPlayer={() => {
                          if (!item.playerId) return;
                          router.push(`/player/${item.playerId}`);
                        }}
                        onOpenReport={() => {
                          if (!item.playerId) return;
                          router.push(`/player/${item.playerId}/report`);
                        }}
                        copiedId={copiedId}
                      />
                    ))}
                  </>
                ) : null}

                {groups.rest.length > 0 ? (
                  <>
                    <DraftGroupHeader
                      isFirst={groups.attention.length === 0 && groups.recent.length === 0}
                      title={
                        groups.attention.length > 0 || groups.recent.length > 0 ? "Остальные" : "Все черновики"
                      }
                      hint={
                        groups.recent.length > 0 || groups.attention.length > 0
                          ? undefined
                          : "Сортировка: сначала без игрока, затем по дате обновления или имени."
                      }
                    />
                    {groups.rest.map((item, i) => (
                      <DraftRow
                        key={item.id}
                        item={item}
                        showTopBorder={i > 0}
                        onOpenShare={() => {
                          if (!item.playerId) return;
                          router.push(`/player/${item.playerId}/share-report`);
                        }}
                        onCopy={() => handleCopy(item)}
                        onOpenPlayer={() => {
                          if (!item.playerId) return;
                          router.push(`/player/${item.playerId}`);
                        }}
                        onOpenReport={() => {
                          if (!item.playerId) return;
                          router.push(`/player/${item.playerId}/report`);
                        }}
                        copiedId={copiedId}
                      />
                    ))}
                  </>
                ) : null}
              </SectionCard>
            </>
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
  statRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: theme.spacing.sm,
    marginBottom: theme.spacing.md,
  },
  statChip: {
    paddingHorizontal: theme.spacing.sm,
    paddingVertical: 6,
    borderRadius: theme.borderRadius.full,
    backgroundColor: theme.colors.primaryMuted,
    borderWidth: 1,
    borderColor: theme.colors.cardBorder,
    maxWidth: "100%",
  },
  statChipText: {
    fontSize: 12,
    fontWeight: "600",
    color: theme.colors.textSecondary,
  },
  summaryPrimary: {
    ...theme.typography.caption,
    color: theme.colors.textSecondary,
    lineHeight: 21,
  },
  summarySecondary: {
    ...theme.typography.caption,
    color: theme.colors.textMuted,
    lineHeight: 20,
    marginTop: theme.spacing.sm,
  },
  summaryNext: {
    ...theme.typography.caption,
    color: theme.colors.textSecondary,
    fontWeight: "600",
    lineHeight: 20,
    marginTop: theme.spacing.md,
  },
  groupHeader: {
    paddingTop: theme.spacing.sm,
    paddingBottom: theme.spacing.sm,
    paddingHorizontal: 0,
  },
  groupHeaderAfterPrevious: {
    marginTop: theme.spacing.md,
    paddingTop: theme.spacing.md,
    borderTopWidth: 1,
    borderTopColor: theme.colors.border,
  },
  groupTitle: {
    ...theme.typography.caption,
    fontWeight: "700",
    color: theme.colors.text,
    textTransform: "uppercase",
    letterSpacing: 0.5,
    marginBottom: 4,
  },
  groupHint: {
    ...theme.typography.caption,
    color: theme.colors.textMuted,
    lineHeight: 18,
  },
  quickCard: {
    marginBottom: theme.spacing.lg,
    borderLeftWidth: 3,
    borderLeftColor: theme.colors.border,
  },
  quickTitle: {
    ...theme.typography.caption,
    color: theme.colors.textMuted,
    textTransform: "uppercase",
    letterSpacing: 0.55,
    marginBottom: theme.spacing.xs,
  },
  quickHint: {
    ...theme.typography.caption,
    color: theme.colors.textMuted,
    lineHeight: 19,
    marginBottom: theme.spacing.sm,
  },
  quickRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: theme.spacing.sm,
  },
  quickBtn: {
    flexGrow: 1,
    minWidth: 120,
  },
  listCard: {
    borderLeftWidth: 4,
    borderLeftColor: theme.colors.accent,
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
  row: {
    flexDirection: "row",
    alignItems: "stretch",
    paddingVertical: theme.spacing.md,
  },
  rowBorder: {
    borderTopWidth: 1,
    borderTopColor: theme.colors.border,
  },
  rowAccent: {
    width: 3,
    borderRadius: 2,
    marginRight: theme.spacing.sm,
    alignSelf: "stretch",
  },
  rowAccentOk: {
    backgroundColor: theme.colors.primary,
    opacity: 0.55,
  },
  rowAccentAttention: {
    backgroundColor: theme.colors.warning,
  },
  rowInner: {
    flex: 1,
    minWidth: 0,
  },
  rowMain: {
    flex: 1,
    minWidth: 0,
  },
  rowTopRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: theme.spacing.sm,
    marginBottom: 4,
  },
  rowTopTrailing: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    flexShrink: 0,
  },
  provenancePill: {
    fontSize: 10,
    fontWeight: "700",
    letterSpacing: 0.4,
    textTransform: "uppercase",
    color: theme.colors.accent,
    backgroundColor: theme.colors.accentMuted,
    paddingVertical: 3,
    paddingHorizontal: 7,
    borderRadius: 6,
    overflow: "hidden",
  },
  rowKicker: {
    fontSize: 11,
    fontWeight: "600",
    letterSpacing: 0.4,
    color: theme.colors.textMuted,
    textTransform: "uppercase",
    flex: 1,
    minWidth: 0,
  },
  attentionPill: {
    paddingHorizontal: theme.spacing.sm,
    paddingVertical: 3,
    borderRadius: theme.borderRadius.full,
    backgroundColor: theme.colors.accentMuted,
    borderWidth: 1,
    borderColor: theme.colors.cardBorder,
    flexShrink: 0,
  },
  attentionPillText: {
    fontSize: 11,
    fontWeight: "600",
    color: theme.colors.textSecondary,
  },
  rowName: {
    ...theme.typography.subtitle,
    color: theme.colors.text,
    marginBottom: 4,
  },
  rowContext: {
    ...theme.typography.caption,
    color: theme.colors.textMuted,
    marginBottom: 4,
    lineHeight: 18,
  },
  rowMeta: {
    ...theme.typography.caption,
    fontSize: 12,
    color: theme.colors.textMuted,
    marginBottom: theme.spacing.xs,
  },
  rowPreview: {
    ...theme.typography.body,
    fontSize: 14,
    color: theme.colors.textSecondary,
    lineHeight: 21,
  },
  rowFlowHint: {
    ...theme.typography.caption,
    color: theme.colors.textMuted,
    marginTop: theme.spacing.sm,
    lineHeight: 19,
  },
  linkRow: {
    flexDirection: "row",
    alignItems: "center",
    flexWrap: "wrap",
    gap: 4,
    marginTop: theme.spacing.sm,
  },
  linkHit: {
    paddingVertical: 4,
    paddingHorizontal: 2,
    minHeight: 32,
    justifyContent: "center",
    maxWidth: "100%",
  },
  linkText: {
    fontSize: 13,
    fontWeight: "600",
    color: theme.colors.accent,
  },
  linkSep: {
    fontSize: 13,
    color: theme.colors.textMuted,
    paddingHorizontal: 2,
  },
  rowActions: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: theme.spacing.sm,
    marginTop: theme.spacing.md,
    alignItems: "stretch",
  },
  rowBtnPrimary: {
    flexGrow: 1,
    minWidth: 120,
  },
  rowBtnSecondary: {
    flexGrow: 1,
    minWidth: 120,
  },
  rowBtnDisabled: {
    opacity: 0.65,
  },
  bottomSpacer: {
    height: theme.spacing.xl,
  },
});
