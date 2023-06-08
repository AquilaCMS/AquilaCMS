/*
 * Product    : AQUILA-CMS
 * Author     : Nextsourcia - contact@aquila-cms.com
 * Copyright  : 2023 © Nextsourcia - All rights reserved.
 * License    : Open Software License (OSL 3.0) - https://opensource.org/licenses/OSL-3.0
 * Disclaimer : Do not edit or add to this file if you wish to upgrade AQUILA CMS to newer versions in the future.
 */

const {authentication, adminAuthRight, adminAuth} = require('../middleware/authentication');
const authService                                 = require('../services/auth');
const usersServices                               = require('../services/users');

module.exports = function (app) {
    app.post('/v2/users', adminAuth, getUsers); // not using adminAuthRight('clients') to let the "admin" also have access. Having both 'client' & 'admin' would be perfect
    app.post('/v2/user', authentication, getUser);
    app.post('/v2/user/resetpassword/:lang?', resetpassword);
    app.post('/v2/user/:id', authentication, getUserById);
    app.post('/v2/user/active/account', getUserByAccountToken);
    app.put('/v2/user/addresses', authentication, setUserAddresses);
    app.put('/v2/user', setUser);
    app.delete('/v2/user/:id', adminAuthRight('clients'), deleteUser);
    app.post('/v2/getUserTypes', adminAuthRight('clients'), getUserTypes);
};

/* POST /api/v2/users
 * @summary Users list
 */
async function getUsers(req, res, next) {
    try {
        const PostBodyVerified = await authService.validateUserIsAllowed(req.info, req.body.PostBody, '_id');
        const result           = await usersServices.getUsers(PostBodyVerified);
        return res.json(result);
    } catch (error) {
        return next(error);
    }
}

// {"PostBody":{"filter":{"email": "lookingfor@themail.com"},"structure":"*","limit":1}}
/**
 * POST /api/v2/user
 * @summary User details
 */
async function getUser(req, res, next) {
    try {
        const PostBodyVerified = await authService.validateUserIsAllowed(req.info, req.body.PostBody, '_id');
        const result           = await usersServices.getUser(PostBodyVerified);
        return res.json(result);
    } catch (error) {
        return next(error);
    }
}

/**
 * POST /api/v2/user/{id}
 * @summary Get user by id
 */
async function getUserById(req, res, next) {
    try {
        const PostBodyVerified = await authService.validateUserIsAllowed(req.info, req.body.PostBody, '_id');
        const result           = await usersServices.getUserById(req.params.id, PostBodyVerified);
        return res.json(result);
    } catch (error) {
        return next(error);
    }
}

/**
 * @typedef {object} RequestAccountToken
 * @property {string} activateAccountToken.required - activateAccountToken
 */

/**
 * POST /api/v2/user/active/account
 * @summary Get user by 'Activate Account Token'
 */
async function getUserByAccountToken(req, res, next) {
    try {
        const result = await usersServices.getUserByAccountToken(req.body.activateAccountToken);
        return res.json(result);
    } catch (error) {
        return next(error);
    }
}

/**
 * PUT /api/v2/user
 * @summary Add or update a user
 */
async function setUser(req, res, next) {
    try {
        let isAdmin = false;
        if (req.info) isAdmin = req.info.isAdmin;

        // Edit
        if (req.body._id) {
            req.body     = await authService.validateUserIsAllowedWithoutPostBody(req.info, req.body, '_id');
            const result = await usersServices.setUser(req.body._id, req.body, isAdmin, req.headers.lang);
            return res.json({code: 'USER_UPDATE_SUCCESS', user: result});
        }

        // Create
        const newUser = await usersServices.createUser(req.body, isAdmin);
        return res.status(201).send({user: newUser});
    } catch (error) {
        return next(error);
    }
}

/**
 * PUT /api/v2/user/addresses
 * @summary Update a user's addresses
 */
async function setUserAddresses(req, res, next) {
    try {
        req.body = await authService.validateUserIsAllowedWithoutPostBody(req.info, req.body, 'userId');
        return res.send(await usersServices.setUserAddresses(req.body));
    } catch (error) {
        return next(error);
    }
}

/**
 * DELETE /api/v2/user/{id}
 * @summary Delete a user
 */
async function deleteUser(req, res, next) {
    try {
        const objectStatus = await usersServices.deleteUser(req.params.id);
        res.json(objectStatus);
    } catch (error) {
        return next(error);
    }
}

/**
 * POST /api/v2/getUserTypes
 * @summary Get user types
 */
async function getUserTypes(req, res, next) {
    try {
        const result = await usersServices.getUserTypes(req.body.query);
        return res.json(result);
    } catch (error) {
        return next(error);
    }
}

/**
 * POST /api/v2/user/resetpassword
 * @summary Reset password
 */
async function resetpassword(req, res, next) {
    try {
        const {email, change, token, password, sendMail} = req.body;
        let result;
        if (email && !change) {
            result = await usersServices.generateTokenSendMail(email, req.params.lang || req.body.lang, sendMail);
        /* } else if (email && change) {
            result = await usersServices.changePassword(email, password); */
        } else if (token) {
            result = await usersServices.resetPassword(token, password);
        } else {
            return res.status(500).send({message: 'Aucun token ou adresse e-mail trouvé.'});
        }
        if (result.status) {
            return res.status(result.status).json(result);
        }
        return res.status(200).json(result);
    } catch (error) {
        return next(error);
    }
}
