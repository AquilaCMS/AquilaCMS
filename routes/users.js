const debug                              = require('debug');
const log                                = debug('aquila:users');
const crypto                             = require('crypto');
const {middlewareServer}                 = require('../middleware');
const {authentication, adminAuth}        = require('../middleware/authentication');
const authService                        = require('../services/auth');
const {Users, Orders, Cart, Newsletters} = require('../orm/models');
const usersServices                      = require('../services/users');
const mailService                        = require('../services/mail');
const NSErrors                           = require('../utils/errors/NSErrors');

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

    // Deprecated
    app.post('/users/update', middlewareServer.deprecatedRoute, authentication, update);
    app.put('/users/addresses', middlewareServer.deprecatedRoute, authentication, updateAddresses);
    app.get('/client/:id', middlewareServer.deprecatedRoute, authentication, view);
    app.get('/client/partial/:page/:limit', middlewareServer.deprecatedRoute, authentication, getPartialList);
    app.get('/client/admin/:start/:limit', middlewareServer.deprecatedRoute, authentication, getAdminList);
    app.put('/client/admin/new', middlewareServer.deprecatedRoute, authentication, createAdmin);
    app.delete('/client/admin/:id', middlewareServer.deprecatedRoute, authentication, removeAdmin);
    app.delete('/client/:id', middlewareServer.deprecatedRoute, authentication, removeClient);
    app.post('/users/resetpassword/:lang?', middlewareServer.deprecatedRoute, resetpassword);
    app.post('/users/:lang?', middlewareServer.deprecatedRoute, save);
};

/**
 * Fonction retournant un listing d'utilisateur
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
 * Fonction retournant un utilisateur en fonction du PostBody
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
 * Fonction retournant un utilisateur
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
 * Fonction retournant un utilisateur en fonction de son token d'activation
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
 * Fonction pour ajouter ou mettre à jour un utilisateur
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
 * Fonction pour mettre à jour les adresses d'un utilisateur
 */
async function setUserAddresses(req, res, next) {
    try {
        return res.send(await usersServices.setUserAddresses(req.body));
    } catch (error) {
        return next(error);
    }
}

/**
 * Fonction supprimant un utilisateur
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
 * Fonction retournant les types d'users
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
// gerard.lecloerec@nextsourcia.com
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

//= ====================================================================
//= ========================== Deprecated ==============================
//= ====================================================================

/**
 *
 * @param {Express.Request} req
 * @param {Express.Response} res
 * @param {Function} next
 * @deprecated
 */
async function createAdmin(req, res, next) {
    const newData    = req.body;
    newData.password = Math.random().toString(36).slice(-8);
    const newUser    = new Users(newData);
    try {
        await newUser.save();
        await usersServices.generateTokenSendMail(newData.email, req.params.lang);
        return res.json({status: true});
    } catch (err) {
        return next(err);
    }
}

/**
 *
 * @param {Express.Request} req
 * @param {Express.Response} res
 * @param {Function} next
 * @deprecated
 */
function removeAdmin(req, res, next) {
    const query = {_id: req.params.id};

    Users.findOne(query, (err, user) => {
        if (err) {
            return next(err);
        }

        req.user = user;
        req.user.remove((err) => {
            if (err) {
                return next(err);
                // msg = {status: false};
            }

            const msg = {status: true};

            res.json(msg);
        });
    });
}

/**
 *
 * @param {Express.Request} req
 * @param {Express.Response} res
 * @param {Function} next
 * @deprecated
 */
async function updateAddresses(req, res, next) {
    try {
        const {addresses, delivery_address, billing_address, userId} = req.body;
        if (delivery_address > -1 && !addresses[delivery_address]) {
            return res.status(400).send({code: 'NOT_VALID_ADDRESS', message: "L'adresse de livraison est invalide."});
        }
        if (billing_address > -1 && !addresses[billing_address]) {
            return res.status(400).send({code: 'NOT_VALID_ADDRESS', message: "L'adresse de facturation est invalide."});
        }
        const user = await Users.findOneAndUpdate({_id: userId}, {addresses, delivery_address, billing_address}, {new: true});
        if (!user) throw NSErrors.UserNotFound;
        return res.send(user);
    } catch (err) {
        next(err);
    }
}

/**
 *
 * @param {Express.Request} req
 * @param {Express.Response} res
 * @param {Function} next
 * @deprecated
 */
async function view(req, res, next) {
    try {
        const user = await Users.findOne({_id: req.params.id}).populate('set_attributes');
        res.json(user);
    } catch (err) {
        return next(err);
    }
}

/**
 *
 * @param {Express.Request} req
 * @param {Express.Response} res
 * @param {Function} next
 * @deprecated
 */
async function save(req, res, next) {
    let user = null;
    let fromAdmin = false;
    if (req.headers && req.headers.authorization) {
        user = authService.getDecodedToken(req.headers.authorization);
        const {referer} = req.headers;
        const {isAdmin} = user.info;
        // On un admin a ajouté un nouveau client dans le backoffice
        if ((referer.endsWith('admin/') || referer.endsWith('admin')) && isAdmin) {
            fromAdmin = true;
        }
    }
    const newData = req.body;
    // eslint-disable-next-line no-useless-escape
    if (newData.email === undefined || !new RegExp(/^(([^<>()\[\]\.,;:\s@\"]+(\.[^<>()\[\]\.,;:\s@\"]+)*)|(\".+\"))@(([^<>()[\]\.,;:\s@\"]+\.)+[^<>()[\]\.,;:\s@\"]{2,})$/i).test(newData.email)) {
        return res.status(400).send({message: "L'adresse email n'est pas valide."});
    }

    // if (!utils.validatePassword(newData.password)) {
    //     return res.status(400).send({message: 'Le mot de passe doit contenir au minimum 6 caractères, dont une minuscule, une majuscule et un chiffre.'});
    // }

    if ((typeof newData.activateAccountToken === 'undefined' || newData.activateAccountToken === '')) {
        const activateAccountToken = crypto.randomBytes(26).toString('hex');
        newData.activateAccountToken = activateAccountToken;
        newData.isActiveAccount = false;
    }/* else {
        // Sinon on met le compte a actif
        newData.isActiveAccount = true;
    } */

    // if (req.session.campaign) {
    //     newData.campaign = req.session.campaign;
    // }

    newData.isAdmin = false;

    try {
        const user = await Users.findOne({email: {$regex: newData.email, $options: 'i'}});

        if (user) {
            if (req.body._id) {
                await Users.updateOne({_id: req.body._id.toString()}, {$set: req.body}, {
                    runValidators : true
                });
                return res.json(req.body);
            }
            throw NSErrors.LoginSubscribeEmailExisting;
        }

        const newUser = new Users(newData);
        await newUser.save();

        try {
            await mailService.sendRegister(newUser._id, req.params.lang);
            if (fromAdmin) {
                await usersServices.generateTokenSendMail(newUser.email, req.params.lang);
            }
        } catch (error) {
            return next(error);
        }

        return res.send(newUser);
    } catch (e) {
        next(e);
    }
}

/**
 *
 * @param {Express.Request} req
 * @param {Express.Response} res
 * @param {Function} next
 * @deprecated
 */
async function update(req, res, next) {
    const data = req.body;

    try {
        const oldUser = await Users.findOne({_id: data._id});
        const existingUser = await Users.findOne({email: data.email});

        if (existingUser != null && existingUser._id.toString() !== data._id.toString() && existingUser.email === data.email) {
            res.status(403).send({msg: "Cet email est déjà utilisé, merci d'en choisir un autre"});
        } else {
            delete data.isAdmin;
            if (data.type === '') {
                delete data.type;
            }

            await Users.updateOne({_id: data._id}, data);

            if (oldUser.email !== data.email) {
                await Orders.updateMany({'customer.email': oldUser.email}, {$set: {'customer.email': data.email}});
                await Cart.updateMany({'customer.email': oldUser.email}, {$set: {'customer.email': data.email}});
                await Newsletters.updateMany({email: oldUser.email}, {$set: {email: data.email}});
            }

            res.send();
        }
    } catch (err) {
        return next(err);
    }
}

/**
 *
 * @param {Express.Request} req
 * @param {Express.Response} res
 * @param {Function} next
 * @deprecated
 */
async function getPartialList(req, res, next) {
    const query = req.query;
    query.isAdmin = false;
    if (query.email) {
        query.email = new RegExp(query.email, 'i');
    }

    try {
        const results = await getUsersAndCount(query, {
            skip  : (req.params.page - 1) * req.params.limit,
            limit : parseInt(req.params.limit, 10)
        });
        return res.json({list: results[0], count: results[1]});
    } catch (err) {
        return next(err);
    }
}

/**
 *
 * @param {Express.Request} req
 * @param {Express.Response} res
 * @param {Function} next
 * @deprecated
 */
async function getAdminList(req, res, next) {
    try {
        const users = await Users.find(
            {isAdmin: true},
            null,
            {skip: parseInt(req.params.start, 10), limit: parseInt(req.params.limit, 10)}
        ).sort('_id');
        return res.json(users);
    } catch (err) {
        return next(err);
    }
}

/**
 *
 * @param {Express.Request} req
 * @param {Express.Response} res
 * @param {Function} next
 * @deprecated
 */
const removeClient = async (req, res, next) => {
    try {
        await Orders.deleteMany({
            $or : [
                {status: 'FINISHED'},
                {status: 'CANCELED'},
                {status: 'RETURNED'}
            ],
            _id_user : req.params.id
        });

        await Users.deleteOne({_id: req.params.id});
        return res.status(200).end();
    } catch (err) {
        return next(err);
    }
};

/**
 *
 * @param {*} query
 * @param {*} params
 * @deprecated
 */
const getUsersAndCount = async (query, params) => {
    return Promise.all([
        Users.find(query, null, params),
        Users.countDocuments(query)
    ]);
};