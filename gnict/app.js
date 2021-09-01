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

const server = https.createServer(options, app).listen(port, serInit(port));

/* [Park's code below] */
/* 

function GetAddress(socket) {
  var address = socket.request.connection.remoteAddress;
  return address;
}

var io = require("socket.io")(server);
var socketDic = {};
io.on("connection", (socket) => {
  var add = socket.request.connection.remoteAddress;
  io.on("yeelight", (message) => {
    //var address =socket.request.connection.remoteAddress;
    var address = "::ffff:" + message;
    console.log(address);
    console.log("yeelight connect!!!");
    socketDic[address] = socket;
  });

  socket.on("power", (message) => {
    var address = GetAddress(socket);
    console.log(address);
    if (socketDic[address]) {
      console.log("power : " + message);
      socketDic[address].emit("power", message);
    }
  });
  socket.on("color", (message) => {
    var address = GetAddress(socket);
    if (socketDic[address]) {
      console.log("color : " + message);
      socketDic[address].emit("color", message.toString());
    }
  });

  socket.on("bright", (message) => {
    var address = GetAddress(socket);
    if (socketDic[address]) {
      console.log("bright : " + message);
      socketDic[address].emit("Brightness", message);
    }
  });
});

*/
