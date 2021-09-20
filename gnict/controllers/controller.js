const fs = require("fs");

const path = require("path");

const animejs = (req, res) => {
  res.sendFile(
    path.join(__dirname, "..", "/node_modules/animejs/lib/anime.es.js")
  );
};

const index = (req, res) => {
  res.render("index");
};

const settingsPage = (req, res) => {
  res.render("settings");
};

const readSettings = (req, res) => {
  const settings = JSON.parse(
    fs.readFileSync(path.join(__dirname, "..", "/config/settings.json"))
  );
  res.json(settings);
};

const writeSettings = (req, res) => {
  const params = JSON.stringify(req.body);
  fs.writeFileSync(path.join(__dirname, "..", "/config/settings.json"), params);
  res.redirect("/");
};

module.exports = {
  animejs,
  index,
  settingsPage,
  readSettings,
  writeSettings,
};
