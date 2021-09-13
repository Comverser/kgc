import { morph, path } from "./libs/morph.js";

// loading
const loading = document.querySelector(".loading");
window.onload = loading_out();
function loading_out() {
  loading.setAttribute("style", "display:none");
}

// msgBox bubble: web
var bubble = document.querySelector("#_bubble");
const _window = window.matchMedia(
  "screen and (max-width: 767px), (orientation: portrait)"
);

fn_bubble(_window);
_window.addEventListener("change", () => {
  fn_bubble(_window);
});

function fn_bubble(_window) {
  if (_window.matches) {
    bubble.setAttribute(
      "d",
      "M58.6451 254.298L29.4936 311.56L7.43998 293.115L58.6451 254.298Z"
    );
  } else {
    bubble.setAttribute(
      "d",
      "M281.527 177.738L391.62 102.15L409.853 140.772L281.527 177.738Z"
    );
  }
}

// Emotion Control in DebugMode
const btn_emotions = document.querySelectorAll(".btn_emotion");

for (let btn_emotion of btn_emotions) {
  btn_emotion.addEventListener("click", (event) => {
    document.getElementById("mouse").setAttribute("class", "mouse");
    var emotion = event.target.innerText.toLowerCase();

    for (var i = 0; i < path.length; i++) {
      if (emotion == path[i]["id"]) {
        document.getElementById("_face").setAttribute("class", emotion);
        morph(path[i]);
      }
    }
  });
}
