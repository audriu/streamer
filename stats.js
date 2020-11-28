const logger = require('./utils');

//init vars
const streamStats = {
  second : Math.floor(new Date().getTime() / 1000),
  totalSeconds : 0,
  framesPerSecond : 0,
  totalFramesForFPS: 0,
  currentFPS: 27, // we will start with an empirical middle ground
  framesDeltaForFPS: 0,
  ffmpegRestartSuggested: false,
  ffmpegRestartSuggestedCounter: 0,
  lastKnownDelta: 0,

  // Smoothing algo vars
  firstFrameTime: 0,
  lastFrameReceivedTime: 0,
  currentElapsedTime: 0,
  idealTotalFrames:0,
  totalFramesReceived: 0,
  totalFramesAdded:0,
  ffmpegReady: false
};
exports.getStats = streamStats;


exports.track = function(){
  const now = new Date().getTime();
  streamStats.lastFrameReceivedTime = now;
  const nowInSecond = Math.floor(now / 1000);

  // This will happen only once every
  if (streamStats.second !== nowInSecond ){
      if(streamStats.totalSeconds > 0 ){
          streamStats.framesDeltaForFPS = streamStats.framesReceivedPerSecond - streamStats.currentFPS;
          logger.info("Second: " + streamStats.second + " received " + streamStats.framesReceivedPerSecond + "/" + streamStats.currentFPS + ". Delta: " + streamStats.framesDeltaForFPS + ". Sent to FFMPEG: " + streamStats.totalFramesAddedPerSecond + " ." );
          logger.info("Total Frames Received: " + streamStats.totalFramesReceived + " . Total Time Elapsed: " + streamStats.currentElapsedTime + " . Ideal Total Frames: " + streamStats.idealTotalFrames + " . Current Frames Added: " + streamStats.totalFramesAdded );

      }
      if(streamStats.totalSeconds > 20){
        if (shouldConsiderRestart() && false){
          logger.info("We should be considering restarting ffmpeg as this delta is too consistent..");
          streamStats.currentFPS = streamStats.currentFPS + streamStats.framesDeltaForFPS;
          streamStats.ffmpegRestartSuggested = true;
        }
      }
      streamStats.totalSeconds++;
      streamStats.second = nowInSecond;
      streamStats.framesReceivedPerSecond = 0;
      streamStats.totalFramesAddedPerSecond = 0;
  }

  streamStats.framesReceivedPerSecond++;

  //calculate frames to add now only start adding when we know
  //we are read
  if (streamStats.ffmpegReady){
    // adjust first time
    if(streamStats.firstFrameTime === 0){
      streamStats.firstFrameTime = now;
    }

    streamStats.totalFramesReceived++;
    streamStats.idealFrameDistance = 1000/streamStats.currentFPS;
    streamStats.currentElapsedTime = now - streamStats.firstFrameTime;
    streamStats.idealTotalFrames = Math.floor(streamStats.currentElapsedTime / streamStats.idealFrameDistance) + 1;
    streamStats.framesToAddNow = streamStats.idealTotalFrames - streamStats.totalFramesAdded;
  }
}

exports.frameAdded = function(){
  if(streamStats.firstFrameTime === 0){
    streamStats.firstFrameTime = streamStats.lastFrameReceivedTime;
  }
  streamStats.totalFramesAddedPerSecond++;
  streamStats.totalFramesAdded++;
  streamStats.framesToAddNow--;
}

exports.resetSmoothingAlgoStats = function(){
  streamStats.firstFrameTime= 0;
  streamStats.lastFrameReceivedTime= 0;
  streamStats.currentElapsedTime= 0;
  streamStats.idealTotalFrames=0;
  streamStats.totalFramesReceived= 0;
  streamStats.totalFramesAdded = 0;
  streamStats.ffmpegReady= false;
}

function shouldConsiderRestart(){
  if(streamStats.framesDeltaForFPS === streamStats.lastKnownDelta && streamStats.lastKnownDelta !== 0 ){
  //if(streamStats.framesDeltaForFPS == streamStats.lastKnownDelta ){
      streamStats.ffmpegRestartSuggestedCounter++
  }else{
      streamStats.ffmpegRestartSuggestedCounter = 0;
  }
  streamStats.lastKnownDelta = streamStats.framesDeltaForFPS;

  return streamStats.ffmpegRestartSuggestedCounter > 4;
}
