/**
 * Demo player - maps from PLAYER_MARK_GOLYSH for backward compatibility.
 * Use PLAYER_MARK_GOLYSH directly when possible.
 */

import {
  PLAYER_MARK_GOLYSH,
  PLAYER_AGE,
} from "./mockPlayerMarkGolysh";

const P = PLAYER_MARK_GOLYSH;
const attrs = P.attributes;

export const DEMO_PLAYER = {
  id: P.id,
  name: P.profile.fullName,
  birthYear: P.profile.birthYear,
  age: PLAYER_AGE,
  number: `#${P.profile.number}`,
  position: P.profile.position,
  positionRu: "Нападающий",
  team: P.profile.team,
  league: P.profile.league,
  city: P.profile.city,
  country: P.profile.country,
  image: P.image,
  coachAvatar: P.coachAvatar,
  ovr: Math.round(
    (attrs.skating + attrs.shooting + attrs.passing + attrs.hockeyIQ + attrs.defense + attrs.strength) / 6
  ),
  stats: {
    games: P.stats.games,
    goals: P.stats.goals,
    assists: P.stats.assists,
    points: P.stats.points,
  },
  extendedStats: {
    plusMinus: P.stats.plusMinus >= 0 ? `+${P.stats.plusMinus}` : String(P.stats.plusMinus),
    shots: P.stats.shots,
    iceTime: P.stats.avgIceTime,
    pointsPerGame: P.stats.pointsPerGame.toFixed(1),
  },
  ranking: {
    dkl3x3Forwards: P.ranking.dkl3x3ForwardRank,
    algaForwards: P.ranking.algaForwardRank,
    teamRank: P.ranking.teamRank,
  },
  attributes: {
    skating: attrs.skating,
    shot: attrs.shooting,
    passing: attrs.passing,
    hockeyIQ: attrs.hockeyIQ,
    discipline: attrs.defense,
    physical: attrs.strength,
  },
} as const;
