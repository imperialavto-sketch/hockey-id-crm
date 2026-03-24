import React, { useState, useMemo } from 'react';
import { StyleSheet, Text, View, TextInput } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { getParamId } from '@/lib/params';
import { ScreenContainer } from '@/components/layout/ScreenContainer';
import { SectionCard } from '@/components/ui/SectionCard';
import { PrimaryButton } from '@/components/ui/PrimaryButton';
import { EmptyState } from '@/components/ui/EmptyState';
import { DashboardSection } from '@/components/dashboard/DashboardSection';
import { StaggerFadeIn } from '@/components/dashboard/StaggerFadeIn';
import { AttendanceHero } from '@/components/attendance/AttendanceHero';
import { PlayerAttendanceRow } from '@/components/attendance/PlayerAttendanceRow';
import {
  getAttendanceSession,
  type AttendancePlayer,
  type AttendanceStatus,
} from '@/constants/attendanceData';
import { theme } from '@/constants/theme';

function countByStatus(roster: AttendancePlayer[]) {
  const present = roster.filter((p) => p.status === 'present').length;
  const late = roster.filter((p) => p.status === 'late').length;
  const absent = roster.filter((p) => p.status === 'absent').length;
  const excused = roster.filter((p) => p.status === 'excused').length;
  return { present, late, absent, excused };
}

export default function AttendanceScreen() {
  const params = useLocalSearchParams<{ teamId: string }>();
  const teamId = getParamId(params.teamId);
  const router = useRouter();

  const initialSession = teamId ? getAttendanceSession(teamId) : null;
  const [roster, setRoster] = useState<AttendancePlayer[]>(
    initialSession?.roster ?? []
  );

  const session = teamId ? getAttendanceSession(teamId) : null;

  const handleStatusChange = (playerId: string, status: AttendanceStatus) => {
    setRoster((prev) =>
      prev.map((p) => (p.id === playerId ? { ...p, status } : p))
    );
  };

  const counts = useMemo(() => countByStatus(roster), [roster]);

  if (!session) {
    return (
      <ScreenContainer contentContainerStyle={styles.content}>
        <StaggerFadeIn delay={0}>
          <EmptyState
            title="Тренировка не найдена"
            subtitle="Выберите команду в расписании"
            icon="📋"
            action={{ label: 'Назад', onPress: () => router.back() }}
          />
        </StaggerFadeIn>
        <View style={styles.bottomSpacer} />
      </ScreenContainer>
    );
  }

  return (
    <ScreenContainer contentContainerStyle={styles.content}>
      <StaggerFadeIn delay={0}>
        <AttendanceHero
          teamName={session.teamName}
          date={session.date}
          time={session.time}
          venue={session.venue}
          confirmed={session.confirmed}
          pending={session.pending}
        />
      </StaggerFadeIn>

      <StaggerFadeIn delay={15}>
        <DashboardSection title="Обзор" compact>
          <SectionCard elevated>
            <View style={styles.snapshotRow}>
              <View style={styles.snapshotItem}>
                <Text style={styles.snapshotValue}>{session.roster.length}</Text>
                <Text style={styles.snapshotLabel}>игроков</Text>
              </View>
              <View style={styles.snapshotDivider} />
              <View style={styles.snapshotItem}>
                <Text style={styles.snapshotValue}>{session.venue}</Text>
                <Text style={styles.snapshotLabel}>площадка</Text>
              </View>
            </View>
          </SectionCard>
        </DashboardSection>
      </StaggerFadeIn>

      <StaggerFadeIn delay={25}>
        <DashboardSection title="Сводка" compact>
          <SectionCard elevated>
            <View style={styles.summaryRow}>
              <View style={styles.summaryItem}>
                <Text style={[styles.summaryValue, styles.summaryPresent]}>
                  {counts.present}
                </Text>
                <Text style={styles.summaryLabel}>присутствует</Text>
              </View>
              <View style={styles.summaryItem}>
                <Text style={[styles.summaryValue, styles.summaryLate]}>
                  {counts.late}
                </Text>
                <Text style={styles.summaryLabel}>опоздал</Text>
              </View>
              <View style={styles.summaryItem}>
                <Text style={[styles.summaryValue, styles.summaryAbsent]}>
                  {counts.absent}
                </Text>
                <Text style={styles.summaryLabel}>отсутствует</Text>
              </View>
              <View style={styles.summaryItem}>
                <Text style={[styles.summaryValue, styles.summaryExcused]}>
                  {counts.excused}
                </Text>
                <Text style={styles.summaryLabel}>уважительно</Text>
              </View>
            </View>
          </SectionCard>
        </DashboardSection>
      </StaggerFadeIn>

      <StaggerFadeIn delay={40}>
        <DashboardSection title="Игроки">
          <SectionCard elevated style={styles.rosterCard}>
            {roster.map((player, index) => (
              <StaggerFadeIn key={player.id} delay={55 + index * 20}>
                <PlayerAttendanceRow
                  playerId={player.id}
                  name={player.name}
                  number={player.number}
                  position={player.position}
                  status={player.status}
                  onStatusChange={handleStatusChange}
                  isLast={index === roster.length - 1}
                />
              </StaggerFadeIn>
            ))}
          </SectionCard>
        </DashboardSection>
      </StaggerFadeIn>

      <StaggerFadeIn delay={50}>
        <DashboardSection title="Заметки" compact>
          <SectionCard elevated>
            <TextInput
              style={styles.noteInput}
              placeholder="Заметка к тренировке"
              placeholderTextColor={theme.colors.textMuted}
              multiline
              numberOfLines={3}
            />
          </SectionCard>
        </DashboardSection>
      </StaggerFadeIn>

      <StaggerFadeIn delay={60}>
        <PrimaryButton
          title="Сохранить посещаемость"
          onPress={() => router.back()}
          style={styles.saveBtn}
        />
      </StaggerFadeIn>

      <View style={styles.bottomSpacer} />
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  content: {
    paddingBottom: theme.spacing.xxl,
  },
  snapshotRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.spacing.md,
  },
  snapshotItem: {
    flex: 1,
    alignItems: 'center',
  },
  snapshotDivider: {
    width: 1,
    height: 32,
    backgroundColor: theme.colors.border,
  },
  snapshotValue: {
    ...theme.typography.subtitle,
    color: theme.colors.text,
  },
  snapshotLabel: {
    fontSize: 11,
    fontWeight: '600',
    letterSpacing: 0.4,
    color: theme.colors.textMuted,
    textTransform: 'uppercase',
    marginTop: theme.spacing.xs,
  },
  summaryRow: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    gap: theme.spacing.sm,
  },
  summaryItem: {
    alignItems: 'center',
    flex: 1,
  },
  summaryValue: {
    ...theme.typography.title,
    fontSize: 22,
  },
  summaryPresent: {
    color: theme.colors.primary,
  },
  summaryLate: {
    color: theme.colors.warning,
  },
  summaryAbsent: {
    color: theme.colors.error,
  },
  summaryExcused: {
    color: theme.colors.accent,
  },
  summaryLabel: {
    fontSize: 11,
    fontWeight: '600',
    letterSpacing: 0.4,
    color: theme.colors.textMuted,
    textTransform: 'uppercase',
    marginTop: theme.spacing.xs,
  },
  rosterCard: {
    padding: 0,
    overflow: 'hidden',
  },
  noteInput: {
    ...theme.typography.body,
    color: theme.colors.text,
    minHeight: 72,
    textAlignVertical: 'top',
  },
  saveBtn: {
    marginTop: theme.spacing.sm,
  },
  bottomSpacer: {
    height: theme.spacing.xl,
  },
});
