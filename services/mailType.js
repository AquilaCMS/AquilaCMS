const mongoose = require('mongoose');
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

/**
 *
 * @param {*} body les data a enregistrer
 * @param {*} _id si l'_id existe alors on met a jour sinon on update
 */
const setMailType = async (body, _id = null) => {
    require('../utils/utils').tmp_use_route('mailType_service', 'setMailType');
    const {MailType} = require('../orm/models');
    let result;
    if (_id) {
        // Update
        if (!mongoose.Types.ObjectId.isValid(_id)) throw NSErrors.InvalidObjectIdError;
        result = await MailType.findByIdAndUpdate(_id, {$set: body}, {new: true, runValidators: true});
        if (!result) throw NSErrors.MailTypeUpdateError;
    } else {
        // Create
        result = await MailType.create(body);
    }
    return result;
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
    setMailType,
    deleteMailType
};