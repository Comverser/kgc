import {
  settingsEndpoint,
  offerLocalEndpoint,
  offerRemoteEndpoint,
  debugMode,
  user_id
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
      domElemLocal,
      user_id
    );
    webrtcRemote = webrtcStart(
      offerRemoteEndpoint,
      webrtcParams,
      debugMode,
      domElemRemote,
      user_id
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
