import { morph, path } from "./morph.js";

// 로딩화면
const loading = document.querySelector(".loading");
window.onload = loading_out();
function loading_out() {
  loading.setAttribute("style", "display:none");
}

// 표정메뉴: 테스트용 추후 삭제
const toggleBtn = document.querySelector(".btn-toggle");
const menu = document.querySelector(".btn-emotions");

toggleBtn.addEventListener("click", () => {
  console.log("click");
  menu.classList.toggle("active");
});

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

// 입모양 애니메이션
const btn_talk = document.querySelector("#msgBox");
btn_talk.addEventListener("click", (event) => {
  var mouseClassName = document.getElementById("mouse").getAttribute("class");
  if (mouseClassName != "talk") {
    document.getElementById("mouse").setAttribute("class", "talk");
  } else {
    document.getElementById("mouse").setAttribute("class", "mouse");
  }
});

// 글씨크기조절
const btn_fonts = document.querySelectorAll(".btn_font");
const msg = document.querySelector("#msgBox");
var size = "";
for (let btn_font of btn_fonts) {
  btn_font.addEventListener("click", (event) => {
    for (var i = 0; i < btn_fonts.length; i++) {
      btn_fonts[i].classList.remove("clicked");
    }
    size = event.target.id;
    event.target.classList.add("clicked");

    if (size == "big_font") {
      msg.setAttribute("style", "font-size:24pt");
    } else if (size == "small_font") {
      msg.setAttribute("style", "font-size:16pt");
    } else if (size == "normal_font") {
      msg.setAttribute("style", "font-size:20pt");
    }
  });
}

// 메세지: 테스트용
const sample_msg = [
  {
    id: "1",
    text: "Hello! How are you today?",
  },
  {
    id: "2",
    text: "Wow!!!",
  },
  {
    id: "3",
    text: "What?!",
  },
  {
    id: "4",
    text: "Huh...",
  },
  {
    id: "5",
    text: "Um...",
  },
  {
    id: "6",
    text: "Yes!!",
  },
  {
    id: "7",
    text: "Nope!",
  },
  {
    id: "8",
    text: "Oh My God!!!!! What’s going on here?",
  },
  {
    id: "9",
    text: "LOL",
  },
];
function random_msg() {
  let random_num = Math.floor(Math.random() * 10);

  if (sample_msg[random_num] != undefined) {
    msg.innerText = sample_msg[random_num].text;
  }
  return msg;
}
// random_msg();
// setInterval(random_msg, 5000);

//말풍선 꼬리: 반응형 web
const bubble = document.querySelector("#_bubble");
const _window = window.matchMedia(
  "screen and (max-width: 768px) and (orientation: portrait)"
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
