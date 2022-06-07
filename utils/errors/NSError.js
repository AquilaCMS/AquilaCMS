/*
 * Product    : AQUILA-CMS
 * Author     : Nextsourcia - contact@aquila-cms.com
 * Copyright  : 2022 © Nextsourcia - All rights reserved.
 * License    : Open Software License (OSL 3.0) - https://opensource.org/licenses/OSL-3.0
 * Disclaimer : Do not edit or add to this file if you wish to upgrade AQUILA CMS to newer versions in the future.
 */

/**
 * Some of the error code specified inside this error class
 * use the WebDav extension define in the RFC4918
 * https://tools.ietf.org/html/rfc4918 who extends the RFC7231
 * defined here : https://tools.ietf.org/html/rfc7231
 */

const inspect = Symbol.for('nodejs.util.inspect.custom');

/**
 * Custom Error class implementation.
 * Do not instantiate directly, create a new entry in NSErrors instead.
 *
 * @class NSError
 * @property {number} this.status HTTP status
 * @property {string} [this.code] Error code
 */
module.exports = class NSError extends Error {
    /**
     * NSError class to generate custom error to work with HTTP
     *
     * @constructor
     * @param {number} status HTTP status
     * @param {string} code Error code
     * @param {string} [message=undefined] Free form optional error message
     * @param {"none" | "error" | "warn" | "info" | "debug"} [level=error] Free form optional error message
     * @param {Object} [datas={}] Free form optional datas
     */
    constructor(status, code, message = '', level = 'error', datas = {}) {
        if (['none', 'error', 'warn', 'info', 'debug'].indexOf(level) === -1) {
            level = 'error';
        }
        Error.stackTraceLimit = 10;

        super(message);
        this.name = 'NSError';

        Error.captureStackTrace(this, NSError);

        Object.defineProperty(this, 'status', {
            value      : status,
            writable   : false,
            enumerable : false
        });

        Object.defineProperty(this, 'code', {
            value      : code,
            writable   : false,
            enumerable : false
        });

        Object.defineProperty(this, 'message', {
            value      : message,
            writable   : true,
            enumerable : false
        });

        Object.defineProperty(this, 'level', {
            value      : level,
            writable   : false,
            enumerable : false
        });

        Object.defineProperty(this, 'datas', {
            value      : datas,
            writable   : true,
            enumerable : false
        });
    }

    details(message) {
        this.message = message;
        return this;
    }

    // override JSON.stringify format to include safe innumerable types
    toJSON() {
        let datas;
        try {
            datas = JSON.parse(this.datas);
        } catch (err) {
            datas = this.datas;
        }
        return {
            status  : this.status,
            code    : this.code,
            message : this.message,
            log     : this.log,
            datas
        };
    }

    /**
     * used by console.log to format an instance
     * @see https://nodejs.org/docs/latest-v10.x/api/util.html#util_util_inspect_custom
     */
    [inspect]() {
        let msg = '';
        if (this.message) {
            msg = `: ${this.message}`;
        }

        // remove the first line from the stack to replace it with a custom format
        let stack = '';
        if (this && this.stack) {
            stack = this.stack.substring(this.stack.indexOf('\n') + 1);
        }

        return `${this.name} [HTTP ${this.status}] ${this.code}${msg}\n${stack}`;
    }
};
