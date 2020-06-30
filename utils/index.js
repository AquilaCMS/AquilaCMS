const mongoose          = require('./database').connect;
const logger            = require('./logger');
const captchaValidation = require('./captchaValidation');
const aquilaEvents      = require('./aquilaEvents');
const encryption        = require('./encryption');
const fsp               = require('./fsp');
const modules           = require('./modules');
const npm               = require('./npm');
const packageManager    = require('./packageManager');
const translation       = require('./translation');
const utils             = require('./utils');
const serverUtils       = require('./server');
const QueryBuilder      = require('./QueryBuilder');
const CacheService      = require('./CacheService');
const NSError           = require('./errors/NSError');
const NSErrors          = require('./errors/NSErrors');

module.exports = {
    mongoose,
    logger,
    captchaValidation,
    aquilaEvents,
    encryption,
    fsp,
    modules,
    npm,
    packageManager,
    translation,
    utils,
    serverUtils,
    QueryBuilder,
    CacheService,
    NSError,
    NSErrors
};