const prisma = require("../services/prisma");

async function getSchedule(_req, res) {
  try {
    const schedules = await prisma.schedule.findMany({
      include: { team: true },
      orderBy: { date: "asc" },
    });
    res.json(schedules);
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
}

async function createSchedule(req, res) {
  try {
    const { title, date, location, teamId } = req.body;
    if (!title || !date || teamId == null) {
      return res.status(400).json({
        error: "title, date, teamId are required",
      });
    }
    const schedule = await prisma.schedule.create({
      data: {
        title,
        date: new Date(date),
        location: location || null,
        teamId: parseInt(teamId, 10),
      },
    });
    res.status(201).json(schedule);
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
}

module.exports = { getSchedule, createSchedule };
