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