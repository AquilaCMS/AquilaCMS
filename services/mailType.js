/*
 * Product    : AQUILA-CMS
 * Author     : Nextsourcia - contact@aquila-cms.com
 * Copyright  : 2021 © Nextsourcia - All rights reserved.
 * License    : Open Software License (OSL 3.0) - https://opensource.org/licenses/OSL-3.0
 * Disclaimer : Do not edit or add to this file if you wish to upgrade AQUILA CMS to newer versions in the future.
 */

const mongoose   = require('mongoose');
const NSErrors   = require('../utils/errors/NSErrors');
const {MailType} = require('../orm/models');
const utils      = require('../utils/utils');

/**
 * Get the emails
 */
const getMailTypes = async () => {
    const {MailType} = require('../orm/models');
    return MailType.find({}).sort({position: 1});
};

/**
* Get a mailType by _id
 * @param {Express.Request} req
 * @param {Express.Response} res
 * @param {Function} next
 */
const getMailType = async (code) => {
    const {MailType} = require('../orm/models');
    return MailType.findOne({code});
};

/**
 * @description Modify or create a new mail type in the admin
 * @param {Object} body datas to set
 * @param {ObjectId} [_id] if the_id exists then we update otherwise we create (Optional)
 */
const setMailType = async (body, _id = null) => {
    try {
        let result;
        if (_id) {
            // Update
            if (!mongoose.Types.ObjectId.isValid(_id)) {
                throw NSErrors.InvalidObjectIdError;
            }
            if (body.code !== '') {
                await checkUniqueCode(body.code);
            }
            result = await MailType.findByIdAndUpdate(_id, {$set: body}, {new: true, runValidators: true});
            if (!result) {
                throw NSErrors.MailTypeUpdateError;
            }
        } else {
            // Create
            if (body.code !== '') {
                await checkUniqueCode(body.code);
            }
            body.code = utils.slugify(body.code);
            result    = await MailType.create(body);
            if (!result) {
                throw NSErrors.MailTypeCreateError;
            }
        }
        return result;
    } catch (error) {
        if (error.code === 11000) {
            throw NSErrors.MailTypeCodeAlreadyExists;
        }
        if (error.name === 'ValidationError') {
            throw NSErrors.LoginSubscribeEmailInvalid;
        }
        throw error;
    }
};

/**
 * @description An email type has a code (registration, forgotten password, etc.). This code must only belong to one email type
 * If a new "registration" type mail code is created, the old "registration" type mail code will see its type change to "noType" (corresponding to the code of the mailtypes collection)
 * @param {string} type: corresponds to the code of email type
 */
async function checkUniqueCode(code) {
    try {
        const mailTypes = await MailType.find({code});
        // If there is no mail type with this code then we do nothing
        if (!mailTypes.length) {
            return;
        }
        // One or more (case: 'several' should never happen) mail type has this code, we assign these mailType.code = ""
        for (let i = 0; i < mailTypes.length; i++) {
            const result = await MailType.findByIdAndUpdate({_id: mailTypes[i]._id}, {code: ''}, {new: true, runValidators: true});
            if (!result) {
                throw NSErrors.MailTypeUpdateNoCodeError;
            }
        }
    } catch (error) {
        throw NSErrors.MailTypeCreateError;
    }
}

const deleteMailType = async (code) => {
    const {Mail, MailType} = require('../orm/models');
    if (code === '') throw NSErrors.MailTypeCannotDeleteNoType;
    const doc = await MailType.findOneAndRemove({code});
    if (!doc) throw NSErrors.MailTypeNotFound;
    // If the type of mail has been deleted then we put the mails containing this old type to 'noType'
    const mail = await Mail.findOne({type: code});
    if (!mail) return doc;
    mail.type = '';
    await Mail.findByIdAndUpdate(mail._id, {$set: mail}, {new: true, runValidators: true});
    return doc;
};

module.exports = {
    getMailTypes,
    getMailType,
    setMailType,
    deleteMailType
};