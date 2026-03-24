import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { theme } from '@/constants/theme';

type AttendanceHeroProps = {
  teamName: string;
  date: string;
  time: string;
  venue: string;
  confirmed: number;
  pending: number;
};

export function AttendanceHero({
  teamName,
  date,
  time,
  venue,
  confirmed,
  pending,
}: AttendanceHeroProps) {
  const contextParts: string[] = [`${date}, ${time}`, venue];
  if (confirmed > 0 || pending > 0) {
    contextParts.push(
      `${confirmed} подтверждено${pending > 0 ? ` · ${pending} ожидают` : ''}`
    );
  }

  return (
    <View style={styles.hero}>
      <Text style={styles.eyebrow}>Посещаемость</Text>
      <Text style={styles.title}>{teamName}</Text>
      <View style={styles.context}>
        {contextParts.map((part, i) => (
          <React.Fragment key={i}>
            {i > 0 && <View style={styles.dot} />}
            <Text style={styles.summary}>{part}</Text>
          </React.Fragment>
        ))}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  hero: {
    marginBottom: theme.spacing.xl,
  },
  eyebrow: {
    fontSize: 11,
    fontWeight: '600',
    letterSpacing: 0.5,
    color: theme.colors.textMuted,
    textTransform: 'uppercase',
    marginBottom: theme.spacing.xs,
  },
  title: {
    fontSize: 28,
    fontWeight: '700',
    letterSpacing: -0.5,
    color: theme.colors.text,
    lineHeight: 34,
    marginBottom: theme.spacing.sm,
  },
  context: {
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: theme.spacing.sm,
  },
  summary: {
    ...theme.typography.body,
    color: theme.colors.textSecondary,
  },
  dot: {
    width: 4,
    height: 4,
    borderRadius: 2,
    backgroundColor: theme.colors.textMuted,
  },
});
