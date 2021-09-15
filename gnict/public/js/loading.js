const loading = document.querySelector(".loading");

function loading_out() {
  loading.setAttribute("style", "display:none");
}

window.onload = loading_out();
