import { morph, path } from "./emotions.js";

export const changeEmo = (pEmo = "neutral") => {
  for (let i = 0; i < path.length; i++) {
    if (pEmo == path[i]["id"]) {
      document.getElementById("_face").setAttribute("class", pEmo);
      morph(path[i]);
    }
  }
};

export const mouse_ani = () => {
  var mouseClassName = document.getElementById("mouse").getAttribute("class");

  if (mouseClassName != "talk") {
    document.getElementById("mouse").setAttribute("class", "talk");
  } else {
    document.getElementById("mouse").setAttribute("class", "mouse");
  }
};

export const state_msg = (state) => {
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
};

export const fontControl = () => {
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
};
