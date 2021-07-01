function morph(emotion) {
  const time = 1000;

  const timeline0 = anime.timeline({
    duration: time,
    easing: "easeOutExpo",
  });

  timeline0.add({
    targets: ".face",
    fill: [{ value: emotion.face }],
  });

  const timeline1 = anime.timeline({
    duration: time,
    easing: "easeOutExpo",
  });

  timeline1.add({
    targets: ".r_eye",
    d: [{ value: emotion.r_eye }],
  });

  const timeline2 = anime.timeline({
    duration: time,
    easing: "easeOutExpo",
  });

  timeline2.add({
    targets: ".l_eye",
    d: [{ value: emotion.l_eye }],
  });

  const timeline3 = anime.timeline({
    duration: time,
    easing: "easeOutExpo",
  });

  timeline3.add({
    targets: ".r_eyebrow",
    d: [{ value: emotion.r_eyebrow }],
  });

  const timeline4 = anime.timeline({
    duration: time,
    easing: "easeOutExpo",
  });

  timeline4.add({
    targets: ".l_eyebrow",
    d: [{ value: emotion.l_eyebrow }],
  });

  var mouse_color = "";

  if (emotion.id == "anger") {
    mouse_color = "#000";
  } else {
    mouse_color = "#FF3D3D";
  }

  const timeline5 = anime.timeline({
    duration: time,
    easing: "easeOutExpo",
  });

  timeline5.add({
    targets: ".mouse",
    d: [{ value: emotion.mouse }],
    fill: [{ value: mouse_color }],
  });

  anime
    .timeline({
      duration: 200,
    })
    .add({
      begin: function () {
        if (emotion.id != "sadness") {
          document.querySelector(".option_sad1").style.display = "none";
          document.querySelector(".option_sad2").style.display = "none";
        }
      },
      complete: function () {
        if (emotion.id == "sadness") {
          document.querySelector(".option_sad1").style.display = "block";
          document.querySelector(".option_sad2").style.display = "block";
        }
      },
    });

  anime
    .timeline({
      duration: 200,
    })
    .add({
      begin: function () {
        if (emotion.id != "fear") {
          document.querySelector(".option_fear1").style.display = "none";
          document.querySelector(".option_fear2").style.display = "none";
        }
      },
      complete: function () {
        if (emotion.id == "fear") {
          document.querySelector(".option_fear1").style.display = "block";
          document.querySelector(".option_fear2").style.display = "block";
        }
      },
    });

  anime
    .timeline({
      duration: 300,
    })
    .add({
      begin: function () {
        if (emotion.id != "disgust") {
          document.querySelector(".option_disgust").style.display = "none";
        }
      },
      complete: function () {
        if (emotion.id == "disgust") {
          document.querySelector(".option_disgust").style.display = "block";
        }
      },
    });
}

export { morph };
