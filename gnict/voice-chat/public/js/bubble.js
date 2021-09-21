var bubble = document.querySelector("#_bubble");

const _window = window.matchMedia(
  "screen and (max-width: 767px), (orientation: portrait)"
);

const fn_bubble = (_window) => {
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
};

fn_bubble(_window);

_window.addEventListener("change", () => {
  fn_bubble(_window);
});
