const winston = require('winston');

const utils = winston.createLogger({
    transports: [
        new winston.transports.Console(),
        new winston.transports.File({filename: 'log'})
    ]
});

//todo create debug log level
const debug = function (message) {
    utils.log({
        level: 'info',
        nivel: 'debug000',
        time: new Date(),
        message: message
    });
}

exports.debug = debug;

const info = function (message) {
    utils.log({
        level: 'info',
        time: new Date(),
        message: message
    });
}

exports.info = info;

const args = process.argv.slice(2);

exports.getUrl = function getUrl() {
    const url = args[0];
    if (url === undefined || url === "") {
        info("Exiting url is not defined in the params");
        process.exit(1);
    }
    info("Working on url: " + url);
    return url;
}

exports.getRtmpUrl = function getRtmpUrl() {
    const rtmpUrl = args[1];
    if (rtmpUrl == null || rtmpUrl === "") {
        info("Exiting, rtmp url is not defined in the params");
        process.exit(1);
    }
    info("Rtmp Url: " + rtmpUrl);
    return rtmpUrl;
}
