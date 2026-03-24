import React, { useState, useCallback, useRef, useEffect } from 'react';
import {
  StyleSheet,
  Text,
  View,
  ScrollView,
  ActivityIndicator,
  TextInput,
  KeyboardAvoidingView,
  Platform,
  Alert,
  Keyboard,
} from 'react-native';
import { useLocalSearchParams, useRouter, useFocusEffect } from 'expo-router';
import { getParamId } from '@/lib/params';
import { useNavigation } from '@react-navigation/native';
import {
  getCoachConversation,
  sendCoachMessage,
  type MessageUi,
} from '@/services/coachMessagesService';
import { isAuthRequiredError } from '@/lib/coachAuth';
import { ScreenContainer } from '@/components/layout/ScreenContainer';
import { PrimaryButton } from '@/components/ui/PrimaryButton';
import { theme } from '@/constants/theme';

export default function ConversationDetailScreen() {
  const params = useLocalSearchParams<{ id: string }>();
  const id = getParamId(params.id);
  const router = useRouter();
  const navigation = useNavigation();
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
      .catch(() => {
        setConversation(null);
        setLoadError('Не удалось загрузить диалог');
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
        setInputText('');
        setTimeout(() => {
          scrollRef.current?.scrollToEnd({ animated: true });
        }, 50);
      } else {
        setSendError('Не удалось отправить сообщение');
        Alert.alert('Ошибка', 'Не удалось отправить сообщение');
      }
    } catch (err) {
      setSendError(isAuthRequiredError(err) ? 'Требуется авторизация' : 'Ошибка отправки');
      Alert.alert('Ошибка', isAuthRequiredError(err) ? 'Требуется авторизация' : 'Не удалось отправить сообщение. Попробуйте снова.');
    } finally {
      setSending(false);
    }
  }, [id, inputText, sending]);

  useFocusEffect(useCallback(() => fetchConversation(), [fetchConversation]));

  useEffect(() => {
    if (conversation && conversation !== 'loading' && conversation.messages.length > 0) {
      setTimeout(() => scrollRef.current?.scrollToEnd({ animated: false }), 100);
    }
  }, [conversation?.id, conversation?.messages?.length]);

  if (!id) {
    return (
      <ScreenContainer>
        <View style={styles.center}>
          <Text style={styles.emptyTitle}>Диалог не найден</Text>
          <PrimaryButton title="Назад" onPress={() => router.back()} />
        </View>
      </ScreenContainer>
    );
  }

  if (conversation === 'loading') {
    return (
      <ScreenContainer>
        <View style={styles.loading}>
          <ActivityIndicator size="large" color={theme.colors.primary} />
          <Text style={styles.loadingText}>Загрузка…</Text>
        </View>
      </ScreenContainer>
    );
  }

  if (!conversation) {
    return (
      <ScreenContainer>
        <View style={styles.center}>
          <Text style={styles.emptyTitle}>Диалог не найден</Text>
          <Text style={styles.emptyText}>
            {loadError ?? 'Проверьте соединение или попробуйте позже'}
          </Text>
          <PrimaryButton
            title="Повторить"
            onPress={fetchConversation}
            style={styles.retryBtn}
          />
          <PrimaryButton
            title="Назад"
            variant="ghost"
            onPress={() => router.back()}
            style={styles.backBtn}
          />
        </View>
      </ScreenContainer>
    );
  }

  return (
    <ScreenContainer style={styles.container}>
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
          {conversation.messages.length === 0 ? (
            <View style={styles.emptyMessages}>
              <Text style={styles.emptyMessagesText}>Пока нет сообщений</Text>
            </View>
          ) : (
            conversation.messages.map((msg) => (
              <View
                key={msg.id}
                style={[
                  styles.messageRow,
                  msg.isOwn ? styles.messageRowOwn : styles.messageRowOther,
                ]}
              >
                <View
                  style={[
                    styles.messageBubble,
                    msg.isOwn ? styles.bubbleOwn : styles.bubbleOther,
                  ]}
                >
                  {!msg.isOwn && (
                    <Text style={styles.senderName}>{msg.senderName}</Text>
                  )}
                  <Text style={styles.messageText}>{msg.text}</Text>
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
            ))
          )}
        </ScrollView>

        <View style={styles.inputArea}>
          {sendError ? (
            <Text style={styles.sendErrorText} numberOfLines={1}>
              {sendError}
            </Text>
          ) : null}
          <View style={styles.inputRow}>
            <TextInput
              style={styles.input}
              placeholder="Сообщение…"
              placeholderTextColor={theme.colors.textMuted}
              value={inputText}
              onChangeText={(t) => {
                setInputText(t);
                setSendError(null);
              }}
              multiline
              maxLength={2000}
              editable={!sending}
              blurOnSubmit={false}
            />
            <PrimaryButton
              title={sending ? '…' : 'Отправить'}
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
  loading: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: theme.spacing.md,
  },
  loadingText: {
    ...theme.typography.body,
    color: theme.colors.textMuted,
  },
  center: {
    flex: 1,
    paddingVertical: theme.spacing.xxl,
    alignItems: 'center',
    gap: theme.spacing.lg,
  },
  emptyTitle: {
    ...theme.typography.title,
    color: theme.colors.text,
    textAlign: 'center',
  },
  emptyText: {
    ...theme.typography.body,
    color: theme.colors.textMuted,
    textAlign: 'center',
  },
  retryBtn: { marginBottom: theme.spacing.sm },
  backBtn: {},
  scroll: { flex: 1 },
  scrollContent: {
    padding: theme.spacing.lg,
    paddingBottom: theme.spacing.xl,
  },
  emptyMessages: {
    paddingVertical: theme.spacing.xxl,
    alignItems: 'center',
  },
  emptyMessagesText: {
    ...theme.typography.body,
    color: theme.colors.textMuted,
  },
  messageRow: {
    marginBottom: theme.spacing.md,
    alignItems: 'flex-start',
  },
  messageRowOwn: {
    alignItems: 'flex-end',
  },
  messageRowOther: {},
  messageBubble: {
    maxWidth: '85%',
    padding: theme.spacing.md,
    borderRadius: theme.borderRadius.md,
  },
  bubbleOwn: {
    backgroundColor: theme.colors.primaryMuted,
    borderBottomRightRadius: 4,
  },
  bubbleOther: {
    backgroundColor: theme.colors.surfaceElevated,
    borderBottomLeftRadius: 4,
  },
  senderName: {
    ...theme.typography.caption,
    fontSize: 11,
    fontWeight: '600',
    color: theme.colors.primary,
    marginBottom: theme.spacing.xs,
  },
  messageText: {
    ...theme.typography.body,
    color: theme.colors.text,
    lineHeight: 22,
  },
  messageTime: {
    fontSize: 11,
    marginTop: theme.spacing.xs,
  },
  messageTimeOwn: {
    color: theme.colors.textMuted,
  },
  messageTimeOther: {
    color: theme.colors.textSecondary,
  },
  inputArea: {
    padding: theme.spacing.md,
    paddingBottom: theme.spacing.lg,
    borderTopWidth: 1,
    borderTopColor: theme.colors.border,
    backgroundColor: theme.colors.background,
  },
  sendErrorText: {
    ...theme.typography.caption,
    color: theme.colors.error,
    marginBottom: theme.spacing.xs,
  },
  inputRow: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: theme.spacing.sm,
  },
  input: {
    flex: 1,
    minHeight: 40,
    maxHeight: 100,
    paddingHorizontal: theme.spacing.md,
    paddingVertical: theme.spacing.sm,
    borderRadius: theme.borderRadius.md,
    backgroundColor: theme.colors.surfaceElevated,
    color: theme.colors.text,
    ...theme.typography.body,
  },
  sendBtn: {},
  sendBtnDisabled: {
    opacity: 0.6,
  },
});
