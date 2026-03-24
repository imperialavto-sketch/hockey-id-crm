import React, { useState, useCallback } from 'react';
import { StyleSheet, View, ActivityIndicator, Text } from 'react-native';
import { useRouter, useFocusEffect } from 'expo-router';
import { ScreenContainer } from '@/components/layout/ScreenContainer';
import { DashboardSection } from '@/components/dashboard/DashboardSection';
import { StaggerFadeIn } from '@/components/dashboard/StaggerFadeIn';
import { TeamHero } from '@/components/team/TeamHero';
import { TeamOverview } from '@/components/team/TeamOverview';
import { TeamCard, type TeamCardData } from '@/components/team/TeamCard';
import { getCoachTeams, type CoachTeamItem } from '@/services/coachTeamsService';
import { isAuthRequiredError } from '@/lib/coachAuth';
import { PrimaryButton } from '@/components/ui/PrimaryButton';
import { theme } from '@/constants/theme';

function mapToTeamCardData(t: CoachTeamItem): TeamCardData {
  return {
    id: t.id,
    name: t.name,
    level: t.level,
    levelVariant: 'primary',
    playerCount: t.playerCount,
    nextSession: t.nextSession ?? '—',
    venue: t.venue,
    confirmed: t.confirmed,
    expected: t.expected,
  };
}

const OVERVIEW_PLACEHOLDER = {
  nextSession: '—',
  totalConfirmed: 0,
  totalExpected: 0,
};

export default function TeamScreen() {
  const router = useRouter();
  const [teams, setTeams] = useState<CoachTeamItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useFocusEffect(
    useCallback(() => {
      setLoading(true);
      setError(null);
      getCoachTeams()
        .then((data) => {
          setTeams(data);
          setError(null);
        })
        .catch((err) => {
          setTeams([]);
          setError(isAuthRequiredError(err) ? 'Требуется авторизация' : (err instanceof Error ? err.message : 'Не удалось загрузить команды'));
        })
        .finally(() => setLoading(false));
    }, [])
  );

  const totalPlayers = teams.reduce((s, t) => s + t.playerCount, 0);
  const totalConfirmed = teams.reduce((s, t) => s + t.confirmed, 0);
  const totalExpected = teams.reduce((s, t) => s + t.expected, 0);
  const overview = teams.length > 0
    ? {
        nextSession: teams[0]?.nextSession ?? '—',
        totalConfirmed,
        totalExpected: totalExpected || totalPlayers,
      }
    : OVERVIEW_PLACEHOLDER;

  return (
    <ScreenContainer contentContainerStyle={styles.content}>
      <StaggerFadeIn delay={0}>
        <TeamHero
          teamsCount={teams.length}
          totalPlayers={totalPlayers}
        />
      </StaggerFadeIn>

      <StaggerFadeIn delay={60}>
        <DashboardSection title="Обзор команд">
          <TeamOverview
            nextSession={overview.nextSession}
            totalConfirmed={overview.totalConfirmed}
            totalExpected={overview.totalExpected}
          />
        </DashboardSection>
      </StaggerFadeIn>

      <StaggerFadeIn delay={120}>
        <DashboardSection title="Мои команды">
          {loading ? (
            <View style={styles.loading}>
              <ActivityIndicator size="small" color={theme.colors.primary} />
              <Text style={styles.loadingText}>Загрузка…</Text>
            </View>
          ) : error ? (
            <View style={styles.emptyBlock}>
              <Text style={styles.errorText}>{error}</Text>
              <Text style={styles.errorHint}>
                Проверьте подключение и настройки API.
              </Text>
              <PrimaryButton
                title="Повторить"
                variant="outline"
                onPress={() => {
                  setLoading(true);
                  setError(null);
                  getCoachTeams()
                    .then((data) => { setTeams(data); setError(null); })
                    .catch((err) => {
                      setTeams([]);
                      setError(isAuthRequiredError(err) ? 'Требуется авторизация' : (err instanceof Error ? err.message : 'Не удалось загрузить команды'));
                    })
                    .finally(() => setLoading(false));
                }}
                style={styles.retryBtn}
              />
            </View>
          ) : teams.length === 0 ? (
            <View style={styles.emptyBlock}>
              <Text style={styles.emptyText}>Нет команд</Text>
              <Text style={styles.emptyHint}>
                Попросите администратора назначить вас на команду.
              </Text>
            </View>
          ) : (
            teams.map((team, index) => (
              <StaggerFadeIn key={team.id} delay={180 + index * 50}>
                <TeamCard
                  team={mapToTeamCardData(team)}
                  onPress={() => router.push(`/team/${team.id}`)}
                  onOpenHub={() => router.push(`/team/${team.id}`)}
                  onManageRoster={() => router.push(`/team/${team.id}`)}
                />
              </StaggerFadeIn>
            ))
          )}
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
    gap: theme.spacing.sm,
    paddingVertical: theme.spacing.lg,
  },
  loadingText: {
    ...theme.typography.body,
    color: theme.colors.textMuted,
  },
  emptyBlock: {
    paddingVertical: theme.spacing.lg,
  },
  errorText: {
    ...theme.typography.body,
    color: theme.colors.error,
    marginBottom: theme.spacing.xs,
  },
  errorHint: {
    ...theme.typography.caption,
    color: theme.colors.textMuted,
    marginBottom: theme.spacing.sm,
  },
  retryBtn: { alignSelf: 'flex-start' },
  emptyText: {
    ...theme.typography.body,
    color: theme.colors.textMuted,
    marginBottom: theme.spacing.xs,
  },
  emptyHint: {
    ...theme.typography.caption,
    color: theme.colors.textMuted,
  },
  bottomSpacer: {
    height: theme.spacing.xl,
  },
});
