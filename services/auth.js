/*
 * Product    : AQUILA-CMS
 * Author     : Nextsourcia - contact@aquila-cms.com
 * Copyright  : 2021 © Nextsourcia - All rights reserved.
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
const IsAuthenticate = async (req, res) => {
    return res.status(200).send({
        code           : 'AUTHENTICATED',
        isAuthenticate : true,
        user           : req.info,
        data           : req.headers.authorization
    });
};

/**
 * Return the decoded token
 * @param {String} token
 * @returns utilisateur
 */
const getDecodedToken = (token) => {
    return jwt.decode(token.substr(token.indexOf(' ') + 1));
};

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
            if (!user.isAdmin) throw NSErrors.Unauthorized;
        }

        const isMatch = await user.validPassword(password);
        if (!isMatch) throw NSErrors.BadLogin;

        if (!user.isActive) {
            throw NSErrors.DesactivateAccount;
        }

        const loginPassport = promisify(req.logIn);
        await loginPassport(user, {session: false});

        user = user.toObject();
        delete user.password;
        const token = require('../middleware/authentication').generateJWTToken(res, user, user.isAdmin);

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
const validateUserIsAllowed = async (token, baseUrl, PostBody, field) => {
    try {
        if (!token) {
            throw NSErrors.AccessUnauthorized;
        }
        const decoded = getDecodedToken(token);
        if (decoded.info.isAdmin) {
            return PostBody;
        }
        if (!PostBody.filter) {
            PostBody.filter = {};
        }
        PostBody.filter[field] = decoded.userId;
        return PostBody;
    } catch (error) {
        throw NSErrors.AccessUnauthorized;
    }
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
const validateUserAuthWithoutPostBody = async (token, id) => {
    try {
        if (!token) {
            throw NSErrors.AccessUnauthorized;
        }
        const decoded = getDecodedToken(token);
        if (decoded.info.isAdmin) {
            return id;
        }
        return decoded.userId;
    } catch (error) {
        throw NSErrors.AccessUnauthorized;
    }
};

/**
 * Check if admin
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