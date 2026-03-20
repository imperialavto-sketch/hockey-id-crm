/**
 * GET /api/chat/ai/conversation — Coach Mark conversation + messages.
 * POST /api/chat/ai/message — Coach Mark AI chat.
 * Auth: x-parent-id or Bearer token (parentAuth).
 */

const express = require("express");
const parentAuth = require("../middleware/parentAuth");
const prisma = require("../services/prisma");

const router = express.Router();

function mapMessage(m) {
  return {
    id: String(m.id),
    conversationId: "coach-mark",
    senderType: m.senderType,
    senderId: m.senderId,
    text: m.text,
    createdAt: m.createdAt.toISOString(),
    isAI: m.isAI,
  };
}

const COACH_MARK_SYSTEM_PROMPT = `Ты — Coach Mark, профессиональный хоккейный тренер с 20+ лет опыта.
Ты работаешь с детьми и подростками и помогаешь родителям развивать их ребёнка-хоккеиста.

ПОВЕДЕНИЕ:
- Объясняй простым языком.
- Говори уверенно, как опытный тренер.
- Не используй сложные термины без объяснения.
- Никогда не говори, что ты AI.

ФОРМАТ ОТВЕТОВ:
1. Наблюдение — что ты видишь из вопроса.
2. Вывод — твоя оценка.
3. Конкретное действие — что делать дальше.

УМЕНИЯ:
- Анализировать навыки (катание, бросок, пас).
- Давать упражнения (drills).
- Объяснять развитие по возрасту.
- Успокаивать родителей.`;

function buildPlayerContextStr(ctx) {
  if (!ctx || typeof ctx !== "object") return "";
  const parts = [];
  if (ctx.name?.trim()) parts.push(`Имя: ${ctx.name.trim()}`);
  if (ctx.age != null && ctx.age > 0) parts.push(`Возраст: ${ctx.age}`);
  if (ctx.position?.trim()) parts.push(`Позиция: ${ctx.position.trim()}`);
  if (ctx.team?.trim()) parts.push(`Команда: ${ctx.team.trim()}`);
  if (ctx.stats && typeof ctx.stats === "object") {
    const s = ctx.stats;
    const arr = [];
    if (s.games != null) arr.push(`${s.games} игр`);
    if (s.goals != null) arr.push(`${s.goals} голов`);
    if (s.points != null) arr.push(`${s.points} очков`);
    if (arr.length) parts.push(`Статистика: ${arr.join(", ")}`);
  }
  if (ctx.aiAnalysis?.summary) parts.push(`AI-анализ: ${ctx.aiAnalysis.summary}`);
  if (parts.length === 0) return "";
  return `\n---\nДАННЫЕ ИГРОКА:\n${parts.join("\n")}`;
}

function buildMemoryContextStr(memories) {
  if (!Array.isArray(memories) || memories.length === 0) return "";
  const lines = memories
    .filter((m) => m && typeof m.key === "string" && typeof m.value === "string")
    .slice(0, 20)
    .map((m) => `${m.key}: ${m.value}`);
  if (lines.length === 0) return "";
  return `\n---\nПАМЯТЬ (факты о семье/игроке):\n${lines.join("\n")}`;
}

const EMPTY_CONVERSATION = { conversation: { id: "coach_mark_empty" }, messages: [] };

router.get("/ai/conversation", parentAuth, async (req, res) => {
  const parentId = req.parentId;
  const xParentId = req.headers["x-parent-id"];
  const hasToken = !!req.headers.authorization;

  if (process.env.NODE_ENV !== "production") {
    console.log("[coach-mark] GET /api/chat/ai/conversation", {
      parentId,
      xParentIdHeader: xParentId ?? "(none)",
      hasToken,
    });
  }

  if (!parentId) {
    if (process.env.NODE_ENV !== "production") {
      console.warn("[coach-mark] error: no parentId resolved");
    }
    return res.status(401).json({ error: "Необходима авторизация" });
  }

  try {
    let conv = await prisma.coachMarkConversation.findUnique({
      where: { parentId },
      include: {
        messages: { orderBy: { createdAt: "asc" } },
      },
    });
    if (!conv) {
      conv = await prisma.coachMarkConversation.create({
        data: { parentId },
        include: {
          messages: { orderBy: { createdAt: "asc" } },
        },
      });
    }
    const messages = conv.messages.map(mapMessage);
    const response = { conversation: { id: conv.id }, messages };
    if (process.env.NODE_ENV !== "production") {
      console.log("[coach-mark] response shape", { conversationId: conv.id, messagesCount: messages.length });
    }
    return res.json(response);
  } catch (err) {
    console.error("[coach-mark] GET /api/chat/ai/conversation error:", err?.message || err);
    return res.json(EMPTY_CONVERSATION);
  }
});

router.post("/ai/message", parentAuth, async (req, res) => {
  const parentId = req.parentId;
  if (process.env.NODE_ENV !== "production") {
    console.log("[coach-mark] POST /api/chat/ai/message", { parentId });
  }

  const OPENAI_API_KEY = process.env.OPENAI_API_KEY;
  if (!OPENAI_API_KEY?.trim()) {
    return res.status(503).json({ error: "AI-ассистент временно недоступен" });
  }

  try {
    const body = req.body || {};
    const text = body?.text;
    if (!text || typeof text !== "string" || !text.trim()) {
      return res.status(400).json({ error: "Текст сообщения обязателен" });
    }

    const rawHistory = body?.history;
    const history = Array.isArray(rawHistory)
      ? rawHistory
          .filter((h) => h && typeof h.role === "string" && typeof h.content === "string")
          .filter((h) => h.role === "user" || h.role === "assistant")
          .slice(-20)
      : [];

    const playerContext = body?.playerContext && typeof body.playerContext === "object"
      ? body.playerContext
      : null;
    const memories = Array.isArray(body?.memories)
      ? body.memories.filter((m) => m && typeof m.key === "string" && typeof m.value === "string").slice(0, 20)
      : [];

    const playerStr = buildPlayerContextStr(playerContext);
    const memoryStr = buildMemoryContextStr(memories);
    const systemContent = `${COACH_MARK_SYSTEM_PROMPT}${playerStr}${memoryStr}`;

    const messages = [
      { role: "system", content: systemContent },
      ...history.map((h) => ({ role: h.role, content: h.content })),
      { role: "user", content: text.trim() },
    ];

    const openaiRes = await fetch("https://api.openai.com/v1/chat/completions", {
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

    if (!openaiRes.ok) {
      const errText = await openaiRes.text();
      console.error("[chat/ai] OpenAI error:", openaiRes.status, errText);
      return res.status(502).json({ error: "Не удалось получить ответ от AI" });
    }

    const json = await openaiRes.json();
    const content = json?.choices?.[0]?.message?.content;
    if (!content || typeof content !== "string") {
      return res.status(502).json({ error: "Пустой ответ от AI" });
    }

    const parentId = req.parentId;
    if (parentId) {
      try {
        let conv = await prisma.coachMarkConversation.findUnique({
          where: { parentId },
        });
        if (!conv) {
          conv = await prisma.coachMarkConversation.create({
            data: { parentId },
          });
        }
        const senderId = String(parentId);
        await prisma.coachMarkMessage.createMany({
          data: [
            {
              conversationId: conv.id,
              senderType: "parent",
              senderId,
              text: text.trim(),
              isAI: false,
            },
            {
              conversationId: conv.id,
              senderType: "coach",
              senderId: "coach-mark",
              text: content.trim(),
              isAI: true,
            },
          ],
        });
        await prisma.coachMarkConversation.update({
          where: { id: conv.id },
          data: { updatedAt: new Date() },
        });
      } catch (persistErr) {
        console.warn("[chat/ai] persist messages failed:", persistErr);
      }
    }

    return res.json({ text: content.trim(), isAI: true });
  } catch (err) {
    console.error("[chat/ai] POST /api/chat/ai/message failed:", err);
    return res.status(500).json({
      error: "Ошибка при обработке сообщения",
      details: err?.message || "",
    });
  }
});

module.exports = router;
