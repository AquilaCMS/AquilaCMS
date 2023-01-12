/*
 * Product    : AQUILA-CMS
 * Author     : Nextsourcia - contact@aquila-cms.com
 * Copyright  : 2022 © Nextsourcia - All rights reserved.
 * License    : Open Software License (OSL 3.0) - https://opensource.org/licenses/OSL-3.0
 * Disclaimer : Do not edit or add to this file if you wish to upgrade AQUILA CMS to newer versions in the future.
 */

const {
    login,
    IsAuthenticate
}                        = require('../services/auth');
const {
    authentication,
    generateJWTToken
}                        = require('../middleware/authentication');
const {middlewareServer} = require('../middleware');
const NSErrors           = require('../utils/errors/NSErrors');

module.exports = function (app) {
    /**
     * POST /api/v2/auth/login/{from}
     * @summary Authentification
     */
    app.post('/v2/auth/login/:from?', login);
    /**
     * GET /api/v2/auth/isauthenticated
     * @summary Is authentificated
     */
    app.get('/v2/auth/isauthenticated', authentication, IsAuthenticate);
    app.get('/v2/auth/logout', logout);
    app.post('/v2/auth/logout/admin', logoutAdmin);
    app.post('/v2/auth/loginAdminAsClient', authentication, loginAdminAsClient);

    // Deprecied
    app.get('/auth/logout', middlewareServer.deprecatedRoute, logout);
};

/**
 * GET /api/v2/auth/logout
 * @summary Delete the cookie for authentification
 */
const logout = (req, res) => {
    res.clearCookie('jwt');
    res.removeHeader('x-auth-token');
    res.status(204).end();
};

const logoutAdmin = (req, res, next) => {
    try {
        req.logOut();
        return res.status(204).end();
    } catch (err) {
        next(err);
    }
};

const loginAdminAsClient = async (req, res, next) => {
    try {
        const user = await require('../orm/models/users').findOne({_id: req.body._id}, '-password');
        if (!user) {
            throw NSErrors.UserNotFound;
        }

        const logIn = require('util').promisify(req.logIn);
        await logIn(user, {session: false});
        const param = await require('../utils/server').getAppUrl(req);
        if (!param) {
            throw NSErrors.NotFound;
        }
        const token = await generateJWTToken(res, user, user.isAdmin);
        return res.status(200).send({
            code : 'LOGIN_SUCCESS',
            data : token
        });
    } catch (err) {
        return next(err);
    }
};