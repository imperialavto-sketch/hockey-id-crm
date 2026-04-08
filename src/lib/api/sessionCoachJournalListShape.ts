/**
 * SESSION JOURNAL SSOT — `journal[]` element shape on `GET /api/coaches/[id]/trainings`.
 * Aligns with CRM coach page / legacy list journal embed (id + four text fields).
 */
export type SessionCoachJournalListEmbed = {
  id: string;
  topic: string | null;
  goals: string | null;
  notes: string | null;
  teamComment: string | null;
};

export function mapToSessionCoachJournalListEmbed(row: SessionCoachJournalListEmbed): SessionCoachJournalListEmbed {
  return {
    id: row.id,
    topic: row.topic,
    goals: row.goals,
    notes: row.notes,
    teamComment: row.teamComment,
  };
}
