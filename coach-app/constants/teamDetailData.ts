/**
 * Placeholder team detail data — TEMPORARY FALLBACK only.
 * Primary source: GET /api/coach/teams, GET /api/coach/teams/:id.
 * Still used by: attendanceData (attendance module uses mock roster).
 */

export type TeamDetailData = {
  id: string;
  name: string;
  level: string;
  levelVariant?: 'primary' | 'accent' | 'muted';
  ageGroup?: string;
  playerCount: number;
  coachSummary?: string;
  nextSession: {
    date: string;
    time: string;
    venue: string;
    confirmed: number;
    expected: number;
  };
  attendance: {
    attended: number;
    total: number;
  };
  rosterHighlights: Array<{
    id: string;
    name: string;
    number: number;
    position: string;
  }>;
  announcements: Array<{
    id: string;
    date: string;
    title: string;
    preview: string;
  }>;
  recentActivity: Array<{
    id: string;
    date: string;
    title: string;
    type: 'practice' | 'game' | 'assessment';
  }>;
};

export const TEAM_DETAIL_MOCK: Record<string, TeamDetailData> = {
  u12: {
    id: 'u12',
    name: 'U12 Elite',
    level: 'Elite',
    levelVariant: 'primary',
    ageGroup: 'Ages 10–12',
    playerCount: 16,
    coachSummary: 'Strong group with solid fundamentals. Focus on game awareness and team play this month.',
    nextSession: {
      date: 'Today',
      time: '6:00 PM',
      venue: 'Main Rink',
      confirmed: 14,
      expected: 16,
    },
    attendance: { attended: 14, total: 16 },
    rosterHighlights: [
      { id: '1', name: 'Alex Kowalski', number: 7, position: 'F' },
      { id: '2', name: 'Emma Johnson', number: 14, position: 'D' },
      { id: '3', name: 'Marcus Chen', number: 9, position: 'F' },
      { id: '4', name: 'Lily Anderson', number: 5, position: 'D' },
    ],
    announcements: [
      {
        id: 'a1',
        date: 'Mar 20',
        title: 'Practice moved to 6:30 PM Thursday',
        preview: 'Due to ice availability, practice is moved from 6:00 to 6:30 PM this week.',
      },
      {
        id: 'a2',
        date: 'Mar 18',
        title: 'Tournament schedule posted',
        preview: 'March 22–24 tournament. Please confirm attendance by Wednesday.',
      },
    ],
    recentActivity: [
      { id: 'r1', date: 'Mar 19', title: 'Practice', type: 'practice' },
      { id: 'r2', date: 'Mar 16', title: 'Game vs Eagles', type: 'game' },
      { id: 'r3', date: 'Mar 12', title: 'Practice', type: 'practice' },
    ],
  },
  u14: {
    id: 'u14',
    name: 'U14 Development',
    level: 'Development',
    levelVariant: 'accent',
    ageGroup: 'Ages 12–14',
    playerCount: 18,
    coachSummary: 'Developing skills across the roster. Good progress on skating and positioning.',
    nextSession: {
      date: 'Wed',
      time: '5:30 PM',
      venue: 'Arena B',
      confirmed: 16,
      expected: 18,
    },
    attendance: { attended: 16, total: 18 },
    rosterHighlights: [
      { id: '4', name: 'Sofia Rodriguez', number: 3, position: 'G' },
      { id: '5', name: 'Jake Thompson', number: 11, position: 'F' },
    ],
    announcements: [
      {
        id: 'a1',
        date: 'Mar 19',
        title: 'Tournament schedule for March 22–24',
        preview: 'Please confirm attendance. Hotel info attached.',
      },
    ],
    recentActivity: [
      { id: 'r1', date: 'Mar 18', title: 'Game vs Sharks', type: 'game' },
      { id: 'r2', date: 'Mar 15', title: 'Practice', type: 'practice' },
    ],
  },
  u10: {
    id: 'u10',
    name: 'U10 Learn to Skate',
    level: 'Learn',
    levelVariant: 'muted',
    ageGroup: 'Ages 8–10',
    playerCount: 12,
    coachSummary: 'Fun, enthusiastic group. Building confidence on ice and basic skills.',
    nextSession: {
      date: 'Sat',
      time: '10:00 AM',
      venue: 'Community Rink',
      confirmed: 11,
      expected: 12,
    },
    attendance: { attended: 11, total: 12 },
    rosterHighlights: [
      { id: 'u10-1', name: 'Sam Wilson', number: 8, position: 'F' },
      { id: 'u10-2', name: 'Mia Brown', number: 2, position: 'D' },
    ],
    announcements: [
      {
        id: 'a1',
        date: 'Mar 17',
        title: 'Focus for next session',
        preview: 'Stopping and turning. Please ensure skates are sharpened.',
      },
    ],
    recentActivity: [
      { id: 'r1', date: 'Mar 15', title: 'Practice', type: 'practice' },
      { id: 'r2', date: 'Mar 8', title: 'Practice', type: 'practice' },
    ],
  },
};
