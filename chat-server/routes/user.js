const express = require("express");
const router = express.Router();

const authController = require("../controllers/authController");
const userController = require("../controllers/userController");

router.patch("/update-me", authController.protect, userController.updateProfile);

router.get("/get-users", authController.protect, userController.getUsers);


router.get("/get-me", authController.protect, userController.getMe);

router.get("/get-friends", authController.protect, userController.getFriends);

router.get("/get-requests", authController.protect, userController.getRequests)

// http://locolhost:3000/v1/user/update-me
module.exports = router;
