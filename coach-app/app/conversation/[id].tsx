import React, { useState, useCallback, useRef, useEffect } from 'react';
import {
  StyleSheet,
  Text,
  View,
  ScrollView,
  TextInput,
  KeyboardAvoidingView,
  Platform,
  Alert,
  Keyboard,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useLocalSearchParams, useRouter, useFocusEffect } from 'expo-router';
import { getParamId } from '@/lib/params';
import { useNavigation } from '@react-navigation/native';
import {
  getCoachConversation,
  getCoachMessages,
  sendCoachMessage,
  type MessageUi,
} from '@/services/coachMessagesService';
import { isAuthRequiredError } from '@/lib/coachAuth';
import { ScreenContainer } from '@/components/layout/ScreenContainer';
import { SectionCard } from '@/components/ui/SectionCard';
import { PrimaryButton } from '@/components/ui/PrimaryButton';
import { PressableFeedback } from '@/components/ui/PressableFeedback';
import { StaggerFadeIn } from '@/components/dashboard/StaggerFadeIn';
import { CoachDetailHero, CoachDetailLoadingBody } from '@/components/details/CoachDetailScreenPrimitives';
import { theme } from '@/constants/theme';
import {
  COACH_AUTH_REQUIRED_LINE,
  COACH_CONVERSATION_DETAIL_COPY,
} from '@/lib/coachConversationDetailUi';
import { consumeConversationDraftPrefill } from '@/lib/conversationDraftPrefill';
import {
  buildVoiceStarterFromVoiceRecap,
  enrichVoiceStarterWithAi,
  saveVoiceStarterPayload,
  type VoiceStarterPayload,
} from '@/lib/voiceMvp';
import type { ConversationType } from '@/components/messages/ConversationCard';

type DraftComposeState = {
  text: string;
  isDraftOrigin: boolean;
};

type InboxThreadMeta = {
  type: ConversationType | null;
  playerId: string | null;
  metadata?: string;
  listName?: string;
  needsCoachReaction: boolean;
  awaitingParentReply: boolean;
  unreadCount: number;
};

const EMPTY_INBOX_META: InboxThreadMeta = {
  type: null,
  playerId: null,
  needsCoachReaction: false,
  awaitingParentReply: false,
  unreadCount: 0,
};

const unsentDraftByConversation = new Map<string, DraftComposeState>();

function buildSimpleHighlightsFromParentMessage(text: string): string[] {
  const clean = text.replace(/\s+/g, ' ').trim();
  if (!clean) return [];
  const first = clean.length > 180 ? `${clean.slice(0, 179).trimEnd()}…` : clean;
  const second = 'Подготовить спокойный и конкретный ответ для родителя.';
  return [first, second];
}

function typeLabelRu(t: ConversationType | null): string {
  if (t === 'parent') return 'Родитель';
  if (t === 'team') return 'Команда';
  if (t === 'announcement') return 'Объявление';
  return 'Диалог';
}

function SummaryChip({ label }: { label: string }) {
  return (
    <View style={styles.summaryChip}>
      <Text style={styles.summaryChipText} numberOfLines={2}>
        {label}
      </Text>
    </View>
  );
}

function ThreadQuickLinks({
  playerId,
  showParentDraftsLink,
  onMessages,
  onPlayer,
  onParentDrafts,
}: {
  playerId: string | null;
  showParentDraftsLink: boolean;
  onMessages: () => void;
  onPlayer: () => void;
  onParentDrafts: () => void;
}) {
  return (
    <View style={styles.quickLinksRow}>
      <PressableFeedback onPress={onMessages} style={styles.quickLinkHit}>
        <Text style={styles.quickLinkText} numberOfLines={1}>
          {COACH_CONVERSATION_DETAIL_COPY.quickAllMessages}
        </Text>
      </PressableFeedback>
      {playerId ? (
        <>
          <Text style={styles.quickLinkSep}>·</Text>
          <PressableFeedback onPress={onPlayer} style={styles.quickLinkHit}>
            <Text style={styles.quickLinkText} numberOfLines={1}>
              {COACH_CONVERSATION_DETAIL_COPY.quickPlayerCard}
            </Text>
          </PressableFeedback>
        </>
      ) : null}
      {showParentDraftsLink ? (
        <>
          <Text style={styles.quickLinkSep}>·</Text>
          <PressableFeedback onPress={onParentDrafts} style={styles.quickLinkHit}>
            <Text style={styles.quickLinkText} numberOfLines={1}>
              {COACH_CONVERSATION_DETAIL_COPY.quickDrafts}
            </Text>
          </PressableFeedback>
        </>
      ) : null}
    </View>
  );
}

function ThreadHeaderAndSummary({
  title,
  inboxMeta,
  messageCount,
  onOpenMessages,
  onOpenPlayer,
  onOpenParentDrafts,
}: {
  title: string;
  inboxMeta: InboxThreadMeta;
  messageCount: number;
  onOpenMessages: () => void;
  onOpenPlayer: () => void;
  onOpenParentDrafts: () => void;
}) {
  const displayTitle = title.trim() || 'Диалог';
  const metaLineParts: string[] = [typeLabelRu(inboxMeta.type)];
  if (inboxMeta.type === 'parent') {
    metaLineParts.push('канал с родителем');
  }
  const extra =
    inboxMeta.metadata?.trim() ||
    (inboxMeta.listName?.trim() && inboxMeta.listName.trim() !== displayTitle.trim()
      ? inboxMeta.listName.trim()
      : '');
  const subtitle = extra ? `${metaLineParts.join(' · ')} · ${extra}` : metaLineParts.join(' · ');

  const metaLeft = inboxMeta.needsCoachReaction
    ? 'Нужен ответ'
    : inboxMeta.awaitingParentReply
      ? 'Ждём родителя'
      : 'В работе';
  const metaRight =
    inboxMeta.unreadCount > 0
      ? inboxMeta.unreadCount === 1
        ? '1 новое'
        : `${inboxMeta.unreadCount} новых`
      : undefined;

  const chips: string[] = [`Сообщений: ${messageCount}`];
  if (inboxMeta.unreadCount > 0) {
    chips.push(inboxMeta.unreadCount === 1 ? '1 непрочит.' : `${inboxMeta.unreadCount} непрочит.`);
  }
  if (inboxMeta.needsCoachReaction) chips.push('Входящее');
  else if (inboxMeta.awaitingParentReply) chips.push('Ожидание');

  const statusOneLiner = (() => {
    const parts: string[] = [];
    if (inboxMeta.needsCoachReaction) parts.push('Есть входящее — можно ответить ниже.');
    if (inboxMeta.awaitingParentReply && !inboxMeta.needsCoachReaction) {
      parts.push('Последний ответ был ваш — ждём родителя.');
    }
    if (parts.length === 0) return 'Специальных пометок по треду нет.';
    return parts.join(' ');
  })();

  return (
    <View style={styles.threadHeaderBlock}>
      <StaggerFadeIn preset="snappy" delay={0}>
        <CoachDetailHero
          eyebrow={COACH_CONVERSATION_DETAIL_COPY.heroEyebrow}
          title={displayTitle}
          subtitle={subtitle}
          metaLeft={metaLeft}
          metaRight={metaRight}
        />
      </StaggerFadeIn>
      <StaggerFadeIn preset="snappy" delay={10}>
        <ThreadQuickLinks
          playerId={inboxMeta.playerId}
          showParentDraftsLink={inboxMeta.type === 'parent'}
          onMessages={onOpenMessages}
          onPlayer={onOpenPlayer}
          onParentDrafts={onOpenParentDrafts}
        />
      </StaggerFadeIn>
      <StaggerFadeIn preset="snappy" delay={18}>
        <SectionCard elevated style={styles.summaryCard}>
          <Text style={styles.summaryKicker}>{COACH_CONVERSATION_DETAIL_COPY.summaryKicker}</Text>
          <View style={styles.summaryChipRow}>
            {chips.map((c) => (
              <SummaryChip key={c} label={c} />
            ))}
          </View>
          <Text style={styles.summaryStatus} numberOfLines={4}>
            {statusOneLiner}
          </Text>
        </SectionCard>
      </StaggerFadeIn>
    </View>
  );
}

export default function ConversationDetailScreen() {
  const params = useLocalSearchParams<{ id: string }>();
  const id = getParamId(params.id);
  const router = useRouter();
  const navigation = useNavigation();
  const insets = useSafeAreaInsets();
  const scrollRef = useRef<ScrollView>(null);
  const [conversation, setConversation] = useState<{
    id: string;
    title: string;
    messages: MessageUi[];
  } | null | 'loading'>('loading');
  const [loadError, setLoadError] = useState<string | null>(null);
  const [inputText, setInputText] = useState('');
  const [sending, setSending] = useState(false);
  const [sendError, setSendError] = useState<string | null>(null);
  const [draftComposeMode, setDraftComposeMode] = useState(false);
  const [sendSuccessHint, setSendSuccessHint] = useState<string | null>(null);
  const [inboxMeta, setInboxMeta] = useState<InboxThreadMeta>(EMPTY_INBOX_META);
  const successHintTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const latestInputRef = useRef('');
  const latestDraftModeRef = useRef(false);

  const fetchConversation = useCallback(() => {
    if (!id) return;
    setConversation('loading');
    setLoadError(null);
    setSendError(null);
    getCoachConversation(id)
      .then((data) => {
        setConversation(data ?? null);
        if (data?.title) {
          navigation.setOptions({ title: data.title });
        } else if (!data) {
          setLoadError('Не удалось загрузить диалог');
        }
      })
      .catch((err) => {
        setConversation(null);
        setLoadError(
          isAuthRequiredError(err) ? COACH_AUTH_REQUIRED_LINE : 'Не удалось загрузить диалог'
        );
      });
  }, [id, navigation]);

  const handleSend = useCallback(async () => {
    const text = inputText.trim();
    if (!text || !id || sending) return;

    setSending(true);
    setSendError(null);
    Keyboard.dismiss();

    try {
      const newMsg = await sendCoachMessage(id, text);
      if (newMsg) {
        setConversation((prev) => {
          if (!prev || prev === 'loading') return prev;
          return { ...prev, messages: [...prev.messages, newMsg] };
        });

        if (id) {
          unsentDraftByConversation.delete(id);
        }
        setInputText('');
        setDraftComposeMode(false);
        setSendSuccessHint(COACH_CONVERSATION_DETAIL_COPY.sendSuccess);
        if (successHintTimeoutRef.current) {
          clearTimeout(successHintTimeoutRef.current);
        }
        successHintTimeoutRef.current = setTimeout(() => {
          setSendSuccessHint(null);
        }, 2200);
        setTimeout(() => {
          scrollRef.current?.scrollToEnd({ animated: true });
        }, 50);
      } else {
        setSendError(COACH_CONVERSATION_DETAIL_COPY.sendFailedNetwork);
      }
    } catch (err) {
      setSendError(
        isAuthRequiredError(err)
          ? COACH_AUTH_REQUIRED_LINE
          : COACH_CONVERSATION_DETAIL_COPY.sendFailedGeneric
      );
    } finally {
      setSending(false);
    }
  }, [id, inputText, sending]);

  useFocusEffect(useCallback(() => fetchConversation(), [fetchConversation]));

  const loadedConversation =
    conversation !== 'loading' && conversation !== null ? conversation : null;

  useEffect(() => {
    if (!id) return;
    const cached = unsentDraftByConversation.get(id);
    if (cached?.text) {
      setInputText(cached.text);
      setDraftComposeMode(cached.isDraftOrigin);
      return;
    }

    const draftPrefill = consumeConversationDraftPrefill(id);
    if (!draftPrefill) return;
    setInputText(draftPrefill);
    setSendError(null);
    setDraftComposeMode(true);
    unsentDraftByConversation.set(id, { text: draftPrefill, isDraftOrigin: true });
  }, [id]);

  useEffect(() => {
    latestInputRef.current = inputText;
  }, [inputText]);

  useEffect(() => {
    latestDraftModeRef.current = draftComposeMode;
  }, [draftComposeMode]);

  useEffect(() => {
    return () => {
      if (successHintTimeoutRef.current) {
        clearTimeout(successHintTimeoutRef.current);
      }
      if (!id) return;
      const text = latestInputRef.current.trim();
      if (!text) {
        unsentDraftByConversation.delete(id);
        return;
      }
      unsentDraftByConversation.set(id, {
        text: latestInputRef.current,
        isDraftOrigin: latestDraftModeRef.current,
      });
    };
  }, [id]);

  useEffect(() => {
    if (!id) return;
    getCoachMessages()
      .then((list) => {
        const meta = list.find((c) => c.id === id);
        if (!meta) {
          setInboxMeta(EMPTY_INBOX_META);
          return;
        }
        setInboxMeta({
          type: meta.type ?? null,
          playerId: meta.playerId ?? null,
          metadata: meta.metadata,
          listName: meta.name,
          needsCoachReaction: meta.needsCoachReaction === true,
          awaitingParentReply: meta.awaitingParentReply === true,
          unreadCount: meta.unreadCount ?? 0,
        });
      })
      .catch(() => {
        setInboxMeta(EMPTY_INBOX_META);
      });
  }, [id]);

  useEffect(() => {
    if (!loadedConversation || loadedConversation.messages.length === 0) return;
    setTimeout(() => scrollRef.current?.scrollToEnd({ animated: false }), 100);
  }, [loadedConversation?.id, loadedConversation?.messages.length]);

  const handleClearDraftText = useCallback(() => {
    if (!id) return;
    setInputText('');
    setDraftComposeMode(false);
    setSendError(null);
    unsentDraftByConversation.delete(id);
  }, [id]);

  const lastParentMessage = loadedConversation
    ? [...loadedConversation.messages].reverse().find((m) => !m.isOwn) ?? null
    : null;
  const showTaskBridge = inboxMeta.type === 'parent' && !!lastParentMessage;

  const handleCreateTaskFromConversation = useCallback(async () => {
    if (!showTaskBridge || !lastParentMessage) return;
    try {
      const built: VoiceStarterPayload = buildVoiceStarterFromVoiceRecap({
        intent: 'action_item',
        transcript: lastParentMessage.text,
        summary: `Сообщение родителя: ${lastParentMessage.text}`,
        highlights: [lastParentMessage.text],
        context: {
          playerId: inboxMeta.playerId ?? undefined,
          playerLabel: loadedConversation?.title ?? 'Родительский диалог',
          sessionHint: 'Из диалога с родителем',
        },
      });
      const payload = await enrichVoiceStarterWithAi(built);
      const starterId = await saveVoiceStarterPayload(payload);
      router.push({
        pathname: '/voice-starter/action-item',
        params: { voiceStarterId: starterId },
      });
    } catch {
      Alert.alert('Не получилось подготовить задачу', 'Попробуйте ещё раз чуть позже.');
    }
  }, [showTaskBridge, lastParentMessage, inboxMeta.playerId, loadedConversation?.title, router]);

  const handlePrepareParentReply = useCallback(async () => {
    if (!showTaskBridge || !lastParentMessage) return;
    try {
      const messageText = lastParentMessage.text.trim();
      const built: VoiceStarterPayload = buildVoiceStarterFromVoiceRecap({
        intent: 'parent_draft',
        transcript: messageText,
        summary: `Ответ родителю по сообщению: ${messageText}`,
        highlights: buildSimpleHighlightsFromParentMessage(messageText),
        context: {
          playerId: inboxMeta.playerId ?? undefined,
          playerLabel: loadedConversation?.title ?? 'Родительский диалог',
          sessionHint: 'Из диалога с родителем',
        },
      });
      const payload = await enrichVoiceStarterWithAi(built);
      const starterId = await saveVoiceStarterPayload(payload);
      router.push({
        pathname: '/dev/coach-input',
        params: { voiceStarterId: starterId },
      });
    } catch {
      Alert.alert('Не получилось подготовить черновик', 'Попробуйте ещё раз чуть позже.');
    }
  }, [showTaskBridge, lastParentMessage, inboxMeta.playerId, loadedConversation?.title, router]);

  if (!id) {
    return (
      <ScreenContainer scroll={false} contentContainerStyle={styles.errorScreenContent}>
        <SectionCard elevated style={styles.errorCard}>
          <Text style={styles.errorCardTitle}>{COACH_CONVERSATION_DETAIL_COPY.noIdTitle}</Text>
          <Text style={styles.errorCardBody}>{COACH_CONVERSATION_DETAIL_COPY.noIdBody}</Text>
          <PrimaryButton
            animatedPress
            title={COACH_CONVERSATION_DETAIL_COPY.toMessagesCta}
            onPress={() => router.push('/(tabs)/messages')}
          />
          <PrimaryButton
            animatedPress
            title={COACH_CONVERSATION_DETAIL_COPY.backCta}
            variant="ghost"
            onPress={() => router.back()}
          />
        </SectionCard>
      </ScreenContainer>
    );
  }

  if (conversation === 'loading') {
    return (
      <ScreenContainer scroll={false} style={styles.container}>
        <CoachDetailLoadingBody
          eyebrow={COACH_CONVERSATION_DETAIL_COPY.heroEyebrow}
          title={COACH_CONVERSATION_DETAIL_COPY.loadingTitle}
          subtitle={COACH_CONVERSATION_DETAIL_COPY.loadingSubtitle}
        />
      </ScreenContainer>
    );
  }

  if (!conversation) {
    return (
      <ScreenContainer scroll={false} contentContainerStyle={styles.errorScreenContent}>
        <SectionCard elevated style={styles.errorCard}>
          <Text style={styles.errorCardTitle}>{COACH_CONVERSATION_DETAIL_COPY.loadErrorTitle}</Text>
          <Text style={styles.errorCardBody}>
            {loadError ?? COACH_CONVERSATION_DETAIL_COPY.loadErrorFallback}
          </Text>
          {loadError !== COACH_AUTH_REQUIRED_LINE ? (
            <Text style={styles.errorHint}>{COACH_CONVERSATION_DETAIL_COPY.networkRetryHint}</Text>
          ) : null}
          <PrimaryButton
            animatedPress
            title={COACH_CONVERSATION_DETAIL_COPY.retryCta}
            onPress={fetchConversation}
            style={styles.errorPrimaryBtn}
          />
          <PrimaryButton
            animatedPress
            title={COACH_CONVERSATION_DETAIL_COPY.toMessagesCta}
            variant="outline"
            onPress={() => router.push('/(tabs)/messages')}
            style={styles.errorPrimaryBtn}
          />
          <PrimaryButton
            animatedPress
            title={COACH_CONVERSATION_DETAIL_COPY.backCta}
            variant="ghost"
            onPress={() => router.back()}
          />
        </SectionCard>
      </ScreenContainer>
    );
  }

  const lastIncomingIndex = (() => {
    const msgs = conversation.messages;
    for (let i = msgs.length - 1; i >= 0; i--) {
      if (!msgs[i].isOwn) return i;
    }
    return -1;
  })();

  return (
    <ScreenContainer scroll={false} style={styles.container}>
      <KeyboardAvoidingView
        style={styles.flex}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        keyboardVerticalOffset={Platform.OS === 'ios' ? 90 : 0}
      >
        <ScrollView
          ref={scrollRef}
          style={styles.scroll}
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        >
          <ThreadHeaderAndSummary
            title={conversation.title}
            inboxMeta={inboxMeta}
            messageCount={conversation.messages.length}
            onOpenMessages={() => router.push('/(tabs)/messages')}
            onOpenPlayer={() => {
              if (inboxMeta.playerId) router.push(`/player/${inboxMeta.playerId}`);
            }}
            onOpenParentDrafts={() => router.push('/parent-drafts')}
          />

          {conversation.messages.length === 0 ? (
            <View style={styles.emptyMessages}>
              <Text style={styles.emptyMessagesTitle}>{COACH_CONVERSATION_DETAIL_COPY.emptyMessagesTitle}</Text>
              <Text style={styles.emptyMessagesSub}>{COACH_CONVERSATION_DETAIL_COPY.emptyMessagesSub}</Text>
            </View>
          ) : (
            conversation.messages.map((msg, index) => {
              const isLastIncoming = index === lastIncomingIndex && !msg.isOwn;
              return (
                <View
                  key={msg.id}
                  style={[
                    styles.messageRow,
                    msg.isOwn ? styles.messageRowOwn : styles.messageRowOther,
                    index > 0 ? styles.messageRowGap : null,
                    isLastIncoming ? styles.messageRowLastIncoming : null,
                  ]}
                >
                  {isLastIncoming ? (
                    <Text style={styles.lastIncomingLabel} numberOfLines={1}>
                      {COACH_CONVERSATION_DETAIL_COPY.lastIncomingLabel}
                    </Text>
                  ) : null}
                  <View
                    style={[
                      styles.messageBubble,
                      msg.isOwn ? styles.bubbleOwn : styles.bubbleOther,
                      isLastIncoming ? styles.bubbleOtherLast : null,
                    ]}
                  >
                    {!msg.isOwn ? (
                      <Text style={styles.senderName} numberOfLines={2}>
                        {msg.senderName}
                      </Text>
                    ) : null}
                    <Text style={styles.messageText} selectable>
                      {msg.text}
                    </Text>
                    <Text
                      style={[
                        styles.messageTime,
                        msg.isOwn ? styles.messageTimeOwn : styles.messageTimeOther,
                      ]}
                    >
                      {msg.time}
                    </Text>
                  </View>
                </View>
              );
            })
          )}
        </ScrollView>

        <View
          style={[
            styles.inputArea,
            draftComposeMode && styles.inputAreaDraftMode,
            { paddingBottom: Math.max(insets.bottom, theme.spacing.sm) },
          ]}
        >
          {showTaskBridge ? (
            <SectionCard elevated style={styles.taskBridgeCard}>
              <Text style={styles.taskBridgeKicker}>{COACH_CONVERSATION_DETAIL_COPY.taskBridgeKicker}</Text>
              <Text style={styles.taskBridgeTitle}>{COACH_CONVERSATION_DETAIL_COPY.taskBridgeTitle}</Text>
              <Text style={styles.taskBridgeSubtitle}>{COACH_CONVERSATION_DETAIL_COPY.taskBridgeSubtitle}</Text>
              <View style={styles.taskBridgeActions}>
                <PrimaryButton
                  animatedPress
                  title={COACH_CONVERSATION_DETAIL_COPY.taskBridgeTaskCta}
                  variant="outline"
                  onPress={() => {
                    void handleCreateTaskFromConversation();
                  }}
                  style={styles.taskBridgeBtn}
                />
                <PrimaryButton
                  animatedPress
                  title={COACH_CONVERSATION_DETAIL_COPY.taskBridgeDraftCta}
                  variant="ghost"
                  onPress={() => {
                    void handlePrepareParentReply();
                  }}
                  style={styles.taskBridgeBtn}
                />
              </View>
            </SectionCard>
          ) : null}
          {draftComposeMode ? (
            <View style={styles.draftOriginBlock}>
              <View style={styles.draftOriginTextWrap}>
                <Text style={styles.draftOriginTitle}>{COACH_CONVERSATION_DETAIL_COPY.draftOriginTitle}</Text>
                <Text style={styles.draftOriginSubtitle}>{COACH_CONVERSATION_DETAIL_COPY.draftOriginSubtitle}</Text>
              </View>
              <PressableFeedback onPress={handleClearDraftText} style={styles.clearDraftHit}>
                <Text style={styles.clearDraftText}>{COACH_CONVERSATION_DETAIL_COPY.clearDraftCta}</Text>
              </PressableFeedback>
            </View>
          ) : null}
          {sendSuccessHint ? (
            <View style={styles.inlineHintSuccess}>
              <Text style={styles.sendSuccessText} numberOfLines={2}>
                {sendSuccessHint}
              </Text>
            </View>
          ) : null}
          {sendError ? (
            <View style={styles.sendErrorWrap}>
              <View style={styles.inlineHintError}>
                <Text style={styles.sendErrorText} numberOfLines={3}>
                  {sendError}
                </Text>
              </View>
              {sendError !== COACH_AUTH_REQUIRED_LINE ? (
                <Text style={styles.sendErrorHint}>{COACH_CONVERSATION_DETAIL_COPY.networkRetryHint}</Text>
              ) : null}
            </View>
          ) : null}
          {!draftComposeMode && !sendError && !sendSuccessHint ? (
            <Text style={styles.composerHint} numberOfLines={2}>
              {showTaskBridge
                ? COACH_CONVERSATION_DETAIL_COPY.composerHintTaskBridge
                : COACH_CONVERSATION_DETAIL_COPY.composerHintDefault}
            </Text>
          ) : null}
          <View style={styles.composerShell}>
            <TextInput
              style={styles.input}
              placeholder={COACH_CONVERSATION_DETAIL_COPY.inputPlaceholder}
              placeholderTextColor={theme.colors.textMuted}
              value={inputText}
              onChangeText={(t) => {
                setInputText(t);
                setSendError(null);
                if (!id) return;
                if (!t.trim()) {
                  unsentDraftByConversation.delete(id);
                  return;
                }
                unsentDraftByConversation.set(id, {
                  text: t,
                  isDraftOrigin: draftComposeMode,
                });
              }}
              multiline
              maxLength={2000}
              editable={!sending}
              blurOnSubmit={false}
            />
            <PrimaryButton
              animatedPress
              title={sending ? COACH_CONVERSATION_DETAIL_COPY.sendingCta : COACH_CONVERSATION_DETAIL_COPY.sendCta}
              onPress={handleSend}
              disabled={sending || !inputText.trim()}
              style={styles.sendBtn}
            />
          </View>
        </View>
      </KeyboardAvoidingView>
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  flex: { flex: 1 },
  errorScreenContent: {
    flexGrow: 1,
    justifyContent: 'center',
    paddingVertical: theme.spacing.xl,
  },
  errorCard: {
    borderLeftWidth: 4,
    borderLeftColor: theme.colors.accent,
  },
  errorCardTitle: {
    ...theme.typography.subtitle,
    color: theme.colors.text,
    marginBottom: theme.spacing.xs,
  },
  errorCardBody: {
    ...theme.typography.caption,
    color: theme.colors.textSecondary,
    lineHeight: 20,
    marginBottom: theme.spacing.sm,
  },
  errorHint: {
    ...theme.typography.caption,
    color: theme.colors.textMuted,
    lineHeight: 18,
    marginBottom: theme.spacing.md,
  },
  errorPrimaryBtn: {
    alignSelf: 'flex-start',
    marginBottom: theme.spacing.sm,
  },
  scroll: { flex: 1 },
  scrollContent: {
    padding: theme.spacing.md,
    paddingBottom: theme.spacing.xl,
  },
  threadHeaderBlock: {
    marginBottom: theme.spacing.md,
  },
  quickLinksRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    alignItems: 'center',
    gap: 4,
    marginBottom: theme.spacing.md,
  },
  quickLinkHit: {
    paddingVertical: 6,
    paddingHorizontal: 2,
    maxWidth: '100%',
  },
  quickLinkText: {
    fontSize: 14,
    fontWeight: '600',
    color: theme.colors.primary,
  },
  quickLinkSep: {
    fontSize: 14,
    color: theme.colors.textMuted,
  },
  summaryCard: {
    marginBottom: theme.spacing.lg,
    borderLeftWidth: 4,
    borderLeftColor: theme.colors.primary,
  },
  summaryKicker: {
    fontSize: 11,
    fontWeight: '600',
    color: theme.colors.textMuted,
    textTransform: 'uppercase',
    letterSpacing: 0.55,
    marginBottom: theme.spacing.sm,
  },
  summaryChipRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: theme.spacing.sm,
    marginBottom: theme.spacing.sm,
  },
  summaryChip: {
    paddingHorizontal: theme.spacing.sm,
    paddingVertical: 6,
    borderRadius: theme.borderRadius.full,
    backgroundColor: theme.colors.primaryMuted,
    borderWidth: 1,
    borderColor: theme.colors.cardBorder,
    maxWidth: '100%',
  },
  summaryChipText: {
    fontSize: 12,
    fontWeight: '600',
    color: theme.colors.textSecondary,
  },
  summaryStatus: {
    ...theme.typography.caption,
    color: theme.colors.textSecondary,
    lineHeight: 20,
  },
  emptyMessages: {
    paddingVertical: theme.spacing.xl,
    alignItems: 'center',
    paddingHorizontal: theme.spacing.md,
  },
  emptyMessagesTitle: {
    ...theme.typography.subtitle,
    color: theme.colors.text,
    marginBottom: theme.spacing.xs,
  },
  emptyMessagesSub: {
    ...theme.typography.caption,
    color: theme.colors.textMuted,
    textAlign: 'center',
    lineHeight: 19,
  },
  messageRow: {
    alignItems: 'flex-start',
  },
  messageRowGap: {
    marginTop: theme.spacing.md,
  },
  messageRowOwn: {
    alignItems: 'flex-end',
  },
  messageRowOther: {},
  messageRowLastIncoming: {
    alignItems: 'flex-start',
  },
  lastIncomingLabel: {
    fontSize: 10,
    fontWeight: '700',
    letterSpacing: 0.4,
    textTransform: 'uppercase',
    color: theme.colors.primary,
    marginBottom: 6,
    marginLeft: 2,
  },
  messageBubble: {
    maxWidth: '88%',
    minWidth: 0,
    paddingVertical: theme.spacing.sm,
    paddingHorizontal: theme.spacing.md,
    borderRadius: theme.borderRadius.lg,
  },
  bubbleOwn: {
    backgroundColor: theme.colors.primaryMuted,
    borderBottomRightRadius: 6,
    borderWidth: 1,
    borderColor: theme.colors.cardBorder,
  },
  bubbleOther: {
    backgroundColor: theme.colors.surfaceElevated,
    borderBottomLeftRadius: 6,
    borderWidth: 1,
    borderColor: theme.colors.border,
  },
  bubbleOtherLast: {
    backgroundColor: theme.colors.primaryMuted,
    borderColor: theme.colors.primary,
    borderWidth: 1.5,
  },
  senderName: {
    fontSize: 11,
    fontWeight: '600',
    letterSpacing: 0.2,
    color: theme.colors.primary,
    marginBottom: 6,
  },
  messageText: {
    ...theme.typography.body,
    color: theme.colors.text,
    lineHeight: 23,
    flexShrink: 1,
  },
  messageTime: {
    fontSize: 11,
    marginTop: 8,
    letterSpacing: 0.2,
  },
  messageTimeOwn: {
    color: theme.colors.textMuted,
    textAlign: 'right',
  },
  messageTimeOther: {
    color: theme.colors.textMuted,
    opacity: 0.9,
  },
  inputArea: {
    paddingHorizontal: theme.spacing.md,
    paddingTop: theme.spacing.md,
    paddingBottom: theme.spacing.sm,
    borderTopWidth: 1,
    borderTopColor: theme.colors.border,
    backgroundColor: theme.colors.surface,
  },
  taskBridgeCard: {
    marginBottom: theme.spacing.md,
    borderLeftWidth: 4,
    borderLeftColor: theme.colors.primary,
  },
  taskBridgeKicker: {
    fontSize: 10,
    fontWeight: '600',
    letterSpacing: 0.45,
    color: theme.colors.textMuted,
    textTransform: 'uppercase',
    marginBottom: theme.spacing.xs,
  },
  taskBridgeTitle: {
    ...theme.typography.subtitle,
    color: theme.colors.text,
    marginBottom: theme.spacing.xs,
  },
  taskBridgeSubtitle: {
    ...theme.typography.caption,
    color: theme.colors.textSecondary,
    lineHeight: 20,
    marginBottom: theme.spacing.md,
  },
  taskBridgeActions: {
    gap: theme.spacing.sm,
  },
  taskBridgeBtn: {
    alignSelf: 'stretch',
  },
  inputAreaDraftMode: {
    backgroundColor: theme.colors.primaryMuted,
  },
  draftOriginBlock: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: theme.spacing.sm,
    paddingHorizontal: theme.spacing.md,
    paddingVertical: theme.spacing.sm,
    borderRadius: theme.borderRadius.md,
    backgroundColor: theme.colors.background,
    borderWidth: 1,
    borderColor: theme.colors.border,
    marginBottom: theme.spacing.sm,
  },
  draftOriginTextWrap: {
    flex: 1,
    minWidth: 0,
  },
  draftOriginTitle: {
    ...theme.typography.caption,
    color: theme.colors.text,
    fontWeight: '600',
  },
  draftOriginSubtitle: {
    ...theme.typography.caption,
    color: theme.colors.textMuted,
  },
  clearDraftHit: {
    paddingVertical: theme.spacing.xs,
    paddingHorizontal: theme.spacing.sm,
    marginRight: -theme.spacing.sm,
  },
  clearDraftText: {
    ...theme.typography.caption,
    color: theme.colors.primary,
    fontWeight: '600',
  },
  inlineHintSuccess: {
    marginBottom: theme.spacing.xs,
    paddingVertical: theme.spacing.xs,
    paddingHorizontal: theme.spacing.sm,
    borderRadius: theme.borderRadius.sm,
    backgroundColor: theme.colors.primaryMuted,
  },
  sendSuccessText: {
    ...theme.typography.caption,
    color: theme.colors.primary,
    fontWeight: '600',
  },
  inlineHintError: {
    marginBottom: 0,
    paddingVertical: theme.spacing.sm,
    paddingHorizontal: theme.spacing.sm,
    borderRadius: theme.borderRadius.sm,
    backgroundColor: theme.colors.accentMuted,
    borderWidth: 1,
    borderColor: theme.colors.cardBorder,
  },
  sendErrorWrap: {
    marginBottom: theme.spacing.sm,
  },
  sendErrorText: {
    ...theme.typography.caption,
    color: theme.colors.error,
    lineHeight: 18,
  },
  sendErrorHint: {
    ...theme.typography.caption,
    color: theme.colors.textMuted,
    lineHeight: 18,
    marginTop: theme.spacing.xs,
  },
  composerHint: {
    ...theme.typography.caption,
    color: theme.colors.textMuted,
    lineHeight: 18,
    marginBottom: theme.spacing.sm,
  },
  composerShell: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: theme.spacing.sm,
    padding: theme.spacing.md,
    borderRadius: theme.borderRadius.lg,
    backgroundColor: theme.colors.surfaceElevated,
    borderWidth: 1,
    borderColor: theme.colors.cardBorder,
    borderLeftWidth: 4,
    borderLeftColor: theme.colors.primary,
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.06,
        shadowRadius: 6,
      },
      android: { elevation: 2 },
    }),
  },
  input: {
    flex: 1,
    minHeight: 44,
    maxHeight: 120,
    paddingHorizontal: theme.spacing.md,
    paddingVertical: Platform.OS === 'ios' ? theme.spacing.sm : theme.spacing.xs,
    borderRadius: theme.borderRadius.md,
    backgroundColor: theme.colors.background,
    color: theme.colors.text,
    ...theme.typography.body,
  },
  sendBtn: {
    marginBottom: 2,
  },
});
