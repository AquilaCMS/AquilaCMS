/*
 * Product    : AQUILA-CMS
 * Author     : Nextsourcia - contact@aquila-cms.com
 * Copyright  : 2021 © Nextsourcia - All rights reserved.
 * License    : Open Software License (OSL 3.0) - https://opensource.org/licenses/OSL-3.0
 * Disclaimer : Do not edit or add to this file if you wish to upgrade AQUILA CMS to newer versions in the future.
 */

const crypto       = require('crypto');
const mongoose     = require('mongoose');
const {Users}      = require('../orm/models');
const servicesMail = require('./mail');
const QueryBuilder = require('../utils/QueryBuilder');
const aquilaEvents = require('../utils/aquilaEvents');
const NSErrors     = require('../utils/errors/NSErrors');

const restrictedFields = ['password'];
const defaultFields    = ['_id', 'firstname', 'lastname', 'email'];
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
    return queryBuilder.findOne(PostBody);
};

const getUserByAccountToken = async (activateAccountToken) => {
    return Users.findOneAndUpdate({activateAccountToken}, {$set: {isActiveAccount: true}}, {new: true});
};

const setUser = async (id, info, isAdmin = false) => {
    try {
        if (!isAdmin) {
            // The addresses field cannot be updated (see updateAddresses)
            delete info.addresses;
            // The email field cannot be updated (see updateemail)
            delete info.email;
            delete info.isAdmin;
        }
        const userBase = await Users.findOne({_id: id});
        if (userBase.email !== info.email) {
            info.isActiveAccount = false;
        }
        if (info.birthDate) info.birthDate = new Date(info.birthDate);
        const userUpdated = await Users.findOneAndUpdate({_id: id}, info, {new: true});
        if (!userUpdated) throw NSErrors.UpdateUserInvalid;
        aquilaEvents.emit('aqUserUpdated', userUpdated);
        return userUpdated;
    } catch (err) {
        if (err.keyPattern && err.keyPattern.email) {
            throw NSErrors.LoginSubscribeEmailExisting;
        }
        throw err;
    }
};

const setUserAddresses = async (body) => {
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

    aquilaEvents.emit('aqUserUpdated', userUpdated);
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

    const user = await Users.findOne({email: new RegExp(['^', body.email, '$'].join(''), 'i')});
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
    try {
        await servicesMail.sendRegister(newUser._id, body.lang);
    } catch (err) {
        console.error(err);
    }
    try {
        await servicesMail.sendRegisterForAdmin(newUser._id, body.lang);
    } catch (err) {
        // No need to catch this error
    }
    aquilaEvents.emit('aqUserCreated', newUser);
    return newUser;
};

const deleteUser = async (id) => {
    const query = {_id: id};
    // Checks if the _id is valid
    if (!mongoose.Types.ObjectId.isValid(query._id)) {
        throw NSErrors.InvalidObjectIdError;
    }
    const user = await Users.findOne(query);
    if (!user) {
        throw NSErrors.UserNotFound;
    }
    const isRemoved = await Users.deleteOne(query);
    return {status: !!isRemoved.ok};
};

const getUserTypes = async (query) => {
    const result = await Users.find({type: {$regex: query, $options: 'i'}}, {type: 1}).lean();
    if (!result) throw NSErrors.NotFound;
    return result.filter((obj, pos, arr) => arr.map((mapObj) => mapObj.type).indexOf(obj.type) === pos);
};
/**
 * Allows to generate a token to send to the customer to reset his password
 * @param {*} email customer's email
 * @param {*} lang customer's language
 * @see https://github.com/Automattic/mongoose/issues/7984 can't use updateOne
 */
const generateTokenSendMail = async (email, lang, sendMail = true) => {
    const resetPassToken = crypto.randomBytes(26).toString('hex');
    const user           = await Users.findOneAndUpdate({email}, {resetPassToken}, {new: true});
    if (!user) {
        throw NSErrors.NotFound;
    }
    const {appUrl, adminPrefix} = global.envConfig.environment;
    let link;
    if (user.isAdmin) {
        link = `${appUrl}${adminPrefix}/login`;
    } else {
        link = `${appUrl}resetpass`;
    }
    const tokenlink = `${link}?token=${resetPassToken}`;
    if (sendMail) {
        await servicesMail.sendResetPassword(email, tokenlink, lang);
    }
    return {message: email};
};

/**
 * @deprecated
 */
const changePassword = async (email, password) => {
    console.error('changePassword is deprecated !');
    const user = await Users.findOne({email});
    if (!user) {
        return {message: 'Utilisateur introuvable, impossible de réinitialiser le mot de passe.', status: 500};
    }
    try {
        user.password = password;
        await user.save();
        await Users.updateOne({_id: user._id}, {$unset: {resetPassToken: 1}});
        // await Users.updateOne({_id: user._id}, {password, $unset: {resetPassToken: 1}}, {runValidators: true});
    } catch (err) {
        if (err.errors && err.errors.password && err.errors.password.message === 'FORMAT_PASSWORD') {
            throw NSErrors.LoginSubscribePasswordInvalid;
        }
        if (err.errors && err.errors.email && err.errors.email.message === 'BAD_EMAIL_FORMAT') {
            throw NSErrors.LoginSubscribeEmailInvalid;
        }
        throw err;
    }
    return {message: 'Mot de passe réinitialisé.'};
};

/**
 * Allows to change the password if the token is valid and the password meets the criteria
 * @param {*} token password reset token
 * @param {*} password new password
 * @see https://github.com/Automattic/mongoose/issues/7984 can't use updateOne
 */
const resetPassword = async (token, password) => {
    const user = await Users.findOne({resetPassToken: token});
    if (password === undefined) {
        if (user) {
            return {message: 'Token valide'};
        }
        return {message: 'Token invalide'};
    }

    if (user) {
        try {
            user.password = password;
            user.needHash = true;
            await user.save();
            await Users.updateOne({_id: user._id}, {$unset: {resetPassToken: 1}});
            return {message: 'Mot de passe réinitialisé.'};
        } catch (err) {
            if (err.errors && err.errors.password && err.errors.password.message === 'FORMAT_PASSWORD') {
                throw NSErrors.LoginSubscribePasswordInvalid;
            }
            if (err.errors && err.errors.email && err.errors.email.message === 'BAD_EMAIL_FORMAT') {
                throw NSErrors.LoginSubscribeEmailInvalid;
            }
            throw err;
        }
    }
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