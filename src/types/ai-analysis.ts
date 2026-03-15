/**
 * AI Hockey Analyst — response type.
 * Used by backend and frontend (CRM + parent app).
 */

export interface PlayerAIAnalysis {
  summary: string;
  strengths: string[];
  growthAreas: string[];
  recommendations: string[];
  coachFocus: string;
  motivation: string;
}
