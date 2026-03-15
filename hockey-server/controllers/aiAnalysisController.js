const prisma = require("../services/prisma");

async function getAIAnalysisByPlayerId(req, res) {
  try {
    const playerId = parseInt(req.params.playerId, 10);
    if (Number.isNaN(playerId)) {
      return res.status(400).json({ error: "Invalid playerId" });
    }
    const analyses = await prisma.aIAnalysis.findMany({
      where: { playerId },
      orderBy: { createdAt: "desc" },
    });
    res.json(analyses);
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
}

async function createAIAnalysis(req, res) {
  try {
    const { playerId, report, score } = req.body;
    if (!playerId || !report) {
      return res.status(400).json({
        error: "playerId and report are required",
      });
    }
    const analysis = await prisma.aIAnalysis.create({
      data: {
        playerId: parseInt(playerId, 10),
        report,
        score: score != null ? parseFloat(score) : null,
      },
    });
    res.status(201).json(analysis);
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
}

module.exports = { getAIAnalysisByPlayerId, createAIAnalysis };
