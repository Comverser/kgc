// import express, ejs, uuid
const express = require("express");
const app = express();

// set up https, via letsencrypt
const fs = require("fs");
const path = require("path");
const https = require("https");
const server = https.createServer(
  {
    key: fs.readFileSync(path.join(__dirname, "cert", "key.pem")),
    cert: fs.readFileSync(path.join(__dirname, "cert", "cert.pem")),
    requestCert: false,
    rejectUnauthorized: false,
  },
  app
);

app.use(express.static("public"));

// redirect to random room url
app.get("/", (req, res) => {
  res.render("index");
});

server.listen(3000, () => {
  console.log("App listening on port 3000");
});
