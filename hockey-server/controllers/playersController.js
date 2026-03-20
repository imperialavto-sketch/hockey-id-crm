const prisma = require("../services/prisma");

async function getPlayers(_req, res) {
  try {
    const players = await prisma.player.findMany({
      include: { parent: true, team: true },
    });
    res.json(players);
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
}

async function getPlayerById(req, res) {
  try {
    const id = parseInt(req.params.id, 10);
    if (Number.isNaN(id)) {
      return res.status(400).json({ error: "Invalid player id" });
    }
    const player = await prisma.player.findUnique({
      where: { id },
      include: { parent: true, team: true },
    });
    if (!player) return res.status(404).json({ error: "Player not found" });
    res.json(player);
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
}

async function createPlayer(req, res) {
  try {
    const { firstName, lastName, birthYear, position, parentId, teamId } = req.body;
    if (!firstName || !lastName || birthYear == null || !parentId) {
      return res.status(400).json({
        error: "firstName, lastName, birthYear, parentId are required",
      });
    }
    const player = await prisma.player.create({
      data: {
        firstName,
        lastName,
        birthYear: parseInt(birthYear, 10),
        position: position || null,
        parentId: parseInt(parentId, 10),
        teamId: teamId != null ? parseInt(teamId, 10) : null,
      },
    });
    res.status(201).json(player);
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
}

async function getPlayerStats(req, res) {
  try {
    const id = parseInt(req.params.id, 10);
    if (Number.isNaN(id)) {
      return res.status(400).json({ error: "Invalid player id" });
    }
    const stats = await prisma.playerStats.findMany({
      where: { playerId: id },
    });
    const agg = stats.reduce(
      (acc, s) => ({
        games: acc.games + (s.games || 0),
        goals: acc.goals + (s.goals || 0),
        assists: acc.assists + (s.assists || 0),
        points: acc.points + (s.points || (s.goals || 0) + (s.assists || 0)),
      }),
      { games: 0, goals: 0, assists: 0, points: 0 }
    );
    res.json({
      games: agg.games,
      goals: agg.goals,
      assists: agg.assists,
      points: agg.points,
    });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
}

module.exports = { getPlayers, getPlayerById, createPlayer, getPlayerStats };
