import { talkEndpoint, debugMode } from "./config.js";

// set up basic variables for app
const status = document.querySelector(".status");
const soundClips = document.querySelector(".sound-clips");
const canvas = document.querySelector(".visualizer");
const mainSection = document.querySelector(".main-controls");

// system
let systemStatus = "init"; // init, listen, speak, idle, wait

// visualiser setup - create web audio api context and canvas
let audioCtx;
const canvasCtx = canvas.getContext("2d");

// audio data conversion setup
const reader = new FileReader();
let base64data;

// VAD
const vadThreshold = 220; // should be automated
let vadInterval = 50;
if (debugMode) {
  vadInterval = 500;
}
let noiseLevelParam = 0.75;
let noiseLevelMax = vadThreshold * noiseLevelParam * 0.8;
let maBufLong = new Array(2000 / vadInterval).fill(0);
let maBufShort = new Array(1000 / vadInterval).fill(0);
let maIdxLong = 0;
let maIdxShort = 0;

//main block for doing the audio recording
if (navigator.mediaDevices.getUserMedia) {
  // console.log("getUserMedia supported.");

  const constraints = { audio: true };
  let chunks = [];

  let onSuccess = function (stream) {
    const mediaRecorder = new MediaRecorder(stream);

    voiceTracking(stream, mediaRecorder);

    setTimeout(() => {
      systemStatus = "listen";
    }, 5000);

    mediaRecorder.onstop = function (e) {
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
      const blob = new Blob(chunks, { type: "audio/ogg; codecs=opus" });

      chunks = [];
      const audioURL = window.URL.createObjectURL(blob);
      audio.src = audioURL;
      // console.log("recorder stopped");

      reader.readAsDataURL(blob);
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
            snd.play();
          })
          .catch((err) => {
            alert(err);
          });
      };

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

  // VAD
  setInterval(() => {
    // voice amplitude
    analyser.getByteFrequencyData(dataArray);

    let sum = 0;
    for (let i = 1; i < 5; i++) {
      sum += dataArray[i];
    }
    const voiceAmp = sum / 4;

    // moving average voice amplitude
    const maLong = calMa(maBufLong, maIdxLong, voiceAmp);
    const maShort = calMa(maBufShort, maIdxShort, voiceAmp);
    maIdxLong = maLong[1];
    maIdxShort = maShort[1];

    // VAD
    if (
      systemStatus === "listen" &&
      voiceAmp >= vadThreshold &&
      maShort[0] < vadThreshold &&
      maLong[0] < vadThreshold &&
      mediaRecorder.state === "inactive"
    ) {
      mediaRecorder.start();
      status.style.background = "red";
    } else if (
      systemStatus === "listen" &&
      voiceAmp <= noiseLevelMax &&
      maShort[0] < maLong[0] &&
      maLong[0] <= noiseLevelMax &&
      mediaRecorder.state === "recording"
    ) {
      mediaRecorder.stop();
      // mediaRecorder.requestData();
    } else if (
      systemStatus === "listen" &&
      mediaRecorder.state === "inactive"
    ) {
      status.style.background = "black";
      if (
        maShort[0] < maLong[0] * 1.05 &&
        maShort[0] > maLong[0] * 0.95 &&
        maShort[0] < noiseLevelMax * 1.05
      ) {
        noiseLevelMax = Math.max(maShort[0], maLong[0]) * 1.15;
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
