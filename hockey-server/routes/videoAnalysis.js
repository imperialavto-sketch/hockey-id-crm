const express = require("express");
const {
  getVideoAnalysisByPlayerId,
  createVideoAnalysis,
} = require("../controllers/videoAnalysisController");

const router = express.Router();

router.get("/:playerId", getVideoAnalysisByPlayerId);
router.post("/", createVideoAnalysis);

module.exports = router;
