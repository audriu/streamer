const exec = require('async-child-process').execAsync;
const spawn = require('child_process').spawn;
const stats = require('./stats');
const utils = require('./utils');

let ffmpeg;
exports.inst = function () {return ffmpeg}

// Start new an then kill the old, so we do not loose stream
const restart = (exports.restart = function () {
    utils.info('Killing ffmpeg PID: ' + ffmpeg.pid);
    const old = ffmpeg;
    start();
    try {
        old.stdout.pause();
        old.stdin.pause();
        exec('kill -9 ' + old.pid);
    } catch (error) {
        utils.info('[ERROR] Failed to close ffmpeg..' + error);
        process.exit(1);
    }
});

// Start ffmpeg via spawn
const start = (exports.start = function () {
    utils.info('Initializing FFMPEG with ops:: ' + ops);
    ffmpeg = spawn('ffmpeg', ops, {stdio: ['pipe', 'pipe', 2]});

    ffmpeg.on('error', function (e) {
        utils.info('Child process error' + e);
        restart();
    });

    ffmpeg.on('close', (code, signal) => {
        utils.info('Child process terminated due to receipt of code ' + code + " signal " + signal);
        restart();
    });

    utils.info('FFMPEG started on this PID: ' + ffmpeg.pid);
});

const ops = [
    //"-debug_ts",
    //Input 0: Audio
    '-thread_queue_size',
    '1024',
    '-i',
    utils.getMusicUrl(),
    '-acodec',
    'aac',

    // Input 1: Video
    '-thread_queue_size',
    '1024',
    '-framerate',
    stats.getStats.currentFPS,
    '-i',
    '-',
    '-f',
    'image2pipe',
    '-c:v',
    'libx264',
    '-preset',
    'veryFast',
    '-tune', 'zerolatency',
    '-pix_fmt',
    'yuvj420p',
    //video optimization
    // '-me_method',
    // 'epzs',
    '-threads',
    '4',
    '-g',
    '45',
    '-bf',
    '2',
    '-trellis',
    '2',
    '-cmp',
    '2',
    '-subcmp',
    '2',

    // Output
    // '-async', '1', '-vsync', '1',
    // '-af', 'aresample=async=1000',
    // This is to speed up video 0.5 double speed, 2.0 half as slow
    //'-filter:v', videoSpeed,
    //'-filter:v', 'fps=fps=25',
    //This is to slow down audio, but audio is always good, no need this
    //'-filter:a', 'aresample=async=1', // no effect detected maybe we need buffer. it is causing sometimes to fail
    //'-shortest',
    '-vb',
    '5M',
    '-vf',
    'pp=al',
    '-r',
    stats.getStats.currentFPS,
    '-threads',
    '0',
    //'-f', 'mp4', 'recording.mp4'
    '-c:a',
    'aac',
    '-strict',
    'normal',
    //'-acodec', 'aac', '-strict', 'experimental', '-ab', '48k', '-ac', '2', '-ar', '44100',
    //'-af', 'aresample=async=1',
    '-f',
    'flv',
    utils.getRtmpUrl()
];
