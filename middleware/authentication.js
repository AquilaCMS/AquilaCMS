/*
 * Product    : AQUILA-CMS
 * Author     : Nextsourcia - contact@aquila-cms.com
 * Copyright  : 2021 © Nextsourcia - All rights reserved.
 * License    : Open Software License (OSL 3.0) - https://opensource.org/licenses/OSL-3.0
 * Disclaimer : Do not edit or add to this file if you wish to upgrade AQUILA CMS to newer versions in the future.
 */

const jwt               = require('jsonwebtoken');
const NSErrors          = require('../utils/errors/NSErrors');
const {authenticate}    = require('./passport');
const {getDecodedToken} = require('../services/auth');

const retrieveUser = async (req, res, next) => {
    try {
        if (req.headers.authorization) {
            const decoded = getDecodedToken(req.headers.authorization);
            if (decoded) {
                if (decoded.type === 'USER') {
                    try {
                        const user = await authenticate(req, res);
                        req.info   = user.info;
                    } catch (err) {
                        return next(err);
                    }
                }
                if (decoded.type === 'GUEST') {
                    req.info = decoded;
                }
            }
        }
        return next();
    } catch (err) {
        next(err);
    }
};

/**
 * Authentication
 */
const authentication = async (req, res, next) => {
    try {
        if (!req.info) throw NSErrors.Unauthorized;
        next();
    } catch (err) {
        res.clearCookie('jwt');
        return next(err);
    }
};

/**
 * middleware admin route
 * @param {Express.Request} req
 * @param {Express.Response} res
 * @param {Function} next
 */
const adminAuth = async (req, res, next) => {
    if (!req.info || !!req.info.isAdmin === false) {
        return next(NSErrors.Unauthorized);
    }
    next();
};

/**
 *
 * @param {Express.Response} res
 * @param {any} user
 * @param {boolean} isAdmin
 */
const generateJWTToken = (res, user, isAdmin) => {
    // Ne pas mettre trop de propriétés dans le token pour ne pas dépasser les limites du header
    let token = jwt.sign({
        type   : 'USER',
        userId : user._id,
        info   : {
            _id             : user._id,
            email           : user.email,
            isAdmin         : user.isAdmin,
            active          : user.active,
            type            : user.type,
            taxDisplay      : user.taxDisplay,
            isActiveAccount : user.isActiveAccount
        }
    },
    global.envFile.jwt.secret,
    {expiresIn: 172800 /* 48 hours in second */});
    token     = `JWT ${token}`;

    if (!isAdmin) {
        const currentDate = new Date();
        currentDate.setDate(currentDate.getDate() + 2);
        res.cookie('jwt', token, {
            expires  : currentDate,
            httpOnly : false,
            encode   : String,
            secure   : !!global.isServerSecure
        });
    }

    return token;
};

module.exports = {
    retrieveUser,
    authentication,
    adminAuth,
    generateJWTToken
};