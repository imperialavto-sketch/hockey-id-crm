export interface PlayerVideoAnalysis {
  id: string;
  videoUrl: string;
  analysisText: string | null;
  strengths: string[];
  growthAreas: string[];
  recommendations: string[];
  createdAt: string;
}
