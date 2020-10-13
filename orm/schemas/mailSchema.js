// const isEmail  = require('validator').isEmail;
const mongoose            = require('mongoose');
const {checkCustomFields} = require('../../utils/translation');
const utilsDatabase       = require('../../utils/database');
const Schema              = mongoose.Schema;

const MailSchema = new Schema({
    code        : {type: String, required: true, unique: true},
    type        : {type: String, default: '', index: true}, // jointure entre type et code dans mail_type
    from        : {type: String, trim: true, required: true/* , validate: [{validator: (value) => isEmail(value), msg: 'Invalid email.'}] */}, // adresse mail d'envoi
    fromName    : {type: String, default: ''},
    translation : {}
}, {timestamps: true});

MailSchema.statics.translationValidation = async function (updateQuery, self) {
    let errors = [];

    if (self && updateQuery === undefined || self.code !== undefined) {
        while (self.translation === undefined) {
            self.translation = {};
        }
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

module.exports = MailSchema;