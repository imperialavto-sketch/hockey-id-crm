const express = require("express");
const auth = require("../middleware/auth");
const {
  getPlayers,
  getPlayerById,
  createPlayer,
  getPlayerStats,
} = require("../controllers/playersController");

const router = express.Router();

router.get("/", auth, getPlayers);
router.get("/:id/stats", getPlayerStats);
router.get("/:id", auth, getPlayerById);
router.post("/", auth, createPlayer);

module.exports = router;
