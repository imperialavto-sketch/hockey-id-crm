import React, { useState, useCallback } from "react";
import {
  StyleSheet,
  Text,
  View,
  ScrollView,
  ActivityIndicator,
  Alert,
} from "react-native";
import { useLocalSearchParams, useRouter, useFocusEffect } from "expo-router";
import * as Clipboard from "expo-clipboard";
import { getParamId } from "@/lib/params";
import { ScreenContainer } from "@/components/layout/ScreenContainer";
import { PrimaryButton } from "@/components/ui/PrimaryButton";
import { SectionCard } from "@/components/ui/SectionCard";
import { getCoachShareReport } from "@/services/coachParentDraftsService";
import { theme } from "@/constants/theme";

export default function ShareReportScreen() {
  const params = useLocalSearchParams<{ id: string }>();
  const id = getParamId(params.id);
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  const fetchMessage = useCallback(() => {
    if (!id) return;
    setLoading(true);
    setMessage(null);
    getCoachShareReport(id).then((data) => {
      setLoading(false);
      setMessage(data?.message ?? null);
    });
  }, [id]);

  useFocusEffect(useCallback(() => fetchMessage(), [fetchMessage]));

  const handleCopy = async () => {
    if (!message) return;
    try {
      await Clipboard.setStringAsync(message);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      Alert.alert("Ошибка", "Не удалось скопировать");
    }
  };

  if (!id) {
    return (
      <ScreenContainer>
        <View style={styles.empty}>
          <Text style={styles.emptyTitle}>Игрок не найден</Text>
          <PrimaryButton title="Назад" onPress={() => router.back()} />
        </View>
      </ScreenContainer>
    );
  }

  if (loading) {
    return (
      <ScreenContainer>
        <View style={styles.loading}>
          <ActivityIndicator size="large" color={theme.colors.primary} />
          <Text style={styles.loadingText}>Загрузка…</Text>
        </View>
      </ScreenContainer>
    );
  }

  if (!message) {
    return (
      <ScreenContainer>
        <View style={styles.empty}>
          <Text style={styles.emptyTitle}>Пока нет сообщения</Text>
          <Text style={styles.emptyText}>
            Нужно минимум 3 наблюдения. Запишите тренировку
          </Text>
          <PrimaryButton title="Повторить" variant="outline" onPress={fetchMessage} style={styles.retryBtn} />
          <PrimaryButton title="Назад" variant="ghost" onPress={() => router.back()} />
        </View>
      </ScreenContainer>
    );
  }

  return (
    <ScreenContainer>
      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
      >
        <Text style={styles.title}>Сообщение родителю</Text>

        <SectionCard elevated style={styles.previewCard}>
          <Text style={styles.messageText}>{message}</Text>
        </SectionCard>

        <PrimaryButton
          title={copied ? "Скопировано" : "Скопировать"}
          onPress={handleCopy}
          disabled={copied}
          style={styles.copyBtn}
        />

        <Text style={styles.hint}>
          Скопируйте и отправьте в мессенджере или почте
        </Text>

        <PrimaryButton
          title="В сообщения"
          variant="outline"
          onPress={() => router.push("/(tabs)/messages")}
          style={styles.messagesBtn}
        />

        <PrimaryButton
          title="Готово"
          variant="ghost"
          onPress={() => router.back()}
          style={styles.doneBtn}
        />
      </ScrollView>
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  scroll: { flex: 1 },
  content: {
    paddingBottom: theme.spacing.xxl,
  },
  loading: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    gap: theme.spacing.md,
  },
  loadingText: {
    ...theme.typography.body,
    color: theme.colors.textMuted,
  },
  empty: {
    flex: 1,
    paddingVertical: theme.spacing.xxl,
    alignItems: "center",
    gap: theme.spacing.md,
  },
  emptyTitle: {
    ...theme.typography.title,
    color: theme.colors.text,
  },
  emptyText: {
    ...theme.typography.body,
    color: theme.colors.textMuted,
    textAlign: "center",
  },
  retryBtn: { marginBottom: theme.spacing.sm },
  title: {
    ...theme.typography.title,
    color: theme.colors.text,
    marginBottom: theme.spacing.lg,
  },
  previewCard: {
    marginBottom: theme.spacing.lg,
    borderLeftWidth: 4,
    borderLeftColor: theme.colors.primary,
  },
  messageText: {
    ...theme.typography.body,
    color: theme.colors.text,
    lineHeight: 24,
  },
  copyBtn: {
    marginBottom: theme.spacing.sm,
  },
  messagesBtn: {
    marginBottom: theme.spacing.sm,
  },
  hint: {
    ...theme.typography.caption,
    color: theme.colors.textMuted,
    textAlign: "center",
    marginBottom: theme.spacing.lg,
  },
  doneBtn: {},
});
