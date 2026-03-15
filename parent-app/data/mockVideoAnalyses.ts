import type { VideoAnalysisRequest, VideoAnalysisResult } from "@/types/video-analysis";
import { PLAYER_MARK_GOLYSH } from "@/constants/mockPlayerMarkGolysh";

const videoAnalyses = PLAYER_MARK_GOLYSH.videoAnalysis;

export const MOCK_VIDEO_ANALYSIS_REQUESTS: VideoAnalysisRequest[] = videoAnalyses.length > 0
  ? videoAnalyses.map((v, i) => ({
      id: `va_${v.id}`,
      playerId: PLAYER_MARK_GOLYSH.id,
      uploadedByUserId: "parent_1",
      title: v.title,
      description: v.insight,
      videoUrl: `https://storage.hockeyid.mock/video/va_${v.id}.mp4`,
      storageKey: `players/${PLAYER_MARK_GOLYSH.id}/analyses/va_${v.id}/video.mp4`,
      durationSeconds: 30 + i * 10,
      fileSizeBytes: (40 + i * 10) * 1024 * 1024,
      mimeType: "video/mp4" as const,
      uploadStatus: "success" as const,
      analysisStatus: i === 0 ? "completed" : "processing",
      createdAt: `${v.date}T12:00:00.000Z`,
      updatedAt: `${v.date}T12:03:00.000Z`,
      completedAt: i === 0 ? `${v.date}T12:03:00.000Z` : undefined,
    }))
  : [
  {
    id: "va_1",
    playerId: "1",
    uploadedByUserId: "parent_1",
    title: "Бросок с ходу",
    description: "Игровой эпизод 5-на-5",
    videoUrl: "https://storage.hockeyid.mock/video/va_1.mp4",
    storageKey: "players/1/analyses/va_1/video.mp4",
    durationSeconds: 34,
    fileSizeBytes: 46 * 1024 * 1024,
    mimeType: "video/mp4",
    uploadStatus: "success",
    analysisStatus: "completed",
    createdAt: "2026-03-09T12:00:00.000Z",
    updatedAt: "2026-03-09T12:03:00.000Z",
    completedAt: "2026-03-09T12:03:00.000Z",
  },
  {
    id: "va_2",
    playerId: "1",
    uploadedByUserId: "parent_1",
    title: "Игровой момент у борта",
    description: "Смена во втором периоде",
    videoUrl: "https://storage.hockeyid.mock/video/va_2.mp4",
    storageKey: "players/1/analyses/va_2/video.mp4",
    durationSeconds: 41,
    fileSizeBytes: 58 * 1024 * 1024,
    mimeType: "video/mp4",
    uploadStatus: "success",
    analysisStatus: "processing",
    createdAt: "2026-03-10T09:10:00.000Z",
    updatedAt: "2026-03-10T09:10:00.000Z",
  },
];

export const MOCK_VIDEO_ANALYSIS_RESULTS: VideoAnalysisResult[] = videoAnalyses.length > 0
  ? videoAnalyses
      .filter((_, i) => i === 0)
      .map((v) => ({
        id: `var_${v.id}`,
        analysisRequestId: `va_${v.id}`,
        summary: v.insight,
        strengths: PLAYER_MARK_GOLYSH.aiCoachReport.strengths,
        weaknesses: PLAYER_MARK_GOLYSH.aiCoachReport.improvements,
        recommendations: [PLAYER_MARK_GOLYSH.aiCoachReport.recommendation],
        keyMoments: [v.insight],
        confidenceScore: 0.85,
        createdAt: `${v.date}T12:03:00.000Z`,
      }))
  : [
      {
        id: "var_1",
        analysisRequestId: "va_1",
        summary:
          "Голыш Марк показывает хороший базовый уровень катания и стабильный баланс, но в эпизоде заметен недостаточный перенос веса при броске.",
        strengths: ["Хороший баланс", "Скорость первого шага", "Позиция корпуса в движении"],
        weaknesses: ["Перенос веса при броске", "Недостаточная жесткость корпуса в финальной фазе", "Нестабильное завершение движения"],
        recommendations: [
          "3 недели работы над переносом веса при броске",
          "2 индивидуальные тренировки в неделю по технике броска",
          "Упражнения на устойчивость корпуса и баланс",
        ],
        keyMoments: [
          "00:08 — правильная работа ног в разгоне",
          "00:19 — потеря стабильности корпуса перед броском",
          "00:27 — хороший первый шаг после смены направления",
        ],
        confidenceScore: 0.82,
        createdAt: "2026-03-09T12:03:00.000Z",
      },
    ];
