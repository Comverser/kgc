const express = require("express");

const controller = require("../controllers/controller");

const router = express.Router();

router.get("/anime.es.js", controller.animejs);

router.get("/", controller.index);
router.get("/settings-page", controller.settingsPage);

router.get("/settings", controller.readSettings);
router.post("/settings", controller.writeSettings);

module.exports = router;
