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
class Logger {
    constructor() {
        this.logger = null;
        this.stream = null;
    }

    init() {
        const transports = [];

        if (global.aquila.envFile?.logs?.type?.console) {
            console.log('Logger console activé');
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
                        env  : process.env.NODE_ENV || 'development',
                        host : graylogConfig.source || 'AquilaCMS'
                    },
                    adapterName    : 'udp',
                    adapterOptions : {
                        host : graylogConfig.host, // Replace per your Graylog domain
                        port : graylogConfig.port
                    }
                }
            }));
        }

        const levels = {
            emerg  : 0,
            alert  : 1,
            crit   : 2,
            error  : 3,
            warn   : 4,
            notice : 5,
            info   : 6,
            debug  : 7
        };

        // instantiate a new Winston Logger with the settings defined above
        // eslint-disable-next-line new-cap
        this.logger = new winston.createLogger({
            levels,
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
        this.stream = {
            write(message) {
                // use the 'info' log level so the output will be picked up by both transports (file and console)
                this.logger.info(message.substring(0, message.lastIndexOf('\n')));
            }
        };

        console.log('Logger initialisé');
    }

    log(level, message) {
        if (!this.logger) {
            this.init();
        }
        if (typeof message !== 'string') {
            message = JSON.stringify(message);
        }
        this.logger.log(level, message);
    }

    emerg(...args) {
        this.log('emerg', ...args);
    }

    alert(...args) {
        this.log('alert', ...args);
    }

    crit(...args) {
        this.log('crit', ...args);
    }

    error(...args) {
        this.log('error', ...args);
    }

    warn(...args) {
        this.log('warn', ...args);
    }

    notice(...args) {
        this.log('notice', ...args);
    }

    info(...args) {
        this.log('info', ...args);
    }

    debug(...args) {
        this.log('debug', ...args);
    }
}

const logger = new Logger();

module.exports = logger;
