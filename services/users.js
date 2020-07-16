const debug            = require('debug');
const log              = debug('aquila:users');
const crypto           = require('crypto');
const mongoose         = require('mongoose');
const {Users}          = require("../orm/models");
const servicesMail     = require("./mail");
const QueryBuilder     = require('../utils/QueryBuilder');
const aquilaEvents     = require("../utils/aquilaEvents");
const NSErrors         = require("../utils/errors/NSErrors");

const restrictedFields = ["_slug"];
const defaultFields    = ["_id", "firstname", "lastname", "email"];
const queryBuilder     = new QueryBuilder(Users, restrictedFields, defaultFields);

/**
 * get all users filter by PostBody
 * @param {Object} PostBody PostBody
 * @param {Object} [PostBody.limit] limit
 * @param {Object} [PostBody.skip] skip
 * @param {Object} [PostBody.filter] filter
 * @param {Object} [PostBody.populate] populate
 * @param {Object} [PostBody.sort] sort
 * @param {Object} [PostBody.structure] structure
 */
const getUsers = async (PostBody) => {
    return queryBuilder.find(PostBody);
};

const getUser = async (PostBody) => {
    return queryBuilder.findOne(PostBody);
};

const getUserById = async (id, PostBody = {filter: {_id: id}}) => {
    if (PostBody !== null) {
        PostBody.filter._id = id;
    }
    log("- getUserById - ", id, PostBody);
    return queryBuilder.findOne(PostBody);
};

const getUserByAccountToken = async (activateAccountToken) => {
    return Users.findOneAndUpdate({activateAccountToken}, {$set: {isActiveAccount: true}}, {new: true});
};

const setUser = async (id, info, isAdmin = false) => {
    try {
        if (!isAdmin) {
            // On ne peut pas mettre à jour le champ addresses (voir updateAddresses)
            delete info.addresses;
            // On ne peut pas mettre à jour le champ email (voir updateemail)
            delete info.email;
            delete info.isAdmin;
        }
        if (info.birthDate) info.birthDate = new Date(info.birthDate);
        log("- setUser - ", {id, info, isAdmin});
        const userUpdated = await Users.findOneAndUpdate({_id: id}, info, {new: true});
        if (!userUpdated) throw NSErrors.UpdateUserInvalid;
        log("- setUser - ", userUpdated);
        log("- setUser - ", "emit:aqUserUpdated");
        aquilaEvents.emit("aqUserUpdated", userUpdated);
        return userUpdated;
    } catch (err) {
        log("- setUser - ", err);
        if (err.keyPattern && err.keyPattern.email) {
            throw NSErrors.LoginSubscribeEmailExisting;
        }
        throw err;
    }
};

const setUserAddresses = async (body) => {
    log("- setUserAddresses - ", body);
    if (body.delivery_address && !body.addresses[body.delivery_address]) {
        throw NSErrors.AddressDeliveryInvalid;
    }
    if (body.billing_address && !body.addresses[body.billing_address]) {
        throw NSErrors.AddressBillingInvalid;
    }

    const userUpdated = await Users.findOneAndUpdate(
        {_id: body.userId},
        {
            addresses        : body.addresses,
            delivery_address : body.delivery_address,
            billing_address  : body.billing_address
        },
        {new: true}
    );
    if (!userUpdated) throw NSErrors.UpdateUserInvalid;

    log("- setUserAddresses - ", userUpdated);
    aquilaEvents.emit("aqUserUpdated", userUpdated);
    return userUpdated;
};

const createUser = async (body, isAdmin = false) => {
    // Control password
    body.activateAccountToken = crypto.randomBytes(26).toString('hex');
    body.isActiveAccount      = false;

    // Control Addresses
    if (!body.billing_address) {
        body.billing_address = 0;
    }
    if (!body.delivery_address) {
        body.delivery_address = 0;
    }
    if (!isAdmin) body.isAdmin = false;
    log("- createUser - ", {body, isAdmin});

    const user = await Users.findOne({email: new RegExp(["^", body.email, "$"].join(""), "i")});
    log("- createUser - ", user);
    if (user) {
        throw NSErrors.UserAlreadyExist;
    }
    let newUser;
    try {
        newUser = await (new Users(body)).save();
    } catch (err) {
        if (err.errors && err.errors.password && err.errors.password.message === 'FORMAT_PASSWORD') {
            throw NSErrors.LoginSubscribePasswordInvalid;
        }
        if (err.errors && err.errors.email && err.errors.email.message === 'BAD_EMAIL_FORMAT') {
            throw NSErrors.LoginSubscribeEmailInvalid;
        }
        throw err;
    }
    log("- createUser - ", newUser);
    try {
        log("- createUser - ", "sendRegisterMail");
        await servicesMail.sendRegister(newUser._id, body.lang);
    } catch (err) {
        console.error(err);
    }
    try {
        log("- createUser - ", "sendRegisterMailForAdmin");
        await servicesMail.sendRegisterForAdmin(newUser._id, body.lang);
    } catch (err) {
        // No need to catch this error
    }
    log("- createUser - ", "emit:aqUserCreated");
    aquilaEvents.emit("aqUserCreated", newUser);
    return newUser;
};

const deleteUser = async (id) => {
    const query = {_id: id};
    log("- deleteUser - ", query);
    // On verifie si l'_id est valide
    if (!mongoose.Types.ObjectId.isValid(query._id)) {
        throw NSErrors.InvalidObjectIdError;
    }
    const user = await Users.findOne(query);
    log("- deleteUser - ", user);
    if (!user) {
        throw NSErrors.UserNotFound;
    }
    const isRemoved = await Users.deleteOne(query);
    log("- deleteUser - ", {status: !!isRemoved.ok});
    return {status: !!isRemoved.ok};
};

const getUserTypes = async (query) => {
    const result = await Users.find({type: {$regex: query, $options: "i"}}, {type: 1}).lean();
    if (!result) throw NSErrors.NotFound;
    return result.filter((obj, pos, arr) => arr.map((mapObj) => mapObj.type).indexOf(obj.type) === pos);
};
/**
 * Permet de generer un token a envoyer au client afin de réinitialiser son mot de passe
 * @param {*} email email du client
 * @param {*} lang lang du client
 * @see https://github.com/Automattic/mongoose/issues/7984 can't use updateOne
 */
const generateTokenSendMail = async (email, lang) => {
    const resetPassToken = crypto.randomBytes(26).toString('hex');
    log("- generateTokenSendMail - ", resetPassToken);
    const user           = await Users.findOneAndUpdate({email}, {resetPassToken}, {new: true});
    log("- generateTokenSendMail - ", user);
    if (!user) {
        throw NSErrors.NotFound;
    }
    const {appUrl}  = global.envConfig.environment;
    const tokenlink = `${appUrl + (global.envFile.front === 'react' ? '' : '#/')}resetpass?token=${resetPassToken}`;

    log("- generateTokenSendMail - ", tokenlink);
    await servicesMail.sendResetPassword(email, tokenlink, lang);
    log("- generateTokenSendMail - ", {message: email});
    return {message: email};
};

const changePassword = async (email, password) => {
    const user = await Users.findOne({email});
    if (!user) {
        return {message: 'Utilisateur introuvable, impossible de réinitialiser le mot de passe.', status: 500};
    }
    try {
        user.password = password;
        log("- changePassword - ", user);
        await user.save();
        await Users.updateOne({_id: user._id}, {$unset: {resetPassToken: 1}});
        // await Users.updateOne({_id: user._id}, {password, $unset: {resetPassToken: 1}}, {runValidators: true});
    } catch (err) {
        log("- changePassword - ", err);
        if (err.errors && err.errors.password && err.errors.password.message === 'FORMAT_PASSWORD') {
            throw NSErrors.LoginSubscribePasswordInvalid;
        }
        if (err.errors && err.errors.email && err.errors.email.message === 'BAD_EMAIL_FORMAT') {
            throw NSErrors.LoginSubscribeEmailInvalid;
        }
        throw err;
    }
    log("- changePassword - ", {message: 'Mot de passe réinitialisé.'});
    return {message: 'Mot de passe réinitialisé.'};
};

/**
 * Permet de changer le password si le token est valide et que le password réponds aux critéres
 * @param {*} token token de réinitialisation de mot de passe
 * @param {*} password nouveau mot de passe
 * @see https://github.com/Automattic/mongoose/issues/7984 can't use updateOne
 */
const resetPassword = async (token, password) => {
    const user = await Users.findOne({resetPassToken: token});
    log("- resetPassword - ", {password, user});
    if (password === undefined && user) return {message: 'Token valide'};
    if (password === undefined && !user) return {message: 'Token invalide'};

    if (user) {
        try {
            user.password = password;
            await user.save();
            await Users.updateOne({_id: user._id}, {$unset: {resetPassToken: 1}});
            // await Users.updateOne({_id: user._id}, {$set: {password}, $unset: {resetPassToken: 1}}, {
            //     runValidators : true
            // });
            log('- resetPassword - ', 'password reset successfully');
            return {message: 'Mot de passe réinitialisé.'};
        } catch (err) {
            log('- resetPassword - ', err);
            if (err.errors && err.errors.password && err.errors.password.message === 'FORMAT_PASSWORD') {
                throw NSErrors.LoginSubscribePasswordInvalid;
            }
            if (err.errors && err.errors.email && err.errors.email.message === 'BAD_EMAIL_FORMAT') {
                throw NSErrors.LoginSubscribeEmailInvalid;
            }
            throw err;
        }
    }
    log("- resetPassword - ", 'Utilisateur introuvable, impossible de réinitialiser le mot de passe.');
    return {message: 'Utilisateur introuvable, impossible de réinitialiser le mot de passe.', status: 500};
};

module.exports = {
    getUsers,
    getUser,
    getUserById,
    getUserByAccountToken,
    setUser,
    setUserAddresses,
    createUser,
    deleteUser,
    getUserTypes,
    generateTokenSendMail,
    changePassword,
    resetPassword
};