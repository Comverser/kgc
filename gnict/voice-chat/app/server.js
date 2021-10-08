const express = require("express");
const https = require("https");
const morgan = require("morgan");
const fs = require("fs");

const path = require("path");
const routes = require("./routes/routes");

const app = express();
const port = 20443;

const options = {
  key: fs.readFileSync(path.join(__dirname, "cert", "key.pem")),
  cert: fs.readFileSync(path.join(__dirname, "cert", "cert.pem")),
  requestCert: false,
  rejectUnauthorized: false,
};

const server = https
  .createServer(options, app)
  .listen(port, () => console.log(`Listening on port: ${port}`));

// register view engine
app.set("view engine", "ejs");

// static files and middleware
app.use(express.static("public"));
app.use(express.urlencoded({ extended: true }));
app.use(express.json());
app.use(morgan("dev"));

app.use(routes);

app.use((req, res) => {
  res.status(404).render("404", { title: "404" });
});

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
