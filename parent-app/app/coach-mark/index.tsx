import { useState, useEffect, useCallback } from "react";
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  RefreshControl,
  Pressable,
  Share,
  Alert,
} from "react-native";
import { useLocalSearchParams, useRouter } from "expo-router";
import * as FileSystem from "expo-file-system";
import * as Sharing from "expo-sharing";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { useAuth } from "@/context/AuthContext";
import {
  getCoachMarkNotes,
  getCoachMarkWeeklyPlans,
  getCoachMarkCalendarItems,
} from "@/services/coachMarkStorage";
import { getCoachMarkCheckins } from "@/services/coachMarkCheckins";
import {
  getCoachMarkMemories,
  getMemoryKeyLabel,
  deleteCoachMarkMemory,
} from "@/services/coachMarkMemory";
import {
  generateCoachMarkCalendarShareText,
  generateCoachMarkICS,
} from "@/services/coachMarkCalendarExport";
import {
  getCoachMarkRecommendedCoaches,
  type CoachMarkRecommendedCoach,
} from "@/services/coachMarkRecommendations";
import type {
  CoachMarkNote,
  CoachMarkWeeklyPlan,
  CoachMarkCalendarItem,
} from "@/services/coachMarkStorage";
import type { CoachMarkCheckin } from "@/services/coachMarkCheckins";
import type { CoachMarkMemory } from "@/services/coachMarkMemory";
import {
  computeCoachMarkNudges,
  type CoachMarkNudge,
} from "@/services/coachMarkNudges";
import {
  getCoachMarkMessages,
  generateWeeklyCheckinWithCoachMark,
} from "@/services/chatService";
import { getPlayerContextForCoachMark } from "@/services/playerService";
import { FlagshipScreen } from "@/components/layout/FlagshipScreen";
import { useSubscription } from "@/context/SubscriptionContext";
import { colors, spacing, typography, radius } from "@/constants/theme";
import { triggerHaptic } from "@/lib/haptics";
import { trackCoachMarkEvent } from "@/lib/coachMarkAnalytics";
import { COACH_MARK_ID } from "@/services/chatService";

const PRESSED_OPACITY = 0.88;

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString("ru-RU", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

function truncate(str: string, max: number): string {
  if (str.length <= max) return str;
  return str.slice(0, max).trim() + "…";
}

function EmptySection({
  icon,
  title,
  onAction,
  actionLabel = "Открыть чат",
}: {
  icon: keyof typeof Ionicons.glyphMap;
  title: string;
  onAction?: () => void;
  actionLabel?: string;
}) {
  return (
    <View style={styles.emptySection}>
      <Ionicons name={icon} size={28} color={colors.textMuted} />
      <Text style={styles.emptyText}>{title}</Text>
      {onAction && (
        <Pressable
          style={({ pressed }) => [styles.emptyBtn, pressed && { opacity: PRESSED_OPACITY }]}
          onPress={onAction}
        >
          <Text style={styles.emptyBtnText}>{actionLabel}</Text>
        </Pressable>
      )}
    </View>
  );
}

export default function CoachMarkHubScreen() {
  const { playerId } = useLocalSearchParams<{ playerId?: string }>();
  const router = useRouter();
  const { user } = useAuth();
  const { hasProOrAbove } = useSubscription();
  const insets = useSafeAreaInsets();
  const [notes, setNotes] = useState<CoachMarkNote[]>([]);
  const [plans, setPlans] = useState<CoachMarkWeeklyPlan[]>([]);
  const [calendarItems, setCalendarItems] = useState<CoachMarkCalendarItem[]>([]);
  const [memories, setMemories] = useState<CoachMarkMemory[]>([]);
  const [nudges, setNudges] = useState<CoachMarkNudge[]>([]);
  const [recommendedCoaches, setRecommendedCoaches] = useState<CoachMarkRecommendedCoach[]>([]);
  const [checkins, setCheckins] = useState<CoachMarkCheckin[]>([]);
  const [checkinGenerating, setCheckinGenerating] = useState(false);
  const [exportInProgress, setExportInProgress] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [hubLoading, setHubLoading] = useState(true);
  const [hubError, setHubError] = useState(false);
  const [needsOnboarding, setNeedsOnboarding] = useState(false);

  const load = useCallback(async () => {
    if (!user?.id) return;
    setHubError(false);
    try {
      const [n, p, c, chat, mem, chk] = await Promise.all([
        getCoachMarkNotes(user.id, playerId ?? null),
        getCoachMarkWeeklyPlans(user.id, playerId ?? null),
        getCoachMarkCalendarItems(user.id, playerId ?? null),
        getCoachMarkMessages(user.id),
        getCoachMarkMemories(user.id, playerId ?? null),
        getCoachMarkCheckins(user.id, playerId ?? null),
      ]);
      setNotes(n);
      setPlans(p);
      setCalendarItems(c);
      setMemories(mem);
      const hasRecentAI = chat.some(
        (m) => m.isAI || m.senderId === COACH_MARK_ID
      );
      const computed = computeCoachMarkNudges({
        notesCount: n.length,
        plansCount: p.length,
        calendarItemsCount: c.length,
        playerId: playerId ?? null,
        hasRecentAIMessages: hasRecentAI,
      });
      setNudges(computed);
      const recs = await getCoachMarkRecommendedCoaches(
        { memories: mem, plans: p, calendarItems: c },
        user.id
      );
      setRecommendedCoaches(recs);
      setCheckins(chk);
      const hasAnyAI = chat.some(
        (m) => m.isAI || m.senderId === COACH_MARK_ID
      );
      setNeedsOnboarding(
        n.length === 0 &&
          p.length === 0 &&
          chk.length === 0 &&
          !hasAnyAI
      );
    } catch {
      trackCoachMarkEvent("coachmark_hub_load_error");
      setNotes([]);
      setPlans([]);
      setCalendarItems([]);
      setMemories([]);
      setNudges([]);
      setRecommendedCoaches([]);
      setCheckins([]);
      setNeedsOnboarding(true);
      setHubError(true);
    } finally {
      setRefreshing(false);
      setHubLoading(false);
    }
  }, [user?.id, playerId]);

  useEffect(() => {
    if (__DEV__) console.log("[CoachMark] Hub screen ENTER", { playerId });
    trackCoachMarkEvent("coachmark_hub_open");
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    load();
  }, [load]);

  const handleExportCalendar = useCallback(async () => {
    if (calendarItems.length === 0) {
      Alert.alert(
        "Нет событий",
        "Сначала подготовьте план для календаря из чата Coach Mark."
      );
      return;
    }
    if (exportInProgress) return;
    triggerHaptic();
    setExportInProgress(true);
    const shareText = generateCoachMarkCalendarShareText(calendarItems);
    const icsContent = generateCoachMarkICS(calendarItems);
    try {
      const available = await Sharing.isAvailableAsync();
      if (available) {
        const filename = `coach-mark-plan-${Date.now()}.ics`;
        const uri = `${FileSystem.cacheDirectory}${filename}`;
        await FileSystem.writeAsStringAsync(uri, icsContent, {
          encoding: FileSystem.EncodingType.UTF8,
        });
        await Sharing.shareAsync(uri, {
          mimeType: "text/calendar",
          dialogTitle: "Экспорт в календарь",
        });
        setExportInProgress(false);
        return;
      }
    } catch {
      // Fallback to text share
    }
    try {
      await Share.share({
        message: shareText,
        title: "Coach Mark — План недели",
      });
    } catch {
      Alert.alert("Не получилось", "Не удалось открыть меню экспорта.");
    }
    setExportInProgress(false);
  }, [calendarItems, exportInProgress]);

  const goToChat = useCallback(
    (nudgePlayerId?: string) => {
      triggerHaptic();
      const id = nudgePlayerId ?? playerId;
      const q = id ? `?playerId=${encodeURIComponent(id)}` : "";
      router.push(`/chat/${COACH_MARK_ID}${q}`);
    },
    [router, playerId]
  );

  const goToWeeklyPlan = useCallback(() => {
    triggerHaptic();
    const params = new URLSearchParams();
    if (playerId) params.set("playerId", playerId);
    params.set("initialMessage", "Составь недельный план развития на эту неделю");
    router.push(`/chat/${COACH_MARK_ID}?${params.toString()}`);
  }, [router, playerId]);

  const handleGenerateCheckin = useCallback(async () => {
    if (!user?.id || checkinGenerating) return;
    triggerHaptic();
    setCheckinGenerating(true);
    try {
      const [chat, mem] = await Promise.all([
        getCoachMarkMessages(user.id),
        getCoachMarkMemories(user.id, playerId ?? null),
      ]);
      const memories = mem.map((m) => ({ key: m.key, value: m.value }));
      const playerContext = playerId
        ? await getPlayerContextForCoachMark(playerId, user.id)
        : null;
      const { savedCheckin } = await generateWeeklyCheckinWithCoachMark(
        user.id,
        chat,
        playerContext,
        memories,
        playerId ?? null
      );
      if (savedCheckin) {
        setCheckins((prev) => [savedCheckin, ...prev]);
      }
    } catch {
      Alert.alert("Не получилось", "Не удалось сгенерировать проверку.");
    } finally {
      setCheckinGenerating(false);
    }
  }, [user?.id, playerId, checkinGenerating]);

  const lastCheckin = checkins[0];

  if (!user?.id) {
    return (
      <FlagshipScreen scroll={false}>
        <View style={styles.centered}>
          <Text style={styles.centeredText}>Требуется вход</Text>
        </View>
      </FlagshipScreen>
    );
  }

  const paddingBottom = insets.bottom + spacing.xxl;

  if (hubLoading && notes.length === 0 && plans.length === 0) {
    return (
      <FlagshipScreen scroll={false}>
        <View style={styles.hubSkeleton}>
          <View style={styles.hubSkeletonCard} />
          <View style={styles.hubSkeletonCard} />
          <View style={styles.hubSkeletonCard} />
          <Text style={styles.hubSkeletonText}>Подготовка…</Text>
        </View>
      </FlagshipScreen>
    );
  }

  if (hubError && notes.length === 0 && plans.length === 0) {
    return (
      <FlagshipScreen scroll={false}>
        <View style={styles.errorWrap}>
          <Ionicons name="cloud-offline-outline" size={48} color={colors.textMuted} />
          <Text style={styles.errorTitle}>Не получилось загрузить</Text>
          <Text style={styles.errorSub}>Проверьте подключение и нажмите «Повторить»</Text>
          <Pressable
            style={({ pressed }) => [styles.retryBtn, pressed && { opacity: PRESSED_OPACITY }]}
            onPress={() => {
              triggerHaptic();
              setHubLoading(true);
              load();
            }}
          >
            <Text style={styles.retryBtnText}>Повторить</Text>
          </Pressable>
          <Pressable
            style={({ pressed }) => [styles.backLink, pressed && { opacity: PRESSED_OPACITY }]}
            onPress={() => {
              triggerHaptic();
              router.back();
            }}
          >
            <Text style={styles.backLinkText}>Назад</Text>
          </Pressable>
        </View>
      </FlagshipScreen>
    );
  }

  return (
    <FlagshipScreen scroll={false}>
      <ScrollView
        style={styles.scroll}
        contentContainerStyle={[styles.content, { paddingBottom }]}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor={colors.accent}
          />
        }
      >
        {/* Hero — для пользователей с контентом */}
        {!needsOnboarding && (
          <View style={styles.heroBlock}>
            <View style={styles.heroIconWrap}>
              <Ionicons name="sparkles" size={28} color={colors.accent} />
            </View>
            <Text style={styles.heroTitle}>Coach Mark</Text>
            <Text style={styles.heroSub}>
              Ваш персональный хоккейный наставник. Советы, планы, рекомендации — всё в одном месте.
            </Text>
            <View style={styles.quickActionsRow}>
              <Pressable
                style={({ pressed }) => [
                  styles.quickActionPrimary,
                  pressed && { opacity: PRESSED_OPACITY },
                ]}
                onPress={() => goToChat()}
              >
                <Ionicons name="chatbubble-outline" size={18} color={colors.onAccent} />
                <Text style={styles.quickActionPrimaryText}>Открыть чат</Text>
              </Pressable>
              <Pressable
                style={({ pressed }) => [
                  styles.quickActionSecondary,
                  pressed && { opacity: PRESSED_OPACITY },
                ]}
                onPress={goToWeeklyPlan}
              >
                <Ionicons name="calendar-outline" size={18} color={colors.accent} />
                <Text style={styles.quickActionSecondaryText}>Недельный план</Text>
              </Pressable>
            </View>
          </View>
        )}

        {/* Onboarding */}
        {needsOnboarding && (
          <View style={styles.onboardingBlock}>
            <View style={styles.onboardingIconWrap}>
              <Ionicons name="sparkles" size={32} color={colors.accent} />
            </View>
            <Text style={styles.onboardingTitle}>Coach Mark</Text>
            <Text style={styles.onboardingText}>
              Ваш персональный хоккейный наставник. Советы, планы, рекомендации тренеров — всё в одном месте.
            </Text>
            <View style={styles.onboardingCtaRow}>
              <Pressable
                style={({ pressed }) => [
                  styles.onboardingCtaPrimary,
                  pressed && { opacity: PRESSED_OPACITY },
                ]}
                onPress={() => goToChat(playerId)}
              >
                <Text style={styles.onboardingCtaPrimaryText}>
                  Задать первый вопрос
                </Text>
              </Pressable>
              <Pressable
                style={({ pressed }) => [
                  styles.onboardingCtaSecondary,
                  pressed && { opacity: PRESSED_OPACITY },
                ]}
                onPress={() => {
                  triggerHaptic();
                  const params = new URLSearchParams();
                  if (playerId) params.set("playerId", playerId);
                  params.set(
                    "initialMessage",
                    "Составь недельный план развития на эту неделю"
                  );
                  router.push(`/chat/${COACH_MARK_ID}?${params.toString()}`);
                }}
              >
                <Text style={styles.onboardingCtaSecondaryText}>
                  Составить недельный план
                </Text>
              </Pressable>
            </View>
          </View>
        )}

        {/* Nudges */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Подсказки Coach Mark</Text>
          {nudges.length === 0 ? (
            <View style={[styles.nudgeCard, styles.nudgeAllGoodCard]}>
              <Ionicons name="checkmark-circle" size={24} color={colors.success} />
              <Text style={styles.nudgeAllGood}>Всё под контролем</Text>
            </View>
          ) : (
            nudges.map((nudge) => (
              <Pressable
                key={nudge.id}
                style={({ pressed }) => [
                  styles.nudgeCard,
                  styles.nudgeCardPressable,
                  pressed && { opacity: PRESSED_OPACITY },
                ]}
                onPress={() => goToChat(nudge.playerId)}
              >
                <Text style={styles.cardTitle}>{nudge.title}</Text>
                <Text style={styles.cardText}>{nudge.description}</Text>
                <View style={styles.nudgeActionRow}>
                  <Text style={styles.nudgeActionText}>Открыть чат</Text>
                  <Ionicons name="chevron-forward" size={18} color={colors.accent} />
                </View>
              </Pressable>
            ))
          )}
        </View>

        {/* Premium Value */}
        {!hasProOrAbove && (
          <View style={styles.premiumValueBlock}>
            <View style={styles.premiumValueIconWrap}>
              <Ionicons name="diamond-outline" size={24} color={colors.accent} />
            </View>
            <Text style={styles.premiumValueTitle}>Coach Mark и Premium</Text>
            <Text style={styles.premiumValueText}>
              Coach Mark уже помогает: недельные планы, экспорт в календарь,
              рекомендации тренеров, память о семье и игроке. С Premium —
              персональные weekly check-ins и полный доступ ко всем инструментам.
            </Text>
            <Pressable
              style={({ pressed }) => [
                styles.premiumValueCta,
                pressed && { opacity: PRESSED_OPACITY },
              ]}
              onPress={() => {
                triggerHaptic();
                router.push("/subscription");
              }}
            >
              <Text style={styles.premiumValueCtaText}>Узнать о Premium</Text>
              <Ionicons name="chevron-forward" size={18} color={colors.onAccent} />
            </Pressable>
          </View>
        )}

        {/* Weekly Check-in */}
        <View style={styles.section}>
          {lastCheckin ? (
            <View style={styles.sectionHeaderRow}>
              <Text style={styles.sectionTitle}>Еженедельная проверка Coach Mark</Text>
              <Pressable
                style={({ pressed }) => [
                  styles.exportBtn,
                  pressed && { opacity: PRESSED_OPACITY },
                ]}
                onPress={handleGenerateCheckin}
                disabled={checkinGenerating}
              >
                {checkinGenerating ? (
                  <Text style={styles.exportBtnText}>Генерация…</Text>
                ) : (
                  <>
                    <Ionicons name="refresh-outline" size={18} color={colors.accent} />
                    <Text style={styles.exportBtnText}>Сделать проверку</Text>
                  </>
                )}
              </Pressable>
            </View>
          ) : (
            <Text style={styles.sectionTitle}>Еженедельная проверка Coach Mark</Text>
          )}
          {!lastCheckin ? (
            checkinGenerating ? (
              <View style={styles.emptySection}>
                <Ionicons name="hourglass-outline" size={28} color={colors.textMuted} />
                <Text style={styles.emptyText}>Генерация проверки…</Text>
              </View>
            ) : (
              <EmptySection
                icon="checkmark-done-outline"
                title="Пока нет еженедельных проверок"
                onAction={handleGenerateCheckin}
                actionLabel="Сделать проверку"
              />
            )
          ) : (
            <View style={styles.card}>
              <Text style={styles.cardText} numberOfLines={4}>
                {truncate(lastCheckin.summary, 300)}
              </Text>
              {lastCheckin.nextStep ? (
                <>
                  <Text style={styles.cardMeta}>Следующий шаг</Text>
                  <Text style={styles.cardText} numberOfLines={2}>
                    {truncate(lastCheckin.nextStep, 150)}
                  </Text>
                </>
              ) : null}
              <Text style={styles.cardMeta}>{formatDate(lastCheckin.createdAt)}</Text>
            </View>
          )}
        </View>

        {/* Recommended Trainers */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Coach Mark рекомендует тренеров</Text>
          {recommendedCoaches.length === 0 ? (
            <EmptySection
              icon="person-outline"
              title="Пока нет рекомендуемых тренеров"
              onAction={goToChat}
            />
          ) : (
              recommendedCoaches.map((coach) => (
                <Pressable
                  key={coach.id}
                  style={({ pressed }) => [
                    styles.card,
                    styles.coachCard,
                    pressed && { opacity: PRESSED_OPACITY },
                  ]}
                  onPress={() => {
                    triggerHaptic();
                    router.push(`/marketplace/coach/${coach.id}`);
                  }}
                >
                  <View style={styles.coachCardRow}>
                    <View style={styles.coachCardContent}>
                      <Text style={styles.cardTitle}>{coach.fullName}</Text>
                      <Text style={styles.cardMeta}>
                        {coach.specialization}
                        {coach.city ? ` · ${coach.city}` : ""}
                      </Text>
                      <View style={styles.coachCardMeta}>
                        <Text style={styles.cardMeta}>
                          ★ {coach.rating.toFixed(1)}
                        </Text>
                        <Text style={styles.cardMeta}>
                          от {coach.price.toLocaleString("ru-RU")} ₽
                        </Text>
                      </View>
                    </View>
                    <View style={styles.coachCardAction}>
                      <Text style={styles.exportBtnText}>Открыть</Text>
                      <Ionicons name="chevron-forward" size={18} color={colors.accent} />
                    </View>
                  </View>
                </Pressable>
              ))
            )}
        </View>

        {/* Memory */}
        <View style={styles.section}>
          <View style={styles.sectionTitleRow}>
            <Text style={styles.sectionTitle}>Что Coach Mark запомнил</Text>
            {memories.length > 0 && (
              <View style={styles.memoryCountBadge}>
                <Text style={styles.memoryCountText}>{memories.length}</Text>
              </View>
            )}
          </View>
          {memories.length === 0 ? (
            <EmptySection
              icon="bulb-outline"
              title="Пока ничего не запомнено. Долгое нажатие на ответ в чате — сохранить."
              onAction={goToChat}
              actionLabel="Открыть чат"
            />
          ) : (
            memories.slice(0, 10).map((m) => (
              <View key={m.id} style={styles.memoryCard}>
                <View style={styles.memoryCardContent}>
                  <Text style={styles.cardMeta}>
                    {getMemoryKeyLabel(m.key)}
                  </Text>
                  <Text style={styles.cardText} numberOfLines={3}>
                    {truncate(m.value, 150)}
                  </Text>
                  <Text style={styles.cardMeta}>{formatDate(m.createdAt)}</Text>
                </View>
                <Pressable
                  style={({ pressed }) => [
                    styles.memoryDeleteBtn,
                    pressed && { opacity: PRESSED_OPACITY },
                  ]}
                  onPress={() => {
                    triggerHaptic();
                    Alert.alert(
                      "Удалить из памяти?",
                      "Coach Mark перестанет учитывать этот факт в разговорах.",
                      [
                        { text: "Отмена", style: "cancel" },
                        {
                          text: "Удалить",
                          style: "destructive",
                          onPress: async () => {
                            if (!user?.id) return;
                            const ok = await deleteCoachMarkMemory(user.id, m.id);
                            if (ok) {
                              trackCoachMarkEvent("coachmark_memory_delete", { memoryKey: m.key });
                              load();
                            }
                          },
                        },
                      ]
                    );
                  }}
                >
                  <Ionicons name="trash-outline" size={18} color={colors.textMuted} />
                </Pressable>
              </View>
            ))
          )}
        </View>

        {/* Notes */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Заметки</Text>
          {notes.length === 0 ? (
            <EmptySection
              icon="document-text-outline"
              title="Пока нет заметок"
              onAction={goToChat}
            />
          ) : (
            notes.slice(0, 10).map((note) => (
              <View key={note.id} style={styles.card}>
                <Text style={styles.cardText} numberOfLines={4}>
                  {truncate(note.text, 200)}
                </Text>
                <Text style={styles.cardMeta}>{formatDate(note.createdAt)}</Text>
              </View>
            ))
          )}
        </View>

        {/* Weekly Plans */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Недельные планы</Text>
          {plans.length === 0 ? (
            <EmptySection
              icon="calendar-outline"
              title="Пока нет недельных планов"
              onAction={goToChat}
            />
          ) : (
            plans.slice(0, 5).map((plan) => (
              <View key={plan.id} style={styles.card}>
                <Text style={styles.cardTitle}>{plan.focus || "Недельный план"}</Text>
                <Text style={styles.cardMeta}>
                  {plan.items.length} дней · {formatDate(plan.createdAt)}
                </Text>
              </View>
            ))
          )}
        </View>

        {/* Calendar Items */}
        <View style={styles.section}>
          <View style={styles.sectionHeaderRow}>
            <Text style={styles.sectionTitle}>Подготовлено для календаря</Text>
            {calendarItems.length > 0 && (
              <Pressable
                style={({ pressed }) => [
                  styles.exportBtn,
                  (pressed || exportInProgress) && { opacity: PRESSED_OPACITY },
                ]}
                onPress={handleExportCalendar}
                disabled={exportInProgress}
              >
                <Ionicons name="share-outline" size={18} color={colors.accent} />
                <Text style={styles.exportBtnText}>Экспортировать</Text>
              </Pressable>
            )}
          </View>
          {calendarItems.length === 0 ? (
            <EmptySection
              icon="calendar-outline"
              title="Пока нет событий для календаря"
              onAction={goToChat}
            />
          ) : (
            calendarItems.slice(0, 10).map((item) => (
              <View key={item.id} style={styles.card}>
                <Text style={styles.cardTitle}>{item.title}</Text>
                <Text style={styles.cardMeta}>
                  {item.day}
                  {item.suggestedTime ? ` · ${item.suggestedTime}` : ""}
                  {item.durationMinutes ? ` · ${item.durationMinutes} мин` : ""}
                </Text>
                {item.details ? (
                  <Text style={styles.cardText} numberOfLines={2}>
                    {truncate(item.details, 100)}
                  </Text>
                ) : null}
              </View>
            ))
          )}
        </View>
      </ScrollView>
    </FlagshipScreen>
  );
}

const styles = StyleSheet.create({
  scroll: { flex: 1 },
  content: {
    padding: spacing.screenPadding,
    paddingTop: spacing.lg,
  },
  section: {
    marginBottom: spacing.xxl,
  },
  heroBlock: {
    backgroundColor: colors.accentSoft,
    borderWidth: 1,
    borderColor: "rgba(59,130,246,0.25)",
    borderRadius: radius.lg,
    padding: spacing.lg,
    marginBottom: spacing.xxl,
  },
  heroIconWrap: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: "rgba(59,130,246,0.15)",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: spacing.md,
  },
  heroTitle: {
    ...typography.h3,
    color: colors.text,
    marginBottom: spacing.xs,
  },
  heroSub: {
    ...typography.bodySmall,
    color: colors.textSecondary,
    lineHeight: 20,
    marginBottom: spacing.lg,
  },
  quickActionsRow: {
    flexDirection: "row",
    gap: spacing.md,
  },
  quickActionPrimary: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: spacing.sm,
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.lg,
    backgroundColor: colors.accent,
    borderRadius: radius.md,
  },
  quickActionPrimaryText: {
    ...typography.bodySmall,
    fontWeight: "600",
    color: colors.onAccent,
  },
  quickActionSecondary: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: spacing.sm,
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.lg,
    borderWidth: 1,
    borderColor: colors.accent,
    borderRadius: radius.md,
  },
  quickActionSecondaryText: {
    ...typography.bodySmall,
    fontWeight: "600",
    color: colors.accent,
  },
  onboardingBlock: {
    backgroundColor: colors.accentSoft,
    borderWidth: 1,
    borderColor: "rgba(59,130,246,0.25)",
    borderRadius: radius.lg,
    padding: spacing.lg,
    marginBottom: spacing.xxl,
  },
  onboardingIconWrap: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: "rgba(59,130,246,0.15)",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: spacing.md,
  },
  onboardingTitle: {
    ...typography.h3,
    color: colors.text,
    marginBottom: spacing.sm,
  },
  onboardingText: {
    ...typography.bodySmall,
    color: colors.textSecondary,
    lineHeight: 20,
    marginBottom: spacing.lg,
  },
  onboardingCtaRow: {
    gap: spacing.sm,
  },
  onboardingCtaPrimary: {
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.lg,
    backgroundColor: colors.accent,
    borderRadius: radius.md,
    alignItems: "center",
  },
  onboardingCtaPrimaryText: {
    ...typography.bodySmall,
    fontWeight: "600",
    color: colors.onAccent,
  },
  onboardingCtaSecondary: {
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.lg,
    alignItems: "center",
    borderWidth: 1,
    borderColor: colors.accent,
    borderRadius: radius.md,
  },
  onboardingCtaSecondaryText: {
    ...typography.bodySmall,
    fontWeight: "600",
    color: colors.accent,
  },
  premiumValueBlock: {
    backgroundColor: colors.surfaceLevel1,
    borderWidth: 1,
    borderColor: colors.surfaceLevel1Border,
    borderRadius: radius.lg,
    padding: spacing.lg,
    marginBottom: spacing.xxl,
  },
  premiumValueIconWrap: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: "rgba(59,130,246,0.12)",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: spacing.md,
  },
  premiumValueTitle: {
    ...typography.cardTitle,
    color: colors.text,
    marginBottom: spacing.sm,
  },
  premiumValueText: {
    ...typography.bodySmall,
    color: colors.textSecondary,
    lineHeight: 20,
    marginBottom: spacing.lg,
  },
  premiumValueCta: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: spacing.xs,
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.lg,
    backgroundColor: colors.accent,
    borderRadius: radius.md,
  },
  premiumValueCtaText: {
    ...typography.bodySmall,
    fontWeight: "600",
    color: colors.onAccent,
  },
  sectionHeaderRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: spacing.lg,
  },
  sectionTitleRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
  },
  sectionTitle: {
    ...typography.sectionTitle,
    color: colors.text,
    marginBottom: spacing.lg,
  },
  memoryCountBadge: {
    backgroundColor: colors.accentSoft,
    paddingHorizontal: spacing.sm,
    paddingVertical: 2,
    borderRadius: radius.sm,
  },
  memoryCountText: {
    ...typography.captionSmall,
    color: colors.accent,
    fontWeight: "600",
  },
  exportBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.xs,
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.md,
  },
  exportBtnText: {
    ...typography.bodySmall,
    color: colors.accent,
    fontWeight: "600",
  },
  card: {
    backgroundColor: colors.surfaceLevel1,
    borderWidth: 1,
    borderColor: colors.surfaceLevel1Border,
    borderRadius: radius.lg,
    padding: spacing.lg,
    marginBottom: spacing.md,
  },
  memoryCard: {
    flexDirection: "row",
    alignItems: "flex-start",
    backgroundColor: colors.surfaceLevel1,
    borderWidth: 1,
    borderColor: colors.surfaceLevel1Border,
    borderLeftWidth: 3,
    borderLeftColor: "rgba(59,130,246,0.5)",
    borderRadius: radius.lg,
    padding: spacing.lg,
    marginBottom: spacing.md,
  },
  memoryCardContent: {
    flex: 1,
  },
  memoryDeleteBtn: {
    padding: spacing.sm,
    marginLeft: spacing.sm,
    marginTop: -spacing.xs,
  },
  coachCard: {
    flexDirection: "row",
    alignItems: "center",
  },
  coachCardRow: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  coachCardContent: {
    flex: 1,
  },
  coachCardMeta: {
    flexDirection: "row",
    gap: spacing.md,
    marginTop: spacing.xs,
  },
  coachCardAction: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.xs,
  },
  cardTitle: {
    ...typography.cardTitle,
    color: colors.text,
    marginBottom: spacing.xs,
  },
  cardText: {
    ...typography.bodySmall,
    color: colors.textSecondary,
    marginTop: spacing.xs,
  },
  cardMeta: {
    ...typography.captionSmall,
    color: colors.textMuted,
    marginTop: spacing.xs,
  },
  emptySection: {
    backgroundColor: colors.surfaceLevel1,
    borderWidth: 1,
    borderColor: colors.surfaceLevel1Border,
    borderRadius: radius.lg,
    padding: spacing.xxl,
    alignItems: "center",
    gap: spacing.md,
  },
  emptyText: {
    ...typography.bodySmall,
    color: colors.textMuted,
    textAlign: "center",
  },
  emptyBtn: {
    marginTop: spacing.sm,
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.lg,
    backgroundColor: colors.accentSoft,
    borderRadius: radius.sm,
  },
  emptyBtnText: {
    ...typography.bodySmall,
    color: colors.accent,
    fontWeight: "600",
  },
  nudgeCard: {
    backgroundColor: colors.surfaceLevel1,
    borderWidth: 1,
    borderColor: colors.surfaceLevel1Border,
    borderRadius: radius.lg,
    padding: spacing.lg,
    marginBottom: spacing.md,
  },
  nudgeCardPressable: {
    borderColor: "rgba(59,130,246,0.3)",
  },
  nudgeAllGoodCard: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.md,
  },
  nudgeAllGood: {
    ...typography.bodySmall,
    color: colors.textSecondary,
  },
  nudgeActionRow: {
    flexDirection: "row",
    alignItems: "center",
    marginTop: spacing.md,
    gap: spacing.xs,
  },
  nudgeActionText: {
    ...typography.bodySmall,
    color: colors.accent,
    fontWeight: "600",
  },
  hubSkeleton: {
    flex: 1,
    padding: spacing.screenPadding,
    gap: spacing.lg,
  },
  hubSkeletonCard: {
    height: 120,
    backgroundColor: colors.surfaceLevel1,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.surfaceLevel1Border,
  },
  hubSkeletonText: {
    ...typography.bodySmall,
    color: colors.textMuted,
    textAlign: "center",
    marginTop: spacing.lg,
  },
  errorWrap: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    padding: spacing.xl,
    gap: spacing.lg,
  },
  errorTitle: {
    ...typography.h2,
    color: colors.text,
    textAlign: "center",
  },
  errorSub: {
    ...typography.bodySmall,
    color: colors.textMuted,
    textAlign: "center",
  },
  retryBtn: {
    backgroundColor: colors.accent,
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.xl,
    borderRadius: radius.md,
  },
  retryBtnText: {
    ...typography.bodySmall,
    fontWeight: "600",
    color: colors.onAccent,
  },
  backLink: {
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.lg,
  },
  backLinkText: {
    ...typography.bodySmall,
    color: colors.textMuted,
    fontWeight: "600",
  },
  centered: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  centeredText: {
    ...typography.h2,
    color: colors.textMuted,
  },
});
