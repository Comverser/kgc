console.log("test.js");

let useDatachannel,
  useAudio,
  useVideo,
  useStun,
  datachannelParameters,
  audioCodec,
  videoCodec,
  videoResolution,
  videoTransform;

fetch("/get-settings")
  .then((res) => res.json())
  .then((answer) => {
    useDatachannel = answer["useDatachannel"];
    useAudio = answer["useAudio"];
    useVideo = answer["useVideo"];
    useStun = answer["useStun"];
    datachannelParameters = answer["datachannelParameters"];
    audioCodec = answer["audioCodec"];
    videoCodec = answer["videoCodec"];
    videoResolution = answer["videoResolution"];
    videoTransform = answer["videoTransform"];
  })
  .then(test)
  .catch(function (e) {
    alert(e);
  });

function test() {
  console.log(useDatachannel);
}
