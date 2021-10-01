import { talkEndpoint, debugMode } from "./config/config.js";
import { changeEmo, mouse_ani, state_msg, fontControl } from "./libs/ui.js";

// set up basic variables for app
const status = document.querySelector(".status");
const soundClips = document.querySelector(".sound-clips");

// audio data conversion setup
const reader = new FileReader();
let base64data;

let loopTime = 20;
if (debugMode) {
  loopTime = 200;
}

let listenMsg = document.createElement("p");

// system status management: init -> idle -> listen -> wait -> speak -> idle -> ...
let emotion = "neutral";
let message = "안녕하세요";
const msg = document.querySelector("#msgBox");
let systemStatus = "init";
let previous;

let chunks = [];

const constraints = {
  audio: true,
};

console.log(navigator.mediaDevices.getSupportedConstraints()); // may return false positives

setTimeout(() => {
  systemStatus = "idle";
}, 3000);

const updatePage = (emotion) => {
  console.log(emotion);
};

const getMedia = async (constraints) => {
  let stream = null;

  try {
    stream = await navigator.mediaDevices.getUserMedia(constraints);
    const mediaRecorder = new MediaRecorder(stream);

    kgcSpeechRecognition(mediaRecorder);

    mediaRecorder.ondataavailable = (e) => {
      chunks.push(e.data);
    };

    mediaRecorder.onstop = (e) => {
      const audio = document.createElement("audio");

      audio.setAttribute("controls", "");

      const blob = new Blob(chunks, { type: "audio/webm; codecs=opus" });
      chunks = [];
      const audioURL = window.URL.createObjectURL(blob);
      audio.src = audioURL;
      soundClips.appendChild(audio);
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
      mediaRecorder.start();
    };

    recognition.onresult = (e) => {
      const text = Array.from(e.results)
        .map((result) => result[0])
        .map((result) => result.transcript)
        .join("");

      if (e.results[0].isFinal) {
        if (text.includes("뀨뀨")) {
          console.log("뀨뀨?");
        }
        message = text;
      }

      listenMsg.innerText = text;
      texts.appendChild(listenMsg);
    };

    recognition.onerror = () => {
      console.error("Speech Recognition Error");
    };

    recognition.onend = () => {
      recognition.start();
      mediaRecorder.stop();
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
    if (systemStatus !== "init") {
      msg.innerText = message;
    }

    state_msg(systemStatus);

    console.log(
      `[systemStatus: ${systemStatus.padStart(6)}, ${emotion.padStart(8)}]`
    );
  }
  fontControl();

  previous = systemStatus;
}, loopTime * 5);

mediaRecorder.onstop = (e) => {
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

    postButton.onclick = (e) => {
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
          console.error(err);
        });
    };

    deleteButton.onclick = (e) => {
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
        console.error(err);
        systemStatus = "idle";
      });
  };
};
