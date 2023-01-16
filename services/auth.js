/*
 * Product    : AQUILA-CMS
 * Author     : Nextsourcia - contact@aquila-cms.com
 * Copyright  : 2022 © Nextsourcia - All rights reserved.
 * License    : Open Software License (OSL 3.0) - https://opensource.org/licenses/OSL-3.0
 * Disclaimer : Do not edit or add to this file if you wish to upgrade AQUILA CMS to newer versions in the future.
 */

const {promisify} = require('util');
const jwt         = require('jsonwebtoken');
const NSErrors    = require('../utils/errors/NSErrors');

/**
 * Check if user is authenticate
 * @param {Object} req request
 * @param {Object} res response
 */
const IsAuthenticate = async (req, res) => res.status(200).send({
    code           : 'AUTHENTICATED',
    isAuthenticate : true,
    user           : req.info,
    data           : req.headers.authorization
});

/**
 * Return the decoded token
 * @param {String} token
 * @returns user
 */
const getDecodedToken = (token) => jwt.verify(token.substr(token.indexOf(' ') + 1), global.envFile.jwt.secret);

/**
 * Login user or admin
 */
const login = async (req, res, next) => {
    const {username, password} = req.body;
    try {
        const {Users} = require('../orm/models');
        let user      = await Users.findOne({email: new RegExp(`^${username}$`, 'i')}); // Exact match with case insensitive

        if (!user) throw NSErrors.BadLogin;
        if (req.params.from === 'admin') {
            if (!user.isAdmin) {
                throw NSErrors.Unauthorized;
            }
        } else {
            if (user.isAdmin) {
                throw NSErrors.BadLogin;
            }
        }

        const isMatch = await user.validPassword(password);
        if (!isMatch) {
            throw NSErrors.BadLogin;
        }
        if (!user.isActive) {
            throw NSErrors.DeactivateAccount;
        }

        const loginPassport = promisify(req.logIn);
        await loginPassport(user, {session: false});

        user = user.toObject();
        delete user.password;
        const token = await require('../middleware/authentication').generateJWTToken(res, user, user.isAdmin);

        // Update last login
        await Users.updateOne({_id: user._id}, {$set: {lastConnexion: new Date()}});

        return res.status(200).send({
            code : 'LOGIN_SUCCESS',
            data : token
        });
    } catch (err) {
        return next(err);
    }
};

/**
 * Validate user is allowed with PostBody
 */
const validateUserIsAllowed = async (user, PostBody, field) => {
    if (!user) {
        throw NSErrors.AccessUnauthorized;
    }
    if (user.isAdmin) {
        return PostBody;
    }
    if (!PostBody.filter) {
        PostBody.filter = {};
    }
    PostBody.filter[field] = user._id;
    return PostBody;
};

/**
 * Validate user is allowed without PostBody
 */
const validateUserIsAllowedWithoutPostBody = async (user, query, field) => {
    if (user.isAdmin) return query;
    if (!query) query = {};
    query[field] = user._id;
    return query;
};

/**
 * Validate user is allowed without PostBody for RGPD
 */
const validateUserAuthWithoutPostBody = async (user, id) => {
    if (!user) throw NSErrors.AccessUnauthorized;
    return user.isAdmin ? id : user._id;
};

/**
 * Check if admin
 * @deprecated use `req.info.isAdmin` instead
 */
function isAdmin(req_headers_authorization) {
    if (req_headers_authorization) {
        const userInfo = getDecodedToken(req_headers_authorization);
        if (userInfo && userInfo.info && userInfo.info.isAdmin === true) {
            return true;
        }
    }
    return false;
}

module.exports = {
    validateUserIsAllowed,
    validateUserIsAllowedWithoutPostBody,
    validateUserAuthWithoutPostBody,
    isAdmin,
    IsAuthenticate,
    getDecodedToken,
    login
};