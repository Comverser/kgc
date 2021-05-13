const btn1 = document.querySelector("#btn1");
const btn2 = document.querySelector("#btn2");
const btn3 = document.querySelector("#btn3");

const circle =
  "M299.231 52.2563C367.573 120.598 367.573 231.402 299.231 299.744C230.889 368.085 120.085 368.085 51.7437 299.744C-16.5981 231.402 -16.5981 120.598 51.7437 52.2563C120.085 -16.0854 230.889 -16.0854 299.231 52.2563Z";
const rect =
  "M349 0.999991C349 137.834 349 235.415 349 351C253.921 351 115.328 351 -0.999991 351C-0.999991 259.456 -0.999991 126.52 -0.999991 0.999991C89.8722 0.999991 244.729 0.999991 349 0.999991Z";

let pathEyes;

btn1.addEventListener("click", () => {
  console.log("btn1");
  anime({
    targets: "path.face",
    fill: "#CACA50",
    d: [
      {
        value: circle,
      },
    ],
    easing: "easeOutQuad",
    duration: 1000,
  });
  console.log("test:", pathEyes);
  if (pathEyes) {
    pathEyes.play();
  } else {
    pathEyes = anime({
      targets: "path.eyes",
      d: [
        {
          value:
            "M77 18.5C77 28.7173 59.763 37 38.5 37C17.237 37 0 28.7173 0 18.5C0 8.28273 17.237 0 38.5 0C59.763 0 77 8.28273 77 18.5Z",
          value:
            "M77 9.49999C77 19.7173 60.263 17 39 17C17.737 17 0 19.7173 0 9.49999C0 -0.717275 17.737 0.499999 39 0.499999C60.263 0.499999 77 -0.717275 77 9.49999Z",
        },
      ],

      easing: "easeInExpo",
      duration: 300,
      delay: 1500,
      direction: "alternate",
      loop: true,
    });
  }
});

btn2.addEventListener("click", () => {
  console.log("btn2");
  if (pathEyes) {
    pathEyes.pause();
  }

  anime({
    targets: "path.face",
    fill: "#D7D70A",
    d: [
      {
        value: circle,
      },
    ],
    easing: "easeInExpo",
    duration: 1000,
  });
  anime({
    targets: "path.eyes",
    d: [
      {
        value:
          "M77 27.0451C77 37.2623 60.263 8 39 8C17.737 8 0 37.2623 0 27.0451C0 16.8278 17.737 0 39 0C60.263 0 77 16.8278 77 27.0451Z",
      },
    ],
    easing: "easeInExpo",
    duration: 1000,
    loop: false,
  });
});

btn3.addEventListener("click", () => {
  console.log("btn3");
  if (pathEyes) {
    pathEyes.pause();
  }

  anime({
    targets: "path.face",
    fill: "#A1A10A",
    d: [
      {
        value: rect,
      },
    ],
    easing: "easeInExpo",
    duration: 1000,
  });
  anime({
    targets: "path.eyes",
    d: [
      {
        value:
          "M77 3.04509C77 13.2624 60.263 23.5 39 23.5C17.737 23.5 0 13.2624 0 3.04509C0 -7.17217 17.737 16 39 16C60.263 16 77 -7.17217 77 3.04509Z",
      },
    ],
    easing: "easeInExpo",
    duration: 1000,
    loop: false,
  });
});
