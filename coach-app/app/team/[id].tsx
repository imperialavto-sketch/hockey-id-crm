import React, { useState, useCallback } from 'react';
import { StyleSheet, Text, View, Pressable, ActivityIndicator } from 'react-native';
import { useLocalSearchParams, useRouter, useFocusEffect } from 'expo-router';
import { getParamId } from '@/lib/params';
import { ScreenContainer } from '@/components/layout/ScreenContainer';
import { SectionCard } from '@/components/ui/SectionCard';
import { PrimaryButton } from '@/components/ui/PrimaryButton';
import { DashboardSection } from '@/components/dashboard/DashboardSection';
import { StaggerFadeIn } from '@/components/dashboard/StaggerFadeIn';
import { TeamDetailHero } from '@/components/team-detail/TeamDetailHero';
import { getCoachTeamDetail, type CoachTeamDetail } from '@/services/coachTeamsService';
import { isAuthRequiredError } from '@/lib/coachAuth';
import type { TeamDetailData } from '@/constants/teamDetailData';
import { theme } from '@/constants/theme';

function mapToTeamDetailData(d: CoachTeamDetail): TeamDetailData {
  return {
    id: d.id,
    name: d.name,
    level: d.level,
    playerCount: d.playerCount,
    nextSession: d.nextSession ?? {
      date: '—',
      time: '—',
      venue: '—',
      confirmed: 0,
      expected: d.playerCount,
    },
    attendance: d.attendance,
    rosterHighlights: d.roster.map((r) => ({
      id: r.id,
      name: r.name,
      number: r.number,
      position: r.position,
    })),
    announcements: [],
    recentActivity: [],
  };
}

function ActivityBadge({ type }: { type: 'practice' | 'game' | 'assessment' }) {
  const label = type === 'practice' ? 'Тренировка' : type === 'game' ? 'Игра' : 'Оценка';
  const isGame = type === 'game';

  return (
    <View
      style={[
        styles.activityBadge,
        {
          backgroundColor: isGame
            ? theme.colors.accentMuted
            : theme.colors.surfaceElevated,
        },
      ]}
    >
      <Text
        style={[
          styles.activityBadgeText,
          { color: isGame ? theme.colors.accent : theme.colors.textSecondary },
        ]}
      >
        {label}
      </Text>
    </View>
  );
}

export default function TeamHubScreen() {
  const params = useLocalSearchParams<{ id: string }>();
  const id = getParamId(params.id);
  const router = useRouter();
  const [team, setTeam] = useState<CoachTeamDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useFocusEffect(
    useCallback(() => {
      if (!id) {
        setLoading(false);
        setTeam(null);
        return;
      }
      setLoading(true);
      setError(null);
      getCoachTeamDetail(id)
        .then((data) => {
          setTeam(data ?? null);
          setError(null);
        })
        .catch((err) => {
          setTeam(null);
          setError(isAuthRequiredError(err) ? 'Требуется авторизация' : (err instanceof Error ? err.message : 'Не удалось загрузить команду'));
        })
        .finally(() => setLoading(false));
    }, [id])
  );

  if (!id) {
    return (
      <ScreenContainer>
        <View style={styles.notFound}>
          <Text style={styles.notFoundText}>Команда не найдена</Text>
          <PrimaryButton title="К списку команд" onPress={() => router.back()} />
        </View>
      </ScreenContainer>
    );
  }

  if (loading) {
    return (
      <ScreenContainer>
        <View style={styles.loading}>
          <ActivityIndicator size="small" color={theme.colors.primary} />
          <Text style={styles.loadingText}>Загрузка…</Text>
        </View>
      </ScreenContainer>
    );
  }

  if (error || !team) {
    const refetch = () => {
      setLoading(true);
      setError(null);
      getCoachTeamDetail(id!)
        .then((data) => {
          setTeam(data ?? null);
          setError(null);
        })
        .catch((err) => {
          setTeam(null);
          setError(isAuthRequiredError(err) ? 'Требуется авторизация' : (err instanceof Error ? err.message : 'Не удалось загрузить команду'));
        })
        .finally(() => setLoading(false));
    };
    return (
      <ScreenContainer>
        <View style={styles.notFound}>
          <Text style={styles.notFoundText}>{error ?? 'Команда не найдена'}</Text>
          <PrimaryButton title="Повторить" variant="outline" onPress={refetch} style={styles.retryBtn} />
          <PrimaryButton title="К списку команд" onPress={() => router.back()} />
        </View>
      </ScreenContainer>
    );
  }

  const teamData = mapToTeamDetailData(team);
  const { nextSession, attendance, rosterHighlights, announcements, recentActivity } =
    teamData;

  return (
    <ScreenContainer contentContainerStyle={styles.content}>
      <StaggerFadeIn delay={0}>
        <TeamDetailHero team={teamData} />
      </StaggerFadeIn>

      <StaggerFadeIn delay={60}>
        <DashboardSection title="Профиль команды">
          <SectionCard elevated>
            <View style={styles.snapshotRow}>
              <View style={styles.snapshotItem}>
                <Text style={styles.snapshotLabel}>Игроков</Text>
                <Text style={styles.snapshotValue}>{team.playerCount}</Text>
              </View>
              <View style={styles.snapshotDivider} />
              <View style={styles.snapshotItem}>
                <Text style={styles.snapshotLabel}>Уровень</Text>
                <Text style={styles.snapshotValue}>{team.level}</Text>
              </View>
              <View style={styles.snapshotDivider} />
              <View style={styles.snapshotItem}>
                <Text style={styles.snapshotLabel}>Посещаемость</Text>
                <Text style={styles.snapshotValue}>
                  {attendance.attended}/{attendance.total}
                </Text>
              </View>
            </View>
          </SectionCard>
        </DashboardSection>
      </StaggerFadeIn>

      <StaggerFadeIn delay={120}>
        <DashboardSection title="Ближайшая тренировка">
          <SectionCard elevated>
            <Text style={styles.sessionTime}>
              {nextSession.date}, {nextSession.time}
            </Text>
            <Text style={styles.sessionVenue}>{nextSession.venue}</Text>
            <Text style={styles.sessionAttendance}>
              <Text style={styles.attendanceHighlight}>{nextSession.confirmed}</Text>
              <Text style={styles.attendanceSlash}>/{nextSession.expected}</Text>
              {' '}
              подтверждено
            </Text>
          </SectionCard>
        </DashboardSection>
      </StaggerFadeIn>

      <StaggerFadeIn delay={180}>
        <DashboardSection title="Посещаемость">
          <SectionCard elevated>
            <View style={styles.attendanceRow}>
              <Text style={styles.attendanceValue}>
                <Text style={styles.attendanceHighlight}>{attendance.attended}</Text>
                <Text style={styles.attendanceSlash}>/{attendance.total}</Text>
              </Text>
              <Text style={styles.attendanceLabel}>тренировок за цикл</Text>
            </View>
          </SectionCard>
        </DashboardSection>
      </StaggerFadeIn>

      {rosterHighlights.length > 0 ? (
        <StaggerFadeIn delay={240}>
          <DashboardSection title="Состав">
            <SectionCard elevated>
              {rosterHighlights.map((player) => (
                <Pressable
                  key={player.id}
                  style={({ pressed }) => [
                    styles.rosterItem,
                    pressed && styles.pressed,
                  ]}
                  onPress={() => router.push(`/player/${player.id}`)}
                >
                  <View style={styles.rosterAvatar}>
                    <Text style={styles.rosterNumber}>#{player.number}</Text>
                  </View>
                  <View style={styles.rosterInfo}>
                    <Text style={styles.rosterName}>{player.name}</Text>
                    <Text style={styles.rosterPosition}>{player.position}</Text>
                  </View>
                  <Text style={styles.rosterArrow}>→</Text>
                </Pressable>
              ))}
              <PrimaryButton
                title="Управление ростером"
                variant="outline"
                onPress={() => router.push({ pathname: '/unavailable', params: { module: 'roster' } })}
                style={styles.rosterCta}
              />
            </SectionCard>
          </DashboardSection>
        </StaggerFadeIn>
      ) : null}

      <StaggerFadeIn delay={rosterHighlights.length > 0 ? 300 : 240}>
        <DashboardSection title="Объявления">
          <SectionCard elevated>
            {announcements.length > 0 ? (
              announcements.map((ann) => (
                <View key={ann.id} style={styles.announcementItem}>
                  <Text style={styles.annDate}>{ann.date}</Text>
                  <Text style={styles.annTitle}>{ann.title}</Text>
                  <Text style={styles.annPreview} numberOfLines={2}>
                    {ann.preview}
                  </Text>
                </View>
              ))
            ) : (
              <Text style={styles.emptyText}>Нет объявлений</Text>
            )}
          </SectionCard>
        </DashboardSection>
      </StaggerFadeIn>

      <StaggerFadeIn delay={rosterHighlights.length > 0 ? 360 : 300}>
        <DashboardSection title="Последняя активность">
          <SectionCard elevated>
            {recentActivity.length > 0 ? (
              recentActivity.map((act) => (
                <View key={act.id} style={styles.activityItem}>
                  <ActivityBadge type={act.type} />
                  <View style={styles.activityContent}>
                    <Text style={styles.activityTitle}>{act.title}</Text>
                    <Text style={styles.activityDate}>{act.date}</Text>
                  </View>
                </View>
              ))
            ) : (
              <Text style={styles.emptyText}>Нет недавней активности</Text>
            )}
          </SectionCard>
        </DashboardSection>
      </StaggerFadeIn>

      <StaggerFadeIn delay={rosterHighlights.length > 0 ? 420 : 360}>
        <DashboardSection title="Быстрые действия">
          <SectionCard elevated>
            <View style={styles.actions}>
              <PrimaryButton
                title="Отметить посещаемость"
                variant="primary"
                onPress={() => router.push(`/attendance/${team.id}`)}
                style={styles.actionBtn}
              />
              <PrimaryButton
                title="Написать команде"
                variant="ghost"
                onPress={() => router.push({ pathname: '/unavailable', params: { module: 'write-team' } })}
                style={styles.actionBtn}
              />
              <PrimaryButton
                title="Управление ростером"
                variant="outline"
                onPress={() => router.push({ pathname: '/unavailable', params: { module: 'roster' } })}
                style={styles.actionBtn}
              />
            </View>
          </SectionCard>
        </DashboardSection>
      </StaggerFadeIn>

      <View style={styles.bottomSpacer} />
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  content: {
    paddingBottom: theme.spacing.xxl,
  },
  loading: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: theme.spacing.sm,
    paddingVertical: theme.spacing.xxl,
  },
  loadingText: {
    ...theme.typography.body,
    color: theme.colors.textMuted,
  },
  notFound: {
    paddingVertical: theme.spacing.xxl,
    alignItems: 'center',
    gap: theme.spacing.lg,
  },
  notFoundText: {
    ...theme.typography.title,
    color: theme.colors.text,
  },
  retryBtn: { marginBottom: theme.spacing.sm },
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
  snapshotLabel: {
    fontSize: 11,
    fontWeight: '600',
    letterSpacing: 0.4,
    color: theme.colors.textMuted,
    textTransform: 'uppercase',
    marginBottom: theme.spacing.xs,
  },
  snapshotValue: {
    ...theme.typography.subtitle,
    color: theme.colors.text,
  },
  sessionTime: {
    fontSize: 20,
    fontWeight: '600',
    color: theme.colors.primary,
    marginBottom: theme.spacing.xs,
  },
  sessionVenue: {
    ...theme.typography.body,
    color: theme.colors.text,
    marginBottom: theme.spacing.xs,
  },
  sessionAttendance: {
    ...theme.typography.caption,
    color: theme.colors.textSecondary,
  },
  attendanceRow: {
    alignItems: 'center',
    gap: theme.spacing.xs,
  },
  attendanceValue: {
    ...theme.typography.title,
    color: theme.colors.text,
    fontSize: 28,
  },
  attendanceHighlight: {
    color: theme.colors.primary,
    fontWeight: '700',
  },
  attendanceSlash: {
    color: theme.colors.textSecondary,
    fontWeight: '500',
  },
  attendanceLabel: {
    ...theme.typography.caption,
    color: theme.colors.textSecondary,
  },
  rosterItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.spacing.md,
    paddingVertical: theme.spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.border,
  },
  pressed: {
    opacity: 0.8,
  },
  rosterAvatar: {
    width: 40,
    height: 40,
    borderRadius: theme.borderRadius.full,
    backgroundColor: theme.colors.primaryMuted,
    alignItems: 'center',
    justifyContent: 'center',
  },
  rosterNumber: {
    ...theme.typography.caption,
    color: theme.colors.primary,
    fontWeight: '600',
  },
  rosterInfo: {
    flex: 1,
  },
  rosterName: {
    ...theme.typography.subtitle,
    color: theme.colors.text,
  },
  rosterPosition: {
    ...theme.typography.caption,
    color: theme.colors.textSecondary,
    marginTop: 2,
  },
  rosterArrow: {
    ...theme.typography.body,
    color: theme.colors.textMuted,
  },
  rosterCta: {
    marginTop: theme.spacing.sm,
  },
  announcementItem: {
    paddingVertical: theme.spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.border,
  },
  annDate: {
    fontSize: 11,
    fontWeight: '600',
    letterSpacing: 0.4,
    color: theme.colors.textMuted,
    textTransform: 'uppercase',
    marginBottom: theme.spacing.xs,
  },
  annTitle: {
    ...theme.typography.subtitle,
    color: theme.colors.text,
    marginBottom: theme.spacing.xs,
  },
  annPreview: {
    ...theme.typography.body,
    color: theme.colors.textSecondary,
  },
  emptyText: {
    ...theme.typography.body,
    color: theme.colors.textMuted,
    paddingVertical: theme.spacing.md,
  },
  activityItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.spacing.md,
    paddingVertical: theme.spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.border,
  },
  activityBadge: {
    paddingHorizontal: theme.spacing.sm,
    paddingVertical: theme.spacing.xs,
    borderRadius: theme.borderRadius.sm,
  },
  activityBadgeText: {
    fontSize: 11,
    fontWeight: '600',
    letterSpacing: 0.3,
    textTransform: 'uppercase',
  },
  activityContent: {
    flex: 1,
  },
  activityTitle: {
    ...theme.typography.subtitle,
    color: theme.colors.text,
  },
  activityDate: {
    ...theme.typography.caption,
    color: theme.colors.textMuted,
    marginTop: 2,
  },
  actions: {
    gap: theme.spacing.sm,
  },
  actionBtn: {
    width: '100%',
  },
  bottomSpacer: {
    height: theme.spacing.xl,
  },
});
