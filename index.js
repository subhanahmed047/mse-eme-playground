var video = document.querySelector("video");
var assetURL = "frag_bunny.mp4";
var mimeCodec = 'video/mp4; codecs="avc1.42E01E, mp4a.40.2"';
var totalSegments = 5;
var segmentLength = 0;
var segmentDuration = 0;
var bytesFetched = 0;
var requestedSegments = [];

for (var i = 0; i < totalSegments; ++i) {
  requestedSegments[i] = false;
}
var mediaSource = null;
if ("MediaSource" in window && MediaSource.isTypeSupported(mimeCodec)) {
  mediaSource = new MediaSource();
  // create a mediaSource and attach it to the video element to be filled later
  video.src = URL.createObjectURL(mediaSource);
  mediaSource.addEventListener("sourceopen", sourceOpen); // sourceopen is triggered when the media element and is ready for the souceBuffers to be appended
} else {
  console.error("Unsupported MIME type or codec: ", mimeCodec);
}

var sourceBuffer = null;

function sourceOpen() {
  sourceBuffer = mediaSource.addSourceBuffer(mimeCodec);
  getFileLength(assetURL)
    .then(function (fileLength) {
      console.log((fileLength / 1024 / 1024).toFixed(2), "MB");
      segmentLength = Math.round(fileLength / totalSegments);
      requestedSegments[0] = true;
      console.log("Source Buffer created", {
        totalSegments: totalSegments,
        segmentLength,
        fileLength,
      });
      return fetchRange(assetURL, 0, segmentLength);
    })
    .then(appendSegment)
    .then(function () {
      video.addEventListener("timeupdate", checkBuffer);
      return new Promise(function (resolve) {
        video.addEventListener("canplay", function () {
          segmentDuration = video.duration / totalSegments;
          video.play();
          resolve();
        });
      });
    })
    .then(function () {
      video.addEventListener("seeking", seek);
    })
    .catch(function (error) {
      console.error("An error occurred:", error);
    });
}
function getFileLength(url) {
  return new Promise(function (resolve, reject) {
    var xhr = new XMLHttpRequest();
    xhr.open("head", url);
    xhr.onload = function () {
      resolve(xhr.getResponseHeader("content-length"));
    };
    xhr.onerror = function () {
      reject(xhr.statusText);
    };
    xhr.send();
  });
}

function fetchRange(url, start, end) {
  return new Promise(function (resolve, reject) {
    var xhr = new XMLHttpRequest();
    xhr.open("get", url);
    xhr.responseType = "arraybuffer";
    xhr.setRequestHeader("Range", "bytes=" + start + "-" + end);
    xhr.onload = function () {
      console.log("Fetched bytes:", start, "-", end);
      bytesFetched += end - start + 1;
      resolve(xhr.response);
    };
    xhr.onerror = function () {
      reject(xhr.statusText);
    };
    xhr.send();
  });
}

function appendSegment(chunk) {
  return new Promise(function (resolve, reject) {
    // sourceBuffer.addEventListener("updateend", function (e) {
    //   var currentSegment = getCurrentSegment() + 1 || 1;
    //   if (currentSegment <= totalSegments) {
    //     console.log(
    //       `${currentSegment}/${totalSegments} segments appended`
    //     );
    //   }
    //   resolve();
    // });
    sourceBuffer.addEventListener("error", function () {
      reject("Error occurred while appending the segment.");
    });
    sourceBuffer.appendBuffer(chunk);
    var buffered = sourceBuffer.buffered;
    if (buffered.length > 0) {
      console.log("buffer appended, Active Buffers", {
        start: buffered.start(0),
        end: buffered.end(0),
        length: buffered.length,
      });
    }
    // var currentSegment = getCurrentSegment() + 1 || 1;
    // if (currentSegment <= totalSegments) {
    //   console.log(
    //     ""
    //       .concat(currentSegment, "/")
    //       .concat(totalSegments, " segments appended")
    //   );
    // }
    // console.log("removing the first 2 seconds from the source buffer", {
    //   bufferBefore: getTotalBufferedSeconds(),
    // });
    // setTimeout(function () {
    //   // adding a timeout because right after the append, the source buffer's updating flag is still true
    //   // for testing, removing a tiny bit of a buffer when we have enough content buffered
    //   if (!sourceBuffer.updating && currentSegment === 2) {
    //     sourceBuffer.remove(1, 2);
    //     console.log(
    //       "successfully removed the first 2 seconds from the source buffer",
    //       {
    //         bufferAfter: getTotalBufferedSeconds(),
    //       }
    //     );
    //   }
    // }, 1000);
    resolve();
    sourceBuffer.removeEventListener("updateend", function () {});
  });
}

function getTotalBufferedSeconds() {
  var totalSeconds = 0;
  for (var i = 0; i < sourceBuffer.buffered.length; i++) {
    var start = sourceBuffer.buffered.start(i);
    var end = sourceBuffer.buffered.end(i);
    totalSeconds += end - start;
  }
  return totalSeconds;
}

function checkBuffer() {
  var currentSegment = getCurrentSegment();
  if (currentSegment === totalSegments && haveAllSegments()) {
    console.log("Last segment", mediaSource.readyState);
    mediaSource.endOfStream();
    video.removeEventListener("timeupdate", checkBuffer);
  } else if (shouldFetchNextSegment(currentSegment)) {
    requestedSegments[currentSegment] = true;
    console.log("Time to fetch next chunk", video.currentTime);
    fetchRange(assetURL, bytesFetched, bytesFetched + segmentLength)
      .then(appendSegment)
      .catch(function (error) {
        console.error("An error occurred:", error);
      });
  }
}

function seek() {
  console.log("Seeking:", video.currentTime);
  if (mediaSource.readyState === "open") {
    // stop any ongoing append or remove operations
    sourceBuffer.abort();
    console.log(mediaSource.readyState);
  } else {
    console.log("Seek but not open?");
    console.log(mediaSource.readyState);
  }
}

function getCurrentSegment() {
  return Math.floor(video.currentTime / segmentDuration) + 1;
}

function haveAllSegments() {
  return requestedSegments.every(function (val) {
    return !!val;
  });
}

function shouldFetchNextSegment(currentSegment) {
  return (
    video.currentTime > segmentDuration * currentSegment * 0.8 &&
    !requestedSegments[currentSegment]
  );
}
