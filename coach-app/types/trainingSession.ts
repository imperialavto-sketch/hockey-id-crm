/**
 * TrainingSession DTO — совпадает с серверным CoachTrainingSessionJson.
 * Единый тип для weekly list, create response и GET /api/trainings/[id].
 */

export interface CoachTrainingSession {
  id: string;
  type: string;
  /** Опционально для старых ответов без поля */
  subType?: string | null;
  startAt: string;
  endAt: string;
  status: string;
  sessionStatus: string;
  locationName: string | null;
  locationAddress: string | null;
  notes: string | null;
  teamId: string;
  teamName: string;
  groupId: string;
  groupName: string;
  team: { id: string; name: string };
  group: { id: string; name: string; level: number };
  coachId: string;
  coach: { id: string; firstName: string; lastName: string };
  /** Optional focus line from Arena / planning (when API includes it). */
  arenaNextTrainingFocus?: string | null;
}
