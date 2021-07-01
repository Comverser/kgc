import { settingsEndpoint, offerEndpoint } from "./config.js";

let useDatachannel,
  useAudio,
  useVideo,
  useStun,
  datachannelParameters,
  audioCodec,
  videoCodec,
  videoResolution,
  videoTransform;

// get DOM elements
const startBtn = document.getElementById("start"),
  stopBtn = document.getElementById("stop");
const dataChannelLog = document.getElementById("data-channel"),
  iceConnectionLog = document.getElementById("ice-connection-state"),
  iceGatheringLog = document.getElementById("ice-gathering-state"),
  signalingLog = document.getElementById("signaling-state");

// peer connection
let pc;

// data channel
let dc, dcInterval;

function createPeerConnection() {
  let config = {
    sdpSemantics: "unified-plan",
  };

  if (useStun) {
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
    if (evt.track.kind == "video") {
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

      codec = audioCodec;
      if (codec !== "default") {
        offer.sdp = sdpFilterCodec("audio", codec, offer.sdp);
      }

      codec = videoCodec;
      if (codec !== "default") {
        offer.sdp = sdpFilterCodec("video", codec, offer.sdp);
      }

      document.getElementById("offer-sdp").textContent = offer.sdp;
      return fetch(offerEndpoint, {
        body: JSON.stringify({
          sdp: offer.sdp,
          type: offer.type,
          video_transform: videoTransform,
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
      document.getElementById("answer-sdp").textContent = answer.sdp;
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

  if (useDatachannel) {
    let parameters = JSON.parse(datachannelParameters);

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
    audio: useAudio,
    video: useVideo,
  };

  if (useVideo) {
    videoResolution = videoResolution.split("x");
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

function sdpFilterCodec(kind, codec, realSdp) {
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
}

function escapeRegExp(string) {
  return string.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"); // $& means the whole matched string
}

fetch(settingsEndpoint)
  .then((res) => res.json())
  .then((answer) => {
    useDatachannel = answer["useDatachannel"];
    useAudio = answer["useAudio"];
    useVideo = answer["useVideo"];
    useStun = answer["useStun"];
    datachannelParameters = answer["datachannelParameters"];
    audioCodec = answer["audioCodec"];
    videoCodec = answer["videoCodec"];
    videoResolution = answer["videoResolution"];
    videoTransform = answer["videoTransform"];
  })
  .then(start)
  .catch(function (e) {
    alert(e);
  });

// startBtn.onclick = () => start();
stopBtn.onclick = () => stop();
