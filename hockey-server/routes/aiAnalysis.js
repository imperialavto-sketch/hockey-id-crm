const express = require("express");
const {
  getAIAnalysisByPlayerId,
  createAIAnalysis,
} = require("../controllers/aiAnalysisController");

const router = express.Router();

router.get("/:playerId", getAIAnalysisByPlayerId);
router.post("/", createAIAnalysis);

module.exports = router;
