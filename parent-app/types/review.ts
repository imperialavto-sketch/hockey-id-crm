export interface CoachReview {
  id: string;
  coachId: string;
  parentName: string;
  playerAge: number;
  playerPosition?: string;
  rating: number;
  date: string;
  title: string;
  text: string;
  tags: string[];
  improvementArea?: string;
  verifiedBooking: boolean;
}
