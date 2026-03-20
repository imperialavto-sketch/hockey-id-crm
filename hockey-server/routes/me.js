const express = require("express");
const parentAuth = require("../middleware/parentAuth");
const prisma = require("../services/prisma");

const router = express.Router();

router.get("/", parentAuth, (req, res) => {
  res.json({ id: String(req.parentId) });
});

const subscriptionRouter = require("./subscription");
router.use("/subscription", subscriptionRouter);

module.exports = router;
