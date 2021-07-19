// import express, ejs, uuid
const express = require("express");
const app = express();
const https = require("https");
// const http = require("http");
const port = 20443;

// set up https
const fs = require("fs");
const path = require("path");
const options = {
  key: fs.readFileSync(path.join(__dirname, "cert", "key.pem")),
  cert: fs.readFileSync(path.join(__dirname, "cert", "cert.pem")),
  requestCert: false,
  rejectUnauthorized: false,
};

app.use(express.static("public"));

app.get("/", (req, res) => {
  res.render("index");
});

function serInit(port) {
  console.log(`App listening on port ${port}`);
}

// const httpSer = http.createServer(app).listen(3080, serInit(3080));
// httpSer.on("connection", (client) => {
//   console.log(`Connected: ${client}`);
// });

https.createServer(options, app).listen(port, serInit(port));
