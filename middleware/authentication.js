const jwt               = require('jsonwebtoken');
const NSErrors          = require('../utils/errors/NSErrors');
const {authenticate}    = require('./passport');
const {getDecodedToken} = require('../services/auth');

/**
 * Authentication
 */
const authentication = async (req, res, next) => {
    try {
        if (!req.headers.authorization) {
            if (!next) {
                throw NSErrors.MissingHeaderAuthorize;
            }
            return next(NSErrors.MissingHeaderAuthorize);
        }
        const decoded = getDecodedToken(req.headers.authorization);
        if (!decoded) return next(NSErrors.Unauthorized);

        if (decoded.type === 'USER') {
            const user = await authenticate(req, res);
            req.info   = user.info;
            if (!next) return;
            return next();
        }
        if (decoded.type === 'GUEST') {
            req.info = decoded;
            if (!next) return;
            return next();
        }
        throw NSErrors.Unauthorized;
    } catch (err) {
        res.clearCookie('jwt');
        if (!next) throw err;
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

const generateJWTToken = (res, user, isAdmin) => {
    // Ne pas mettre trop de propriétés dans le token pour ne pas dépasser les limites du header
    let token = jwt.sign({type   : 'USER',
        userId : user._id,
        info   : {
            _id             : user._id,
            email           : user.email,
            isAdmin         : user.isAdmin,
            active          : user.active,
            type            : user.type,
            taxDisplay      : user.taxDisplay,
            isActiveAccount : user.isActiveAccount
        }}, global.envFile.jwt.secret, {
        expiresIn : 172800 // 48 hours in second
    });
    token     = `JWT ${token}`;

    if (!isAdmin) {
        const currentDate = new Date();
        currentDate.setDate(currentDate.getDate() + 2);
        res.cookie('jwt', token, {expires: currentDate, httpOnly: false, encode: String});
    }

    return token;
};

module.exports = {
    authentication,
    adminAuth,
    generateJWTToken
};