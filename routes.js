const express = require("express");
const controller = require("./controllers");

const router = express.Router();

router.get("/", controller.getStudent);
router.post("/", controller.createEvent);
router.delete("/", controller.deleteUserEvent);
router.post("/invite", controller.createInvitation);
router.delete("/invite", controller.deleteInvitation);

module.exports = router;
