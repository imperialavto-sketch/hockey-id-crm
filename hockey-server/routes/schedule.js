const express = require("express");
const { getSchedule, createSchedule } = require("../controllers/scheduleController");

const router = express.Router();

router.get("/", getSchedule);
router.post("/", createSchedule);

module.exports = router;
