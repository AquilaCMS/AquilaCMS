/*
 * Product    : AQUILA-CMS
 * Author     : Nextsourcia - contact@aquila-cms.com
 * Copyright  : 2023 © Nextsourcia - All rights reserved.
 * License    : Open Software License (OSL 3.0) - https://opensource.org/licenses/OSL-3.0
 * Disclaimer : Do not edit or add to this file if you wish to upgrade AQUILA CMS to newer versions in the future.
 */

/* eslint-disable prefer-spread */
/* eslint-disable prefer-rest-params */
const winston     = require('winston');
const WinstonGelf = require('winston-gelf');

const {combine, timestamp, printf} = winston.format;
const WinstonDailyRotateFile       = require('winston-daily-rotate-file');

const transports = [];

module.exports = () => {
    if (global.aquila.envFile?.logs?.type?.console) {
        transports.push(new winston.transports.Console());
    }

    if (global.aquila.envFile?.logs?.type?.file) {
        transports.push(new WinstonDailyRotateFile({
            level       : 'info',
            filename    : `${global.aquila.appRoot}/logs/app.log`,
            datePattern : 'YYYY-MM-DD'
        }));
    }

    if (global.aquila.envFile?.logs?.type?.graylog) {
        const graylogConfig = global.aquila.envFile.logs.config;
        if (!graylogConfig || !graylogConfig.host || !graylogConfig.port) {
            throw new Error('Graylog enable but invalide config config is missing');
        }

        transports.push(new WinstonGelf({
        // You will find all gelfPro options here: https://www.npmjs.com/package/gelf-pro
            gelfPro : {
                fields : {
                    env : process.env.NODE_ENV || 'development'
                },
                adapterName    : 'udp',
                adapterOptions : {
                    host : graylogConfig.host, // Replace per your Graylog domain
                    port : graylogConfig.port
                }
            }
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

    if (global.aquila.envFile?.logs && global.aquila.envFile?.logs?.override) {
        const logStdout = (...args) => {
            const text = args.join('').replaceAll('%s', '');
            process.stdout.write(`${text}\n`);
            return logger.info.call(logger, ...args);
        };

        const logStderr = (...args) => {
            const text = args.join('').replaceAll('%s', '');
            process.stderr.write(`${text}\n`);
            logger.error.call(logger, ...args);
        };

        // https://stackoverflow.com/questions/56097580/override-console-logerror-with-winston-no-longer-working
        // Override the base console log with winston
        console.log   = (...args) => logStdout(...args);
        console.error = (...args) => logStderr(...args);
        console.info  = (...args) => logStdout(...args);
        console.warn  = (...args) => logStdout(...args);
    }
    console.log('Logger initialisé');
    return logger;
};
