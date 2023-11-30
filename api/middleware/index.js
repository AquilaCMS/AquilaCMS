/*
 * Product    : AQUILA-CMS
 * Author     : Nextsourcia - contact@aquila-cms.com
 * Copyright  : 2023 © Nextsourcia - All rights reserved.
 * License    : Open Software License (OSL 3.0) - https://opensource.org/licenses/OSL-3.0
 * Disclaimer : Do not edit or add to this file if you wish to upgrade AQUILA CMS to newer versions in the future.
 */

const middlewareAuthentication = require('./authentication');
const middlewareCategories     = require('./categories');
const middlewarePassport       = require('./passport');
const middlewareServer         = require('./server');
const middlewareSecurity       = require('./security');
const expressErrorHandler      = require('./expressErrorHandler');

module.exports = {
    middlewareAuthentication,
    middlewarePassport,
    middlewareServer,
    middlewareSecurity,
    middlewareCategories,
    expressErrorHandler
};