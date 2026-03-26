import React, { useCallback, useState } from "react";
import {
  ActivityIndicator,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { useFocusEffect, useRouter } from "expo-router";
import { ScreenContainer } from "@/components/layout/ScreenContainer";
import { SectionCard } from "@/components/ui/SectionCard";
import { PrimaryButton } from "@/components/ui/PrimaryButton";
import { theme } from "@/constants/theme";
import { formatVoiceDateTimeCompactRu } from "@/lib/voiceMvp";
import { hasVoiceNoteLink, VOICE_PROVENANCE } from "@/lib/voiceProvenanceCopy";
import {
  getCreatedActions,
  type CreatedActionListItem,
} from "@/services/createdActionsService";

function ActionRow({
  item,
  onOpen,
  isFirst,
}: {
  item: CreatedActionListItem;
  onOpen: () => void;
  isFirst: boolean;
}) {
  const fromVoiceNote = hasVoiceNoteLink(item.voiceNoteId);
  return (
    <Pressable
      style={({ pressed }) => [
        styles.row,
        !isFirst && styles.rowBorder,
        pressed && styles.pressed,
      ]}
      onPress={onOpen}
    >
      <View style={styles.rowContent}>
        <View style={styles.titleRow}>
          <Text style={styles.rowTitle} numberOfLines={1}>
            {item.title || "Задача"}
          </Text>
          {fromVoiceNote ? (
            <Text style={styles.provenancePill} accessibilityLabel={VOICE_PROVENANCE.DETAIL_DESCRIPTION}>
              {VOICE_PROVENANCE.PILL_LABEL}
            </Text>
          ) : null}
        </View>
        <Text style={styles.preview} numberOfLines={2}>
          {item.descriptionPreview}
        </Text>
        <View style={styles.rowMeta}>
          <Text style={styles.metaText}>{formatVoiceDateTimeCompactRu(item.createdAt)}</Text>
          <View style={styles.dot} />
          <Text style={styles.metaText}>{item.status || "open"}</Text>
          {item.playerName ? (
            <>
              <View style={styles.dot} />
              <Text style={styles.metaText} numberOfLines={1}>
                {item.playerName}
              </Text>
            </>
          ) : null}
        </View>
      </View>
      <PrimaryButton
        title="Подробнее"
        variant="ghost"
        onPress={onOpen}
        style={styles.rowBtn}
        textStyle={styles.rowBtnText}
      />
    </Pressable>
  );
}

export default function CreatedActionsScreen() {
  const router = useRouter();
  const [items, setItems] = useState<CreatedActionListItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchList = useCallback(() => {
    setLoading(true);
    setError(null);
    getCreatedActions()
      .then((res) => {
        if (!res.ok) {
          setItems([]);
          setError(res.error);
          return;
        }
        setItems(res.data);
      })
      .finally(() => setLoading(false));
  }, []);

  useFocusEffect(useCallback(() => fetchList(), [fetchList]));

  if (loading) {
    return (
      <ScreenContainer contentContainerStyle={styles.content}>
        <View style={styles.loading}>
          <ActivityIndicator size="small" color={theme.colors.primary} />
          <Text style={styles.loadingText}>Загрузка…</Text>
        </View>
      </ScreenContainer>
    );
  }

  if (error) {
    return (
      <ScreenContainer contentContainerStyle={styles.content}>
        <SectionCard elevated style={styles.errorCard}>
          <Text style={styles.errorTitle}>Не удалось загрузить</Text>
          <Text style={styles.errorText}>{error}</Text>
          <PrimaryButton title="Повторить" variant="outline" onPress={fetchList} />
        </SectionCard>
      </ScreenContainer>
    );
  }

  return (
    <ScreenContainer>
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.content}>
        <Text style={styles.heroEyebrow}>Задачи</Text>
        <Text style={styles.heroTitle}>Созданные задачи</Text>
        <Text style={styles.heroSub}>
          Задачи, созданные вручную и из голосовых заметок (read-only просмотр).
        </Text>

        {items.length === 0 ? (
          <SectionCard elevated style={styles.emptyCard}>
            <Text style={styles.emptyTitle}>Пока нет задач</Text>
            <Text style={styles.emptyText}>
              Создайте задачу из голосовой заметки — она появится здесь.
            </Text>
            <PrimaryButton
              title="К голосовой заметке"
              variant="outline"
              onPress={() => router.push("/voice-note")}
            />
          </SectionCard>
        ) : (
          <SectionCard elevated style={styles.listCard}>
            {items.map((it, idx) => (
              <ActionRow
                key={it.id}
                item={it}
                isFirst={idx === 0}
                onOpen={() => router.push(`/created-actions/${it.id}`)}
              />
            ))}
          </SectionCard>
        )}
      </ScrollView>
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  content: { paddingBottom: theme.spacing.xxl },
  loading: {
    flexGrow: 1,
    minHeight: 240,
    alignItems: "center",
    justifyContent: "center",
    gap: theme.spacing.sm,
  },
  loadingText: { ...theme.typography.body, color: theme.colors.textMuted },
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
    marginBottom: theme.spacing.xl,
    lineHeight: 18,
  },
  listCard: { borderLeftWidth: 4, borderLeftColor: theme.colors.warning },
  emptyCard: { borderLeftWidth: 4, borderLeftColor: theme.colors.textMuted },
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
  errorCard: { borderLeftWidth: 4, borderLeftColor: theme.colors.error },
  errorTitle: {
    ...theme.typography.subtitle,
    color: theme.colors.text,
    marginBottom: theme.spacing.xs,
  },
  errorText: {
    ...theme.typography.caption,
    color: theme.colors.textMuted,
    marginBottom: theme.spacing.md,
    lineHeight: 18,
  },
  row: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingVertical: theme.spacing.md,
  },
  rowBorder: { borderTopWidth: 1, borderTopColor: theme.colors.border },
  rowContent: { flex: 1, marginRight: theme.spacing.md },
  titleRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: theme.spacing.sm,
    marginBottom: 2,
  },
  rowTitle: { ...theme.typography.subtitle, color: theme.colors.text, flex: 1, minWidth: 0 },
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
  rowMeta: {
    flexDirection: "row",
    alignItems: "center",
    gap: theme.spacing.sm,
    flexWrap: "wrap",
    marginTop: 6,
  },
  metaText: { ...theme.typography.caption, color: theme.colors.textMuted },
  dot: { width: 4, height: 4, borderRadius: 2, backgroundColor: theme.colors.textMuted },
  preview: { ...theme.typography.caption, color: theme.colors.textSecondary, lineHeight: 18 },
  rowBtn: { paddingVertical: theme.spacing.xs, paddingHorizontal: theme.spacing.sm },
  rowBtnText: { fontSize: 12 },
  pressed: { opacity: 0.8 },
});

