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

const OPENAI_API_KEY = process.env.OPENAI_API_KEY;

interface HistoryItem {
  role: "user" | "assistant";
  content: string;
}

export async function POST(req: NextRequest) {
  const user = await getAuthFromRequest(req);
  if (user?.role !== "PARENT" || !user?.parentId) {
    return NextResponse.json(
      { error: "Необходима авторизация" },
      { status: 401 }
    );
  }

  if (!OPENAI_API_KEY?.trim()) {
    return NextResponse.json(
      { error: "AI-ассистент временно недоступен" },
      { status: 503 }
    );
  }

  try {
    const body = await req.json().catch(() => ({}));
    const text = body?.text;
    if (!text || typeof text !== "string" || !text.trim()) {
      return NextResponse.json(
        { error: "Текст сообщения обязателен" },
        { status: 400 }
      );
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

    const res = await fetch("https://api.openai.com/v1/chat/completions", {
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
    });

    if (!res.ok) {
      const err = await res.text();
      console.error("OpenAI API error:", res.status, err);
      return NextResponse.json(
        { error: "Не удалось получить ответ от AI" },
        { status: 502 }
      );
    }

    const json = await res.json();
    const content = json?.choices?.[0]?.message?.content;
    if (!content || typeof content !== "string") {
      return NextResponse.json(
        { error: "Пустой ответ от AI" },
        { status: 502 }
      );
    }

    return NextResponse.json({
      text: content.trim(),
      isAI: true,
    });
  } catch (error) {
    console.error("POST /api/chat/ai/message failed:", error);
    return NextResponse.json(
      {
        error: "Ошибка при обработке сообщения",
        details: error instanceof Error ? error.message : "",
      },
      { status: 500 }
    );
  }
}
