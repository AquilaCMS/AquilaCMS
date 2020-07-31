const mongoose     = require('mongoose');
const utils        = require('../../utils/utils');
const utilsDatabase = require('../../utils/database');
const {checkCustomFields} = require('../../utils/translation');
const aquilaEvents = require('../../utils/aquilaEvents');
const translation  = require('../../utils/translation');
const Schema       = mongoose.Schema;

const NewsSchema = new Schema({
    isVisible   : {type: Boolean, default: false},
    img         : {type: String, default: ''},
    extension   : {type: String, default: '.jpg'},
    translation : {}
}, {timestamps: true});

/* translation:
 slug: unique
 title
 content: {
 resume
 text
 }
 */

NewsSchema.statics.translationValidation = async function (updateQuery, self) {
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
                lang.slug = utils.slugify(lang.title);
            } else {
                lang.slug = utils.slugify(lang.slug);
            }

            if (updateQuery) {
                const slugEdit = {translation: {}};
                slugEdit.translation[translationKeys[i]] = {};
                slugEdit.translation[translationKeys[i]].slug = lang.slug;
                updateQuery.updateOne(slugEdit);
            }

            if (await mongoose.model('news').countDocuments({_id: {$ne: self._id}, translation: {slug: lang.slug}}) > 0) {
                errors.push('slug déjà existant');
            }

            errors = errors.concat(checkCustomFields(lang, `translation.${translationKeys[i]}`, [
                {key: 'slug'}, {key: 'title'}
            ]));

            if (lang.content) {
                errors = translation.checkTranslations(lang.content.resume, 'content.resume', errors, translationKeys[i]);
                errors = translation.checkTranslations(lang.content.text, 'content.text', errors, translationKeys[i]);
            }
        }
    }

    return errors;
};

NewsSchema.pre('updateOne', async function (next) {
    utilsDatabase.preUpdates(this, next, NewsSchema);
});

NewsSchema.pre('findOneAndUpdate', async function (next) {
    utilsDatabase.preUpdates(this, next, NewsSchema);
});

NewsSchema.pre('save', async function (next) {
    const errors = await NewsSchema.statics.translationValidation(undefined, this);
    next(errors.length > 0 ? new Error(errors.join('\n')) : undefined);
});

NewsSchema.post('save', async function (doc) {
    aquilaEvents.emit('aqNewArticle', doc);
});

module.exports = NewsSchema;