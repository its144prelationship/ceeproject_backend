const express = require("express");
const controller = require("./controllers");

const router = express.Router();

router.get("/courseville/auth_app", controller.authApp);
router.get("/courseville/access_token", controller.accessToken);
router.get("/", controller.getStudent);
router.post("/", controller.createEvent);
router.delete("/", controller.deleteUserEvent);
router.post("/invite", controller.createUserEvent);
router.delete("/invite", controller.deleteInvitation);
router.get("/logout", controller.logout);
module.exports = router;
