const useDatachannel = document.getElementById("use-datachannel");
const useAudio = document.getElementById("use-audio");
const useVideo = document.getElementById("use-video");
const useStun = document.getElementById("use-stun");

const datachannelParameters = document.getElementById("datachannel-parameters");
const audioCodec = document.getElementById("audio-codec");
const videoCodec = document.getElementById("video-codec");
const videoResolution = document.getElementById("video-resolution");
const videoTransform = document.getElementById("video-transform");

function start() {
  fetch("/settings", {
    method: "POST",
    body: JSON.stringify({
      useDatachannel: useDatachannel.checked,
      useAudio: useAudio.checked,
      useVideo: useVideo.checked,
      useStun: useStun.checked,
      datachannelParameters: datachannelParameters.value,
      audioCodec: audioCodec.value,
      videoCodec: videoCodec.value,
      videoResolution: videoResolution.value,
      videoTransform: videoTransform.value,
    }),
    headers: {
      "Content-Type": "application/json",
    },
  })
    .then((res) => {
      return res.json();
    })
    .then((answer) => console.log(answer))
    .catch(function (e) {
      alert(e);
    });
}
