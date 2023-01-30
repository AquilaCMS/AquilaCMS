/*
 * Product    : AQUILA-CMS
 * Author     : Nextsourcia - contact@aquila-cms.com
 * Copyright  : 2023 © Nextsourcia - All rights reserved.
 * License    : Open Software License (OSL 3.0) - https://opensource.org/licenses/OSL-3.0
 * Disclaimer : Do not edit or add to this file if you wish to upgrade AQUILA CMS to newer versions in the future.
 */

const mongoose   = require('mongoose');
const NSErrors   = require('../utils/errors/NSErrors');
const {MailType} = require('../orm/models');

/**
 * Get the emails
 */
const getMailTypes = async () => MailType.find({}).sort({position: 1}).lean();

/**
* Get a mailType by code
 * @param {String} code
 * @param {Object} MailType
 */
const getMailType = async (code) => MailType.findOne({code}).lean();

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
            result = await MailType.findByIdAndUpdate(_id, {$set: body}, {new: true, runValidators: true});
            if (!result) {
                throw NSErrors.MailTypeUpdateError;
            }
        } else {
            // Create
            result = await MailType.create(body);
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

const deleteMailType = async (code, removeInMailRef = true) => {
    const {Mail, MailType} = require('../orm/models');
    if (code === '') throw NSErrors.MailTypeCannotDeleteNoType;
    const doc = await MailType.findOneAndRemove({code});
    if (!doc) throw NSErrors.MailTypeNotFound;
    // If the type of mail has been deleted then we put the mails containing this old type to 'noType'
    const mail = await Mail.findOne({type: code});
    if (!mail) return doc;
    mail.type = '';
    if (removeInMailRef) await Mail.findByIdAndUpdate(mail._id, {$set: mail}, {new: true, runValidators: true});
    return doc;
};

module.exports = {
    getMailTypes,
    getMailType,
    setMailType,
    deleteMailType
};