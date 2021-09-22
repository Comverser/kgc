import { settingsEndpoint, offerEndpoint, debugMode } from "./config/config.js";
import { genDomElem, webrtcStart, webrtcStop } from "./libs/webrtc.js";

// get DOM elements
const domElem = genDomElem("-remote");

let webrtcObj;

fetch(settingsEndpoint)
  .then((res) => res.json())
  .then((webrtcParams) => {
    webrtcObj = webrtcStart(offerEndpoint, webrtcParams, debugMode, domElem);
    domElem.startBtn.style.display = "none";
    domElem.stopBtn.style.display = "inline-block";
  })
  .catch(function (e) {
    alert(e);
  });

domElem.stopBtn.onclick = () => {
  webrtcStop(webrtcObj);
  domElem.stopBtn.style.display = "none";
};
