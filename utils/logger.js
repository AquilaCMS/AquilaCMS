/*
 * Product    : AQUILA-CMS
 * Author     : Nextsourcia - contact@aquila-cms.com
 * Copyright  : 2022 © Nextsourcia - All rights reserved.
 * License    : Open Software License (OSL 3.0) - https://opensource.org/licenses/OSL-3.0
 * Disclaimer : Do not edit or add to this file if you wish to upgrade AQUILA CMS to newer versions in the future.
 */

/* eslint-disable prefer-spread */
/* eslint-disable prefer-rest-params */
const winston                      = require('winston');
const {combine, timestamp, printf} = winston.format;
const WinstonDailyRotateFile       = require('winston-daily-rotate-file');

const transports = [];

module.exports = () => {
    if (global.envFile.logs && global.envFile.logs.type && global.envFile.logs.type.console) {
        transports.push(new winston.transports.Console());
    }

    if (global.envFile.logs && global.envFile.logs.type && global.envFile.logs.type.file) {
        transports.push(new WinstonDailyRotateFile({
            level       : 'info',
            filename    : `${global.appRoot}/logs/app.log`,
            datePattern : 'YYYY-MM-DD'
        }));
    }

    // instantiate a new Winston Logger with the settings defined above
    // eslint-disable-next-line new-cap
    const logger = new winston.createLogger({
        format : combine(timestamp(), printf((info) => {
            if (info.stack) {
                return `${info.timestamp} [${info.level}] : ${info.message} ${info.stack}`;
            }
            return `${info.timestamp} [${info.level}] : ${info.message}`;
        })),
        transports,
        exitOnError : false // do not exit on handled exceptions
    });
    // // create a stream object with a 'write' function that will be used by `morgan`
    logger.stream = {
        write(message) {
            // use the 'info' log level so the output will be picked up by both transports (file and console)
            console.log(message.substring(0, message.lastIndexOf('\n')));
        }
    };

    if (global.envFile.logs && global.envFile.logs.override) {
        // https://stackoverflow.com/questions/56097580/override-console-logerror-with-winston-no-longer-working
        // Override the base console log with winston
        console.log   = function () {
            return logger.info.apply(logger, arguments);
        };
        console.error = function () {
            return logger.error.apply(logger, arguments);
        };
        console.info  = function () {
            return logger.info.apply(logger, arguments);
        };
        console.warn  = function () {
            return logger.warn.apply(logger, arguments);
        };
    }
    return logger;
};
