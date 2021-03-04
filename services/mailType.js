/*
 * Product    : AQUILA-CMS
 * Author     : Nextsourcia - contact@aquila-cms.com
 * Copyright  : 2021 © Nextsourcia - All rights reserved.
 * License    : Open Software License (OSL 3.0) - https://opensource.org/licenses/OSL-3.0
 * Disclaimer : Do not edit or add to this file if you wish to upgrade AQUILA CMS to newer versions in the future.
 */

const NSErrors = require('../utils/errors/NSErrors');

/**
 * On récupére les mails
 */
const getMailTypes = async () => {
    const {MailType} = require('../orm/models');
    return MailType.find({}).sort({position: 1});
};

/**
* Permet de récupérer un mailType en fonction de son _id
 * @param {Express.Request} req
 * @param {Express.Response} res
 * @param {Function} next
 */
const getMailType = async (code) => {
    const {MailType} = require('../orm/models');
    return MailType.findOne({code});
};

const deleteMailType = async (code) => {
    const {Mail, MailType} = require('../orm/models');
    if (code === '') throw NSErrors.MailTypeCannotDeleteNoType;
    const doc = await MailType.findOneAndRemove({code});
    if (!doc) throw NSErrors.MailTypeNotFound;
    // Si le type de mail a été supprimé alors on met les mails contenant cet ancien type à 'noType'
    const mail = await Mail.findOne({type: code});
    if (!mail) return doc;
    mail.type = '';
    await Mail.findByIdAndUpdate(mail._id, {$set: mail}, {new: true, runValidators: true});
    return doc;
};

module.exports = {
    getMailTypes,
    getMailType,
    deleteMailType
};