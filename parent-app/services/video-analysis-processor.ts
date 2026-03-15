import type { VideoAnalysisResult } from "@/types/video-analysis";
import { MOCK_VIDEO_ANALYSIS_RESULTS } from "@/data/mockVideoAnalyses";

export interface VideoAnalysisProcessor {
  enqueueAnalysis(analysisRequestId: string): Promise<void>;
  getAnalysisStatus(analysisRequestId: string): Promise<"processing" | "completed" | "failed">;
  getAnalysisResult(analysisRequestId: string): Promise<VideoAnalysisResult | null>;
}

class MockVideoAnalysisProcessor implements VideoAnalysisProcessor {
  async enqueueAnalysis(_analysisRequestId: string): Promise<void> {
    return;
  }

  async getAnalysisStatus(_analysisRequestId: string): Promise<"processing" | "completed" | "failed"> {
    return "processing";
  }

  async getAnalysisResult(analysisRequestId: string): Promise<VideoAnalysisResult | null> {
    const existing = MOCK_VIDEO_ANALYSIS_RESULTS.find((r) => r.analysisRequestId === analysisRequestId);
    if (existing) return existing;
    return {
      id: `var_${analysisRequestId}`,
      analysisRequestId,
      summary:
        "Хорошая работа ног и баланс в движении. Требуется улучшить стабильность корпуса и перенос веса в финальной фазе броска.",
      strengths: ["Сильная работа ног", "Неплохой первый шаг", "Баланс в движении"],
      weaknesses: ["Стабильность корпуса", "Перенос веса", "Контроль завершения броска"],
      recommendations: [
        "Упражнения на баланс и устойчивость корпуса",
        "3 тренировки на перенос веса при броске",
        "Разбор техники на коротких повторяющихся эпизодах",
      ],
      keyMoments: ["00:11 — хорошее ускорение", "00:24 — потеря корпуса в фазе броска"],
      confidenceScore: 0.79,
      createdAt: new Date().toISOString(),
    };
  }
}

export const videoAnalysisProcessor: VideoAnalysisProcessor = new MockVideoAnalysisProcessor();
