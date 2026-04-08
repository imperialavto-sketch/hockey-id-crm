import React from "react";
import { ActivityIndicator, Pressable, StyleSheet, Text, View } from "react-native";
import { useRouter } from "expo-router";
import { SectionCard } from "@/components/ui/SectionCard";
import { DashboardSection } from "@/components/dashboard/DashboardSection";
import { theme } from "@/constants/theme";
import { coachHapticSelection } from "@/lib/coachHaptics";
import type {
  CoachTaskSuggestion,
  CoachTaskSuggestionsFromReports,
} from "@/services/coachPlayersService";
import { COACH_PLAYER_DETAIL_COPY } from "@/lib/coachPlayerDetailUi";

type Props = {
  loading: boolean;
  taskSuggestions: CoachTaskSuggestionsFromReports | null;
  hidden: boolean;
  /** Диплинк на экран старта live с query ltPlayerId (опционально). */
  liveStartLink?: { teamId: string; playerId: string } | null;
};

function typeBadgeLabel(t: CoachTaskSuggestion["type"]): string {
  const c = COACH_PLAYER_DETAIL_COPY;
  if (t === "focus_for_next_session") return c.reportTaskSuggestionTypeFocus;
  if (t === "follow_up_check") return c.reportTaskSuggestionTypeCheck;
  return c.reportTaskSuggestionTypeNote;
}

export function CoachPlayerReportTaskSuggestionsSection({
  loading,
  taskSuggestions,
  hidden,
  liveStartLink,
}: Props) {
  const router = useRouter();
  const copy = COACH_PLAYER_DETAIL_COPY;
  const items = taskSuggestions?.suggestions ?? [];

  if (hidden) return null;

  return (
    <DashboardSection title={copy.reportTaskSuggestionsTitle}>
      <Text style={styles.sectionSub}>{copy.reportTaskSuggestionsSub}</Text>
      <SectionCard elevated style={styles.card}>
        {loading ? (
          <View style={styles.loadingRow}>
            <ActivityIndicator size="small" color={theme.colors.primary} />
            <Text style={styles.muted}>{copy.reportTaskSuggestionsLoading}</Text>
          </View>
        ) : items.length === 0 ? (
          <Text style={styles.empty}>{copy.reportTaskSuggestionsEmpty}</Text>
        ) : (
          <View style={styles.inner}>
            {items.map((s) => (
              <View
                key={s.id}
                style={[
                  styles.row,
                  s.priority === "elevated" && styles.rowElevated,
                ]}
              >
                <View style={styles.rowTop}>
                  <View style={styles.badge}>
                    <Text style={styles.badgeText}>{typeBadgeLabel(s.type)}</Text>
                  </View>
                  {s.priority === "elevated" ? (
                    <View style={styles.prioPill}>
                      <Text style={styles.prioPillText}>{copy.reportTaskSuggestionElevated}</Text>
                    </View>
                  ) : null}
                </View>
                <Text style={styles.title}>{s.title}</Text>
                {s.description && s.description !== s.title ? (
                  <Text style={styles.desc}>{s.description}</Text>
                ) : null}
              </View>
            ))}

            {taskSuggestions?.rationale && taskSuggestions.rationale.length > 0 ? (
              <View style={styles.rationaleBlock}>
                <Text style={styles.rationaleKicker}>{copy.reportTaskSuggestionsRationaleKicker}</Text>
                {taskSuggestions.rationale.map((r, i) => (
                  <Text key={i} style={styles.rationaleLine}>
                    {r}
                  </Text>
                ))}
              </View>
            ) : null}

            {liveStartLink && items.length > 0 ? (
              <Pressable
                onPress={() => {
                  coachHapticSelection();
                  const q = new URLSearchParams({
                    teamId: liveStartLink.teamId,
                    ltPlayerId: liveStartLink.playerId,
                  });
                  router.push(`/live-training/start?${q.toString()}` as Parameters<typeof router.push>[0]);
                }}
                style={({ pressed }) => [styles.liveLink, pressed && styles.liveLinkPressed]}
              >
                <Text style={styles.liveLinkText}>{copy.reportTaskSuggestionsLiveStartLink}</Text>
              </Pressable>
            ) : null}
          </View>
        )}
      </SectionCard>
    </DashboardSection>
  );
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
    paddingHorizontal: 4,
  },
  loadingRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: theme.spacing.sm,
    paddingVertical: theme.spacing.lg,
    paddingHorizontal: theme.spacing.sm,
  },
  muted: {
    ...theme.typography.body,
    color: theme.colors.textMuted,
  },
  empty: {
    ...theme.typography.body,
    fontSize: 14,
    color: theme.colors.textMuted,
    paddingVertical: theme.spacing.md,
    paddingHorizontal: theme.spacing.sm,
    lineHeight: 21,
  },
  inner: {
    paddingHorizontal: theme.spacing.sm,
  },
  row: {
    paddingVertical: 12,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: theme.colors.cardBorder,
  },
  rowElevated: {
    borderLeftWidth: 3,
    borderLeftColor: theme.colors.warning,
    paddingLeft: 10,
    marginLeft: -2,
  },
  rowTop: {
    flexDirection: "row",
    flexWrap: "wrap",
    alignItems: "center",
    gap: 8,
    marginBottom: 8,
  },
  badge: {
    alignSelf: "flex-start",
    paddingVertical: 3,
    paddingHorizontal: 8,
    borderRadius: theme.borderRadius.sm,
    backgroundColor: theme.colors.accentMuted,
  },
  badgeText: {
    fontSize: 10,
    fontWeight: "700",
    letterSpacing: 0.3,
    color: theme.colors.accent,
    textTransform: "uppercase",
  },
  prioPill: {
    paddingVertical: 3,
    paddingHorizontal: 8,
    borderRadius: theme.borderRadius.sm,
    backgroundColor: theme.colors.warningMuted,
  },
  prioPillText: {
    fontSize: 10,
    fontWeight: "700",
    color: theme.colors.warning,
    letterSpacing: 0.2,
  },
  title: {
    ...theme.typography.body,
    fontSize: 14,
    lineHeight: 21,
    fontWeight: "600",
    color: theme.colors.text,
  },
  desc: {
    marginTop: 6,
    ...theme.typography.body,
    fontSize: 13,
    lineHeight: 19,
    color: theme.colors.textSecondary,
  },
  rationaleBlock: {
    marginTop: 14,
    paddingTop: 12,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: theme.colors.cardBorder,
  },
  rationaleKicker: {
    fontSize: 10,
    fontWeight: "700",
    letterSpacing: 0.5,
    textTransform: "uppercase",
    color: theme.colors.textMuted,
    marginBottom: 8,
  },
  rationaleLine: {
    fontSize: 11,
    lineHeight: 16,
    color: theme.colors.textMuted,
    marginBottom: 6,
  },
  liveLink: {
    marginTop: 14,
    paddingVertical: 10,
    paddingHorizontal: 4,
  },
  liveLinkPressed: {
    opacity: 0.75,
  },
  liveLinkText: {
    fontSize: 13,
    fontWeight: "700",
    color: theme.colors.primary,
    letterSpacing: 0.2,
  },
});
