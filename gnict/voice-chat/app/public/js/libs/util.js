let startTime, endTime;

const elapsedStart = () => {
  startTime = performance.now();
};

const elapsedEnd = () => {
  endTime = performance.now();
  var timeDiff = endTime - startTime; //in ms
  // strip the ms
  timeDiff /= 1000;

  // get seconds
  var seconds = Math.round(timeDiff);
  console.log(seconds + " seconds");
};

export { elapsedStart, elapsedEnd };
