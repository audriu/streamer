const ChromeRemoteInterface = require('chrome-remote-interface');
const chromeLauncher = require('chrome-launcher');
const exec = require('async-child-process').execAsync;
const ffmpeg = require('./ffmpeg-launcher');
const stats = require('./stats');
const utils = require('./utils');

let Page;

start = async function () {
    utils.info('Started new stream PID: ' + process.pid);

    const chrome = await chromeLauncher.launch({
        startingUrl: utils.getUrl(),
        chromeFlags: ['--window-size=1920,1080', '--headless', '--disable-gpu', '--no-sandbox']
    });
    utils.info('Chrome started on pid: ' + chrome.pid);

    //Init remote interface
    utils.info('Initialize Remote Interface on port: ' + chrome.port);
    const remoteInterface = await ChromeRemoteInterface({port: chrome.port});

    remoteInterface.on('Page.screencastFrame', onScreencastFrame);

    //Init Page and Runtime protocols from remote interface
    Page = remoteInterface.Page;
    const Runtime = remoteInterface.Runtime;
    await Promise.all([Page.enable(), Runtime.enable()]);

    //Load page
    utils.info('Loading page: ' + utils.getUrl());
    await Page.navigate({url: utils.getUrl()});

    ffmpeg.start();

    // Wait for window.onload before start streaming.
    await Page.loadEventFired(async () => {
        utils.info('Page.loadEventFired onload fired');
        await exec('sleep 3');

        //Start capturing frames
        utils.info('Starting capturing screen frames..');
        await Page.startScreencast({
            format: 'jpeg',
            quality: 100
            //everyNthFrame: 1
        })
    });
    process.on('exit', () => {
        exec('kill -9 ' + ffmpeg.inst().pid);
        chrome.kill;
    });
}

let lastRestartDateTime = 0;

function onScreencastFrame(event) {
    Page.screencastFrameAck({sessionId: event.sessionId}).catch(err => {
        utils.info('onScreencastAck: ', err);
    });

    //start by updating stats
    stats.track();

    if (ffmpeg.inst() == null) return;

    // dropping this frame this is too many frames for this second
    if (stats.getStats.framesToAddNow === 0) return;

    // //if ffmpeg restart recommended do it now if possible or wait until 10 seconds later
    const nextRestart = lastRestartDateTime + 10000; //10 seconds later
    const newRestartDateTime = new Date().getTime();
    if (stats.getStats.ffmpegRestartSuggested && nextRestart < newRestartDateTime) {
        lastRestartDateTime = newRestartDateTime;
        stats.getStats.ffmpegRestartSuggested = false;
        stats.getStats.ffmpegRestartSuggestedCounter = 0;
        stats.resetSmoothingAlgoStats();

        ffmpeg.restart();
        return;
    }

    if (ffmpeg.inst() && ffmpeg.inst().stdin) {
        stats.getStats.ffmpegReady = true;
        const lastImage = new Buffer(event.data, 'base64');
        while (stats.getStats.framesToAddNow > 0) {
            ffmpeg.inst().stdin.write(lastImage);
            stats.getStats.framesDeltaForFPS++;
            stats.frameAdded();
        }
    }
}

start();