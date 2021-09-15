import { talkEndpoint, debugMode } from "./config/config.js";
import { morph, path } from "./emotions.js";

// set up basic variables for app
const status = document.querySelector(".status");
const soundClips = document.querySelector(".sound-clips");
const canvas = document.querySelector(".visualizer");
const mainSection = document.querySelector(".main-controls");

// visualiser setup - create web audio api context and canvas
let audioCtx;
const canvasCtx = canvas.getContext("2d");

// audio data conversion setup
const reader = new FileReader();
let base64data;

// VAD
const vadThreshold = 220; // should be automated later
let vadInterval = 20;
if (debugMode) {
  vadInterval = 200;
}
let noiseLevelParam = 0.8;
let noiseLevelMax = vadThreshold * 0.5;
let maBufLong = new Array(1000 / vadInterval).fill(0);
let maBufShort = new Array(600 / vadInterval).fill(0);
let maIdxLong = 0;
let maIdxShort = 0;

// system status management: init -> idle -> listen -> wait -> speak -> idle -> ...
// let emotion = "happy";
let emotion = "neutral";
let message = "안녕하세요.";
const msg = document.querySelector("#msgBox");
let systemStatus = "init";
let previous;
function changeEmo(pEmo = "neutral") {
  for (let i = 0; i < path.length; i++) {
    if (pEmo == path[i]["id"]) {
      document.getElementById("_face").setAttribute("class", pEmo);
      morph(path[i]);
    }
  }
}

// Status handler
setInterval(() => {
  if (previous !== systemStatus) {
    if (systemStatus === "init") {
      status.style.background = "white";
    } else if (systemStatus === "idle") {
      emotion = "neutral";
      status.style.background = "gray";
    } else if (systemStatus === "listen") {
      emotion = systemStatus;
      status.style.background = "green";
    } else if (systemStatus === "wait") {
      emotion = systemStatus;
      status.style.background = "orange";
    } else if (systemStatus === "speak") {
      status.style.background = "red";
    }
    changeEmo(emotion);
    if (systemStatus !== "init") {
      msg.innerText = message;
    }

    console.log(
      `[systemStatus: ${systemStatus.padStart(6)}, ${emotion.padStart(8)}]`
    );
  }
  previous = systemStatus;
  state_msg(systemStatus);
  fontControl();
}, vadInterval * 5);

//main block for doing the audio recording
if (navigator.mediaDevices.getUserMedia) {
  // console.log("getUserMedia supported.");
  // console.log(navigator.mediaDevices.getSupportedConstraints()); // may return false positives

  const constraints = {
    audio: true,
  };
  let chunks = [];

  let onSuccess = function (stream) {
    const mediaRecorder = new MediaRecorder(stream);

    voiceTracking(stream, mediaRecorder);

    setTimeout(() => {
      systemStatus = "idle";
    }, 5000);

    mediaRecorder.onstop = function (e) {
      if (debugMode) {
        const clipContainer = document.createElement("article");
        const audio = document.createElement("audio");
        const postButton = document.createElement("button");
        const deleteButton = document.createElement("button");

        clipContainer.classList.add("clip");
        audio.setAttribute("controls", "");
        postButton.textContent = "Post";
        postButton.className = "post";
        deleteButton.textContent = "Delete";
        deleteButton.className = "delete";

        clipContainer.appendChild(audio);
        clipContainer.appendChild(postButton);
        clipContainer.appendChild(deleteButton);
        soundClips.appendChild(clipContainer);

        audio.controls = true;
        const blob = new Blob(chunks, { type: "audio/webm; codecs=opus" });

        chunks = [];
        const audioURL = window.URL.createObjectURL(blob);
        audio.src = audioURL;
        console.log("recorder stopped");

        reader.readAsDataURL(blob);

        postButton.onclick = function (e) {
          fetch(talkEndpoint, {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
            },
            body: JSON.stringify({
              audio: base64data,
            }),
          })
            .then((response) => response.json())
            .then((data) => {
              let snd = new Audio(data.audio);
              snd.play();
            })
            .catch((err) => {
              alert(err);
            });
        };

        deleteButton.onclick = function (e) {
          let evtTgt = e.target;
          evtTgt.parentNode.parentNode.removeChild(evtTgt.parentNode);
        };
      } else {
        const blob = new Blob(chunks, { type: "audio/webm; codecs=opus" });
        chunks = [];
        reader.readAsDataURL(blob);
      }

      reader.onloadend = () => {
        base64data = reader.result;

        fetch(talkEndpoint, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            audio: base64data,
          }),
        })
          .then((response) => response.json())
          .then((data) => {
            let snd = new Audio(data.audio);
            emotion = data.emotion;
            message = data.text;

            systemStatus = "speak";
            changeEmo(emotion);

            snd.onended = () => {
              mouse_ani();
              systemStatus = "idle";
            };
            snd.play();
            mouse_ani();
          })
          .catch((err) => {
            alert(err);
          });
      };
    };

    mediaRecorder.ondataavailable = function (e) {
      chunks.push(e.data);
    };
  };

  let onError = function (err) {
    console.log("The following error occured: " + err);
  };

  navigator.mediaDevices.getUserMedia(constraints).then(onSuccess, onError);
} else {
  alert("getUserMedia not supported on your browser!");
}

function calMa(pMaBuf, pMaIdx, value) {
  pMaBuf.splice(pMaIdx, 1, value);
  if (pMaIdx < pMaBuf.length - 1) {
    pMaIdx++;
  } else {
    pMaIdx = 0;
  }
  const avg = pMaBuf.reduce((a, b) => a + b) / pMaBuf.length;
  return [avg, pMaIdx, pMaBuf];
}

function voiceTracking(stream, mediaRecorder) {
  if (!audioCtx) {
    audioCtx = new AudioContext({ sampleRate: 16000 });
  }

  const source = audioCtx.createMediaStreamSource(stream);

  const analyser = audioCtx.createAnalyser();
  // Frequency resolution is equal to: Sampling Rate/FFT size
  // analyser.fftSize = 256; // default value is 2048 and dataArray size of 1024
  analyser.fftSize = 32; // default value is 2048 and dataArray size of 1024
  const bufferLength = analyser.frequencyBinCount;
  const dataArray = new Uint8Array(bufferLength);

  source.connect(analyser);
  // analyser.connect(audioCtx.destination);

  // console.log(`AudioContext sampleRate: ${audioCtx.sampleRate}`);

  // VAD
  setInterval(() => {
    // voice amplitude
    analyser.getByteFrequencyData(dataArray);

    let sum = 0;
    for (let i = 0; i < 3; i++) {
      sum += dataArray[i];
    }
    const voiceAmp = sum / 3;

    // moving average voice amplitude
    const maLong = calMa(maBufLong, maIdxLong, voiceAmp);
    const maShort = calMa(maBufShort, maIdxShort, voiceAmp);
    maIdxLong = maLong[1];
    maIdxShort = maShort[1];

    // VAD
    if (
      systemStatus === "idle" &&
      voiceAmp >= vadThreshold &&
      maShort[0] < vadThreshold &&
      maLong[0] < vadThreshold &&
      mediaRecorder.state === "inactive"
    ) {
      mediaRecorder.start();
      systemStatus = "listen";
    } else if (
      systemStatus === "listen" &&
      voiceAmp <= noiseLevelMax &&
      maShort[0] < maLong[0] &&
      maLong[0] <= noiseLevelMax &&
      mediaRecorder.state === "recording"
    ) {
      mediaRecorder.stop();
      systemStatus = "wait";
      // mediaRecorder.requestData();
    } else if (systemStatus === "idle" && mediaRecorder.state === "inactive") {
      if (
        maShort[0] < maLong[0] * 1.05 &&
        maShort[0] > maLong[0] * 0.95 &&
        maShort[0] < noiseLevelMax * 1.05
      ) {
        noiseLevelMax = Math.max(maShort[0], maLong[0]) * 1.1;
      } else if (Math.max(maShort[0], maLong[0]) >= noiseLevelMax * 1.05) {
        noiseLevelMax *= 1.01;
      }
      if (noiseLevelMax > vadThreshold * noiseLevelParam) {
        alert(
          `It is too noisy. Voice and noise level is ${vadThreshold} and ${noiseLevelMax} respectively`
        );
        noiseLevelParam *= 1.1;
      }

      if (debugMode) {
        console.log(
          `${Math.floor(voiceAmp)}\t${Math.floor(maShort[0])}\t${Math.floor(
            maLong[0]
          )}\t|\t${Math.floor(noiseLevelMax)}`
        );
      }
    }
  }, vadInterval);

  if (debugMode) {
    var debugZone = document.getElementById("debugZone");
    debugZone.style.display = "block";
    draw();
  }

  function draw() {
    /* -------------------------------------------------------------------------- */
    /*                                Draw                                */
    /* -------------------------------------------------------------------------- */
    const WIDTH = canvas.width;
    const HEIGHT = canvas.height;

    requestAnimationFrame(draw);

    /* -------------------------------------------------------------------------- */
    /*                                Frequency-domain                                */
    /* The voiced speech of a typical adult male will have a fundamental frequency*/
    /* from 85 to 180 Hz, and that of a typical adult female from 165 to 255 Hz.  */
    /* -------------------------------------------------------------------------- */
    // const bufferLength = 5;
    // const bufferLength = 32;

    canvasCtx.fillStyle = "rgb(255, 255, 255)";
    canvasCtx.fillRect(0, 0, WIDTH, HEIGHT);

    // values do range between 0-255 and 0 is zero
    analyser.getByteFrequencyData(dataArray);

    let barWidth = WIDTH / bufferLength;
    // let barWidth = (WIDTH / bufferLength) * 2.5;
    let barHeight;
    let x = 0;

    for (let i = 0; i < bufferLength; i++) {
      barHeight = dataArray[i] / 2;

      canvasCtx.fillStyle = "rgb(" + (barHeight + 100) + ",50,50)";
      canvasCtx.fillRect(x, HEIGHT - barHeight / 2, barWidth, barHeight);

      x += barWidth + 1;
    }
  }
}

function mouse_ani() {
  var mouseClassName = document.getElementById("mouse").getAttribute("class");

  if (mouseClassName != "talk") {
    document.getElementById("mouse").setAttribute("class", "talk");
  } else {
    document.getElementById("mouse").setAttribute("class", "mouse");
  }
}

function state_msg(state) {
  var msgBox = document.getElementById("msgBox");
  var bubble = document.getElementById("_bubble");

  if (state == "wait") {
    var table = `
    <table>
    <tr><td><i></i></td><td><i></i></td><td><i></i></td></tr>
    <tr><td>생</td><td>각</td><td>중</td></tr>
    </table>
    `;

    msgBox.innerText = "";
    msgBox.innerHTML += table;

    msgBox.classList.add("stateWait");
    msgBox.classList.remove("stateListen");
    bubble.setAttribute("fill", "#41A201");
  } else if (state == "listen") {
    var table = `
    <table>
    <tr><td><i></i></td><td><i></i></td><td><i></i></td></tr>
    <tr><td>듣</td><td>는</td><td>중</td></tr>
    </table>
    `;

    msgBox.innerText = "";
    msgBox.innerHTML += table;

    msgBox.classList.add("stateListen");
    msgBox.classList.remove("stateWait");
    bubble.setAttribute("fill", "#0059FF");
  } else {
    msgBox.classList.remove("stateListen");
    msgBox.classList.remove("stateWait");
    bubble.setAttribute("fill", "#2b2b2b");
  }
}

function fontControl() {
  const btn_fonts = document.querySelectorAll(".btn_font");
  const _msg = document.querySelector("#msgBox");
  var size = "";
  for (let btn_font of btn_fonts) {
    btn_font.addEventListener("click", (event) => {
      for (var i = 0; i < btn_fonts.length; i++) {
        btn_fonts[i].classList.remove("clicked");
      }
      size = event.target.id;
      event.target.classList.add("clicked");

      if (size == "big_font") {
        _msg.setAttribute("style", "font-size:24pt");
      } else if (size == "small_font") {
        _msg.setAttribute("style", "font-size:16pt");
      } else if (size == "normal_font") {
        _msg.setAttribute("style", "font-size:20pt");
      }
    });
  }
}
