/**
 * Placeholder player detail data — TEMPORARY FALLBACK only.
 * Primary source: GET /api/coach/players, GET /api/coach/players/:id.
 * Still used by: getCoachSessionPlayers when Players tab cache is empty.
 */

export type PlayerStatusChip = 'needs-follow-up' | 'improving' | 'top-effort';

export type PlayerDetailData = {
  id: string;
  name: string;
  number: number;
  position: 'F' | 'D' | 'G';
  team: string;
  teamId: string;
  level: string;
  statusChip?: PlayerStatusChip;
  onWatchlist?: boolean;
  coachSummary?: string;
  attendance: {
    attended: number;
    total: number;
    lastSession?: string;
  };
  developmentFocus?: string;
  coachNotes: Array<{
    id: string;
    date: string;
    text: string;
  }>;
  recentActivity: Array<{
    id: string;
    date: string;
    title: string;
    type: 'practice' | 'game' | 'assessment';
  }>;
};

export const PLAYER_DETAIL_MOCK: Record<string, PlayerDetailData> = {
  '1': {
    id: '1',
    name: 'Alex Kowalski',
    number: 7,
    position: 'F',
    team: 'U12 Elite',
    teamId: 'u12',
    level: 'Elite',
    statusChip: 'needs-follow-up',
    coachSummary: 'Strong skating fundamentals. Working on shot accuracy and game awareness.',
    attendance: { attended: 14, total: 16, lastSession: '2 days ago' },
    developmentFocus: 'First-step acceleration',
    coachNotes: [
      { id: 'n1', date: 'Mar 19', text: 'Strong skating. Focus on shot accuracy in drills.' },
      { id: 'n2', date: 'Mar 12', text: 'Good effort in scrimmage. Needs to communicate more on breakouts.' },
      { id: 'n3', date: 'Mar 5', text: 'Improved positioning. Keep working on first step.' },
    ],
    recentActivity: [
      { id: 'a1', date: 'Mar 19', title: 'Practice', type: 'practice' },
      { id: 'a2', date: 'Mar 16', title: 'Game vs Eagles', type: 'game' },
      { id: 'a3', date: 'Mar 12', title: 'Practice', type: 'practice' },
    ],
  },
  '2': {
    id: '2',
    name: 'Emma Johnson',
    number: 14,
    position: 'D',
    team: 'U12 Elite',
    teamId: 'u12',
    level: 'Elite',
    statusChip: 'improving',
    coachSummary: 'Great positioning and hockey IQ. Emerging leader on defense.',
    attendance: { attended: 16, total: 16, lastSession: '2 days ago' },
    developmentFocus: 'Breakout passes',
    coachNotes: [
      { id: 'n1', date: 'Mar 19', text: 'Great positioning. Keep pushing in breakouts.' },
      { id: 'n2', date: 'Mar 10', text: 'Excellent game. Best defensive performance this season.' },
    ],
    recentActivity: [
      { id: 'a1', date: 'Mar 19', title: 'Practice', type: 'practice' },
      { id: 'a2', date: 'Mar 16', title: 'Game vs Eagles', type: 'game' },
    ],
  },
  '3': {
    id: '3',
    name: 'Marcus Chen',
    number: 9,
    position: 'F',
    team: 'U12 Elite',
    teamId: 'u12',
    level: 'Elite',
    statusChip: 'top-effort',
    onWatchlist: true,
    coachSummary: 'High energy player. Consistently brings top effort to every session.',
    attendance: { attended: 15, total: 16, lastSession: '2 days ago' },
    developmentFocus: 'Puck protection',
    coachNotes: [
      { id: 'n1', date: 'Mar 15', text: 'Outstanding effort today. Led drills with energy.' },
    ],
    recentActivity: [
      { id: 'a1', date: 'Mar 19', title: 'Practice', type: 'practice' },
      { id: 'a2', date: 'Mar 16', title: 'Game vs Eagles', type: 'game' },
    ],
  },
  '4': {
    id: '4',
    name: 'Sofia Rodriguez',
    number: 3,
    position: 'G',
    team: 'U14 Development',
    teamId: 'u14',
    level: 'Development',
    coachSummary: 'Outstanding goaltender. Ready for next level challenges.',
    attendance: { attended: 17, total: 18, lastSession: '3 days ago' },
    developmentFocus: 'Angle play',
    coachNotes: [
      { id: 'n1', date: 'Mar 18', text: 'Outstanding game last week. Ready for next level.' },
    ],
    recentActivity: [
      { id: 'a1', date: 'Mar 18', title: 'Game vs Sharks', type: 'game' },
      { id: 'a2', date: 'Mar 15', title: 'Practice', type: 'practice' },
    ],
  },
  '5': {
    id: '5',
    name: 'Jake Thompson',
    number: 11,
    position: 'F',
    team: 'U14 Development',
    teamId: 'u14',
    level: 'Development',
    statusChip: 'needs-follow-up',
    onWatchlist: true,
    coachSummary: 'Talented but inconsistent attendance. Schedule parent meeting.',
    attendance: { attended: 12, total: 18, lastSession: '5 days ago' },
    developmentFocus: 'Consistency',
    coachNotes: [
      { id: 'n1', date: 'Mar 14', text: 'Missed 3 practices. Schedule follow-up with parent.' },
    ],
    recentActivity: [
      { id: 'a1', date: 'Mar 14', title: 'Practice', type: 'practice' },
      { id: 'a2', date: 'Mar 10', title: 'Game vs Wolves', type: 'game' },
    ],
  },
  '6': {
    id: '6',
    name: 'Lily Anderson',
    number: 5,
    position: 'D',
    team: 'U12 Elite',
    teamId: 'u12',
    level: 'Elite',
    statusChip: 'improving',
    coachSummary: 'Solid defender. Working on gap control and closing speed.',
    attendance: { attended: 16, total: 16 },
    developmentFocus: 'Defensive gaps',
    coachNotes: [
      { id: 'n1', date: 'Mar 18', text: 'Good progress on gap control. Keep it up.' },
    ],
    recentActivity: [
      { id: 'a1', date: 'Mar 19', title: 'Practice', type: 'practice' },
      { id: 'a2', date: 'Mar 16', title: 'Game vs Eagles', type: 'game' },
    ],
  },
};
