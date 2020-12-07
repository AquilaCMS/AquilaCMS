const mongodb      = require('mongodb');
const NSError      = require('../utils/errors/NSError');
const NSErrors     = require('../utils/errors/NSErrors');
const errorMessage = require('../utils/translate/errors');

const mongoErrorCodeToNsError = {
    11000 : NSErrors.Conflict
};

const log = (err) => {
    if (err instanceof NSError && err.level !== 'none') {
        console[err.level](err);
    } else if (!(err instanceof NSError)) {
        console.error(err);
    }
};

/**
 * return an new object of an error object
 * @param {Error | NSError} value error object
 */
const replaceErrors = (value) => {
    if (value instanceof Error || value instanceof NSError) {
        const error   = {};
        const ignored = ['stack'];
        Object.getOwnPropertyNames(value).forEach(function (key) {
            if (ignored.indexOf(key) === -1) {
                error[key] = value[key];
            }
        });
        return error;
    }
    return value;
};

/**
 *
 * @param {Express.Response} res response
 * @param {{} | NSError} err error sent to client
 */
const sendError = (res, err) => res.status(err.status).json(replaceErrors(err));

/**
 * get correct message for each Errors
 * @param {{} | NSError} err error
 * @param {string} lang language of message error
 * @return {string} original error message or message translation
 */
const applyTranslation = (err, lang) => {
    if (err.translations && Object.keys(err.translations).length > 0) {
        if (err.translations[lang]) {
            return err.translations[lang];
        }
        if (err.translations.en) {
            return err.translations[lang];
        }
        return err.translations[Object.keys(err.translations)[0]];
    }
    return err.message;
};

/**
 * middleware express to handler error
 * @param {Error | NSError | {}} err error
 * @param {Express.Request} req request
 * @param {Express.Response} res response
 * @param {Function} next next
 */
const expressErrorHandler = (err, req, res, next) => {
    if (err) {
        if (!err.status) err.status = 500;
        if (err instanceof NSError && err.level !== 'none') {
            console[err.level](`"${req.method} ${req.originalUrl} HTTP/${req.httpVersion}"
                ${err.status} - "${req.protocol}://${req.get('host')}${req.originalUrl}"`);
        } else if (!(err instanceof NSError)) {
            console.error(`"${req.method} ${req.originalUrl} HTTP/${req.httpVersion}"
                ${err.status} - "${req.protocol}://${req.get('host')}${req.originalUrl}"`);
        }

        let lang = 'en';
        if (req.headers && req.headers.lang) lang = req.headers.lang;
        else if (req.query && req.query.lang) lang = req.query.lang;
        else if (req.body && req.body.lang) lang = req.body.lang;
        else if (global.defaultLang) lang = global.defaultLang;

        if (err instanceof mongodb.MongoError) {
            log(err);
            const knownError = mongoErrorCodeToNsError[err.code];
            if (knownError) err = knownError;
            err.message = errorMessage[err.code] ? errorMessage[err.code][lang] : '';
        } else if (err instanceof NSError) {
            err.message = errorMessage[err.code] ? errorMessage[err.code][lang] : '';
            log(err);
        } else if (err instanceof Object && !(err instanceof Error)) {
            err.message = applyTranslation(err, lang);
            delete err.translations;
            if (!err.message) err = NSErrors.InternalError;
            log(err);
        } else if (err instanceof Object && err instanceof Error) {
            err.message = applyTranslation(err, lang);
            delete err.translations;
            log(err);
        }

        return sendError(res, err);
    }
    return next();
};

module.exports = expressErrorHandler;