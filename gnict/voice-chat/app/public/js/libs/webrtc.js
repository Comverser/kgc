// public functions

const genDomElem = (name = "") => {
  return {
    startBtn: document.getElementById(`start${name}`),
    stopBtn: document.getElementById(`stop${name}`),
    mediaDiv: document.getElementById(`media${name}`),
    dataChannelLog: document.getElementById(`data-channel${name}`),
    iceConnectionLog: document.getElementById(`ice-connection-state${name}`),
    iceGatheringLog: document.getElementById(`ice-gathering-state${name}`),
    signalingLog: document.getElementById(`signaling-state${name}`),
    webrtcVideo: document.getElementById(`webrtc-video${name}`),
    webrtcAudio: document.getElementById(`webrtc-audio${name}`),
    offerSdp: document.getElementById(`offer-sdp${name}`),
    answerSdp: document.getElementById(`answer-sdp${name}`),
  };
};

const webrtcStart = (offerEndpoint, webrtcParams, debugMode, domElem, user_id) => {
  let dcInterval;

  const pc = createPeerConnection(webrtcParams["use-stun"], debugMode, domElem);
  let dc;

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
      domElem.dataChannelLog.textContent += "- close\n";
    };
    dc.onopen = function () {
      domElem.dataChannelLog.textContent += "- open\n";
      dcInterval = setInterval(function () {
        let message = "ping " + current_stamp();
        domElem.dataChannelLog.textContent += "> " + message + "\n";
        dc.send(message);
      }, 1000);
    };
    dc.onmessage = function (evt) {
      domElem.dataChannelLog.textContent += "< " + evt.data + "\n";

      if (evt.data.substring(0, 4) === "pong") {
        let elapsed_ms = current_stamp() - parseInt(evt.data.substring(5), 10);
        domElem.dataChannelLog.textContent += " RTT " + elapsed_ms + " ms\n";
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
      domElem.mediaDiv.style.display = "block";
    }
    navigator.mediaDevices.getUserMedia(constraints).then(
      function (stream) {
        stream.getTracks().forEach(function (track) {
          pc.addTrack(track, stream);
        });
        return negotiate(pc, webrtcParams, offerEndpoint, debugMode, domElem, user_id);
      },
      function (err) {
        console.error("Could not acquire media: " + err);
      }
    );
  } else {
    negotiate(pc, webrtcParams, offerEndpoint, debugMode, domElem, user_id);
  }

  return { pc, dc };
};

const webrtcStop = ({ pc, dc }) => {
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
};

// private functions

const createPeerConnection = (useStun, debugMode, domElem) => {
  let config = {
    sdpSemantics: "unified-plan",
  };

  if (useStun) {
    config.iceServers = [{ urls: ["stun:stun.l.google.com:19302"] }];
  }

  const pc = new RTCPeerConnection(config);

  // register some listeners to help debugging
  pc.addEventListener(
    "icegatheringstatechange",
    function () {
      domElem.iceGatheringLog.textContent += " -> " + pc.iceGatheringState;
    },
    false
  );
  domElem.iceGatheringLog.textContent = pc.iceGatheringState;

  pc.addEventListener(
    "iceconnectionstatechange",
    function () {
      domElem.iceConnectionLog.textContent += " -> " + pc.iceConnectionState;
    },
    false
  );
  domElem.iceConnectionLog.textContent = pc.iceConnectionState;

  pc.addEventListener(
    "signalingstatechange",
    function () {
      domElem.signalingLog.textContent += " -> " + pc.signalingState;
    },
    false
  );
  domElem.signalingLog.textContent = pc.signalingState;

  // connect audio / video
  pc.addEventListener("track", function (evt) {
    if (evt.track.kind == "video" && debugMode) {
      domElem.webrtcVideo.srcObject = evt.streams[0];
    } else {
      domElem.webrtcAudio.srcObject = evt.streams[0];
    }
  });

  return pc;
};

const negotiate = (pc, webrtcParams, offerEndpoint, debugMode, domElem, user_id) => {
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
        domElem.offerSdp.textContent = offer.sdp;
      }

      console.log("negotiate: "+user_id)

      return fetch(offerEndpoint, {
        body: JSON.stringify({
          sdp: offer.sdp,
          type: offer.type,
          uid: user_id,
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
        domElem.answerSdp.textContent = answer.sdp;
      }
      return pc.setRemoteDescription(answer);
    })
    .catch(function (e) {
      console.error("negotiate: " + e);
    });
};

const sdpFilterCodec = (kind, codec, realSdp) => {
  let allowed = [];
  let rtxRegex = new RegExp("a=fmtp:(\\d+) apt=(\\d+)\r$");
  let codecRegex = new RegExp("a=rtpmap:([0-9]+) " + escapeRegExp(codec));
  let videoRegex = new RegExp("(m=" + kind + " .*?)( ([0-9]+))*\\s*$");

  let lines = realSdp.split("\n");

  let isKind = false;
  for (let i = 0; i < lines.length; i++) {
    if (lines[i].startsWith("m=" + kind + " ")) {
      isKind = true;
    } else if (lines[i].startsWith("m=")) {
      isKind = false;
    }

    if (isKind) {
      let match = lines[i].match(codecRegex);
      if (match) {
        allowed.push(parseInt(match[1]));
      }

      match = lines[i].match(rtxRegex);
      if (match && allowed.includes(parseInt(match[2]))) {
        allowed.push(parseInt(match[1]));
      }
    }
  }

  let skipRegex = "a=(fmtp|rtcp-fb|rtpmap):([0-9]+)";
  let sdp = "";

  isKind = false;
  for (let i = 0; i < lines.length; i++) {
    if (lines[i].startsWith("m=" + kind + " ")) {
      isKind = true;
    } else if (lines[i].startsWith("m=")) {
      isKind = false;
    }

    if (isKind) {
      let skipMatch = lines[i].match(skipRegex);
      if (skipMatch && !allowed.includes(parseInt(skipMatch[2]))) {
        continue;
      } else if (lines[i].match(videoRegex)) {
        sdp += lines[i].replace(videoRegex, "$1 " + allowed.join(" ")) + "\n";
      } else {
        sdp += lines[i] + "\n";
      }
    } else {
      sdp += lines[i] + "\n";
    }
  }

  return sdp;
};

const escapeRegExp = (string) => {
  return string.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"); // $& means the whole matched string
};

export { genDomElem, webrtcStart, webrtcStop };
