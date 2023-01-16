/*
 * Product    : AQUILA-CMS
 * Author     : Nextsourcia - contact@aquila-cms.com
 * Copyright  : 2022 © Nextsourcia - All rights reserved.
 * License    : Open Software License (OSL 3.0) - https://opensource.org/licenses/OSL-3.0
 * Disclaimer : Do not edit or add to this file if you wish to upgrade AQUILA CMS to newer versions in the future.
 */

const mongoose            = require('mongoose');
const {aquilaEvents}      = require('aql-utils');
const {checkCustomFields} = require('../../utils/translation');
const utilsDatabase       = require('../../utils/database');
const Schema              = mongoose.Schema;

const MailSchema = new Schema({
    code        : {type: String, required: true, unique: true},
    type        : {type: String, default: '', index: true}, // jointure entre type et code dans mail_type
    from        : {type: String, trim: true, required: true/* , validate: [{validator: (value) => isEmail(value), msg: 'Invalid email.'}] */}, // adresse mail d'envoi
    fromName    : {type: String, default: ''},
    translation : {}
}, {
    timestamps : true,
    id         : false
});

MailSchema.statics.translationValidation = async function (updateQuery, self) {
    let errors = [];

    if (self && updateQuery === undefined || self.code !== undefined) {
        if (self.translation === undefined) return errors; // No translation

        let translationKeys = Object.keys(self.translation);
        if (translationKeys.length === 0) {
            const lang                  = await mongoose.model('languages').findOne({defaultLanguage: true});
            self.translation[lang.code] = {};
            translationKeys             = Object.keys(self.translation);
        }
        for (let i = 0; i < translationKeys.length; i++) {
            const lang = self.translation[translationKeys[i]];
            if (updateQuery) {
                self.translation[translationKeys[i]] = Object.assign(self.translation[translationKeys[i]], lang);
            }
            errors = errors.concat(checkCustomFields(lang, `translation.${translationKeys[i]}`, [
                {key: 'content'}, {key: 'subject'}
            ]));
        }
        if (updateQuery) {
            updateQuery.updateOne(self);
        }
    }

    return errors;
};

MailSchema.pre('updateOne', async function (next) {
    utilsDatabase.preUpdates(this, next, MailSchema);
});
MailSchema.pre('findOneAndUpdate', async function (next) {
    utilsDatabase.preUpdates(this, next, MailSchema);
});

MailSchema.pre('save', async function (next) {
    const errors = await MailSchema.statics.translationValidation(undefined, this);
    next(errors.length > 0 ? new Error(errors.join('\n')) : undefined);
});

aquilaEvents.emit('mailSchemaInit', MailSchema);

module.exports = MailSchema;