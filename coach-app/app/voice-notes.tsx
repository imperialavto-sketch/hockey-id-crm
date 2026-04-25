import React, { useCallback, useMemo, useState } from "react";
import {
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { useFocusEffect, useRouter } from "expo-router";
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
import { theme } from "@/constants/theme";
import { formatVoiceDateTimeCompactRu } from "@/lib/voiceMvp";
import { voiceListRowSignal } from "@/lib/voicePipeline/uiHelpers";
import { getVoiceNotes, type VoiceNoteListItem } from "@/services/voiceNotesService";
import { LIVE_TRAINING_START_ROUTE } from "@/services/liveTrainingService";

type PlayerFilter = "all" | "with_player" | "without_player";
type AudioFilter = "all" | "with_audio" | "without_audio";

function voiceItemsCountRu(n: number): string {
  const m10 = n % 10;
  const m100 = n % 100;
  if (m10 === 1 && m100 !== 11) return `${n} заметка`;
  if (m10 >= 2 && m10 <= 4 && (m100 < 10 || m100 >= 20)) return `${n} заметки`;
  return `${n} заметок`;
}

function voiceItemsWordBare(n: number): string {
  const m10 = n % 10;
  const m100 = n % 100;
  if (m10 === 1 && m100 !== 11) return "заметка";
  if (m10 >= 2 && m10 <= 4 && (m100 < 10 || m100 >= 20)) return "заметки";
  return "заметок";
}

function normalizeForSearch(value: string): string {
  return value.toLowerCase().replace(/\s+/g, " ").trim();
}

function matchesQuery(item: VoiceNoteListItem, query: string): boolean {
  const q = normalizeForSearch(query);
  if (!q) return true;
  const hay = normalizeForSearch(
    [
      item.summary ?? "",
      item.transcriptPreview ?? "",
      item.playerName ?? "",
      item.audioFileName ?? "",
    ].join(" · ")
  );
  return hay.includes(q);
}

function applyPlayerFilter(item: VoiceNoteListItem, f: PlayerFilter): boolean {
  if (f === "all") return true;
  const hasPlayer = !!item.playerId;
  return f === "with_player" ? hasPlayer : !hasPlayer;
}

function applyAudioFilter(item: VoiceNoteListItem, f: AudioFilter): boolean {
  if (f === "all") return true;
  const hasAudio = !!item.audioFileName || !!item.uploadId;
  return f === "with_audio" ? hasAudio : !hasAudio;
}

type VoiceArchiveStats = {
  total: number;
  withoutPlayer: number;
  processing: number;
  failed: number;
};

function computeVoiceArchiveStats(items: VoiceNoteListItem[]): VoiceArchiveStats {
  let withoutPlayer = 0;
  let processing = 0;
  let failed = 0;
  for (const it of items) {
    if (!it.playerId) withoutPlayer++;
    const s = voiceListRowSignal(it);
    if (s?.tone === "active") processing++;
    if (s?.tone === "warn") failed++;
  }
  return { total: items.length, withoutPlayer, processing, failed };
}

function buildSummaryLines(params: {
  stats: VoiceArchiveStats;
  visibleCount: number;
  hasActiveControls: boolean;
}): { primary: string; secondary: string | null } {
  const { stats, visibleCount, hasActiveControls } = params;

  if (stats.total === 0) {
    return {
      primary:
        "Здесь будет архив голосовых материалов: сохранённые записи, расшифровки и резюме после голосовых сценариев тренера.",
      secondary: null,
    };
  }

  let primary = `В архиве ${voiceItemsCountRu(stats.total)} — всё на сервере, открывается в режиме просмотра.`;
  if (hasActiveControls) {
    primary = `${voiceItemsCountRu(stats.total)} в архиве; по фильтрам сейчас видно ${visibleCount} ${voiceItemsWordBare(visibleCount)}.`;
  }

  const parts: string[] = [];
  if (stats.failed > 0) {
    parts.push(
      stats.failed === 1
        ? "1 со сбоем обработки — загляните внутрь или повторите позже."
        : `${stats.failed} со сбоем обработки.`
    );
  }
  if (stats.processing > 0) {
    parts.push(
      stats.processing === 1
        ? "1 ещё обрабатывается."
        : `${stats.processing} ещё в обработке.`
    );
  }
  if (stats.withoutPlayer > 0) {
    parts.push(
      stats.withoutPlayer === 1
        ? "1 без привязки к игроку."
        : `${stats.withoutPlayer} без привязки к игроку.`
    );
  }

  const secondary = parts.length > 0 ? parts.join(" ") : "Все записи в обычном состоянии — можно просматривать по списку.";

  return { primary, secondary: hasActiveControls && parts.length === 0 ? null : secondary };
}

function buildNextStepHint(stats: VoiceArchiveStats): string | null {
  if (stats.total === 0) return null;
  if (stats.failed > 0) return "Следующий шаг: откройте заметку со сбоем — проверьте статус или попробуйте позже.";
  if (stats.processing > 0) return "Следующий шаг: дождитесь обработки или откройте заметку — часть данных уже может быть доступна.";
  if (stats.withoutPlayer > 0) return "Следующий шаг: при необходимости уточните привязку к игроку в карточке заметки.";
  return "Следующий шаг: откройте последнюю запись сверху или воспользуйтесь поиском.";
}

function sortVoiceNotesForArchive(items: VoiceNoteListItem[]): VoiceNoteListItem[] {
  return [...items].sort((a, b) => {
    const sa = voiceListRowSignal(a);
    const sb = voiceListRowSignal(b);
    const rank = (s: ReturnType<typeof voiceListRowSignal>) => {
      if (s?.tone === "warn") return 0;
      if (s?.tone === "active") return 1;
      return 2;
    };
    const d = rank(sa) - rank(sb);
    if (d !== 0) return d;
    const ta = new Date(a.createdAt).getTime();
    const tb = new Date(b.createdAt).getTime();
    return tb - ta;
  });
}

type VoiceNoteTimeBucket = "today" | "this_week" | "earlier";

function startOfLocalDay(d: Date): Date {
  const x = new Date(d.getTime());
  x.setHours(0, 0, 0, 0);
  return x;
}

function isSameLocalDay(a: Date, b: Date): boolean {
  return (
    a.getFullYear() === b.getFullYear() &&
    a.getMonth() === b.getMonth() &&
    a.getDate() === b.getDate()
  );
}

/** Понедельник как начало недели (привычно для RU). */
function startOfLocalWeek(d: Date): Date {
  const x = startOfLocalDay(d);
  const day = x.getDay();
  const offsetMonday = day === 0 ? -6 : 1 - day;
  x.setDate(x.getDate() + offsetMonday);
  return x;
}

function voiceNoteTimeBucket(createdAtIso: string, now: Date): VoiceNoteTimeBucket {
  const created = new Date(createdAtIso);
  if (Number.isNaN(created.getTime())) return "earlier";

  if (isSameLocalDay(created, now)) return "today";

  const weekStart = startOfLocalWeek(now);
  const createdDay = startOfLocalDay(created);
  if (createdDay >= weekStart) return "this_week";

  return "earlier";
}

/** Сохраняет порядок элементов внутри каждой группы (вход уже отсортирован). Пустые группы не возвращаются. */
function groupVoiceNotesByTime(
  items: VoiceNoteListItem[],
  now: Date = new Date()
): { key: VoiceNoteTimeBucket; title: string; items: VoiceNoteListItem[] }[] {
  const today: VoiceNoteListItem[] = [];
  const thisWeek: VoiceNoteListItem[] = [];
  const earlier: VoiceNoteListItem[] = [];

  for (const it of items) {
    const b = voiceNoteTimeBucket(it.createdAt, now);
    if (b === "today") today.push(it);
    else if (b === "this_week") thisWeek.push(it);
    else earlier.push(it);
  }

  const out: { key: VoiceNoteTimeBucket; title: string; items: VoiceNoteListItem[] }[] = [];
  if (today.length > 0) out.push({ key: "today", title: "Сегодня", items: today });
  if (thisWeek.length > 0)
    out.push({ key: "this_week", title: "На этой неделе", items: thisWeek });
  if (earlier.length > 0) out.push({ key: "earlier", title: "Ранее", items: earlier });
  return out;
}

function VoiceNotesErrorCard({ message, onRetry }: { message: string; onRetry: () => void }) {
  return (
    <SectionCard elevated style={styles.errorCard}>
      <Text style={styles.errorHeading}>Не получилось загрузить архив</Text>
      <Text style={styles.errorBody}>
        Список временно недоступен — ваши заметки на сервере не пропали. Достаточно обновить экран чуть позже.
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
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [
        styles.pill,
        active && styles.pillActive,
        pressed && styles.pillPressed,
      ]}
    >
      <Text style={[styles.pillText, active && styles.pillTextActive]}>{label}</Text>
    </Pressable>
  );
}

function VoiceNoteRow({
  item,
  onOpen,
  showTopBorder,
}: {
  item: VoiceNoteListItem;
  onOpen: () => void;
  showTopBorder: boolean;
}) {
  const signal = voiceListRowSignal(item);
  const title = item.summary?.trim() || item.transcriptPreview?.trim() || "Голосовая заметка";
  const previewText =
    item.transcriptPreview?.trim() ||
    (item.summary?.trim() ? `Резюме: ${item.summary.trim()}` : "Текст откроется в карточке заметки.");

  const accentWarn = signal?.tone === "warn";
  const accentActive = signal?.tone === "active";
  const showAiMeta =
    item.hasAnalysis === true &&
    signal?.tone !== "active" &&
    signal?.tone !== "warn";

  return (
    <View style={[styles.row, showTopBorder && styles.rowBorder]}>
      <View
        style={[
          styles.rowAccent,
          accentWarn && styles.rowAccentWarn,
          accentActive && styles.rowAccentActive,
          !accentWarn && !accentActive && styles.rowAccentMuted,
        ]}
      />
      <View style={styles.rowInner}>
        <PressableFeedback style={styles.rowContent} onPress={onOpen}>
          {signal ? (
            <View
              style={[
                styles.rowStatusPill,
                signal.tone === "warn" && styles.rowStatusPillWarn,
                signal.tone === "active" && styles.rowStatusPillActive,
                signal.tone === "muted" && styles.rowStatusPillMuted,
              ]}
            >
              <Text
                style={[
                  styles.rowStatusPillLabel,
                  signal.tone === "warn" && styles.rowStatusPillLabelWarn,
                  signal.tone === "active" && styles.rowStatusPillLabelActive,
                  signal.tone === "muted" && styles.rowStatusPillLabelMuted,
                ]}
                numberOfLines={1}
              >
                {signal.label}
              </Text>
            </View>
          ) : null}
          <Text style={styles.rowTitle} numberOfLines={2}>
            {title}
          </Text>
          <View style={styles.rowMeta}>
            <Text style={styles.metaText}>{formatVoiceDateTimeCompactRu(item.createdAt)}</Text>
            {item.playerName ? (
              <>
                <View style={styles.dot} />
                <Text style={styles.metaText} numberOfLines={1}>
                  {item.playerName}
                </Text>
              </>
            ) : (
              <>
                <View style={styles.dot} />
                <Text style={styles.metaTextMuted} numberOfLines={1}>
                  без игрока
                </Text>
              </>
            )}
            {item.audioFileName || item.uploadId ? (
              <>
                <View style={styles.dot} />
                <Text style={styles.metaText} numberOfLines={1}>
                  есть аудио
                </Text>
              </>
            ) : (
              <>
                <View style={styles.dot} />
                <Text style={styles.metaTextMuted} numberOfLines={1}>
                  без файла в списке
                </Text>
              </>
            )}
            {showAiMeta ? (
              <>
                <View style={styles.dot} />
                <Text
                  style={styles.rowAiTag}
                  numberOfLines={1}
                  accessibilityLabel="Сохранён AI-разбор"
                >
                  Разбор
                </Text>
              </>
            ) : null}
          </View>
          <Text style={styles.preview} numberOfLines={3}>
            {previewText}
          </Text>
        </PressableFeedback>
        <PrimaryButton
          animatedPress
          title="Подробнее"
          variant="ghost"
          onPress={onOpen}
          style={styles.rowBtn}
          textStyle={styles.rowBtnText}
        />
      </View>
    </View>
  );
}

const EYEBROW = "Голос";
const SCREEN_TITLE = "Архив заметок";
const HERO_SUBTITLE =
  "Рабочий архив голосовых материалов: запись, расшифровка и резюме. Откройте заметку — там же отчёт, задача и сообщение родителю.";

export default function VoiceNotesListScreen() {
  const router = useRouter();
  const [items, setItems] = useState<VoiceNoteListItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadedOnce, setLoadedOnce] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [query, setQuery] = useState("");
  const [playerFilter, setPlayerFilter] = useState<PlayerFilter>("all");
  const [audioFilter, setAudioFilter] = useState<AudioFilter>("all");

  const fetchList = useCallback((opts?: { silent?: boolean }) => {
    const silent = opts?.silent === true;
    if (!silent) setLoading(true);
    setError(null);
    getVoiceNotes()
      .then((res) => {
        if (!res.ok) {
          setItems([]);
          setError(res.error);
          return;
        }
        setItems(res.data);
        setError(null);
        setLoadedOnce(true);
      })
      .finally(() => setLoading(false));
  }, []);

  useFocusEffect(
    useCallback(() => {
      void fetchList({ silent: loadedOnce });
    }, [fetchList, loadedOnce])
  );

  const hasActiveControls =
    query.trim().length > 0 || playerFilter !== "all" || audioFilter !== "all";

  const visibleItems = useMemo(() => {
    const filtered = items
      .filter((it) => applyPlayerFilter(it, playerFilter))
      .filter((it) => applyAudioFilter(it, audioFilter))
      .filter((it) => matchesQuery(it, query));
    return sortVoiceNotesForArchive(filtered);
  }, [audioFilter, items, playerFilter, query]);

  const groupedVoiceListBody = useMemo(() => {
    const groups = groupVoiceNotesByTime(visibleItems);
    let globalIdx = 0;
    const nodes: React.ReactNode[] = [];
    for (let gi = 0; gi < groups.length; gi++) {
      const g = groups[gi];
      nodes.push(
        <View
          key={`sec-h-${g.key}`}
          style={[
            styles.voiceSectionHeader,
            gi > 0 ? styles.voiceSectionHeaderSpacing : null,
          ]}
        >
          <Text style={styles.voiceSectionTitle}>{g.title}</Text>
          <Text style={styles.voiceSectionCount}>{g.items.length}</Text>
        </View>
      );
      for (const it of g.items) {
        const showTop = globalIdx > 0;
        globalIdx += 1;
        nodes.push(
          <VoiceNoteRow
            key={it.id}
            item={it}
            showTopBorder={showTop}
            onOpen={() => router.push(`/voice-notes/${it.id}`)}
          />
        );
      }
    }
    return nodes;
  }, [visibleItems, router]);

  const archiveStats = useMemo(() => computeVoiceArchiveStats(items), [items]);

  const summaryLines = useMemo(
    () =>
      buildSummaryLines({
        stats: archiveStats,
        visibleCount: visibleItems.length,
        hasActiveControls,
      }),
    [archiveStats, visibleItems.length, hasActiveControls]
  );

  const nextStepHint = useMemo(() => buildNextStepHint(archiveStats), [archiveStats]);

  const dateLabel = formatCoachListContextDate();
  const countLabel =
    items.length > 0
      ? hasActiveControls
        ? `${visibleItems.length} из ${items.length} ${voiceItemsWordBare(items.length)}`
        : voiceItemsCountRu(items.length)
      : "Архив пуст";

  if (loading) {
    return (
      <ScreenContainer contentContainerStyle={styles.content}>
        <StaggerFadeIn preset="snappy" delay={0}>
          <CoachListHero
            eyebrow={EYEBROW}
            title={SCREEN_TITLE}
            dateLabel={dateLabel}
            countLabel="Загрузка…"
            subtitle="Подтягиваем сохранённые голосовые материалы."
          />
        </StaggerFadeIn>
        <StaggerFadeIn preset="snappy" delay={14}>
          <CoachListSkeletonCard />
        </StaggerFadeIn>
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
            subtitle="Когда связь восстановится, список снова откроется."
          />
        </StaggerFadeIn>
        <StaggerFadeIn preset="snappy" delay={16}>
          <VoiceNotesErrorCard message={error} onRetry={() => void fetchList()} />
        </StaggerFadeIn>
      </ScreenContainer>
    );
  }

  return (
    <ScreenContainer>
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.content}>
        <StaggerFadeIn preset="snappy" delay={0}>
          <CoachListHero
            eyebrow={EYEBROW}
            title={SCREEN_TITLE}
            dateLabel={dateLabel}
            countLabel={countLabel}
            subtitle={HERO_SUBTITLE}
          />
        </StaggerFadeIn>

        <StaggerFadeIn preset="snappy" delay={10}>
          <SectionCard elevated style={styles.summaryCard}>
            <Text style={styles.summaryKicker}>Сводка</Text>
            {items.length > 0 ? (
              <Text style={styles.summaryOrderHint}>
                Сначала — заметки с проблемами и в обработке
              </Text>
            ) : null}
            <Text style={styles.summaryPrimary}>{summaryLines.primary}</Text>
            {summaryLines.secondary ? (
              <Text style={styles.summarySecondary}>{summaryLines.secondary}</Text>
            ) : null}
            {items.length > 0 && nextStepHint ? (
              <Text style={styles.summaryNext}>{nextStepHint}</Text>
            ) : null}
          </SectionCard>
        </StaggerFadeIn>

        <StaggerFadeIn preset="snappy" delay={14}>
          <SectionCard elevated style={styles.controlsCard}>
            <Text style={styles.controlsTitle}>Поиск и фильтры</Text>
            <Text style={styles.controlsHint}>Найдите запись по тексту или сузьте список по игроку и наличию аудио.</Text>
            <TextInput
              value={query}
              onChangeText={setQuery}
              placeholder="Поиск по тексту, игроку, названию…"
              placeholderTextColor={theme.colors.textMuted}
              style={styles.searchInput}
              autoCapitalize="none"
              autoCorrect={false}
              clearButtonMode="while-editing"
            />
            <View style={styles.pillsRow}>
              <Pill
                label="Все"
                active={playerFilter === "all"}
                onPress={() => setPlayerFilter("all")}
              />
              <Pill
                label="С игроком"
                active={playerFilter === "with_player"}
                onPress={() => setPlayerFilter("with_player")}
              />
              <Pill
                label="Без игрока"
                active={playerFilter === "without_player"}
                onPress={() => setPlayerFilter("without_player")}
              />
            </View>
            <View style={styles.pillsRow}>
              <Pill
                label="Любое аудио"
                active={audioFilter === "all"}
                onPress={() => setAudioFilter("all")}
              />
              <Pill
                label="С аудио"
                active={audioFilter === "with_audio"}
                onPress={() => setAudioFilter("with_audio")}
              />
              <Pill
                label="Без аудио"
                active={audioFilter === "without_audio"}
                onPress={() => setAudioFilter("without_audio")}
              />
            </View>
            {hasActiveControls ? (
              <PrimaryButton
                animatedPress
                title="Сбросить поиск и фильтры"
                variant="ghost"
                onPress={() => {
                  setQuery("");
                  setPlayerFilter("all");
                  setAudioFilter("all");
                }}
                style={styles.resetBtn}
                textStyle={styles.resetBtnText}
              />
            ) : null}
          </SectionCard>
        </StaggerFadeIn>

        {items.length === 0 ? (
          <StaggerFadeIn preset="snappy" delay={20}>
            <SectionCard elevated style={styles.emptyCard}>
              <View style={styles.emptyAccent} />
              <Text style={styles.emptyTitle}>Архив пока пуст</Text>
              <Text style={styles.emptyText}>
                Здесь появятся материалы после голосовых сценариев. Живая тренировка с наблюдениями — канон Arena /
                live-training; этот список не заменяет post-session live-training.
              </Text>
              <View style={styles.emptyActions}>
                <PrimaryButton animatedPress title="Новая голосовая заметка" onPress={() => router.push("/voice-note")} />
                <PrimaryButton
                  animatedPress
                  title="Живая тренировка (Arena)"
                  variant="outline"
                  onPress={() =>
                    router.push(LIVE_TRAINING_START_ROUTE as Parameters<typeof router.push>[0])
                  }
                />
              </View>
            </SectionCard>
          </StaggerFadeIn>
        ) : visibleItems.length === 0 ? (
          <StaggerFadeIn preset="snappy" delay={20}>
            <SectionCard elevated style={styles.emptyCard}>
              <Text style={styles.emptyTitle}>Ничего не найдено</Text>
              <Text style={styles.emptyText}>
                В архиве {items.length} {voiceItemsWordBare(items.length)}, но под текущие условия ничего не подошло.
                Измените запрос или сбросьте фильтры.
              </Text>
              <PrimaryButton
                animatedPress
                title="Сбросить"
                variant="outline"
                onPress={() => {
                  setQuery("");
                  setPlayerFilter("all");
                  setAudioFilter("all");
                }}
              />
            </SectionCard>
          </StaggerFadeIn>
        ) : (
          <>
            <StaggerFadeIn preset="snappy" delay={18}>
              <SectionCard elevated style={styles.quickCard}>
                <Text style={styles.quickTitle}>Новая запись</Text>
                <Text style={styles.quickHint}>
                  Голосовая заметка или живая тренировка (канон) — архив пополняется отдельно от legacy
                  локальной записи.
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
                    title="Живая тренировка (Arena)"
                    variant="outline"
                    onPress={() =>
                      router.push(LIVE_TRAINING_START_ROUTE as Parameters<typeof router.push>[0])
                    }
                    style={styles.quickBtn}
                  />
                </View>
              </SectionCard>
            </StaggerFadeIn>
            <StaggerFadeIn preset="snappy" delay={22}>
              <SectionCard elevated style={styles.listCard}>
                <Text style={styles.listNextStepLine}>
                  В карточке заметки: отчёт · задача · сообщение родителю
                </Text>
                {groupedVoiceListBody}
              </SectionCard>
            </StaggerFadeIn>
          </>
        )}
      </ScrollView>
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  content: { paddingBottom: theme.spacing.xxl },
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
  summaryOrderHint: {
    ...theme.typography.caption,
    color: theme.colors.textSecondary,
    fontWeight: "600",
    lineHeight: 20,
    marginBottom: theme.spacing.sm,
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
  },
  controlsCard: {
    marginBottom: theme.spacing.lg,
    borderLeftWidth: 4,
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
    marginBottom: theme.spacing.md,
  },
  searchInput: {
    backgroundColor: theme.colors.surfaceElevated,
    borderWidth: 1,
    borderColor: theme.colors.border,
    borderRadius: theme.borderRadius.md,
    paddingVertical: theme.spacing.sm,
    paddingHorizontal: theme.spacing.md,
    color: theme.colors.text,
    ...theme.typography.body,
    marginBottom: theme.spacing.md,
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
    paddingVertical: 6,
    paddingHorizontal: 10,
    borderRadius: theme.borderRadius.full,
  },
  pillActive: {
    borderColor: theme.colors.primary,
    backgroundColor: theme.colors.primaryMuted,
  },
  pillPressed: { opacity: 0.85 },
  pillText: { ...theme.typography.caption, color: theme.colors.textMuted },
  pillTextActive: { color: theme.colors.primary, fontWeight: "600" },
  resetBtn: { paddingVertical: 10 },
  resetBtnText: { fontSize: 12 },
  listCard: { borderLeftWidth: 4, borderLeftColor: theme.colors.primary },
  listNextStepLine: {
    ...theme.typography.caption,
    fontSize: 12,
    color: theme.colors.textSecondary,
    lineHeight: 18,
    marginBottom: theme.spacing.sm,
    fontWeight: "500",
  },
  voiceSectionHeader: {
    flexDirection: "row",
    alignItems: "baseline",
    justifyContent: "space-between",
    gap: theme.spacing.sm,
    paddingBottom: 6,
  },
  voiceSectionHeaderSpacing: {
    marginTop: theme.spacing.md,
    paddingTop: theme.spacing.xs,
    borderTopWidth: 1,
    borderTopColor: theme.colors.border,
  },
  voiceSectionTitle: {
    ...theme.typography.caption,
    fontSize: 11,
    fontWeight: "700",
    letterSpacing: 0.45,
    color: theme.colors.textMuted,
    textTransform: "uppercase",
    flex: 1,
  },
  voiceSectionCount: {
    fontSize: 11,
    fontWeight: "600",
    color: theme.colors.textMuted,
  },
  emptyCard: {
    borderLeftWidth: 4,
    borderLeftColor: theme.colors.textMuted,
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
  rowBorder: { borderTopWidth: 1, borderTopColor: theme.colors.border },
  rowAccent: {
    width: 3,
    borderRadius: 2,
    marginRight: theme.spacing.sm,
    alignSelf: "stretch",
  },
  rowAccentWarn: {
    backgroundColor: theme.colors.warning,
  },
  rowAccentActive: {
    backgroundColor: theme.colors.primary,
    opacity: 0.85,
  },
  rowAccentMuted: {
    backgroundColor: theme.colors.border,
  },
  rowInner: {
    flex: 1,
    flexDirection: "row",
    alignItems: "flex-start",
    justifyContent: "space-between",
    minWidth: 0,
  },
  rowContent: {
    flex: 1,
    marginRight: theme.spacing.sm,
    minWidth: 0,
  },
  rowStatusPill: {
    alignSelf: "flex-start",
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: theme.borderRadius.full,
    borderWidth: 1,
    marginBottom: theme.spacing.sm,
  },
  rowStatusPillWarn: {
    backgroundColor: "rgba(245, 166, 35, 0.18)",
    borderColor: theme.colors.warning,
  },
  rowStatusPillActive: {
    backgroundColor: theme.colors.primaryMuted,
    borderColor: theme.colors.primary,
  },
  rowStatusPillMuted: {
    backgroundColor: theme.colors.surfaceElevated,
    borderColor: theme.colors.border,
  },
  rowStatusPillLabel: {
    fontSize: 12,
    fontWeight: "700",
    letterSpacing: 0.35,
  },
  rowStatusPillLabelWarn: { color: theme.colors.warning },
  rowStatusPillLabelActive: { color: theme.colors.primary },
  rowStatusPillLabelMuted: { color: theme.colors.textSecondary },
  rowTitle: {
    ...theme.typography.subtitle,
    color: theme.colors.text,
    marginBottom: theme.spacing.xs,
  },
  rowMeta: {
    flexDirection: "row",
    alignItems: "center",
    gap: theme.spacing.sm,
    flexWrap: "wrap",
    marginBottom: theme.spacing.xs,
  },
  metaText: { ...theme.typography.caption, color: theme.colors.textMuted },
  metaTextMuted: {
    ...theme.typography.caption,
    color: theme.colors.textMuted,
    opacity: 0.85,
  },
  rowAiTag: {
    ...theme.typography.caption,
    fontSize: 11,
    fontWeight: "600",
    color: theme.colors.accent,
    letterSpacing: 0.2,
  },
  dot: { width: 4, height: 4, borderRadius: 2, backgroundColor: theme.colors.textMuted },
  preview: {
    ...theme.typography.caption,
    color: theme.colors.textSecondary,
    lineHeight: 21,
  },
  rowBtn: {
    paddingVertical: theme.spacing.xs,
    paddingHorizontal: theme.spacing.sm,
    alignSelf: "flex-start",
    marginTop: 2,
  },
  rowBtnText: { fontSize: 12 },
});
