const express = require("express");
const { requestCode, verify } = require("../controllers/parentMobileAuthController");

const router = express.Router();

router.post("/request-code", requestCode);
router.post("/verify", verify);

module.exports = router;
