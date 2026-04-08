import { memo, useMemo } from "react";
import { View, Text, StyleSheet } from "react-native";
import { Ionicons } from "@expo/vector-icons";

import type { TeamAnnouncementDto } from "@/types/teamAnnouncement";
import {
  announcementKindLabel,
  formatAnnouncementDate,
} from "@/lib/teamAnnouncementLabels";
import { colors, spacing, typography, radius } from "@/constants/theme";

type Props = {
  item: TeamAnnouncementDto;
  isHighlighted?: boolean;
};

export const TeamAnnouncementCard = memo(function TeamAnnouncementCard({
  item,
  isHighlighted = false,
}: Props) {
  const when = useMemo(() => {
    const t = item.publishedAt ?? item.createdAt;
    return formatAnnouncementDate(t);
  }, [item.publishedAt, item.createdAt]);

  const kind = useMemo(() => announcementKindLabel(item.kind), [item.kind]);

  const authorLine = useMemo(() => {
    const role =
      item.authorRole === "coach"
        ? "Тренер"
        : item.authorRole === "school"
          ? "Школа"
          : "Автор";
    return `${role} · ${item.authorName}`;
  }, [item.authorName, item.authorRole]);

  return (
    <View
      style={[
        styles.card,
        item.isPinned ? styles.cardPinned : undefined,
        isHighlighted ? styles.cardHighlighted : undefined,
      ]}
    >
      {item.isPinned ? (
        <View style={styles.pinnedRow}>
          <Ionicons name="pin" size={14} color={colors.accentBright} />
          <Text style={styles.pinnedText}>Закреплено</Text>
        </View>
      ) : null}
      <View style={styles.topRow}>
        <View style={styles.kindPill}>
          <Text style={styles.kindText}>{kind}</Text>
        </View>
        <Text style={styles.time}>{when}</Text>
      </View>
      <Text style={styles.title}>{item.title}</Text>
      <Text style={styles.body}>{item.body}</Text>
      <Text style={styles.author}>{authorLine}</Text>
      {item.hasMedia ? (
        <Text style={styles.mediaHint}>К публикации приложены материалы</Text>
      ) : null}
    </View>
  );
});

const styles = StyleSheet.create({
  card: {
    backgroundColor: colors.surfaceLevel1,
    borderRadius: radius.lg,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.surfaceLevel1Border,
    padding: spacing.md,
    marginBottom: spacing.md,
  },
  cardPinned: {
    borderLeftWidth: 3,
    borderLeftColor: colors.accent,
  },
  cardHighlighted: {
    backgroundColor: "rgba(59,130,246,0.10)",
    borderColor: "rgba(59,130,246,0.30)",
  },
  pinnedRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.xs,
    marginBottom: spacing.sm,
  },
  pinnedText: {
    ...typography.captionSmall,
    fontSize: 11,
    fontWeight: "600",
    color: colors.accentBright,
    textTransform: "uppercase",
    letterSpacing: 0.4,
  },
  topRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: spacing.sm,
    marginBottom: spacing.sm,
  },
  kindPill: {
    paddingHorizontal: spacing.sm,
    paddingVertical: 4,
    borderRadius: radius.sm,
    backgroundColor: "rgba(148,163,184,0.15)",
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: "rgba(148,163,184,0.3)",
  },
  kindText: {
    fontSize: 11,
    fontWeight: "600",
    color: colors.textSecondary,
  },
  time: {
    ...typography.caption,
    fontSize: 12,
    color: colors.textMuted,
    flexShrink: 0,
  },
  title: {
    ...typography.cardTitle,
    fontSize: 17,
    fontWeight: "700",
    color: colors.text,
    marginBottom: spacing.xs,
  },
  body: {
    ...typography.body,
    fontSize: 15,
    lineHeight: 22,
    color: colors.textSecondary,
    marginBottom: spacing.sm,
  },
  author: {
    ...typography.caption,
    fontSize: 12,
    color: colors.textMuted,
  },
  mediaHint: {
    ...typography.captionSmall,
    fontSize: 11,
    color: colors.textMuted,
    marginTop: spacing.sm,
    fontStyle: "italic",
  },
});
