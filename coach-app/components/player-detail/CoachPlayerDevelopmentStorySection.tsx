import React from "react";
import { ActivityIndicator, StyleSheet, Text, View } from "react-native";
import { SectionCard } from "@/components/ui/SectionCard";
import { DashboardSection } from "@/components/dashboard/DashboardSection";
import { theme } from "@/constants/theme";
import type { CoachPlayerStory } from "@/services/coachPlayersService";

const SECTION_TITLE = "Линия развития";
const SECTION_SUB =
  "Краткая последовательность из live training: тренировки, динамика и свежие отметки (без отдельного ИИ-нарратива).";

function formatStoryDate(iso: string | null): string {
  if (!iso) return "";
  try {
    return new Date(iso).toLocaleDateString("ru-RU", {
      day: "numeric",
      month: "short",
      year: "numeric",
    });
  } catch {
    return "";
  }
}

function toneColors(tone: string): { border: string; kicker: string } {
  if (tone === "positive") {
    return { border: theme.colors.primary, kicker: theme.colors.primary };
  }
  if (tone === "attention") {
    return { border: theme.colors.warning, kicker: theme.colors.warning };
  }
  return { border: "rgba(255,255,255,0.14)", kicker: theme.colors.textSecondary };
}

type Props = {
  loading: boolean;
  story: CoachPlayerStory | null;
  loadError: string | null;
};

export function CoachPlayerDevelopmentStorySection({ loading, story, loadError }: Props) {
  const items = story?.items ?? [];
  const lowData = story?.lowData ?? true;

  return (
    <DashboardSection title={SECTION_TITLE}>
      <Text style={styles.sectionSub}>{SECTION_SUB}</Text>
      <SectionCard elevated style={styles.card}>
        {loading ? (
          <View style={styles.loadingRow}>
            <ActivityIndicator size="small" color={theme.colors.primary} />
            <Text style={styles.muted}>Загрузка…</Text>
          </View>
        ) : loadError ? (
          <Text style={styles.errorText}>{loadError}</Text>
        ) : lowData || items.length === 0 ? (
          <Text style={styles.emptyText}>
            Линия развития появится после нескольких подтверждённых тренировок с отметками по этому игроку.
          </Text>
        ) : (
          items.map((it, idx) => {
            const { border, kicker } = toneColors(it.tone);
            const dateLine = formatStoryDate(it.date);
            return (
              <View
                key={`${it.type}-${idx}-${it.title}`}
                style={[styles.row, idx > 0 && styles.rowDivider]}
              >
                <View style={[styles.accent, { backgroundColor: border }]} />
                <View style={styles.rowBody}>
                  <View style={styles.rowTop}>
                    <Text style={[styles.typeKicker, { color: kicker }]} numberOfLines={1}>
                      {typeLabelRu(it.type)}
                    </Text>
                    {dateLine ? (
                      <Text style={styles.dateText} numberOfLines={1}>
                        {dateLine}
                      </Text>
                    ) : null}
                  </View>
                  <Text style={styles.title}>{it.title}</Text>
                  <Text style={styles.body}>{it.body}</Text>
                </View>
              </View>
            );
          })
        )}
      </SectionCard>
    </DashboardSection>
  );
}

function typeLabelRu(t: CoachPlayerStory["items"][number]["type"]): string {
  switch (t) {
    case "training_summary":
      return "Тренировка";
    case "positive_signal":
      return "Отметка";
    case "focus_area":
      return "Фокус";
    case "trend_note":
      return "Динамика";
    default:
      return "Запись";
  }
}

const styles = StyleSheet.create({
  sectionSub: {
    fontSize: 13,
    lineHeight: 18,
    color: theme.colors.textSecondary,
    marginBottom: 10,
    paddingHorizontal: 4,
  },
  card: {
    paddingVertical: 12,
  },
  loadingRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    paddingVertical: 16,
    paddingHorizontal: 4,
  },
  muted: {
    fontSize: 14,
    color: theme.colors.textSecondary,
  },
  errorText: {
    fontSize: 14,
    color: theme.colors.error,
    paddingVertical: 12,
  },
  emptyText: {
    fontSize: 14,
    lineHeight: 20,
    color: theme.colors.textSecondary,
    paddingVertical: 8,
  },
  row: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 10,
    paddingVertical: 10,
    paddingHorizontal: 4,
  },
  rowDivider: {
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: "rgba(255,255,255,0.08)",
  },
  accent: {
    width: 3,
    borderRadius: 2,
    marginTop: 4,
    minHeight: 36,
    alignSelf: "stretch",
  },
  rowBody: {
    flex: 1,
    minWidth: 0,
  },
  rowTop: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    gap: 8,
    marginBottom: 4,
  },
  typeKicker: {
    fontSize: 11,
    fontWeight: "600",
    letterSpacing: 0.3,
    textTransform: "uppercase",
    flexShrink: 1,
  },
  dateText: {
    fontSize: 12,
    color: theme.colors.textMuted,
  },
  title: {
    fontSize: 15,
    fontWeight: "600",
    color: theme.colors.text,
    marginBottom: 4,
  },
  body: {
    fontSize: 14,
    lineHeight: 20,
    color: theme.colors.textSecondary,
  },
});
