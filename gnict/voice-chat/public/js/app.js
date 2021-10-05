import { talkEndpoint, debugMode } from "./config/config.js";
import { changeEmo, mouse_ani, state_msg, fontControl } from "./libs/ui.js";

// set up basic variables for app
const status = document.querySelector(".status");
const msgElem = document.querySelector("#msgBox");
let listenMsg;

// audio data conversion setup
const reader = new FileReader();
let base64data;

let loopTime = 50;
if (debugMode) {
  loopTime = 500;
}
const audioLetency = 200;

// system status management: init -> idle -> listen -> wait -> speak -> idle -> ...
let emotion = "neutral";
let msgIn = "안녕하세요";
let msgOut;
let systemStatus = "init";
let previous;

let chunks = [];

const getMedia = async () => {
  const constraints = {
    audio: true,
  };

  let stream = null;

  try {
    stream = await navigator.mediaDevices.getUserMedia(constraints);
    const mediaRecorder = new MediaRecorder(stream);

    kgcSpeechRecognition(mediaRecorder);

    mediaRecorder.ondataavailable = (e) => {
      chunks.push(e.data);
    };

    mediaRecorder.onstop = (e) => {
      if (systemStatus === "wait") {
        const soundClips = document.querySelector(".sound-clips");
        const blob = new Blob(chunks, { type: "audio/webm; codecs=opus" });
        chunks = [];
        if (debugMode) {
          const clipContainer = document.createElement("article");
          const audio = document.createElement("audio");

          clipContainer.classList.add("clip");
          audio.setAttribute("controls", "");

          clipContainer.appendChild(audio);
          soundClips.appendChild(clipContainer);

          const audioURL = window.URL.createObjectURL(blob);
          audio.src = audioURL;
        }
        reader.readAsDataURL(blob);
      }
      // else {
      //   console.log("Speech not detected");
      // }
    };

    reader.onloadend = () => {
      base64data = reader.result;

      fetch(talkEndpoint, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          audio: base64data,
          text: msgOut,
        }),
      })
        .then((response) => response.json())
        .then((data) => {
          let snd = new Audio(data.audio);
          emotion = data.emotion;
          msgIn = data.text;

          systemStatus = "speak";
          changeEmo(emotion);

          snd.onended = () => {
            mouse_ani();
            setTimeout(() => {
              systemStatus = "idle";
            }, audioLetency);
          };
          snd.play();
          mouse_ani();
        })
        .catch((err) => {
          console.error(err);
          systemStatus = "idle";
        });
    };
  } catch (err) {
    console.error(err);
  }
};

const kgcSpeechRecognition = (mediaRecorder) => {
  if (window.SpeechRecognition || window.webkitSpeechRecognition) {
    const recognition =
      new webkitSpeechRecognition() || new SpeechRecognition();

    recognition.lang = "ko-KR";
    recognition.interimResults = true;

    recognition.onstart = () => {
      if (systemStatus === "idle") {
        mediaRecorder.start();
      } else {
        setTimeout(() => {
          recognition.stop();
        }, 200);
      }
    };

    recognition.onresult = (e) => {
      if (systemStatus === "idle" || systemStatus === "listen") {
        systemStatus = "listen";
        const text = Array.from(e.results)
          .map((result) => result[0])
          .map((result) => result.transcript)
          .join("");

        if (e.results[0].isFinal) {
          if (text.includes("확인")) {
            console.log("확인?");
          }
          msgOut = text;
        }

        listenMsg = text;
      }
    };

    // recognition.onerror = () => {
    //   console.error("Speech Recognition Error");
    // };

    recognition.onend = () => {
      if (mediaRecorder.state === "recording") {
        mediaRecorder.stop();
      }

      if (systemStatus === "listen") {
        systemStatus = "wait";
      }

      recognition.start();
    };

    recognition.start();
  } else {
    console.error("Speech Recognition Not Available");
  }
};

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
    state_msg(systemStatus);

    if (systemStatus === "idle" || systemStatus === "speak") {
      msgElem.innerText = msgIn;
    }

    if (debugMode) {
      console.log(
        `[systemStatus: ${systemStatus.padStart(6)}, ${emotion.padStart(8)}]`
      );
    }
  }

  if (systemStatus === "listen") {
    state_msg(systemStatus, listenMsg);
  }

  fontControl();

  previous = systemStatus;
}, loopTime);

setTimeout(() => {
  systemStatus = "idle";
}, 1000);

getMedia();
