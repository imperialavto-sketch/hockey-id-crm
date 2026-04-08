/**
 * Общие стили пузыря треда и индикатора набора (Coach Mark).
 * Используются в `ChatMessageBubble` и в `app/chat/[id].tsx` (`TypingIndicator`).
 */

import { StyleSheet } from "react-native";
import { colors, spacing, typography, radius, radii } from "@/constants/theme";

export const BUBBLE_TAIL_RADIUS = radii.xs;

const PRESSED_OPACITY = 0.88;

export const chatThreadBubbleStyles = StyleSheet.create({
  bubble: {
    maxWidth: "79%",
    paddingHorizontal: spacing.md + 4,
    paddingVertical: spacing.md + 1,
    borderRadius: radius.lg,
    marginBottom: spacing.md,
    shadowColor: "#0A1E3C",
    shadowOpacity: 0.2,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 3 },
    elevation: 2,
  },
  bubblePressed: {
    opacity: PRESSED_OPACITY,
  },
  typingBubble: {
    borderLeftColor: "rgba(59,130,246,0.35)",
    borderLeftWidth: 3,
  },
  typingInner: {
    flex: 1,
  },
  typingRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.xs,
  },
  typingText: {
    fontSize: 15,
    color: colors.textSecondary,
    fontStyle: "italic",
  },
  typingDots: {
    flexDirection: "row",
    gap: spacing.xs / 2,
  },
  typingDot: {
    fontSize: 16,
    color: colors.accent,
  },
  bubbleLeft: {
    alignSelf: "flex-start",
    backgroundColor: "rgba(10,24,46,0.74)",
    borderWidth: 1,
    borderColor: "rgba(196,230,255,0.28)",
    borderBottomLeftRadius: BUBBLE_TAIL_RADIUS,
  },
  bubbleCoachMark: {
    backgroundColor: "rgba(12,32,62,0.78)",
    borderLeftColor: "rgba(97,171,255,0.58)",
    borderLeftWidth: 3,
  },
  /** Канал объявлений: заметные карточки от тренера/школы. */
  bubbleAnnouncement: {
    maxWidth: "92%",
    alignSelf: "flex-start",
    backgroundColor: "rgba(30,42,28,0.88)",
    borderWidth: 1,
    borderColor: "rgba(212,175,55,0.45)",
    borderLeftWidth: 4,
    borderLeftColor: "rgba(212,175,55,0.85)",
    borderBottomLeftRadius: BUBBLE_TAIL_RADIUS,
  },
  bubbleAnnouncementText: {
    color: "rgba(255,248,235,0.98)",
    fontWeight: "600",
  },
  bubbleTextCoachMark: {
    lineHeight: 25,
    color: "rgba(243,249,255,0.98)",
  },
  bubbleRight: {
    alignSelf: "flex-end",
    backgroundColor: "rgba(38,105,238,0.52)",
    borderWidth: 1,
    borderColor: "rgba(159,204,255,0.5)",
    borderBottomRightRadius: BUBBLE_TAIL_RADIUS,
  },
  bubbleText: {
    ...typography.bodySmall,
    fontSize: 16,
    color: "rgba(242,248,255,0.97)",
    lineHeight: 24,
    letterSpacing: 0.1,
    fontWeight: "500",
  },
  bubbleTime: {
    ...typography.captionSmall,
    fontSize: 11,
    color: "rgba(202,224,255,0.78)",
    marginTop: spacing.sm,
    opacity: 1,
    paddingHorizontal: 1,
  },
  bubbleTimeLeft: {
    textAlign: "left",
  },
  bubbleTimeRight: {
    textAlign: "right",
    color: "rgba(225,239,255,0.82)",
  },
});
