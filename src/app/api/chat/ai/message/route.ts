/**
 * POST /api/chat/ai/message — Coach Mark AI chat.
 * Auth: parent (x-parent-id).
 * Body: { text, history?, playerContext? }
 */

import { NextRequest, NextResponse } from "next/server";
import { getAuthFromRequest } from "@/lib/api-auth";
import { COACH_MARK_SYSTEM_PROMPT } from "@/lib/ai/coachMarkPrompt";
import { buildCoachMarkContext } from "@/lib/ai/buildCoachMarkContext";
import {
  buildCoachMarkPlayerContext,
  type CoachMarkPlayerContext,
} from "@/lib/ai/buildCoachMarkPlayerContext";
import { buildCoachMarkMemoryContext } from "@/lib/ai/buildCoachMarkMemoryContext";
import { apiError } from "@/lib/api-error";
import { checkAiMessageRateLimit } from "@/lib/ai-message-rate-limit";

const OPENAI_API_KEY = process.env.OPENAI_API_KEY;

interface HistoryItem {
  role: "user" | "assistant";
  content: string;
}

export async function POST(req: NextRequest) {
  console.log("[API]", {
    path: "/api/chat/ai/message",
    method: "POST",
    time: new Date().toISOString(),
  });

  const user = await getAuthFromRequest(req);
  if (user?.role !== "PARENT" || !user?.parentId) {
    return apiError("UNAUTHORIZED", "Unauthorized", 401);
  }

  if (!OPENAI_API_KEY?.trim()) {
    return apiError(
      "AI_NOT_CONFIGURED",
      "AI service not configured",
      500
    );
  }

  const rateKey = user.parentId;

  if (!checkAiMessageRateLimit(rateKey)) {
    return apiError("RATE_LIMIT", "Too many requests", 429);
  }

  try {
    const body = await req.json().catch(() => ({}));
    const text = body?.text;
    if (!text || typeof text !== "string" || !text.trim()) {
      return apiError("VALIDATION_ERROR", "Invalid request", 400);
    }

    const rawHistory = body?.history;
    const history: HistoryItem[] = Array.isArray(rawHistory)
      ? rawHistory
        .filter(
          (h): h is HistoryItem =>
            h && typeof h.role === "string" && typeof h.content === "string"
        )
        .filter((h) => h.role === "user" || h.role === "assistant")
        .slice(-20)
      : [];

    const rawPlayerContext = body?.playerContext;
    const playerContext: CoachMarkPlayerContext | null =
      rawPlayerContext && typeof rawPlayerContext === "object"
        ? (rawPlayerContext as CoachMarkPlayerContext)
        : null;

    const rawMemories = body?.memories;
    const memories: { key: string; value: string }[] = Array.isArray(rawMemories)
      ? rawMemories
        .filter(
          (m): m is { key: string; value: string } =>
            m && typeof m === "object" && typeof (m as { key: string }).key === "string" && typeof (m as { value: string }).value === "string"
        )
        .slice(0, 20)
      : [];

    const knowledgeContext = buildCoachMarkContext();
    const playerContextStr = buildCoachMarkPlayerContext(playerContext);
    const memoryContextStr = buildCoachMarkMemoryContext(memories);

    const examplesStr = playerContextStr
      ? `
ПРИМЕР С ПЕРСОНАЛИЗАЦИЕЙ (есть данные игрока):
Вопрос: "Как улучшить бросок?" → Обращайся по имени, учитывай возраст и stats. Пример: "У Марка замедленный выпуск шайбы. Добавьте quick release drills 3 раза в неделю — прогресс через 2–3 недели."
`
      : `
ПРИМЕР БЕЗ ПЕРСОНАЛИЗАЦИИ (нет данных игрока):
Вопрос: "Как улучшить бросок?" → Отвечай общими рекомендациями. Пример: "Quick release — ключ. Упражнения у борта: поймал — сразу бросил. 3 раза в неделю по 10–15 минут."
`;

    const systemContent = `${COACH_MARK_SYSTEM_PROMPT}${examplesStr}\n\n---\nБАЗА ЗНАНИЙ (используй при ответах):\n${knowledgeContext}${playerContextStr}${memoryContextStr}`;

    const messages: { role: "system" | "user" | "assistant"; content: string }[] = [
      { role: "system", content: systemContent },
      ...history.map((h) => ({ role: h.role as "user" | "assistant", content: h.content })),
      { role: "user", content: text.trim() },
    ];

    const controller = new AbortController();
    const timeoutMs = 8000;
    const timeoutId = setTimeout(() => controller.abort(), timeoutMs);

    let res: Response;
    try {
      res = await fetch("https://api.openai.com/v1/chat/completions", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${OPENAI_API_KEY}`,
        },
        body: JSON.stringify({
          model: "gpt-4o-mini",
          messages,
          temperature: 0.7,
        }),
        signal: controller.signal,
      });
    } finally {
      clearTimeout(timeoutId);
    }

    if (!res.ok) {
      const err = await res.text();
      console.error("OpenAI API error:", res.status, err);
      return apiError("AI_ERROR", "AI service error", 502);
    }

    const json = await res.json();
    const content = json?.choices?.[0]?.message?.content;
    if (!content || typeof content !== "string") {
      console.error("OpenAI API empty content:", json);
      return apiError("AI_ERROR", "AI service error", 502);
    }

    return NextResponse.json({
      text: content.trim(),
      isAI: true,
    });
  } catch (error) {
    const aborted =
      error instanceof Error && error.name === "AbortError";
    if (aborted) {
      console.error("POST /api/chat/ai/message timeout:", error);
      return apiError("AI_TIMEOUT", "AI service timeout", 503);
    }
    console.error("POST /api/chat/ai/message failed:", error);
    return apiError("AI_ERROR", "AI service error", 502);
  }
}
