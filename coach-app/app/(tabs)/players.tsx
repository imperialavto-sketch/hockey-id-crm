import React, { useState, useMemo, useCallback } from 'react';
import { StyleSheet, View, ActivityIndicator, Text } from 'react-native';
import { useRouter, useFocusEffect } from 'expo-router';
import { ScreenContainer } from '@/components/layout/ScreenContainer';
import { DashboardSection } from '@/components/dashboard/DashboardSection';
import { StaggerFadeIn } from '@/components/dashboard/StaggerFadeIn';
import { PlayersHero } from '@/components/players/PlayersHero';
import { PlayersOverview } from '@/components/players/PlayersOverview';
import {
  PlayersFilterSegment,
  type FilterOption,
  type FilterOptionItem,
} from '@/components/players/PlayersFilterSegment';
import { PlayerCard, type PlayerCardData } from '@/components/players/PlayerCard';
import { getCoachPlayers, type CoachPlayerItem } from '@/services/coachPlayersService';
import { setCoachPlayersCache } from '@/lib/coachPlayersCache';
import { isAuthRequiredError } from '@/lib/coachAuth';
import { PrimaryButton } from '@/components/ui/PrimaryButton';
import { theme } from '@/constants/theme';
import {
  COACH_PLAYERS_LIST_COPY,
  COACH_PLAYERS_NETWORK_RETRY_HINT,
  COACH_PLAYERS_RETRY_CTA,
} from '@/lib/coachPlayersListUi';

function mapToPlayerCardData(p: CoachPlayerItem): PlayerCardData {
  return {
    id: p.id,
    name: p.name,
    number: p.number,
    position: p.position as 'F' | 'D' | 'G',
    team: p.team,
    teamId: p.teamId ?? undefined,
    teamAgeGroup: p.teamAgeGroup ?? undefined,
    attendance: p.attendance,
    coachNote: p.coachNote,
  };
}

function filterPlayers(
  players: PlayerCardData[],
  filter: FilterOption
): PlayerCardData[] {
  if (filter === 'all') return players;
  if (filter === 'watchlist') return players.filter((p) => p.onWatchlist);
  if (filter.startsWith('age:')) {
    const ageGroup = filter.slice(4);
    return players.filter((p) => p.teamAgeGroup === ageGroup);
  }
  return players;
}

function buildFilterOptions(players: PlayerCardData[]): FilterOptionItem[] {
  const options: FilterOptionItem[] = [
    { value: 'all', label: 'Все', count: players.length },
  ];

  const ageGroups = [
    ...new Set(
      players
        .map((p) => p.teamAgeGroup)
        .filter((g): g is string => !!g?.trim())
    ),
  ].sort();

  for (const ag of ageGroups) {
    const count = players.filter((p) => p.teamAgeGroup === ag).length;
    options.push({ value: `age:${ag}` as FilterOption, label: ag, count });
  }

  const watchlistCount = players.filter((p) => p.onWatchlist).length;
  if (watchlistCount > 0) {
    options.push({ value: 'watchlist', label: 'В наблюдении', count: watchlistCount });
  }

  return options;
}

export default function PlayersScreen() {
  const router = useRouter();
  const [filter, setFilter] = useState<FilterOption>('all');
  const [players, setPlayers] = useState<CoachPlayerItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useFocusEffect(
    useCallback(() => {
      setLoading(true);
      setError(null);
      getCoachPlayers()
        .then((data) => {
          setPlayers(data);
          setError(null);
          setCoachPlayersCache(
            data.map((p) => ({
              id: p.id,
              name: p.name,
              jerseyNumber: p.number,
            }))
          );
        })
        .catch((err) => {
          setPlayers([]);
          setError(isAuthRequiredError(err) ? 'Требуется авторизация' : (err instanceof Error ? err.message : 'Не удалось загрузить игроков'));
        })
        .finally(() => setLoading(false));
    }, [])
  );

  const playerCards = useMemo(
    () => players.map(mapToPlayerCardData),
    [players]
  );
  const filterOptions = useMemo(() => buildFilterOptions(playerCards), [playerCards]);
  const validFilter = useMemo(() => {
    const validValues = new Set(filterOptions.map((o) => o.value));
    return validValues.has(filter) ? filter : 'all';
  }, [filter, filterOptions]);
  const filteredPlayers = useMemo(
    () => filterPlayers(playerCards, validFilter),
    [playerCards, validFilter]
  );

  const teamNames = useMemo(
    () => [...new Set(players.map((p) => p.team).filter(Boolean))],
    [players]
  );
  const teamsSummary = loading
    ? 'Загружаем…'
    : teamNames.length > 0
      ? teamNames.join(', ')
      : 'Нет команд';

  const watchlistCount = playerCards.filter((p) => p.onWatchlist).length;
  const needsFollowUpCount = playerCards.filter(
    (p) => p.statusChip === 'needs-follow-up'
  ).length;

  return (
    <ScreenContainer contentContainerStyle={styles.content}>
      <StaggerFadeIn delay={0}>
        <PlayersHero
          loading={loading}
          totalCount={players.length}
          teamsSummary={teamsSummary}
          subtitle={
            !loading && !error && players.length === 0
              ? COACH_PLAYERS_LIST_COPY.heroEmptySubtitle
              : undefined
          }
        />
      </StaggerFadeIn>

      {!loading ? (
        <StaggerFadeIn delay={60}>
          <DashboardSection title="Обзор">
            <PlayersOverview
              watchlistCount={watchlistCount}
              needsFollowUpCount={needsFollowUpCount}
            />
          </DashboardSection>
        </StaggerFadeIn>
      ) : null}

      {!loading && filterOptions.length > 1 ? (
        <StaggerFadeIn delay={120}>
          <DashboardSection title="Фильтр">
            <PlayersFilterSegment
              value={validFilter}
              onChange={setFilter}
              options={filterOptions}
            />
          </DashboardSection>
        </StaggerFadeIn>
      ) : null}

      <StaggerFadeIn delay={filterOptions.length > 1 ? 180 : 120}>
        <DashboardSection title="Ростер">
          {loading ? (
            <View style={styles.loading}>
              <ActivityIndicator size="small" color={theme.colors.primary} />
              <Text style={styles.loadingText}>{COACH_PLAYERS_LIST_COPY.loadingRoster}</Text>
            </View>
          ) : error ? (
            <View style={styles.emptyBlock}>
              <Text style={styles.errorText}>{error}</Text>
              {error !== 'Требуется авторизация' ? (
                <Text style={styles.errorHint}>{COACH_PLAYERS_NETWORK_RETRY_HINT}</Text>
              ) : null}
              <PrimaryButton
                title={COACH_PLAYERS_RETRY_CTA}
                variant="outline"
                onPress={() => {
                  setLoading(true);
                  setError(null);
                  getCoachPlayers()
                    .then((data) => {
                      setPlayers(data);
                      setError(null);
                      setCoachPlayersCache(data.map((p) => ({ id: p.id, name: p.name, jerseyNumber: p.number })));
                    })
                    .catch((err) => {
                      setPlayers([]);
                      setError(isAuthRequiredError(err) ? 'Требуется авторизация' : (err instanceof Error ? err.message : 'Не удалось загрузить игроков'));
                    })
                    .finally(() => setLoading(false));
                }}
                style={styles.retryBtn}
              />
            </View>
          ) : filteredPlayers.length === 0 ? (
            <View style={styles.emptyBlock}>
              <Text style={styles.emptyTitle}>
                {players.length === 0
                  ? COACH_PLAYERS_LIST_COPY.emptyNoPlayersTitle
                  : COACH_PLAYERS_LIST_COPY.emptyFilterTitle}
              </Text>
              <Text style={styles.emptyHint}>
                {players.length === 0
                  ? COACH_PLAYERS_LIST_COPY.emptyNoPlayersHint
                  : COACH_PLAYERS_LIST_COPY.emptyFilterHint}
              </Text>
            </View>
          ) : (
            filteredPlayers.map((player, index) => (
              <StaggerFadeIn key={player.id} delay={220 + index * 40}>
                <PlayerCard
                  player={player}
                  onPress={() => router.push(`/player/${player.id}`)}
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
  emptyBlock: {
    paddingVertical: theme.spacing.xl,
    alignItems: 'center',
    gap: theme.spacing.sm,
  },
  emptyTitle: {
    ...theme.typography.subtitle,
    color: theme.colors.textSecondary,
    textAlign: 'center',
  },
  emptyHint: {
    ...theme.typography.caption,
    color: theme.colors.textMuted,
    textAlign: 'center',
    lineHeight: 18,
    maxWidth: 320,
  },
  bottomSpacer: {
    height: theme.spacing.xl,
  },
});
