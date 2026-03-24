/**
 * Placeholder attendance data — used by Attendance screen
 */

import { TEAM_DETAIL_MOCK } from './teamDetailData';

export type AttendanceStatus = 'present' | 'late' | 'absent' | 'excused';

export type AttendancePlayer = {
  id: string;
  name: string;
  number: number;
  position: string;
  status: AttendanceStatus;
};

export type AttendanceSessionData = {
  teamId: string;
  teamName: string;
  date: string;
  time: string;
  venue: string;
  confirmed: number;
  pending: number;
  roster: AttendancePlayer[];
};

function buildRoster(
  teamId: string,
  players: Array<{ id: string; name: string; number: number; position: string; status: AttendanceStatus }>
): AttendancePlayer[] {
  return players.map((p) => ({ ...p }));
}

export function getAttendanceSession(teamId: string): AttendanceSessionData | null {
  const team = TEAM_DETAIL_MOCK[teamId];
  if (!team) return null;

  const { nextSession } = team;

  const rosters: Record<string, AttendancePlayer[]> = {
    u12: buildRoster('u12', [
      { id: '1', name: 'Alex Kowalski', number: 7, position: 'F', status: 'present' },
      { id: '2', name: 'Emma Johnson', number: 14, position: 'D', status: 'present' },
      { id: '3', name: 'Marcus Chen', number: 9, position: 'F', status: 'late' },
      { id: '6', name: 'Lily Anderson', number: 5, position: 'D', status: 'present' },
      { id: 'u12-5', name: 'Noah Williams', number: 11, position: 'F', status: 'present' },
      { id: 'u12-6', name: 'Olivia Martinez', number: 3, position: 'D', status: 'absent' },
      { id: 'u12-7', name: 'Liam Davis', number: 8, position: 'F', status: 'present' },
      { id: 'u12-8', name: 'Ava Wilson', number: 12, position: 'F', status: 'excused' },
      { id: 'u12-9', name: 'Ethan Brown', number: 2, position: 'D', status: 'present' },
      { id: 'u12-10', name: 'Sophia Taylor', number: 10, position: 'F', status: 'present' },
    ]),
    u14: buildRoster('u14', [
      { id: '4', name: 'Sofia Rodriguez', number: 3, position: 'G', status: 'present' },
      { id: '5', name: 'Jake Thompson', number: 11, position: 'F', status: 'absent' },
      { id: 'u14-3', name: 'Mason Lee', number: 7, position: 'F', status: 'present' },
      { id: 'u14-4', name: 'Isabella Clark', number: 9, position: 'D', status: 'present' },
      { id: 'u14-5', name: 'Lucas Hall', number: 15, position: 'F', status: 'late' },
      { id: 'u14-6', name: 'Mia Garcia', number: 4, position: 'D', status: 'present' },
      { id: 'u14-7', name: 'Noah Martinez', number: 8, position: 'F', status: 'present' },
      { id: 'u14-8', name: 'Charlotte White', number: 12, position: 'F', status: 'excused' },
      { id: 'u14-9', name: 'James Anderson', number: 6, position: 'D', status: 'present' },
    ]),
    u10: buildRoster('u10', [
      { id: 'u10-1', name: 'Sam Wilson', number: 8, position: 'F', status: 'present' },
      { id: 'u10-2', name: 'Mia Brown', number: 2, position: 'D', status: 'present' },
      { id: 'u10-3', name: 'Leo Johnson', number: 5, position: 'F', status: 'present' },
      { id: 'u10-4', name: 'Zoe Davis', number: 3, position: 'D', status: 'present' },
      { id: 'u10-5', name: 'Jack Miller', number: 7, position: 'F', status: 'absent' },
      { id: 'u10-6', name: 'Chloe Moore', number: 11, position: 'F', status: 'present' },
      { id: 'u10-7', name: 'Henry Taylor', number: 4, position: 'D', status: 'excused' },
      { id: 'u10-8', name: 'Emma Clark', number: 9, position: 'F', status: 'present' },
    ]),
  };

  const roster = rosters[teamId];
  if (!roster) return null;

  return {
    teamId,
    teamName: team.name,
    date: nextSession.date,
    time: nextSession.time,
    venue: nextSession.venue,
    confirmed: nextSession.confirmed,
    pending: nextSession.expected - nextSession.confirmed,
    roster,
  };
}
