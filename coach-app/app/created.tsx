import React, { useCallback, useEffect, useMemo, useState } from "react";
import { ActivityIndicator, ScrollView, StyleSheet, Text, View } from "react-native";
import { useFocusEffect, useRouter, type Href } from "expo-router";
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withSequence,
  withTiming,
} from "react-native-reanimated";
import { ScreenContainer } from "@/components/layout/ScreenContainer";
import { SectionCard } from "@/components/ui/SectionCard";
import { PrimaryButton } from "@/components/ui/PrimaryButton";
import { PressableFeedback } from "@/components/ui/PressableFeedback";
import { StaggerFadeIn } from "@/components/dashboard/StaggerFadeIn";
import { theme } from "@/constants/theme";
import { formatVoiceDateTimeCompactRu } from "@/lib/voiceMvp";
import {
  hasParentDraftVoiceNoteLink,
  hasVoiceNoteLink,
  VOICE_PROVENANCE,
} from "@/lib/voiceProvenanceCopy";
import {
  VOICE_MATERIALS_HUB_EYEBROW,
  VOICE_MATERIALS_HUB_REFRESH_HINT,
  VOICE_MATERIALS_HUB_SUB,
  VOICE_MATERIALS_HUB_TITLE,
  VOICE_MATERIALS_ORCHESTRATION_KICKER,
} from "@/lib/voiceMvp/voiceStarterCompletionCopy";
import {
  getCreatedReports,
  type CreatedReportListItem,
} from "@/services/createdReportsService";
import {
  getCreatedActions,
  type CreatedActionListItem,
} from "@/services/createdActionsService";
import { getParentDrafts, type ParentDraftItem } from "@/lib/parentDraftHelpers";
import { getVoiceNotes, type VoiceNoteListItem } from "@/services/voiceNotesService";

type LoadableSection<T> = {
  loading: boolean;
  error: string | null;
  items: T[];
  total: number;
};

type OrchestrationCta = {
  title: string;
  variant: "primary" | "outline" | "ghost";
  onPress: () => void;
};

function describeTotal(total: number, labelMany: string, labelOne: string): string {
  return total === 1 ? `1 ${labelOne}` : `${total} ${labelMany}`;
}

function materialsCountRu(n: number): string {
  const m = n % 10;
  const mm = n % 100;
  if (mm >= 11 && mm <= 14) return `${n} материалов`;
  if (m === 1) return `${n} материал`;
  if (m >= 2 && m <= 4) return `${n} материала`;
  return `${n} материалов`;
}

function formatSectionUnavailable(error: string | null): string {
  if (!error) return "";
  return "Раздел временно недоступен. Попробуйте обновить экран чуть позже.";
}

const TABS_HOME = "/(tabs)" as Href;

type VoiceProductivityMetrics = {
  voiceNotesTotal: number;
  voiceNotesWithAnalysis: number;
  reportsFromVoice: number;
  actionsFromVoice: number;
  parentDraftsFromVoice: number;
  voiceLinkedEntitiesTotal: number;
  uniqueVoiceNotesConverted: number;
  conversionShare: number; // U/N
  analysisCoverage: number; // A/N
  sectionsWithErrors?: number;
};

function computeVoiceProductivityMetrics(params: {
  voiceNotes: VoiceNoteListItem[];
  reports: CreatedReportListItem[];
  actions: CreatedActionListItem[];
  drafts: ParentDraftItem[];
}): VoiceProductivityMetrics {
  const voiceNotesTotal = params.voiceNotes.length;
  const voiceNotesWithAnalysis = params.voiceNotes.filter((v) => v.hasAnalysis === true).length;

  let reportsFromVoice = 0;
  let actionsFromVoice = 0;
  let parentDraftsFromVoice = 0;

  const voiceIds = new Set<string>();

  for (const r of params.reports) {
    if (!hasVoiceNoteLink(r.voiceNoteId)) continue;
    reportsFromVoice++;
    if (typeof r.voiceNoteId === "string") voiceIds.add(r.voiceNoteId.trim());
  }

  for (const a of params.actions) {
    if (!hasVoiceNoteLink(a.voiceNoteId)) continue;
    actionsFromVoice++;
    if (typeof a.voiceNoteId === "string") voiceIds.add(a.voiceNoteId.trim());
  }

  for (const d of params.drafts) {
    if (!hasParentDraftVoiceNoteLink(d.source, d.voiceNoteId)) continue;
    parentDraftsFromVoice++;
    if (typeof d.voiceNoteId === "string") voiceIds.add(d.voiceNoteId.trim());
  }

  const uniqueVoiceNotesConverted = voiceIds.size;
  const voiceLinkedEntitiesTotal = reportsFromVoice + actionsFromVoice + parentDraftsFromVoice;
  const conversionShare = voiceNotesTotal > 0 ? uniqueVoiceNotesConverted / voiceNotesTotal : 0;
  const analysisCoverage = voiceNotesTotal > 0 ? voiceNotesWithAnalysis / voiceNotesTotal : 0;

  return {
    voiceNotesTotal,
    voiceNotesWithAnalysis,
    reportsFromVoice,
    actionsFromVoice,
    parentDraftsFromVoice,
    voiceLinkedEntitiesTotal,
    uniqueVoiceNotesConverted,
    conversionShare,
    analysisCoverage,
  };
}

function buildVoiceProductivityInsight(metrics: VoiceProductivityMetrics): string {
  const { voiceNotesTotal, analysisCoverage, conversionShare } = metrics;

  // Данных мало — не делаем выводы, только нейтральное ожидание.
  if (voiceNotesTotal <= 2) {
    return "Пока данных немного — динамика будет понятна в следующих заметках.";
  }

  const coverageHigh = analysisCoverage >= 0.6;
  const conversionHigh = conversionShare >= 0.4;
  const conversionVeryLow = conversionShare < 0.25;
  const coverageLow = analysisCoverage < 0.4;

  if (coverageHigh && conversionVeryLow) {
    return "Разбор уже готов — чаще превращайте заметки в материалы.";
  }

  if (conversionHigh) {
    return "Голосовые заметки хорошо превращаются в рабочие материалы.";
  }

  if (coverageLow) {
    return "Не все заметки дошли до разбора — часть результатов может появиться позже.";
  }

  return "Метрики отражают текущий voice-поток — продолжайте цикл “заметка → материалы”.";
}

function buildVoiceProductivityNextStep(metrics: VoiceProductivityMetrics): string {
  const { voiceNotesTotal, analysisCoverage, conversionShare, sectionsWithErrors } = metrics;

  if ((sectionsWithErrors ?? 0) > 0) {
    return "Проверьте показатели позже — часть разделов ещё обновляется.";
  }

  if (voiceNotesTotal <= 2) {
    return "Продолжайте сохранять заметки — динамика станет понятнее.";
  }

  if (analysisCoverage < 0.4) {
    return "Откройте заметки и проверьте, дошёл ли разбор до результата.";
  }

  if (analysisCoverage >= 0.6 && conversionShare < 0.25) {
    return "Чаще превращайте заметки в отчёты, задачи и черновики.";
  }

  if (conversionShare >= 0.4) {
    return "Voice-поток работает стабильно — продолжайте в том же ритме.";
  }

  return "Следующий шаг: оформляйте заметки в материалы по мере готовности.";
}

function buildOrchestrationLines(params: {
  totalCreated: number;
  sectionsWithErrors: number;
  reports: LoadableSection<CreatedReportListItem>;
  actions: LoadableSection<CreatedActionListItem>;
  drafts: LoadableSection<ParentDraftItem>;
  voiceNotes: LoadableSection<VoiceNoteListItem>;
  onlyVoiceNotesAvailable: boolean;
  nearZeroMaterials: boolean;
}): { primary: string; secondary: string | null } {
  const {
    totalCreated,
    sectionsWithErrors,
    reports,
    actions,
    drafts,
    voiceNotes,
    onlyVoiceNotesAvailable,
    nearZeroMaterials,
  } = params;

  if (sectionsWithErrors > 0 && totalCreated === 0) {
    return {
      primary: "Сейчас не все разделы ответили — как только связь восстановится, счётчики и превью обновятся.",
      secondary: null,
    };
  }

  if (sectionsWithErrors > 0 && totalCreated > 0) {
    return {
      primary: `В хабе уже ${materialsCountRu(totalCreated)} — можно спокойно продолжать с доступных блоков.`,
      secondary: null,
    };
  }

  if (totalCreated === 0) {
    return {
      primary:
        "Здесь появятся отчёты, задачи, черновики для родителей и история голосовых заметок — в том числе после оформления из заметки.",
      secondary: null,
    };
  }

  const parts: string[] = [];
  if (reports.total > 0) parts.push(describeTotal(reports.total, "отчётов", "отчёт"));
  if (actions.total > 0) parts.push(describeTotal(actions.total, "задач", "задача"));
  if (drafts.total > 0) parts.push(describeTotal(drafts.total, "черновиков", "черновик"));
  if (voiceNotes.total > 0) parts.push(describeTotal(voiceNotes.total, "заметок", "заметка"));

  let secondary: string | null = null;
  if (actions.total > 0) {
    secondary = "Сначала загляните в задачи — так проще держать фокус на исполнении.";
  } else if (drafts.total > 0) {
    secondary = "Есть черновики для родителей — пройдитесь по формулировкам перед отправкой.";
  } else if (reports.total > 0) {
    secondary = "Отчёты помогут спланировать следующую тренировку.";
  } else if (onlyVoiceNotesAvailable) {
    secondary = "Пока только голосовые — из них можно собрать отчёты, задачи и черновики.";
  } else if (nearZeroMaterials) {
    secondary = "Материалов пока немного — после следующей серии блоки заполнятся сами.";
  }

  return {
    primary: `Готово: ${parts.join(", ")}.`,
    secondary,
  };
}

/** Приоритет: задачи → черновики → отчёты → голосовые (как в ТЗ). */
function buildOrchestrationCtas(params: {
  router: { push: (href: Href) => void };
  fetchAll: () => void;
  reports: LoadableSection<CreatedReportListItem>;
  actions: LoadableSection<CreatedActionListItem>;
  drafts: LoadableSection<ParentDraftItem>;
  voiceNotes: LoadableSection<VoiceNoteListItem>;
}): OrchestrationCta[] {
  const { router, fetchAll, reports, actions, drafts, voiceNotes } = params;

  type R = { title: string; route: Href };
  const queue: R[] = [];
  const seen = new Set<string>();

  const push = (title: string, route: Href) => {
    const key = String(route);
    if (seen.has(key)) return;
    seen.add(key);
    queue.push({ title, route });
  };

  if (actions.total > 0) push("Проверить задачи", "/created-actions");
  if (drafts.total > 0) push("Черновики родителям", "/parent-drafts");
  if (reports.total > 0) push("Открыть отчёты", "/created-reports");
  if (voiceNotes.total > 0) push("Голосовые заметки", "/voice-notes");

  if (queue.length === 0) {
    const out: OrchestrationCta[] = [
      { title: "Новая заметка", variant: "primary", onPress: () => router.push("/voice-note") },
      { title: "На главную", variant: "outline", onPress: () => router.push(TABS_HOME) },
      { title: "Обновить хаб", variant: "ghost", onPress: () => fetchAll() },
    ];
    return out;
  }

  const variants: Array<OrchestrationCta["variant"]> = ["primary", "outline", "ghost"];
  const out: OrchestrationCta[] = queue.slice(0, 3).map((item, i) => ({
    title: item.title,
    variant: variants[i] ?? "ghost",
    onPress: () => router.push(item.route),
  }));

  if (out.length === 1) {
    out.push({
      title: "На главную",
      variant: "outline",
      onPress: () => router.push(TABS_HOME),
    });
  }
  if (out.length === 2) {
    out.push({
      title: "Обновить хаб",
      variant: "ghost",
      onPress: () => fetchAll(),
    });
  }

  return out.slice(0, 3);
}

function SectionHeader({
  title,
  subtitle,
  total,
  onAll,
}: {
  title: string;
  subtitle: string;
  total?: number;
  onAll: () => void;
}) {
  return (
    <>
      <View style={styles.sectionHeader}>
        <View style={styles.sectionTitleWrap}>
          <Text style={styles.sectionTitle}>{title}</Text>
          {typeof total === "number" ? (
            <Text style={styles.sectionCount}>{total}</Text>
          ) : null}
        </View>
        <PrimaryButton
          animatedPress
          title="Смотреть всё"
          variant="ghost"
          onPress={onAll}
          style={styles.allBtn}
          textStyle={styles.allBtnText}
        />
      </View>
      <Text style={styles.sectionSubtitle}>{subtitle}</Text>
    </>
  );
}

function PreviewRow({
  title,
  subtitle,
  meta,
  onPress,
  fromVoiceNote,
}: {
  title: string;
  subtitle: string;
  meta?: string;
  onPress: () => void;
  /** Server-backed: элемент связан с голосовой заметкой (voiceNoteId). */
  fromVoiceNote?: boolean;
}) {
  return (
    <PressableFeedback style={styles.previewRow} onPress={onPress}>
      <View style={styles.previewTitleRow}>
        <Text style={styles.previewTitle} numberOfLines={1}>
          {title}
        </Text>
        {fromVoiceNote ? (
          <Text style={styles.provenancePill} accessibilityLabel={VOICE_PROVENANCE.DETAIL_DESCRIPTION}>
            {VOICE_PROVENANCE.PILL_LABEL}
          </Text>
        ) : null}
      </View>
      <Text style={styles.previewSubtitle} numberOfLines={2}>
        {subtitle}
      </Text>
      {meta ? <Text style={styles.previewMeta} numberOfLines={1}>{meta}</Text> : null}
    </PressableFeedback>
  );
}

function PriorityStripPill({
  label,
  section,
  onOpen,
}: {
  label: string;
  section: LoadableSection<unknown>;
  onOpen: () => void;
}) {
  const loading = section.loading;
  const failed = !!section.error;
  const display = loading ? "…" : failed ? "—" : String(section.total);
  return (
    <PressableFeedback
      style={[styles.priorityStripPill, failed && styles.priorityStripPillSoft]}
      onPress={onOpen}
    >
      <Text style={[styles.priorityStripValue, failed && styles.priorityStripValueMuted]}>{display}</Text>
      <Text style={styles.priorityStripLabel} numberOfLines={1}>
        {label}
      </Text>
    </PressableFeedback>
  );
}

function PulseBlocks({ count }: { count: number }) {
  const pulse = useSharedValue(0.35);
  useEffect(() => {
    pulse.value = withRepeat(
      withSequence(withTiming(0.72, { duration: 600 }), withTiming(0.35, { duration: 600 })),
      -1,
      true
    );
  }, [pulse]);
  const bar = useAnimatedStyle(() => ({ opacity: pulse.value }));
  return (
    <View style={styles.pulseBlocksWrap}>
      {Array.from({ length: count }).map((_, i) => (
        <Animated.View
          key={i}
          style={[styles.pulseBlock, i === 1 && styles.pulseBlockMid, i === 2 && styles.pulseBlockShort, bar]}
        />
      ))}
    </View>
  );
}

function HubSummarySkeleton() {
  return (
    <View>
      <PulseBlocks count={2} />
      <PulseBlocks count={1} />
      <View style={styles.priorityStripRow}>
        {[0, 1, 2, 3].map((i) => (
          <View key={i} style={[styles.priorityStripPill, styles.priorityStripPillSkeleton]} />
        ))}
      </View>
      <PulseBlocks count={1} />
    </View>
  );
}

function SectionState({
  loading,
  error,
  emptyText,
}: {
  loading: boolean;
  error: string | null;
  emptyText: string;
}) {
  if (loading) {
    return (
      <View style={styles.inlineState}>
        <ActivityIndicator size="small" color={theme.colors.primary} style={styles.sectionLoaderIcon} />
        <PulseBlocks count={3} />
      </View>
    );
  }
  if (error) {
    return (
      <View style={styles.inlineState}>
        <Text style={styles.inlineNeutral}>{formatSectionUnavailable(error)}</Text>
      </View>
    );
  }
  return (
    <View style={styles.emptySectionWrap}>
      <View style={styles.emptySectionLine} />
      <Text style={styles.inlineStateText}>{emptyText}</Text>
    </View>
  );
}

export default function CreatedHubScreen() {
  const router = useRouter();
  const [reports, setReports] = useState<LoadableSection<CreatedReportListItem>>({
    loading: true,
    error: null,
    items: [],
    total: 0,
  });
  const [actions, setActions] = useState<LoadableSection<CreatedActionListItem>>({
    loading: true,
    error: null,
    items: [],
    total: 0,
  });
  const [drafts, setDrafts] = useState<LoadableSection<ParentDraftItem>>({
    loading: true,
    error: null,
    items: [],
    total: 0,
  });
  const [voiceNotes, setVoiceNotes] = useState<LoadableSection<VoiceNoteListItem>>({
    loading: true,
    error: null,
    items: [],
    total: 0,
  });
  const [voiceProductivity, setVoiceProductivity] = useState<VoiceProductivityMetrics | null>(
    null
  );
  const [loadedOnce, setLoadedOnce] = useState(false);

  const fetchAll = useCallback((opts?: { silent?: boolean }) => {
    const silent = opts?.silent === true;
    setReports((s) => ({ ...s, loading: silent ? s.loading : true, error: null }));
    setActions((s) => ({ ...s, loading: silent ? s.loading : true, error: null }));
    setDrafts((s) => ({ ...s, loading: silent ? s.loading : true, error: null }));
    setVoiceNotes((s) => ({ ...s, loading: silent ? s.loading : true, error: null }));

    Promise.allSettled([
      getCreatedReports(),
      getCreatedActions(),
      getParentDrafts(),
      getVoiceNotes(),
    ]).then(([r, a, d, v]) => {
      const reportsData =
        r.status === "fulfilled" && r.value.ok ? r.value.data : [];
      const actionsData =
        a.status === "fulfilled" && a.value.ok ? a.value.data : [];
      const draftsData = d.status === "fulfilled" ? d.value : [];
      const voiceNotesData =
        v.status === "fulfilled" && v.value.ok ? v.value.data : [];

      setVoiceProductivity(
        computeVoiceProductivityMetrics({
          voiceNotes: voiceNotesData,
          reports: reportsData,
          actions: actionsData,
          drafts: draftsData,
        })
      );

      if (r.status === "fulfilled" && r.value.ok) {
        setReports({
          loading: false,
          error: null,
          items: reportsData.slice(0, 3),
          total: reportsData.length,
        });
      } else {
        let message = "Ошибка загрузки";
        if (r.status === "fulfilled" && !r.value.ok) message = r.value.error;
        setReports({ loading: false, error: message, items: [], total: 0 });
      }

      if (a.status === "fulfilled" && a.value.ok) {
        setActions({
          loading: false,
          error: null,
          items: actionsData.slice(0, 3),
          total: actionsData.length,
        });
      } else {
        let message = "Ошибка загрузки";
        if (a.status === "fulfilled" && !a.value.ok) message = a.value.error;
        setActions({ loading: false, error: message, items: [], total: 0 });
      }

      if (d.status === "fulfilled") {
        setDrafts({
          loading: false,
          error: null,
          items: draftsData.slice(0, 3),
          total: draftsData.length,
        });
      } else {
        setDrafts({ loading: false, error: "Ошибка загрузки", items: [], total: 0 });
      }

      if (v.status === "fulfilled" && v.value.ok) {
        setVoiceNotes({
          loading: false,
          error: null,
          items: voiceNotesData.slice(0, 3),
          total: voiceNotesData.length,
        });
      } else {
        let message = "Ошибка загрузки";
        if (v.status === "fulfilled" && !v.value.ok) message = v.value.error;
        setVoiceNotes({ loading: false, error: message, items: [], total: 0 });
      }
      setLoadedOnce(true);
    });
  }, []);

  useFocusEffect(useCallback(() => {
    fetchAll({ silent: loadedOnce });
  }, [fetchAll, loadedOnce]));

  const nothingCreated =
    !reports.loading &&
    !actions.loading &&
    !drafts.loading &&
    !voiceNotes.loading &&
    reports.items.length === 0 &&
    actions.items.length === 0 &&
    drafts.items.length === 0 &&
    voiceNotes.items.length === 0 &&
    !reports.error &&
    !actions.error &&
    !drafts.error &&
    !voiceNotes.error;

  const totalCreated =
    reports.total + actions.total + drafts.total + voiceNotes.total;
  const loadedSectionCount = [reports, actions, drafts, voiceNotes].filter(
    (s) => !s.loading
  ).length;
  const sectionsWithErrors = [reports, actions, drafts, voiceNotes].filter(
    (s) => !!s.error
  ).length;
  const onlyVoiceNotesAvailable =
    voiceNotes.total > 0 && reports.total === 0 && actions.total === 0 && drafts.total === 0;
  const nearZeroMaterials = totalCreated > 0 && totalCreated <= 2;

  const orchestrationLines = useMemo(
    () =>
      buildOrchestrationLines({
        totalCreated,
        sectionsWithErrors,
        reports,
        actions,
        drafts,
        voiceNotes,
        onlyVoiceNotesAvailable,
        nearZeroMaterials,
      }),
    [
      totalCreated,
      sectionsWithErrors,
      reports,
      actions,
      drafts,
      voiceNotes,
      onlyVoiceNotesAvailable,
      nearZeroMaterials,
    ]
  );

  const orchestrationCtas = useMemo(
    () => buildOrchestrationCtas({ router, fetchAll, reports, actions, drafts, voiceNotes }),
    [router, fetchAll, reports, actions, drafts, voiceNotes]
  );

  const sectionsReady =
    !reports.loading && !actions.loading && !drafts.loading && !voiceNotes.loading;

  return (
    <ScreenContainer>
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.content}>
        <StaggerFadeIn delay={0} preset="snappy">
          <Text style={styles.heroEyebrow}>{VOICE_MATERIALS_HUB_EYEBROW}</Text>
          <Text style={styles.heroTitle}>{VOICE_MATERIALS_HUB_TITLE}</Text>
          <Text style={styles.heroSub}>{VOICE_MATERIALS_HUB_SUB}</Text>
        </StaggerFadeIn>

        <StaggerFadeIn delay={10} preset="snappy">
          <SectionCard elevated style={styles.orchestrationCard}>
            {sectionsReady ? (
              <StaggerFadeIn
                delay={0}
                preset="snappy"
                revealKey={`${reports.total}-${actions.total}-${drafts.total}-${voiceNotes.total}-${sectionsWithErrors}`}
              >
                <Text style={styles.orchestrationKicker}>{VOICE_MATERIALS_ORCHESTRATION_KICKER}</Text>
                <Text style={styles.orchestrationHeadline}>Что готово и что дальше</Text>
                <Text style={styles.orchestrationRefreshHint}>{VOICE_MATERIALS_HUB_REFRESH_HINT}</Text>
                <Text style={styles.orchestrationPrimary}>{orchestrationLines.primary}</Text>
                {orchestrationLines.secondary ? (
                  <Text style={styles.orchestrationSecondary}>{orchestrationLines.secondary}</Text>
                ) : null}

                {voiceProductivity && voiceProductivity.voiceNotesTotal > 0 ? (
                  <View style={styles.voiceProductivityBlock}>
                    <Text style={styles.voiceProductivityLine}>
                      Заметки: {voiceProductivity.voiceNotesTotal} · С разбором:{" "}
                      {voiceProductivity.voiceNotesWithAnalysis}
                    </Text>
                    <Text style={styles.voiceProductivityLine}>
                      В результат: {voiceProductivity.uniqueVoiceNotesConverted}/
                      {voiceProductivity.voiceNotesTotal} (
                      {Math.round(voiceProductivity.conversionShare * 100)}%) · Материалов:{" "}
                      {voiceProductivity.voiceLinkedEntitiesTotal}
                    </Text>
                    <Text style={styles.voiceProductivityInsight}>
                      {sectionsWithErrors > 0
                        ? "Данные могут быть неполными — часть разделов ещё обновляется."
                        : buildVoiceProductivityInsight(voiceProductivity)}
                    </Text>
                    <Text style={styles.voiceProductivityHint} numberOfLines={1}>
                      {buildVoiceProductivityNextStep({
                        ...voiceProductivity,
                        sectionsWithErrors,
                      })}
                    </Text>
                  </View>
                ) : null}

                {sectionsWithErrors > 0 ? (
                  <View style={styles.partialNoticeWrap}>
                    <Text style={styles.partialNoticeText}>
                      Не все разделы ответили ({sectionsWithErrors} из {loadedSectionCount || 4}) — данные могут быть
                      неполными. Это не блокирует работу: откройте доступные блоки ниже или обновите экран.
                    </Text>
                  </View>
                ) : null}

                <Text style={styles.priorityStripCaption}>Сводка по разделам</Text>
                <View style={styles.priorityStripRow}>
                  <PriorityStripPill
                    label="Задачи"
                    section={actions}
                    onOpen={() => router.push("/created-actions")}
                  />
                  <PriorityStripPill
                    label="Черновики"
                    section={drafts}
                    onOpen={() => router.push("/parent-drafts")}
                  />
                  <PriorityStripPill
                    label="Отчёты"
                    section={reports}
                    onOpen={() => router.push("/created-reports")}
                  />
                  <PriorityStripPill
                    label="Голос"
                    section={voiceNotes}
                    onOpen={() => router.push("/voice-notes")}
                  />
                </View>

                <Text style={styles.orchestrationFoot}>Всего в хабе: {totalCreated}.</Text>

                <Text style={styles.nextStepsCaption}>Следующие шаги</Text>
                <View style={styles.orchestrationCtas}>
                  {orchestrationCtas.map((cta, i) => (
                    <PrimaryButton
                      key={`${cta.title}-${i}`}
                      animatedPress
                      title={cta.title}
                      variant={cta.variant}
                      onPress={cta.onPress}
                    />
                  ))}
                </View>
              </StaggerFadeIn>
            ) : (
              <HubSummarySkeleton />
            )}
          </SectionCard>
        </StaggerFadeIn>

        {nothingCreated ? (
          <StaggerFadeIn delay={30} preset="snappy">
            <SectionCard elevated style={styles.emptyCard}>
              <View style={styles.emptyAccent} />
              <Text style={styles.emptyTitle}>Пока без материалов</Text>
              <Text style={styles.emptyText}>
                Отчёты, задачи, черновики и история голосовых заметок появятся здесь после сохранения. Обычно цикл
                начинается с короткой голосовой заметки — затем материалы можно увидеть в этой сводке.
              </Text>
              <View style={styles.emptyActions}>
                <PrimaryButton animatedPress title="Новая голосовая заметка" onPress={() => router.push("/voice-note")} />
                <PrimaryButton
                  animatedPress
                  title="На главную"
                  variant="outline"
                  onPress={() => router.push(TABS_HOME)}
                />
              </View>
            </SectionCard>
          </StaggerFadeIn>
        ) : null}

        <StaggerFadeIn delay={38} preset="snappy">
        <SectionCard elevated style={styles.sectionCard}>
          <SectionHeader
            title="Отчёты"
            subtitle={`Последние записи (${describeTotal(reports.total, "отчётов", "отчёт")})`}
            total={reports.total}
            onAll={() => router.push("/created-reports")}
          />
          {reports.items.length === 0 ? (
            <SectionState
              loading={reports.loading}
              error={reports.error}
              emptyText="Отчёты появятся после подготовки итогов — в том числе из голосовой заметки."
            />
          ) : (
            reports.items.map((x) => (
              <PreviewRow
                key={x.id}
                title={x.title}
                subtitle={x.contentPreview || "Краткое содержание отчёта доступно внутри."}
                meta={[formatVoiceDateTimeCompactRu(x.createdAt), x.playerName ?? ""].filter(Boolean).join(" · ")}
                onPress={() => router.push(`/created-reports/${x.id}` as Href)}
                fromVoiceNote={hasVoiceNoteLink(x.voiceNoteId)}
              />
            ))
          )}
        </SectionCard>
        </StaggerFadeIn>

        <StaggerFadeIn delay={50} preset="snappy">
        <SectionCard elevated style={styles.sectionCard}>
          <SectionHeader
            title="Задачи"
            subtitle={`К исполнению (${describeTotal(actions.total, "задач", "задача")})`}
            total={actions.total}
            onAll={() => router.push("/created-actions")}
          />
          {actions.items.length === 0 ? (
            <SectionState
              loading={actions.loading}
              error={actions.error}
              emptyText="Задачи появятся после фиксации шагов — в том числе из голосовой заметки."
            />
          ) : (
            actions.items.map((x) => (
              <PreviewRow
                key={x.id}
                title={x.title}
                subtitle={x.descriptionPreview || "Описание задачи доступно в карточке."}
                meta={[formatVoiceDateTimeCompactRu(x.createdAt), x.status, x.playerName ?? ""].filter(Boolean).join(" · ")}
                onPress={() => router.push(`/created-actions/${x.id}` as Href)}
                fromVoiceNote={hasVoiceNoteLink(x.voiceNoteId)}
              />
            ))
          )}
        </SectionCard>
        </StaggerFadeIn>

        <StaggerFadeIn delay={62} preset="snappy">
        <SectionCard elevated style={styles.sectionCard}>
          <SectionHeader
            title="Черновики родителям"
            subtitle={`Подготовка коммуникации (${describeTotal(drafts.total, "черновиков", "черновик")})`}
            total={drafts.total}
            onAll={() => router.push("/parent-drafts")}
          />
          {drafts.items.length === 0 ? (
            <SectionState
              loading={drafts.loading}
              error={drafts.error}
              emptyText="Черновики появятся после подготовки сообщений — наблюдения, серия или голосовой сценарий."
            />
          ) : (
            drafts.items.map((x) => (
              <PreviewRow
                key={x.id}
                title={x.playerName}
                subtitle={x.preview || "Черновик доступен для проверки и редактирования."}
                onPress={() => router.push("/parent-drafts")}
                fromVoiceNote={hasParentDraftVoiceNoteLink(x.source, x.voiceNoteId)}
              />
            ))
          )}
        </SectionCard>
        </StaggerFadeIn>

        <StaggerFadeIn delay={74} preset="snappy">
        <SectionCard elevated style={styles.sectionCard}>
          <SectionHeader
            title="Голосовые заметки"
            subtitle={`Исходные записи (${describeTotal(voiceNotes.total, "голосовых заметок", "голосовая заметка")})`}
            total={voiceNotes.total}
            onAll={() => router.push("/voice-notes")}
          />
          {voiceNotes.items.length === 0 ? (
            <SectionState
              loading={voiceNotes.loading}
              error={voiceNotes.error}
              emptyText="Здесь будет храниться история ваших голосовых заметок."
            />
          ) : (
            voiceNotes.items.map((x) => (
              <PreviewRow
                key={x.id}
                title={x.summary?.trim() || "Голосовая заметка"}
                subtitle={x.transcriptPreview || "Откройте заметку, чтобы увидеть расшифровку и связанные материалы."}
                meta={[formatVoiceDateTimeCompactRu(x.createdAt), x.playerName ?? ""].filter(Boolean).join(" · ")}
                onPress={() => router.push(`/voice-notes/${x.id}` as Href)}
              />
            ))
          )}
        </SectionCard>
        </StaggerFadeIn>

        <StaggerFadeIn delay={86} preset="snappy">
          <PrimaryButton animatedPress title="Обновить материалы" variant="ghost" onPress={() => fetchAll()} />
        </StaggerFadeIn>
      </ScrollView>
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  content: { paddingBottom: theme.spacing.xxl },
  heroEyebrow: {
    fontSize: 11,
    fontWeight: "600",
    letterSpacing: 0.5,
    color: theme.colors.textMuted,
    textTransform: "uppercase",
    marginBottom: theme.spacing.xs,
  },
  heroTitle: {
    fontSize: 28,
    fontWeight: "700",
    letterSpacing: -0.5,
    color: theme.colors.text,
    lineHeight: 34,
    marginBottom: theme.spacing.sm,
  },
  heroSub: {
    ...theme.typography.caption,
    color: theme.colors.textMuted,
    marginBottom: theme.spacing.lg,
    lineHeight: 18,
  },
  orchestrationCard: {
    borderLeftWidth: 4,
    borderLeftColor: theme.colors.primary,
    marginBottom: theme.spacing.xl,
  },
  orchestrationKicker: {
    fontSize: 11,
    fontWeight: "600",
    letterSpacing: 0.5,
    color: theme.colors.textMuted,
    textTransform: "uppercase",
    marginBottom: theme.spacing.xs,
  },
  orchestrationHeadline: {
    ...theme.typography.title,
    color: theme.colors.text,
    marginBottom: theme.spacing.sm,
  },
  orchestrationRefreshHint: {
    ...theme.typography.caption,
    fontSize: 12,
    color: theme.colors.textMuted,
    lineHeight: 17,
    marginBottom: theme.spacing.sm,
  },
  orchestrationPrimary: {
    ...theme.typography.caption,
    color: theme.colors.textSecondary,
    lineHeight: 20,
  },
  orchestrationSecondary: {
    ...theme.typography.caption,
    color: theme.colors.textMuted,
    marginTop: theme.spacing.xs,
    lineHeight: 20,
  },
  voiceProductivityBlock: {
    marginTop: theme.spacing.sm,
    paddingTop: theme.spacing.sm,
    borderTopWidth: 1,
    borderTopColor: theme.colors.cardBorder,
  },
  voiceProductivityLine: {
    ...theme.typography.caption,
    color: theme.colors.textSecondary,
    lineHeight: 20,
  },
  voiceProductivityInsight: {
    ...theme.typography.caption,
    color: theme.colors.textMuted,
    lineHeight: 18,
    marginTop: theme.spacing.xs,
  },
  voiceProductivityHint: {
    ...theme.typography.caption,
    color: theme.colors.textMuted,
    lineHeight: 18,
    marginTop: theme.spacing.xs,
  },
  partialNoticeWrap: {
    marginTop: theme.spacing.md,
    paddingVertical: theme.spacing.sm,
    paddingHorizontal: theme.spacing.sm,
    borderRadius: theme.borderRadius.md,
    backgroundColor: theme.colors.accentMuted,
    borderWidth: 1,
    borderColor: theme.colors.cardBorder,
  },
  partialNoticeText: {
    ...theme.typography.caption,
    color: theme.colors.textSecondary,
    lineHeight: 18,
  },
  priorityStripCaption: {
    fontSize: 11,
    fontWeight: "600",
    letterSpacing: 0.4,
    color: theme.colors.textMuted,
    textTransform: "uppercase",
    marginTop: theme.spacing.lg,
    marginBottom: theme.spacing.sm,
  },
  priorityStripRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: theme.spacing.sm,
  },
  priorityStripPill: {
    flexGrow: 1,
    minWidth: 76,
    borderRadius: theme.borderRadius.md,
    backgroundColor: theme.colors.surfaceElevated,
    paddingHorizontal: theme.spacing.sm,
    paddingVertical: theme.spacing.sm,
    borderWidth: 1,
    borderColor: theme.colors.cardBorder,
  },
  priorityStripPillSoft: {
    borderColor: theme.colors.border,
    opacity: 0.9,
  },
  priorityStripPillSkeleton: {
    minHeight: 52,
    paddingHorizontal: 0,
    paddingVertical: 0,
    backgroundColor: theme.colors.border,
    borderColor: "transparent",
  },
  priorityStripValue: {
    ...theme.typography.subtitle,
    color: theme.colors.text,
  },
  priorityStripValueMuted: {
    color: theme.colors.textMuted,
  },
  priorityStripLabel: {
    ...theme.typography.caption,
    fontSize: 11,
    color: theme.colors.textMuted,
    marginTop: 2,
  },
  orchestrationFoot: {
    ...theme.typography.caption,
    color: theme.colors.textMuted,
    marginTop: theme.spacing.md,
    lineHeight: 18,
  },
  nextStepsCaption: {
    fontSize: 11,
    fontWeight: "600",
    letterSpacing: 0.4,
    color: theme.colors.textMuted,
    textTransform: "uppercase",
    marginTop: theme.spacing.lg,
    marginBottom: theme.spacing.sm,
  },
  orchestrationCtas: {
    gap: theme.spacing.sm,
  },
  pulseBlocksWrap: {
    gap: theme.spacing.sm,
    marginBottom: theme.spacing.sm,
  },
  pulseBlock: {
    height: 11,
    borderRadius: theme.borderRadius.sm,
    backgroundColor: theme.colors.border,
    width: "100%",
  },
  pulseBlockMid: { width: "88%" },
  pulseBlockShort: { width: "62%" },
  sectionLoaderIcon: {
    marginBottom: theme.spacing.sm,
  },
  emptySectionWrap: {
    paddingVertical: theme.spacing.md,
    paddingHorizontal: theme.spacing.xs,
  },
  emptySectionLine: {
    width: 36,
    height: 3,
    borderRadius: 2,
    backgroundColor: theme.colors.primaryMuted,
    marginBottom: theme.spacing.sm,
  },
  emptyActions: {
    gap: theme.spacing.sm,
  },
  emptyCard: {
    borderLeftWidth: 4,
    borderLeftColor: theme.colors.textMuted,
    marginBottom: theme.spacing.xl,
    position: "relative",
    overflow: "hidden",
  },
  emptyAccent: {
    position: "absolute",
    top: -20,
    right: -20,
    width: 96,
    height: 96,
    borderRadius: 48,
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
    lineHeight: 18,
  },
  sectionCard: {
    marginBottom: theme.spacing.xl,
    borderLeftWidth: 4,
    borderLeftColor: theme.colors.border,
  },
  sectionHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  sectionTitleWrap: {
    flexDirection: "row",
    alignItems: "baseline",
    gap: theme.spacing.xs,
  },
  sectionTitle: {
    ...theme.typography.subtitle,
    color: theme.colors.text,
  },
  sectionCount: {
    ...theme.typography.caption,
    color: theme.colors.textMuted,
  },
  sectionSubtitle: {
    ...theme.typography.caption,
    color: theme.colors.textMuted,
    marginTop: 2,
    marginBottom: theme.spacing.md,
    lineHeight: 18,
  },
  allBtn: {
    paddingVertical: 6,
    paddingHorizontal: 10,
  },
  allBtnText: {
    fontSize: 12,
  },
  previewRow: {
    paddingVertical: theme.spacing.sm,
    borderTopWidth: 1,
    borderTopColor: theme.colors.border,
  },
  previewTitleRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: theme.spacing.sm,
    marginBottom: 2,
  },
  previewTitle: {
    ...theme.typography.body,
    color: theme.colors.text,
    flex: 1,
    minWidth: 0,
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
    flexShrink: 0,
  },
  previewSubtitle: {
    ...theme.typography.caption,
    color: theme.colors.textSecondary,
    lineHeight: 18,
  },
  previewMeta: {
    ...theme.typography.caption,
    color: theme.colors.textMuted,
    marginTop: 4,
  },
  inlineState: {
    paddingVertical: theme.spacing.sm,
  },
  inlineStateText: {
    ...theme.typography.caption,
    color: theme.colors.textMuted,
  },
  inlineNeutral: {
    ...theme.typography.caption,
    color: theme.colors.textSecondary,
  },
});

