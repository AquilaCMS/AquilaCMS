/*
 * Product    : AQUILA-CMS
 * Author     : Nextsourcia - contact@aquila-cms.com
 * Copyright  : 2023 © Nextsourcia - All rights reserved.
 * License    : Open Software License (OSL 3.0) - https://opensource.org/licenses/OSL-3.0
 * Disclaimer : Do not edit or add to this file if you wish to upgrade AQUILA CMS to newer versions in the future.
 */

/*
 * Passport / Authentification
 */
const passportJWT    = require('passport-jwt');
const {aquilaEvents} = require('aql-utils');
const NSErrors       = require('../utils/errors/NSErrors');
const ExtractJwt     = passportJWT.ExtractJwt;
const Strategy       = passportJWT.Strategy;

/** @type {passport.PassportStatic} */
let passport;

/**
 *
 * @Description Definir la strategie jwt
 * @param {passport.PassportStatic} pp
 */
const init = async (pp) => {
    passport       = pp;
    const strategy = new Strategy({
        secretOrKey    : global.aquila.envFile.jwt.secret,
        jwtFromRequest : ExtractJwt.fromAuthHeaderWithScheme('jwt')
    }, async (payload, done) => {
        try {
            const {Users} = require('../orm/models');
            let user      = await Users.findById(payload.userId, '-password');
            if (!user) {
                throw NSErrors.BadLogin;
            }
            user = user.toObject();
            return done(null, {
                type   : 'USER',
                info   : user,
                userId : user._id
            });
        } catch (err) {
            done(err);
        }
    });

    aquilaEvents.emit('passportInit', passport);

    passport.use(strategy);
    passport.session();

    passport.serializeUser(function (user, done) {
        done(null, user);
    });

    passport.deserializeUser(async function (user, done) {
        let error;
        let usr;
        try {
            const {Users} = require('../orm/models');
            usr           = await Users.findOne({_id: user._id});
        } catch (err) {
            error = err;
        }
        done(error, usr);
    });

    return {
        initialize() {
            return passport.initialize();
        },
        getToken(headers) {
            if (headers && headers.authorization) {
                const parted = headers.authorization.split(' ');
                if (parted.length === 2) {
                    return parted[1];
                }
            }
            return null;
        },
        authenticate() {
            return passport.authenticate('jwt', global.aquila.envFile.jwt.session);
        }
    };
};

/**
 * Authenticate
 */
const authenticate = (req, res) => new Promise((resolve, reject) => {
    const _res = res;
    passport.authenticate('jwt', {session: false}, (err, user) => {
        if (err) reject(err);
        else if (!user) _res.clearCookie('jwt');
        resolve(user);
    })(req, res);
});

module.exports = {
    init,
    authenticate
};