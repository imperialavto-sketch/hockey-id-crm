import React, { useCallback, useEffect, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { useLocalSearchParams, useRouter, type Href } from "expo-router";
import * as Clipboard from "expo-clipboard";
import { ScreenContainer } from "@/components/layout/ScreenContainer";
import { SectionCard } from "@/components/ui/SectionCard";
import { PrimaryButton } from "@/components/ui/PrimaryButton";
import { theme } from "@/constants/theme";
import { formatVoiceDateTimeFullRu } from "@/lib/voiceMvp";
import { hasVoiceNoteLink, VOICE_PROVENANCE } from "@/lib/voiceProvenanceCopy";
import {
  getCreatedActionById,
  type CreatedActionDetail,
} from "@/services/createdActionsService";

export default function CreatedActionDetailScreen() {
  const router = useRouter();
  const params = useLocalSearchParams<{ id?: string }>();
  const id = params.id?.trim() ?? "";

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [item, setItem] = useState<CreatedActionDetail | null>(null);
  const [copied, setCopied] = useState(false);

  const fetchOne = useCallback(() => {
    if (!id) return;
    setLoading(true);
    setError(null);
    getCreatedActionById(id)
      .then((res) => {
        if (!res.ok) {
          setItem(null);
          setError(res.error);
          return;
        }
        setItem(res.data);
      })
      .finally(() => setLoading(false));
  }, [id]);

  useEffect(() => fetchOne(), [fetchOne]);

  const onCopy = useCallback(async () => {
    if (!item) return;
    try {
      await Clipboard.setStringAsync(item.description);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {
      Alert.alert("Ошибка", "Не удалось скопировать");
    }
  }, [item]);

  if (!id) {
    return (
      <ScreenContainer>
        <View style={styles.center}>
          <Text style={styles.title}>Задача не найдена</Text>
          <PrimaryButton title="Назад" onPress={() => router.back()} />
        </View>
      </ScreenContainer>
    );
  }

  if (loading) {
    return (
      <ScreenContainer>
        <View style={styles.center}>
          <ActivityIndicator size="small" color={theme.colors.primary} />
          <Text style={styles.sub}>Загрузка…</Text>
        </View>
      </ScreenContainer>
    );
  }

  if (error || !item) {
    return (
      <ScreenContainer>
        <View style={styles.center}>
          <Text style={styles.title}>Не удалось загрузить</Text>
          <Text style={styles.sub}>{error ?? "—"}</Text>
          <PrimaryButton title="Повторить" variant="outline" onPress={fetchOne} />
          <PrimaryButton title="Назад" variant="ghost" onPress={() => router.back()} />
        </View>
      </ScreenContainer>
    );
  }

  const showVoiceProvenance = hasVoiceNoteLink(item.voiceNoteId);
  const linkedVoiceNoteId =
    showVoiceProvenance && typeof item.voiceNoteId === "string" ? item.voiceNoteId.trim() : "";

  return (
    <ScreenContainer>
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.content}>
        <Text style={styles.eyebrow}>Задача</Text>
        <Text style={styles.title}>Просмотр</Text>
        <Text style={styles.meta}>{formatVoiceDateTimeFullRu(item.createdAt)}</Text>
        <Text style={styles.readonly}>Только чтение</Text>

        {showVoiceProvenance ? (
          <SectionCard elevated style={styles.provenanceCard}>
            <Text style={styles.kicker}>{VOICE_PROVENANCE.DETAIL_KICKER}</Text>
            <Text style={styles.provenanceText}>{VOICE_PROVENANCE.DETAIL_DESCRIPTION}</Text>
            <PrimaryButton
              title={VOICE_PROVENANCE.OPEN_NOTE_CTA}
              variant="outline"
              onPress={() =>
                router.push(`/voice-notes/${encodeURIComponent(linkedVoiceNoteId)}` as Href)
              }
              style={styles.provenanceBtn}
            />
          </SectionCard>
        ) : null}

        <SectionCard elevated style={styles.card}>
          <Text style={styles.kicker}>Заголовок</Text>
          <Text style={styles.body}>{item.title}</Text>
          <Text style={styles.bodyMuted}>Статус: {item.status}</Text>
          {item.playerName ? (
            <Text style={styles.bodyMuted}>Игрок: {item.playerName}</Text>
          ) : null}
        </SectionCard>

        <SectionCard elevated style={styles.card}>
          <Text style={styles.kicker}>Описание</Text>
          <Text style={styles.body}>{item.description}</Text>
        </SectionCard>

        <PrimaryButton
          title={copied ? "Скопировано" : "Скопировать текст"}
          variant="outline"
          onPress={onCopy}
          disabled={copied}
          style={styles.btn}
        />
        <PrimaryButton title="Назад" variant="ghost" onPress={() => router.back()} />
      </ScrollView>
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  content: { paddingBottom: theme.spacing.xxl },
  center: {
    flex: 1,
    paddingVertical: theme.spacing.xxl,
    alignItems: "center",
    gap: theme.spacing.md,
  },
  eyebrow: {
    fontSize: 11,
    fontWeight: "600",
    letterSpacing: 0.5,
    color: theme.colors.textMuted,
    textTransform: "uppercase",
    marginBottom: theme.spacing.xs,
  },
  title: { ...theme.typography.title, color: theme.colors.text, marginBottom: theme.spacing.sm },
  sub: {
    ...theme.typography.caption,
    color: theme.colors.textMuted,
    lineHeight: 18,
    textAlign: "center",
  },
  meta: { ...theme.typography.caption, color: theme.colors.textSecondary, marginBottom: theme.spacing.xs },
  readonly: { ...theme.typography.caption, color: theme.colors.textMuted, marginBottom: theme.spacing.lg },
  provenanceCard: {
    marginBottom: theme.spacing.lg,
    borderLeftWidth: 4,
    borderLeftColor: theme.colors.accent,
    backgroundColor: theme.colors.surfaceElevated,
  },
  provenanceText: {
    ...theme.typography.body,
    color: theme.colors.textSecondary,
    lineHeight: 22,
    marginBottom: theme.spacing.sm,
  },
  provenanceBtn: { marginTop: theme.spacing.xs },
  card: { marginBottom: theme.spacing.lg, borderLeftWidth: 4, borderLeftColor: theme.colors.warning },
  kicker: {
    ...theme.typography.caption,
    color: theme.colors.textMuted,
    textTransform: "uppercase",
    letterSpacing: 0.55,
    marginBottom: theme.spacing.sm,
  },
  body: { ...theme.typography.body, color: theme.colors.text, lineHeight: 24 },
  bodyMuted: { ...theme.typography.caption, color: theme.colors.textMuted, marginTop: theme.spacing.sm, lineHeight: 18 },
  btn: { marginBottom: theme.spacing.sm },
});

