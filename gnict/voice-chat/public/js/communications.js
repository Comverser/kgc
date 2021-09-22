import { settingsEndpoint, offerEndpoint, debugMode } from "./config/config.js";
import { webrtcStart, webrtcStop } from "./libs/webrtc.js";

// get DOM elements
const stopBtn = document.getElementById("stop");

// peer connection
let pc;

// data channel
let dc;

fetch(settingsEndpoint)
  .then((res) => res.json())
  .then((webrtcParams) => {
    ({ pc, dc } = webrtcStart(pc, dc, offerEndpoint, webrtcParams, debugMode));
    document.getElementById("start").style.display = "none";
    document.getElementById("stop").style.display = "inline-block";
  })
  .catch(function (e) {
    alert(e);
  });

stopBtn.onclick = () => {
  webrtcStop(pc, dc);
  stopBtn.style.display = "none";
};
