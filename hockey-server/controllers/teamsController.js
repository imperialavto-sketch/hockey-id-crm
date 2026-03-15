const prisma = require("../services/prisma");

async function getTeams(_req, res) {
  try {
    const teams = await prisma.team.findMany({
      include: { coach: true },
    });
    res.json(teams);
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
}

async function getTeamById(req, res) {
  try {
    const id = parseInt(req.params.id, 10);
    if (Number.isNaN(id)) {
      return res.status(400).json({ error: "Invalid team id" });
    }
    const team = await prisma.team.findUnique({
      where: { id },
      include: { coach: true, players: true },
    });
    if (!team) return res.status(404).json({ error: "Team not found" });
    res.json(team);
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
}

async function createTeam(req, res) {
  try {
    const { name, ageGroup, coachId } = req.body;
    if (!name) {
      return res.status(400).json({ error: "name is required" });
    }
    const team = await prisma.team.create({
      data: {
        name,
        ageGroup: ageGroup || null,
        coachId: coachId != null ? parseInt(coachId, 10) : null,
      },
    });
    res.status(201).json(team);
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
}

module.exports = { getTeams, getTeamById, createTeam };
