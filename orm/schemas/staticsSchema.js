const mongoose = require('mongoose');
const utils    = require('../../utils/utils');
const {checkCustomFields} = require('../../utils/translation');
const utilsDatabase = require('../../utils/database');
const Schema   = mongoose.Schema;

/**
 * @typedef {object} StaticsSchema
 * @property {string} code.required
 * @property {string} type.required
 * @property {boolean} active default:false
 * @property {string} creationDate Date - default:Date.now
 * @property {string} modifyDate Date - default:Date.now
 * @property {string} group default:
 * @property {object} translation
 */
const StaticsSchema = new Schema({
    code         : {type: String, required: true, unique: true},
    type         : {type: String, required: true},
    active       : {type: Boolean, default: false},
    creationDate : {type: Date, default: Date.now},
    modifyDate   : {type: Date, default: Date.now},
    group        : {type: String, default: ''},
    // index        : {type: Boolean, default: true},
    translation  : {}
});

/* translation:
 title
 metaDesc
 slug, requis, unique entre les statics, pas entre ses langues
 content
 */

StaticsSchema.statics.translationValidation = async function (updateQuery, self) {
    let errors = [];

    while (self.translation === undefined) {
        self.translation = {};
    }

    let translationKeys = Object.keys(self.translation);

    if (translationKeys.length === 0) {
        self.translation[global.defaultLang] = {};
        translationKeys = Object.keys(self.translation);
    }

    for (let i = 0; i < translationKeys.length; i++) {
        const lang = self.translation[translationKeys[i]];

        if (Object.keys(lang).length > 0) {
            if (lang.slug === undefined || lang.slug === '') {
                lang.slug = utils.slugify(lang.name);
            } else {
                lang.slug = utils.slugify(lang.slug);
            }

            if (updateQuery) {
                const slugEdit = {translation: {}};
                slugEdit.translation[translationKeys[i]] = {};
                slugEdit.translation[translationKeys[i]].slug = lang.slug;
                updateQuery.updateOne(slugEdit);
            }

            if (await mongoose.model('statics').countDocuments({_id: {$ne: self._id}, translation: {slug: lang.slug}}) > 0) {
                errors.push('slug déjà existant');
            } else if (lang.slug.length < 3) {
                errors.push('le slug doit être composé de 3 caractères minimum');
            }

            errors = errors.concat(checkCustomFields(lang, 'translation.lationKeys[i]}', [
                {key: 'slug'}, {key: 'content'}, {key: 'title'}, {key: 'metaDesc'}
            ]));
        }
    }

    return errors;
};

StaticsSchema.pre('updateOne', async function (next) {
    utilsDatabase.preUpdates(this, next, StaticsSchema);
});

StaticsSchema.pre('findOneAndUpdate', async function (next) {
    utilsDatabase.preUpdates(this, next, StaticsSchema);
});

StaticsSchema.pre('save', async function (next) {
    const errors = await StaticsSchema.statics.translationValidation(undefined, this);
    this.modifyDate = new Date();
    next(errors.length > 0 ? new Error(errors.join('\n')) : undefined);
});

module.exports = StaticsSchema;