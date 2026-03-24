const express = require("express");
const parentAuth = require("../middleware/parentAuth");
const prisma = require("../services/prisma");

const router = express.Router();

function mapPlayerToContract(p) {
  const team = p.team;
  const teamName = team ? team.name : null;
  const statsRows = p.stats || [];
  const agg = statsRows.reduce(
    (acc, s) => ({
      games: acc.games + (s.games || 0),
      goals: acc.goals + (s.goals || 0),
      assists: acc.assists + (s.assists || 0),
      points: acc.points + (s.points || (s.goals || 0) + (s.assists || 0)),
    }),
    { games: 0, goals: 0, assists: 0, points: 0 }
  );
  const birthYear = p.birthYear ?? new Date().getFullYear() - 10;
  const age = new Date().getFullYear() - birthYear;
  const name = [p.firstName, p.lastName].filter(Boolean).join(" ") || "Игрок";

  return {
    id: p.id,
    name,
    firstName: p.firstName,
    lastName: p.lastName,
    position: p.position ?? null,
    team: teamName,
    teamId: p.teamId,
    age,
    birthYear,
    avatarUrl: p.avatarUrl ?? null,
    number: null,
    shoots: null,
    height: null,
    weight: null,
    games: agg.games,
    goals: agg.goals,
    assists: agg.assists,
    points: agg.points,
    stats: {
      games: agg.games,
      goals: agg.goals,
      assists: agg.assists,
      points: agg.points,
    },
  };
}

router.get("/", parentAuth, async (req, res) => {
  try {
    const parentId = req.parentId;
    const players = await prisma.player.findMany({
      where: { parentId },
      include: { team: true, stats: true },
    });
    res.json(players.map(mapPlayerToContract));
  } catch (err) {
    console.error("[me/players] error:", err);
    res.status(500).json({ error: "Не удалось загрузить игроков" });
  }
});

router.get("/:id", parentAuth, async (req, res) => {
  try {
    const parentId = req.parentId;
    const id = parseInt(req.params.id, 10);
    if (Number.isNaN(id)) {
      return res.status(400).json({ error: "Invalid player id" });
    }
    const player = await prisma.player.findFirst({
      where: { id, parentId },
      include: { team: true, stats: true },
    });
    if (!player) {
      return res.status(404).json({ error: "Player not found" });
    }
    res.json(mapPlayerToContract(player));
  } catch (err) {
    console.error("[me/players/:id] error:", err);
    res.status(500).json({ error: "Не удалось загрузить игрока" });
  }
});

/** Create player for parent (POST /api/me/players). Uses parentId from token. */
router.post("/", parentAuth, async (req, res) => {
  try {
    const parentId = req.parentId;
    const { firstName, lastName, birthYear, position, teamId } = req.body || {};
    if (!firstName || !lastName || birthYear == null) {
      return res.status(400).json({
        error: "firstName, lastName, birthYear are required",
      });
    }
    const player = await prisma.player.create({
      data: {
        firstName: String(firstName).trim(),
        lastName: String(lastName).trim(),
        birthYear: parseInt(birthYear, 10),
        position: position ? String(position).trim() : null,
        parentId,
        teamId: teamId != null ? parseInt(teamId, 10) : null,
      },
      include: { team: true, stats: true },
    });
    res.status(201).json(mapPlayerToContract(player));
  } catch (err) {
    console.error("[me/players] POST error:", err);
    res.status(500).json({ error: "Не удалось добавить игрока" });
  }
});

module.exports = router;
