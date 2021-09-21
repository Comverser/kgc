const sdpFilterCodec = (kind, codec, realSdp) => {
  let allowed = [];
  let rtxRegex = new RegExp("a=fmtp:(\\d+) apt=(\\d+)\r$");
  let codecRegex = new RegExp("a=rtpmap:([0-9]+) " + escapeRegExp(codec));
  let videoRegex = new RegExp("(m=" + kind + " .*?)( ([0-9]+))*\\s*$");

  let lines = realSdp.split("\n");

  let isKind = false;
  for (let i = 0; i < lines.length; i++) {
    if (lines[i].startsWith("m=" + kind + " ")) {
      isKind = true;
    } else if (lines[i].startsWith("m=")) {
      isKind = false;
    }

    if (isKind) {
      let match = lines[i].match(codecRegex);
      if (match) {
        allowed.push(parseInt(match[1]));
      }

      match = lines[i].match(rtxRegex);
      if (match && allowed.includes(parseInt(match[2]))) {
        allowed.push(parseInt(match[1]));
      }
    }
  }

  let skipRegex = "a=(fmtp|rtcp-fb|rtpmap):([0-9]+)";
  let sdp = "";

  isKind = false;
  for (let i = 0; i < lines.length; i++) {
    if (lines[i].startsWith("m=" + kind + " ")) {
      isKind = true;
    } else if (lines[i].startsWith("m=")) {
      isKind = false;
    }

    if (isKind) {
      let skipMatch = lines[i].match(skipRegex);
      if (skipMatch && !allowed.includes(parseInt(skipMatch[2]))) {
        continue;
      } else if (lines[i].match(videoRegex)) {
        sdp += lines[i].replace(videoRegex, "$1 " + allowed.join(" ")) + "\n";
      } else {
        sdp += lines[i] + "\n";
      }
    } else {
      sdp += lines[i] + "\n";
    }
  }

  return sdp;
};

// private functions
const escapeRegExp = (string) => {
  return string.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"); // $& means the whole matched string
};

export { sdpFilterCodec };
