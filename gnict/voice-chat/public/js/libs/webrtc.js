// public functions

function webrtcStart(pc, dc, offerEndpoint, webrtcParams, debugMode) {
  const dataChannelLog = document.getElementById("data-channel");
  let dcInterval;

  pc = createPeerConnection(webrtcParams["use-stun"], debugMode);

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
        return negotiate(pc, webrtcParams, offerEndpoint, debugMode);
      },
      function (err) {
        alert("Could not acquire media: " + err);
      }
    );
  } else {
    negotiate(pc, webrtcParams, offerEndpoint, debugMode);
  }

  return { pc, dc };
}

function webrtcStop(pc, dc) {
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

// private functions

const createPeerConnection = (useStun, debugMode) => {
  const iceConnectionLog = document.getElementById("ice-connection-state"),
    iceGatheringLog = document.getElementById("ice-gathering-state"),
    signalingLog = document.getElementById("signaling-state");

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
};

const negotiate = (pc, webrtcParams, offerEndpoint, debugMode) => {
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

export { webrtcStart, webrtcStop };
