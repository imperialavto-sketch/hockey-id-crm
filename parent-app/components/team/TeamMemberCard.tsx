import React from "react";
import { View, Text, Image, StyleSheet } from "react-native";
import { colors, cardStyles, radii, spacing, typography } from "@/constants/theme";
import type { TeamMember } from "@/types/team";

const ROLE_LABELS: Record<string, string> = {
  coach: "Тренер",
  assistant_coach: "Ассистент",
  parent: "Родитель",
  player: "Игрок",
};

interface TeamMemberCardProps {
  member: TeamMember;
}

export function TeamMemberCard({ member }: TeamMemberCardProps) {
  return (
    <View style={styles.card}>
      <View style={styles.avatarWrap}>
        {member.avatarUrl ? (
          <Image source={{ uri: member.avatarUrl }} style={styles.avatar} />
        ) : (
          <View style={styles.avatarPlaceholder}>
            <Text style={styles.avatarLetter}>{member.name.charAt(0)}</Text>
          </View>
        )}
      </View>
      <Text style={styles.name}>{member.name}</Text>
      <Text style={styles.role}>{ROLE_LABELS[member.role] ?? member.role}</Text>
      {member.playerName && (
        <Text style={styles.player}>Игрок: {member.playerName}</Text>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    width: "48%",
    backgroundColor: cardStyles.backgroundColor,
    borderRadius: cardStyles.radius,
    padding: spacing[16],
    marginBottom: spacing[12],
    borderWidth: cardStyles.borderWidth,
    borderColor: cardStyles.borderColor,
  },
  avatarWrap: {
    marginBottom: spacing[12],
  },
  avatar: {
    width: 56,
    height: 56,
    borderRadius: radii.full,
  },
  avatarPlaceholder: {
    width: 56,
    height: 56,
    borderRadius: radii.full,
    backgroundColor: colors.accentSoft,
    alignItems: "center",
    justifyContent: "center",
  },
  avatarLetter: {
    fontSize: 22,
    fontWeight: "700",
    color: colors.accent,
  },
  name: {
    ...typography.body,
    fontWeight: "700",
    color: colors.text,
    marginBottom: 2,
  },
  role: {
    ...typography.caption,
    color: colors.textMuted,
  },
  player: {
    ...typography.caption,
    fontSize: 12,
    color: colors.accent,
    marginTop: spacing[8],
  },
});
