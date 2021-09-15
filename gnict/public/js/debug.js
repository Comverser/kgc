import { morph, path } from "./emotions.js";

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
