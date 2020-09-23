const debug                              = require('debug');
const log                                = debug('aquila:users');
const {authentication, adminAuth}        = require('../middleware/authentication');
const authService                        = require('../services/auth');
const usersServices                      = require('../services/users');

module.exports = function (app) {
    app.post('/v2/users', authentication, adminAuth, getUsers);
    app.post('/v2/user', authentication, getUser);
    app.post('/v2/user/resetpassword/:lang?', resetpassword);
    app.post('/v2/user/:id', authentication, getUserById);
    app.post('/v2/user/active/account', getUserByAccountToken);
    app.put('/v2/user/addresses', authentication, setUserAddresses);
    app.put('/v2/user', setUser);
    app.put('/v2/user/admin', authentication, adminAuth, setUser);
    app.delete('/v2/user/:id', authentication, adminAuth, deleteUser);
    app.post('/v2/getUserTypes', authentication, getUserTypes);
};

/**
 * @api {post} /v2/users Users listing
 * @apiName getUsers
 * @apiGroup Users
 * @apiVersion 2.0.0
 * @apiDescription Get listing of users
 * @apiUse headerAuth
 * @apiUse param_PostBody
 * @apiParamExample {js} Example usage:
Get all 10 first users matching "lookingforname" with default structure
{"PostBody": {"filter": {"$or": [{"firstname": {"$regex": "lookingforname","$options": "i"}},{"lastname": {"$regex": "lookingforname","$options": "i"}}]},"limit": 10}}
 * @apiUse UserSchemaDefault
 * @apiUse ErrorPostBody
 */
async function getUsers(req, res, next) {
    try {
        log('- getUsers - ', 'call');
        const PostBodyVerified = await authService.validateUserIsAllowed(req.headers.authorization, req.baseUrl, req.body.PostBody, '_id');
        log('- getUsers - ', PostBodyVerified);
        const result           = await usersServices.getUsers(PostBodyVerified);
        log('- getUsers - ', result);
        return res.json(result);
    } catch (error) {
        log('- getUsers - ', error);
        return next(error);
    }
}

/**
 * @api {post} /v2/user User details
 * @apiName getUser
 * @apiGroup Users
 * @apiVersion 2.0.0
 * @apiDescription Get one user
 * @apiUse headerAuth
 * @apiUse param_PostBody
 * @apiParamExample {js} Example usage:
Get the user matching "lookingfor@themail.com" with full structure
{"PostBody":{"filter":{"email": "lookingfor@themail.com"},"structure":"*","limit":1}}
 * @apiUse UserSchema
 * @apiUse UserAddressSchema
 * @apiUse ErrorPostBody
 */
async function getUser(req, res, next) {
    try {
        log('- getUser - ', 'call');
        const PostBodyVerified = await authService.validateUserIsAllowed(req.headers.authorization, req.baseUrl, req.body.PostBody, '_id');
        log('- getUser - ', PostBodyVerified);
        const result           = await usersServices.getUser(PostBodyVerified);
        log('- getUser - ', result);
        return res.json(result);
    } catch (error) {
        log('- getUser - ', error);
        return next(error);
    }
}

/**
 * POST /api/v2/user/{id}
 * @tags User
 * @summary Fonction retournant un utilisateur
 * @param {string} authorization.headers - authorization
 * @param {PostBody} request.bod.required - PostBody
 * @param {string} id.path.required - user id
 * @return {UserSchema} 200 - success
 */
async function getUserById(req, res, next) {
    try {
        log('- getUserById - ', 'call');
        const PostBodyVerified = await authService.validateUserIsAllowed(req.headers.authorization, req.baseUrl, req.body.PostBody, '_id');
        log('- getUserById - ', PostBodyVerified);
        const result           = await usersServices.getUserById(req.params.id, PostBodyVerified);
        log('- getUserById - ', result);
        return res.json(result);
    } catch (error) {
        log('- getUserById - ', error);
        return next(error);
    }
}

/**
 * @typedef {object} RequestAccountToken
 * @property {string} activateAccountToken.required - activateAccountToken
 */

/**
 * POST /api/v2/user/active/account
 * @tags User
 * @summary Fonction retournant un utilisateur en fonction de son token d'activation
 * @param {RequestAccountToken} request.body - activateAccountToken
 * @return {UserSchema} 200 - response success
 */
async function getUserByAccountToken(req, res, next) {
    try {
        log('- getUserByAccountToken - ', 'call');
        const result = await usersServices.getUserByAccountToken(req.body.activateAccountToken);
        log('- getUserByAccountToken - ', result);
        return res.json(result);
    } catch (error) {
        log('- getUserByAccountToken - ', error);
        return next(error);
    }
}

/**
 * PUT /api/v2/user
 * @tags User
 * @summary Fonction pour ajouter ou mettre à jour un utilisateur
 */
async function setUser(req, res, next) {
    let isAdmin = false;
    try {
        log('- setUser - ', {isAdmin, authorization: req.headers.authorization});
        if (req.headers && req.headers.authorization) {
            const user = authService.getDecodedToken(req.headers.authorization);
            if (user) {
                isAdmin = user.info.isAdmin ? user.info.isAdmin : false;
            } else {
                return res.json({code: 'NOT_AUTHENTICATED', isAuthenticated: false});
            }
        }

        // Edit
        if (req.body._id) {
            const result  = await usersServices.setUser(req.body._id, req.body, isAdmin);
            return res.json({code: 'USER_UPDATE_SUCCESS', user: result});
        }

        // Create
        const newUser = await usersServices.createUser(req.body, isAdmin);
        log('- setUser - ', newUser);
        return res.status(201).send({user: newUser});
    } catch (error) {
        log('- setUser - ', error);
        return next(error);
    }
}

/**
 * PUT /api/v2/user/addresses
 * @tags User
 * @summary Fonction pour mettre à jour les adresses d'un utilisateur
 */
async function setUserAddresses(req, res, next) {
    try {
        return res.send(await usersServices.setUserAddresses(req.body));
    } catch (error) {
        return next(error);
    }
}

/**
 * DELETE /api/v2/user/{id}
 * @tags User
 * @summary Fonction supprimant un utilisateur
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
 * @tags User
 * @summary Fonction retournant les types d'users
 */
async function getUserTypes(req, res, next) {
    try {
        log('- getUserTypes - ', req.body);
        const result = await usersServices.getUserTypes(req.body.query);
        log('- getUserTypes - ', result);
        return res.json(result);
    } catch (error) {
        log('- getUserTypes - ', error);
        return next(error);
    }
}

/**
 * PUT /api/v2/user/resetpassword
 * @tags User
 * @summary Reset password
 * @param {oneOf|TokenSendMail|changePassword|resetPassword} request.body parameter - success | example | {
 * "email": "testmail@gmail.com",
 * "lang": "fr"
 * }
 */
async function resetpassword(req, res, next) {
    try {
        const {email, change, token, password} = req.body;
        log('- resetpassword - ', {email, change, token, password});
        let result;
        if (email && !change) {
            result = await usersServices.generateTokenSendMail(email, req.params.lang || req.body.lang);
            log('- resetpassword - ', 'result :', result);
        } else if (email && change) {
            result = await usersServices.changePassword(email, password);
            log('- resetpassword - ', 'result :', result);
        } else if (token) {
            result = await usersServices.resetPassword(token, password);
            log('- resetpassword - ', 'result :', result);
        } else {
            log('- resetpassword - ', 'Aucun token ou adresse e-mail trouvé.');
            return res.status(500).send({message: 'Aucun token ou adresse e-mail trouvé.'});
        }
        if (result.status) {
            return res.status(result.status).json(result);
        }
        return res.status(200).json(result);
    } catch (error) {
        log('- resetpassword - ', error);
        return next(error);
    }
}
