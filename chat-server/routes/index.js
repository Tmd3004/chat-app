const express = require("express");
const router = express.Router();

const authRoute = require("./auth");
const userRoute = require("./user");

router.use("/auth", authRoute);
router.use("/user", userRoute);

module.exports = router;
