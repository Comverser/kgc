import {
  settingsEndpoint,
  offerLocalEndpoint,
  offerRemoteEndpoint,
  debugMode,
} from "./config/config.js";
import { genDomElem, webrtcStart, webrtcStop } from "./libs/webrtc.js";

// get DOM elements
const domElemLocal = genDomElem("-local");
const domElemRemote = genDomElem("-remote");

let webrtcLocal, webrtcRemote;

fetch(settingsEndpoint)
  .then((res) => res.json())
  .then((webrtcParams) => {
    webrtcLocal = webrtcStart(
      offerLocalEndpoint,
      webrtcParams,
      debugMode,
      domElemLocal
    );
    webrtcRemote = webrtcStart(
      offerRemoteEndpoint,
      webrtcParams,
      debugMode,
      domElemRemote
    );
    domElemLocal.startBtn.style.display = "none";
    domElemLocal.stopBtn.style.display = "inline-block";
    domElemRemote.startBtn.style.display = "none";
    domElemRemote.stopBtn.style.display = "inline-block";
  })
  .catch(function (e) {
    alert(e);
  });

domElemLocal.stopBtn.onclick = () => {
  webrtcStop(webrtcLocal);
  domElemLocal.stopBtn.style.display = "none";
};

domElemRemote.stopBtn.onclick = () => {
  webrtcStop(webrtcRemote);
  domElemRemote.stopBtn.style.display = "none";
};
