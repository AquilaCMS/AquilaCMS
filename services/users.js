/*
 * Product    : AQUILA-CMS
 * Author     : Nextsourcia - contact@aquila-cms.com
 * Copyright  : 2023 © Nextsourcia - All rights reserved.
 * License    : Open Software License (OSL 3.0) - https://opensource.org/licenses/OSL-3.0
 * Disclaimer : Do not edit or add to this file if you wish to upgrade AQUILA CMS to newer versions in the future.
 */

const crypto                             = require('crypto');
const mongoose                           = require('mongoose');
const {aquilaEvents}                     = require('aql-utils');
const {Users, SetAttributes, Attributes} = require('../orm/models');
const servicesMail                       = require('./mail');
const QueryBuilder                       = require('../utils/QueryBuilder');
const utilsModules                       = require('../utils/modules');
const NSErrors                           = require('../utils/errors/NSErrors');
const modulesUtils                       = require('../utils/modules');

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
const getUsers = async (PostBody) => queryBuilder.find(PostBody, true);

const getUser = async (PostBody) => queryBuilder.findOne(PostBody, true);

const getUserById = async (id, PostBody = {filter: {_id: id}}) => {
    if (PostBody !== null) {
        PostBody.filter._id = id;
    }
    const user = await queryBuilder.findOne(PostBody, true);

    return modulesUtils.modulesLoadFunctions('postGetUserById', {user}, async function () {
        return user;
    });
};

const getUserByAccountToken = async (activateAccountToken) => {
    if (!activateAccountToken) throw NSErrors.Unauthorized;
    const user = await Users.findOneAndUpdate({activateAccountToken}, {$set: {isActiveAccount: true}}, {new: true});
    return {isActiveAccount: user?.isActiveAccount};
};

const setUser = async (id, info, isAdmin) => {
    try {
        const userBase = await Users.findOne({_id: id});
        if (userBase.email && info.email && userBase.email !== info.email) {
            info.isActiveAccount = false;
        }
        if (!isAdmin) {
            // The addresses field cannot be updated (see updateAddresses)
            delete info.addresses;
            // The email field cannot be updated (see updateemail)
            delete info.email;
            delete info.isAdmin;
        }
        /* if (info.attributes) {
            for (let i = 0; i < info.attributes.length; i++) {
                const usrAttr = userBase.attributes.find((attr) => attr.code === info.attributes[i].code);
                if (usrAttr && lang) {
                    info.attributes[i].translation             = usrAttr.translation;
                    info.attributes[i].translation[lang].value = info.attributes[i].value;
                }
            }
        } */
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

const createUser = async (body, isAdmin = false) => utilsModules.modulesLoadFunctions('createUser', {body, isAdmin}, async () => {
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
        if (!body.set_attributes) {
            const defaultSet    = await SetAttributes.findOne({code: 'defautUser'}).populate(['attributes']);
            body.set_attributes = defaultSet._id;
            body.attributes     = defaultSet.attributes.map((attr) => {
                if (attr.default_value) {
                    for (let i = 0; i < Object.keys(attr.translation).length; i++) {
                        const lang =  Object.keys(attr.translation)[i];
                        if (attr.translation[lang].value === undefined) attr.translation[lang].value = attr.default_value;
                    }
                }
                return attr;
            });
        } else {
            for (let i = 0; i < body.attributes.length; i++) {
                const attribute                = await Attributes.findOne({code: body.attributes[i].code});
                body.attributes[i].translation = attribute.translation;
                if (attribute.type) body.attributes[i].type = attribute.type;
                if (attribute.type === 'multiselect') {
                    body.attributes[i].translation[body.lang].values = body.attributes[i].values;
                } else {
                    body.attributes[i].translation[body.lang].value = body.attributes[i].value;
                }
            }
        }
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
    servicesMail.sendRegister(newUser._id, body.lang).catch((err) => {
        console.error(err);
    });
    servicesMail.sendRegisterForAdmin(newUser._id, body.lang).catch((err) => {
        console.error(err);
    });
    aquilaEvents.emit('aqUserCreated', newUser);
    return newUser;
});

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
    const emailRegex     = new RegExp(`^${email}$`, 'i');
    const user           = await Users.findOneAndUpdate({email: emailRegex}, {resetPassToken}, {new: true});
    if (!user) {
        throw NSErrors.NotFound;
    }
    const {appUrl, adminPrefix} = global.aquila.envConfig.environment;
    let link;
    if (user.isAdmin) {
        link = `${appUrl}${adminPrefix}/login`;
    } else {
        link = `${appUrl}resetpass`;
    }
    const tokenlink = `${link}?token=${resetPassToken}`;
    if (sendMail) {
        await servicesMail.sendResetPassword(email, tokenlink, resetPassToken, lang);
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