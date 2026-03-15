const express = require("express");
const {
  getTeams,
  getTeamById,
  createTeam,
} = require("../controllers/teamsController");

const router = express.Router();

router.get("/", getTeams);
router.get("/:id", getTeamById);
router.post("/", createTeam);

module.exports = router;
