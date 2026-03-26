import React, { useState, useCallback } from "react";
import {
  StyleSheet,
  Text,
  View,
  Pressable,
  ActivityIndicator,
  Alert,
} from "react-native";
import { useRouter } from "expo-router";
import * as Clipboard from "expo-clipboard";
import { SectionCard } from "@/components/ui/SectionCard";
import { PrimaryButton } from "@/components/ui/PrimaryButton";
import {
  getParentDrafts,
  type ParentDraftItem,
} from "@/lib/parentDraftHelpers";
import { isEndpointUnavailable, clearEndpointUnavailable, COACH_ENDPOINTS } from "@/lib/endpointAvailability";
import { theme } from "@/constants/theme";
import { useFocusEffect } from "@react-navigation/native";

function ParentDraftsContent({
  drafts,
  loading,
  onOpen,
  onCopy,
  onAll,
  onRetry,
  copiedId,
}: {
  drafts: ParentDraftItem[];
  loading: boolean;
  onOpen: (playerId: string | null) => void;
  onCopy: (item: ParentDraftItem) => void;
  onAll: () => void;
  onRetry: () => void;
  copiedId: string | null;
}) {
  if (loading) {
    return (
      <SectionCard elevated style={blockStyles.active}>
        <View style={blockStyles.loading}>
          <ActivityIndicator size="small" color={theme.colors.primary} />
          <Text style={blockStyles.loadingText}>Загрузка…</Text>
        </View>
      </SectionCard>
    );
  }

  if (drafts.length === 0) {
    const unavailable = isEndpointUnavailable(COACH_ENDPOINTS.PARENT_DRAFTS);
    return (
      <SectionCard elevated style={blockStyles.active}>
        <Text style={blockStyles.emptyTitle}>
          {unavailable ? 'Модуль черновиков пока не подключён' : 'Пока нет готовых черновиков'}
        </Text>
        <Text style={blockStyles.emptyText}>
          {unavailable ? 'Когда сервер будет готов, здесь появятся черновики' : 'Запишите тренировку'}
        </Text>
        {unavailable ? (
          <PrimaryButton
            title="Проверить снова"
            variant="outline"
            onPress={onRetry}
            style={blockStyles.allBtn}
          />
        ) : (
          <PrimaryButton
            title="Все"
            variant="outline"
            onPress={onAll}
            style={blockStyles.allBtn}
          />
        )}
      </SectionCard>
    );
  }

  const displayList = drafts.slice(0, 2);

  return (
    <SectionCard elevated style={blockStyles.active}>
      <View style={blockStyles.countRow}>
        <Text style={blockStyles.countText}>
          {drafts.length}{" "}
          {drafts.length === 1
            ? "черновик"
            : drafts.length < 5
              ? "черновика"
              : "черновиков"}
        </Text>
      </View>
      {displayList.map((item, i) => (
        <View
          key={item.id}
          style={[blockStyles.row, i > 0 && blockStyles.rowBorder]}
        >
          <Pressable
            style={({ pressed }) => [
              blockStyles.rowContent,
              pressed && blockStyles.pressed,
            ]}
            onPress={() => onOpen(item.playerId)}
          >
            <Text style={blockStyles.rowName}>{item.playerName}</Text>
            <Text style={blockStyles.rowPreview} numberOfLines={2}>
              {item.preview}
            </Text>
          </Pressable>
          <View style={blockStyles.rowActions}>
            <PrimaryButton
              title={item.playerId ? "Открыть" : "Без карточки игрока"}
              variant="ghost"
              onPress={() => onOpen(item.playerId)}
              disabled={!item.playerId}
              style={blockStyles.rowBtn}
              textStyle={blockStyles.rowBtnText}
            />
            <PrimaryButton
              title={copiedId === item.id ? "Скопировано" : "Скопировать"}
              variant="ghost"
              onPress={() => onCopy(item)}
              disabled={copiedId === item.id}
              style={blockStyles.rowBtn}
              textStyle={blockStyles.rowBtnText}
            />
          </View>
        </View>
      ))}
      <PrimaryButton
        title="Все"
        variant="outline"
        onPress={onAll}
        style={blockStyles.allBtn}
      />
    </SectionCard>
  );
}

export function ParentDraftsBlock() {
  const router = useRouter();
  const [drafts, setDrafts] = useState<ParentDraftItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [copiedId, setCopiedId] = useState<string | null>(null);

  const handleCopy = async (item: ParentDraftItem) => {
    try {
      await Clipboard.setStringAsync(item.message);
      setCopiedId(item.id);
      setTimeout(() => setCopiedId(null), 2000);
    } catch {
      Alert.alert("Ошибка", "Не удалось скопировать");
    }
  };

  const fetchDrafts = useCallback(() => {
    setLoading(true);
    getParentDrafts()
      .then((data) => setDrafts(data))
      .catch(() => setDrafts([]))
      .finally(() => setLoading(false));
  }, []);

  useFocusEffect(useCallback(() => fetchDrafts(), [fetchDrafts]));

  const handleRetry = useCallback(() => {
    clearEndpointUnavailable(COACH_ENDPOINTS.PARENT_DRAFTS);
    fetchDrafts();
  }, [fetchDrafts]);

  return (
    <ParentDraftsContent
      drafts={drafts}
      loading={loading}
      onOpen={(id) => {
        if (!id) return;
        router.push(`/player/${id}/share-report`);
      }}
      onCopy={handleCopy}
      onAll={() => router.push("/parent-drafts")}
      onRetry={handleRetry}
      copiedId={copiedId}
    />
  );
}

const blockStyles = StyleSheet.create({
  active: {
    borderLeftWidth: 4,
    borderLeftColor: theme.colors.primary,
  },
  loading: {
    flexDirection: "row",
    alignItems: "center",
    gap: theme.spacing.sm,
    paddingVertical: theme.spacing.lg,
  },
  loadingText: {
    ...theme.typography.body,
    color: theme.colors.textMuted,
  },
  emptyTitle: {
    ...theme.typography.subtitle,
    color: theme.colors.text,
    marginBottom: theme.spacing.xs,
  },
  emptyText: {
    ...theme.typography.caption,
    color: theme.colors.textMuted,
  },
  countRow: {
    marginBottom: theme.spacing.md,
  },
  countText: {
    ...theme.typography.caption,
    color: theme.colors.textMuted,
    fontWeight: "600",
  },
  row: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingVertical: theme.spacing.md,
  },
  rowBorder: {
    borderTopWidth: 1,
    borderTopColor: theme.colors.border,
  },
  rowContent: {
    flex: 1,
    marginRight: theme.spacing.md,
  },
  rowName: {
    ...theme.typography.subtitle,
    color: theme.colors.text,
    marginBottom: 2,
  },
  rowPreview: {
    ...theme.typography.caption,
    color: theme.colors.textSecondary,
    lineHeight: 18,
  },
  rowActions: {
    flexDirection: "row",
    gap: theme.spacing.xs,
  },
  rowBtn: {
    paddingVertical: theme.spacing.xs,
    paddingHorizontal: theme.spacing.sm,
  },
  rowBtnText: {
    fontSize: 12,
  },
  allBtn: {
    marginTop: theme.spacing.sm,
  },
  pressed: {
    opacity: 0.8,
  },
});
