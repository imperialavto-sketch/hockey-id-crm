import React, { useCallback, useEffect, useState } from "react";
import {
  ActivityIndicator,
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Switch,
  Text,
  TextInput,
  View,
} from "react-native";
import { theme } from "@/constants/theme";
import { formatLiveTrainingDraftCategory } from "@/lib/liveTrainingDraftCategoryLabel";
import {
  LIVE_TRAINING_EDITABLE_CATEGORY_ORDER,
  LIVE_TRAINING_EDITABLE_CATEGORY_SLUG_SET,
} from "@/lib/liveTrainingEditableCategories";
import type { LiveTrainingObservationDraft, LiveTrainingSentiment } from "@/types/liveTraining";

export type LiveTrainingReviewRosterEntry = { id: string; name: string };

export type LiveTrainingDraftSavePhase = "idle" | "saving" | "saved" | "error";

type Props = {
  visible: boolean;
  draft: LiveTrainingObservationDraft | null;
  roster: LiveTrainingReviewRosterEntry[];
  saving: boolean;
  /** Состояния сохранения для подписей Saving / Saved / Error */
  savePhase?: LiveTrainingDraftSavePhase;
  saveErrorMessage?: string | null;
  onClose: () => void;
  onSave: (patch: {
    sourceText: string;
    playerId: string | null;
    category: string;
    sentiment: LiveTrainingSentiment;
    needsReview: boolean;
  }) => Promise<void>;
  onDelete: () => void;
};

export function LiveTrainingDraftEditModal({
  visible,
  draft,
  roster,
  saving,
  savePhase = "idle",
  saveErrorMessage = null,
  onClose,
  onSave,
  onDelete,
}: Props) {
  const [sourceText, setSourceText] = useState("");
  const [playerId, setPlayerId] = useState<string | null>(null);
  const [category, setCategory] = useState<string>("general_observation");
  const [sentiment, setSentiment] = useState<LiveTrainingSentiment>("neutral");
  const [needsReview, setNeedsReview] = useState(false);

  useEffect(() => {
    if (!visible || !draft) return;
    setSourceText(draft.sourceText);
    setPlayerId(draft.playerId);
    setCategory(
      LIVE_TRAINING_EDITABLE_CATEGORY_SLUG_SET.has(draft.category)
        ? draft.category
        : "general_observation"
    );
    setSentiment(draft.sentiment);
    setNeedsReview(draft.needsReview);
  }, [visible, draft?.id, draft]);

  const handleSave = useCallback(async () => {
    const t = sourceText.trim();
    if (!t) return;
    await onSave({
      sourceText: t,
      playerId,
      category,
      sentiment,
      needsReview,
    });
  }, [sourceText, playerId, category, sentiment, needsReview, onSave]);

  if (!draft) return null;

  const frozen = saving || savePhase === "saving" || savePhase === "saved";

  return (
    <Modal
      animationType="fade"
      transparent
      visible={visible}
      onRequestClose={() => {
        if (!frozen) onClose();
      }}
    >
      <View style={styles.overlay}>
        <Pressable style={styles.backdrop} onPress={frozen ? undefined : onClose} />
        <View style={styles.sheet}>
          <View style={styles.topRow}>
            <Text style={styles.title}>Правка наблюдения</Text>
            <Pressable onPress={frozen ? undefined : onClose} hitSlop={12}>
              <Text style={styles.closeText}>Закрыть</Text>
            </Pressable>
          </View>

          <Text style={styles.label}>Текст</Text>
          <TextInput
            style={styles.textInput}
            multiline
            value={sourceText}
            onChangeText={setSourceText}
            editable={!frozen}
            placeholder="Текст наблюдения"
            placeholderTextColor={theme.colors.textMuted}
          />

          <Text style={styles.label}>Игрок</Text>
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.chipRow}
          >
            <Pressable
              onPress={() => !frozen && setPlayerId(null)}
              style={({ pressed }) => [
                styles.chip,
                playerId == null && styles.chipActive,
                pressed && styles.chipPressed,
              ]}
            >
              <Text style={[styles.chipText, playerId == null && styles.chipTextActive]}>
                Без игрока
              </Text>
            </Pressable>
            {roster.map((p) => {
              const active = p.id === playerId;
              return (
                <Pressable
                  key={p.id}
                  onPress={() => !frozen && setPlayerId(p.id)}
                  style={({ pressed }) => [
                    styles.chip,
                    active && styles.chipActive,
                    pressed && styles.chipPressed,
                  ]}
                >
                  <Text style={[styles.chipText, active && styles.chipTextActive]}>{p.name}</Text>
                </Pressable>
              );
            })}
          </ScrollView>

          <Text style={styles.label}>Категория</Text>
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.chipRow}
          >
            {LIVE_TRAINING_EDITABLE_CATEGORY_ORDER.map((slug) => {
              const active = category === slug;
              return (
                <Pressable
                  key={slug}
                  onPress={() => !frozen && setCategory(slug)}
                  style={({ pressed }) => [
                    styles.chip,
                    active && styles.chipActive,
                    pressed && styles.chipPressed,
                  ]}
                >
                  <Text style={[styles.chipText, active && styles.chipTextActive]} numberOfLines={1}>
                    {formatLiveTrainingDraftCategory(slug)}
                  </Text>
                </Pressable>
              );
            })}
          </ScrollView>

          <Text style={styles.label}>Тональность</Text>
          <View style={styles.sentimentRow}>
            {(
              [
                ["positive", "Плюс"],
                ["neutral", "Нейтр."],
                ["negative", "Минус"],
              ] as const
            ).map(([key, label]) => {
              const active = sentiment === key;
              return (
                <Pressable
                  key={key}
                  onPress={() => !frozen && setSentiment(key)}
                  style={({ pressed }) => [
                    styles.sentimentBtn,
                    active && styles.sentimentBtnActive,
                    pressed && styles.chipPressed,
                  ]}
                >
                  <Text style={[styles.sentimentBtnText, active && styles.sentimentBtnTextActive]}>
                    {label}
                  </Text>
                </Pressable>
              );
            })}
          </View>

          <View style={styles.switchRow}>
            <Text style={styles.switchLabel}>Требует проверки</Text>
            <Switch
              value={needsReview}
              onValueChange={frozen ? undefined : setNeedsReview}
              trackColor={{ false: theme.colors.border, true: theme.colors.primaryMuted }}
              thumbColor={needsReview ? theme.colors.primary : theme.colors.surface}
            />
          </View>

          {savePhase === "error" && saveErrorMessage ? (
            <Text style={styles.saveErrorBanner}>{saveErrorMessage}</Text>
          ) : null}
          {savePhase === "saved" ? (
            <Text style={styles.saveOkBanner}>Сохранено на сервере</Text>
          ) : null}

          <Pressable
            style={[styles.primaryBtn, (!sourceText.trim() || frozen) && styles.btnDisabled]}
            onPress={() => void handleSave()}
            disabled={!sourceText.trim() || frozen}
          >
            {savePhase === "saving" || saving ? (
              <ActivityIndicator color="#fff" />
            ) : savePhase === "error" ? (
              <Text style={styles.primaryBtnText}>Повторить сохранение</Text>
            ) : (
              <Text style={styles.primaryBtnText}>Сохранить</Text>
            )}
          </Pressable>

          <Pressable
            style={[styles.dangerBtn, frozen && styles.btnDisabled]}
            onPress={() => void onDelete()}
            disabled={frozen}
          >
            <Text style={styles.dangerBtnText}>Удалить из списка</Text>
          </Pressable>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    justifyContent: "flex-end",
  },
  backdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "rgba(0,0,0,0.45)",
  },
  sheet: {
    backgroundColor: theme.colors.surface,
    borderTopLeftRadius: 16,
    borderTopRightRadius: 16,
    paddingHorizontal: theme.spacing.lg,
    paddingTop: theme.spacing.md,
    paddingBottom: theme.layout.screenBottom + theme.spacing.md,
    maxHeight: "88%",
  },
  topRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: theme.spacing.md,
  },
  title: {
    ...theme.typography.subtitle,
    fontWeight: "700",
  },
  closeText: {
    ...theme.typography.body,
    color: theme.colors.primary,
    fontWeight: "600",
  },
  label: {
    ...theme.typography.caption,
    color: theme.colors.textMuted,
    textTransform: "uppercase",
    letterSpacing: 0.5,
    marginBottom: theme.spacing.xs,
    marginTop: theme.spacing.sm,
  },
  textInput: {
    ...theme.typography.body,
    borderWidth: 1,
    borderColor: theme.colors.border,
    borderRadius: 10,
    paddingHorizontal: theme.spacing.md,
    paddingVertical: theme.spacing.sm,
    minHeight: 88,
    textAlignVertical: "top",
    color: theme.colors.text,
  },
  chipRow: {
    flexDirection: "row",
    flexWrap: "nowrap",
    gap: 8,
    paddingVertical: 4,
  },
  chip: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: theme.colors.border,
    backgroundColor: theme.colors.background,
  },
  chipActive: {
    borderColor: theme.colors.primary,
    backgroundColor: theme.colors.primaryMuted,
  },
  chipPressed: {
    opacity: 0.85,
  },
  chipText: {
    ...theme.typography.caption,
    color: theme.colors.text,
    maxWidth: 140,
  },
  chipTextActive: {
    color: theme.colors.primary,
    fontWeight: "600",
  },
  sentimentRow: {
    flexDirection: "row",
    gap: 8,
    marginTop: 4,
  },
  sentimentBtn: {
    flex: 1,
    paddingVertical: 10,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: theme.colors.border,
    alignItems: "center",
  },
  sentimentBtnActive: {
    borderColor: theme.colors.primary,
    backgroundColor: theme.colors.primaryMuted,
  },
  sentimentBtnText: {
    ...theme.typography.caption,
    color: theme.colors.textMuted,
  },
  sentimentBtnTextActive: {
    color: theme.colors.primary,
    fontWeight: "600",
  },
  switchRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginTop: theme.spacing.md,
    marginBottom: theme.spacing.sm,
  },
  switchLabel: {
    ...theme.typography.body,
    color: theme.colors.text,
  },
  primaryBtn: {
    backgroundColor: theme.colors.primary,
    borderRadius: 12,
    paddingVertical: 14,
    alignItems: "center",
    marginTop: theme.spacing.sm,
  },
  primaryBtnText: {
    ...theme.typography.body,
    color: "#fff",
    fontWeight: "700",
  },
  dangerBtn: {
    marginTop: theme.spacing.sm,
    paddingVertical: 12,
    alignItems: "center",
  },
  dangerBtnText: {
    ...theme.typography.body,
    color: theme.colors.error,
    fontWeight: "600",
  },
  btnDisabled: {
    opacity: 0.5,
  },
  saveErrorBanner: {
    ...theme.typography.caption,
    color: theme.colors.error,
    marginBottom: theme.spacing.sm,
    lineHeight: 18,
  },
  saveOkBanner: {
    ...theme.typography.caption,
    color: theme.colors.success,
    fontWeight: "600",
    marginBottom: theme.spacing.sm,
  },
});
