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

module.exports = { getPlayers, getPlayerById, createPlayer };
