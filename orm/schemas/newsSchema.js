/*
 * Product    : AQUILA-CMS
 * Author     : Nextsourcia - contact@aquila-cms.com
 * Copyright  : 2023 © Nextsourcia - All rights reserved.
 * License    : Open Software License (OSL 3.0) - https://opensource.org/licenses/OSL-3.0
 * Disclaimer : Do not edit or add to this file if you wish to upgrade AQUILA CMS to newer versions in the future.
 */

const mongoose                               = require('mongoose');
const {aquilaEvents, slugify}                = require('aql-utils');
const utilsDatabase                          = require('../../utils/database');
const {checkCustomFields, checkTranslations} = require('../../utils/translation');
const Schema                                 = mongoose.Schema;

const NewsSchema = new Schema({
    isVisible   : {type: Boolean, default: false},
    img         : {type: String, default: ''},
    extension   : {type: String, default: '.jpg'},
    translation : {}
}, {
    timestamps : true,
    id         : false
});

NewsSchema.statics.translationValidation = async function (self, updateQuery) {
    if (self.translation === undefined) return; // No translation

    let translationKeys = Object.keys(self.translation);

    if (translationKeys.length === 0) {
        self.translation[global.aquila.defaultLang] = {};
        translationKeys                             = Object.keys(self.translation);
    }

    for (let i = 0; i < translationKeys.length; i++) {
        const lang = self.translation[translationKeys[i]];

        if (Object.keys(lang).length > 0) {
            if (lang.slug === undefined || lang.slug === '') {
                lang.slug = slugify(lang.title);
            } else {
                lang.slug = slugify(lang.slug);
            }

            if (updateQuery) {
                const slugEdit                                = {translation: {}};
                slugEdit.translation[translationKeys[i]]      = {};
                slugEdit.translation[translationKeys[i]].slug = lang.slug;
                updateQuery.updateOne(slugEdit);
            }
            checkCustomFields(lang, `translation.${translationKeys[i]}`, [
                {key: 'slug'}, {key: 'title'}
            ]);

            if (lang.content) {
                checkTranslations(lang.content.resume, 'content.resume');
                checkTranslations(lang.content.text, 'content.text');
            }
        }
    }
};

NewsSchema.statics.checkSlugExist = async function (that) {
    await utilsDatabase.checkSlugExist(that, 'news');
};

NewsSchema.pre('updateOne', async function (next) {
    await utilsDatabase.preUpdates(this, next, NewsSchema);
});

NewsSchema.pre('findOneAndUpdate', async function (next) {
    await utilsDatabase.preUpdates(this, next, NewsSchema);
});

NewsSchema.pre('save', async function (next) {
    await utilsDatabase.preUpdates(this, next, NewsSchema);
});

NewsSchema.post('save', async function (doc) {
    aquilaEvents.emit('aqNewArticle', doc);
});

aquilaEvents.emit('newsSchemaInit', NewsSchema);

module.exports = NewsSchema;