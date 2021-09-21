import { settingsEndpoint, offerEndpoint, debugMode } from "./config/config.js";
import { sdpFilterCodec } from "./libs/webrtc.js";

// get DOM elements
const startBtn = document.getElementById("start"),
  stopBtn = document.getElementById("stop");

const dataChannelLog = document.getElementById("data-channel"),
  iceConnectionLog = document.getElementById("ice-connection-state"),
  iceGatheringLog = document.getElementById("ice-gathering-state"),
  signalingLog = document.getElementById("signaling-state");

// webrtc params
let webrtcParams;

// peer connection
let pc;

// data channel
let dc, dcInterval;

function createPeerConnection() {
  let config = {
    sdpSemantics: "unified-plan",
  };

  if (webrtcParams["use-stun"]) {
    config.iceServers = [{ urls: ["stun:stun.l.google.com:19302"] }];
  }

  pc = new RTCPeerConnection(config);

  // register some listeners to help debugging
  pc.addEventListener(
    "icegatheringstatechange",
    function () {
      iceGatheringLog.textContent += " -> " + pc.iceGatheringState;
    },
    false
  );
  iceGatheringLog.textContent = pc.iceGatheringState;

  pc.addEventListener(
    "iceconnectionstatechange",
    function () {
      iceConnectionLog.textContent += " -> " + pc.iceConnectionState;
    },
    false
  );
  iceConnectionLog.textContent = pc.iceConnectionState;

  pc.addEventListener(
    "signalingstatechange",
    function () {
      signalingLog.textContent += " -> " + pc.signalingState;
    },
    false
  );
  signalingLog.textContent = pc.signalingState;

  // connect audio / video
  pc.addEventListener("track", function (evt) {
    if (evt.track.kind == "video" && debugMode) {
      document.getElementById("webrtc_video").srcObject = evt.streams[0];
      // console.log("video received! -------->", evt.streams);
    } else {
      document.getElementById("webrtc_audio").srcObject = evt.streams[0];
      // console.log("Audio received! -------->", evt.streams);
    }
  });

  return pc;
}

function negotiate() {
  return pc
    .createOffer()
    .then(function (offer) {
      return pc.setLocalDescription(offer);
    })
    .then(function () {
      // wait for ICE gathering to complete
      return new Promise(function (resolve) {
        if (pc.iceGatheringState === "complete") {
          resolve();
        } else {
          function checkState() {
            if (pc.iceGatheringState === "complete") {
              pc.removeEventListener("icegatheringstatechange", checkState);
              resolve();
            }
          }
          pc.addEventListener("icegatheringstatechange", checkState);
        }
      });
    })
    .then(function () {
      let offer = pc.localDescription;
      let codec;

      codec = webrtcParams["audio-codec"];
      if (codec !== "default") {
        offer.sdp = sdpFilterCodec("audio", codec, offer.sdp);
      }

      codec = webrtcParams["video-codec"];
      if (codec !== "default") {
        offer.sdp = sdpFilterCodec("video", codec, offer.sdp);
      }

      if (debugMode) {
        document.getElementById("offer-sdp").textContent = offer.sdp;
      }

      return fetch(offerEndpoint, {
        body: JSON.stringify({
          sdp: offer.sdp,
          type: offer.type,
          video_transform: webrtcParams["video-transform"],
        }),
        headers: {
          "Content-Type": "application/json",
        },
        method: "POST",
      });
    })
    .then(function (response) {
      return response.json();
    })
    .then(function (answer) {
      if (debugMode) {
        document.getElementById("answer-sdp").textContent = answer.sdp;
      }
      return pc.setRemoteDescription(answer);
    })
    .catch(function (e) {
      alert(e);
    });
}

function start() {
  document.getElementById("start").style.display = "none";

  pc = createPeerConnection();

  let time_start;

  function current_stamp() {
    if (time_start === undefined) {
      time_start = new Date().getTime();
      return 0;
    } else {
      return new Date().getTime() - time_start;
    }
  }

  if (webrtcParams["use-datachannel"]) {
    let parameters = JSON.parse(webrtcParams["datachannel-parameters"]);

    dc = pc.createDataChannel("chat", parameters);
    dc.onclose = function () {
      clearInterval(dcInterval);
      dataChannelLog.textContent += "- close\n";
    };
    dc.onopen = function () {
      dataChannelLog.textContent += "- open\n";
      dcInterval = setInterval(function () {
        let message = "ping " + current_stamp();
        dataChannelLog.textContent += "> " + message + "\n";
        dc.send(message);
      }, 1000);
    };
    dc.onmessage = function (evt) {
      dataChannelLog.textContent += "< " + evt.data + "\n";

      if (evt.data.substring(0, 4) === "pong") {
        let elapsed_ms = current_stamp() - parseInt(evt.data.substring(5), 10);
        dataChannelLog.textContent += " RTT " + elapsed_ms + " ms\n";
      }
    };
  }

  let constraints = {
    audio: webrtcParams["use-audio"],
    video: webrtcParams["use-video"],
  };

  if (webrtcParams["use-video"]) {
    let videoResolution = webrtcParams["video-resolution"].split("x");
    constraints.video = {
      width: parseInt(videoResolution[0], 0),
      height: parseInt(videoResolution[1], 0),
    };
  }

  if (constraints.audio || constraints.video) {
    if (constraints.video) {
      document.getElementById("media").style.display = "block";
    }
    navigator.mediaDevices.getUserMedia(constraints).then(
      function (stream) {
        stream.getTracks().forEach(function (track) {
          pc.addTrack(track, stream);
          // console.log("-------------->", track);
        });
        return negotiate();
      },
      function (err) {
        alert("Could not acquire media: " + err);
      }
    );
  } else {
    negotiate();
  }

  document.getElementById("stop").style.display = "inline-block";
}

function stop() {
  document.getElementById("stop").style.display = "none";

  // close data channel
  if (dc) {
    dc.close();
  }

  // close transceivers
  if (pc.getTransceivers) {
    pc.getTransceivers().forEach(function (transceiver) {
      if (transceiver.stop) {
        transceiver.stop();
      }
    });
  }

  // close local audio / video
  pc.getSenders().forEach(function (sender) {
    sender.track.stop();
  });

  // close peer connection
  setTimeout(function () {
    pc.close();
  }, 500);
}

fetch(settingsEndpoint)
  .then((res) => res.json())
  .then((data) => {
    webrtcParams = data;
  })
  .then(start)
  .catch(function (e) {
    alert(e);
  });

// startBtn.onclick = () => start();
stopBtn.onclick = () => stop();
