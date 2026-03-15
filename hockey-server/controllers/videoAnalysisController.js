const prisma = require("../services/prisma");

async function getVideoAnalysisByPlayerId(req, res) {
  try {
    const playerId = parseInt(req.params.playerId, 10);
    if (Number.isNaN(playerId)) {
      return res.status(400).json({ error: "Invalid playerId" });
    }
    const analyses = await prisma.videoAnalysis.findMany({
      where: { playerId },
      orderBy: { createdAt: "desc" },
    });
    res.json(analyses);
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
}

async function createVideoAnalysis(req, res) {
  try {
    const { playerId, videoUrl, result } = req.body;
    if (!playerId || !videoUrl) {
      return res.status(400).json({
        error: "playerId and videoUrl are required",
      });
    }
    const analysis = await prisma.videoAnalysis.create({
      data: {
        playerId: parseInt(playerId, 10),
        videoUrl,
        result: result != null ? result : null,
      },
    });
    res.status(201).json(analysis);
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
}

module.exports = { getVideoAnalysisByPlayerId, createVideoAnalysis };
