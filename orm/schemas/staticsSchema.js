/*
 * Product    : AQUILA-CMS
 * Author     : Nextsourcia - contact@aquila-cms.com
 * Copyright  : 2022 © Nextsourcia - All rights reserved.
 * License    : Open Software License (OSL 3.0) - https://opensource.org/licenses/OSL-3.0
 * Disclaimer : Do not edit or add to this file if you wish to upgrade AQUILA CMS to newer versions in the future.
 */

const mongoose            = require('mongoose');
const {aquilaEvents}      = require('aql-utils');
const utils               = require('../../utils/utils');
const {checkCustomFields} = require('../../utils/translation');
const utilsDatabase       = require('../../utils/database');
const Schema              = mongoose.Schema;

const StaticsSchema = new Schema({
    code        : {type: String, required: true, unique: true},
    type        : {type: String, required: true},
    active      : {type: Boolean, default: false},
    group       : {type: String, default: ''},
    // index        : {type: Boolean, default: true},
    translation : {}
}, {
    timestamps : true,
    id         : false
});

/* translation:
 title
 metaDesc
 slug, requis, unique entre les statics, pas entre ses langues
 content
 */

StaticsSchema.statics.translationValidation = async function (updateQuery, self) {
    let errors = [];

    if (updateQuery) {
        if (updateQuery.translation === undefined) return errors; // No translation

        const languages       = await mongoose.model('languages').find({});
        const translationKeys = Object.keys(updateQuery.translation);
        for (const lang of languages) {
            if (!translationKeys.includes(lang.code)) {
                translationKeys.push(lang.code);
                updateQuery.translation[lang.code] = {slug: utils.slugify(updateQuery.code)};
            }
            if (!updateQuery.translation[lang.code].slug) {
                updateQuery.translation[lang.code].slug = updateQuery.translation[lang.code].title ? utils.slugify(updateQuery.translation[lang.code].title) : updateQuery.code;
            } else {
                updateQuery.translation[lang.code].slug = utils.slugify(updateQuery.translation[lang.code].slug);
            }
            if (updateQuery.translation[lang.code].slug.length <= 2) {
                errors.push('slug trop court');
                return errors;
            }
            if (await mongoose.model('statics').countDocuments({_id: {$ne: updateQuery._id}, [`translation.${lang.code}.slug`]: updateQuery.translation[lang.code].slug}) > 0) {
                updateQuery.translation[lang.code].slug = updateQuery.translation[lang.code].title ? `${utils.slugify(updateQuery.translation[lang.code].title)}_${Date.now()}` : `${updateQuery.code}_${Date.now()}`;
                if (await mongoose.model('statics').countDocuments({_id: {$ne: updateQuery._id}, [`translation.${lang.code}.slug`]: updateQuery.translation[lang.code].slug}) > 0) {
                    errors.push('slug déjà existant');
                }
            }
            errors = errors.concat(checkCustomFields(lang, 'translation.lationKeys[i]}', [
                {key: 'slug'}, {key: 'content'}, {key: 'title'}, {key: 'metaDesc'}
            ]));
        }
    } else {
        if (self.translation === undefined) return errors; // No translation
        const translationKeys = Object.keys(self.translation);
        const languages       = await mongoose.model('languages').find({});
        for (const lang of languages) {
            if (!translationKeys.includes(lang.code)) {
                translationKeys.push(lang.code);
                self.translation[lang.code] = {slug: utils.slugify(self.code)};
            }
            if (!self.translation[lang.code].slug) {
                self.translation[lang.code].slug = self.translation[lang.code].title ? utils.slugify(self.translation[lang.code].title) : self.code;
            } else {
                self.translation[lang.code].slug = utils.slugify(self.translation[lang.code].slug);
            }
            if (self.translation[lang.code].slug.length <= 2) {
                errors.push('slug trop court');
                return errors;
            }
            if (await mongoose.model('statics').countDocuments({_id: {$ne: self._id}, [`translation.${lang.code}.slug`]: self.translation[lang.code].slug}) > 0) {
                errors.push('slug déjà existant');
            }
            errors = errors.concat(checkCustomFields(lang, 'translation.lationKeys[i]}', [
                {key: 'slug'}, {key: 'content'}, {key: 'title'}, {key: 'metaDesc'}
            ]));
        }
    }
    return errors;
};

StaticsSchema.statics.checkCode = async function (that) {
    await utilsDatabase.checkCode('statics', that._id, that.code);
};

StaticsSchema.statics.checkSlugExist = async function (that) {
    await utilsDatabase.checkSlugExist(that, 'statics');
};

StaticsSchema.pre('updateOne', async function (next) {
    await utilsDatabase.preUpdates(this, next, StaticsSchema);
});

StaticsSchema.pre('findOneAndUpdate', async function (next) {
    await utilsDatabase.preUpdates(this, next, StaticsSchema);
});

StaticsSchema.pre('save', async function (next) {
    await utilsDatabase.preUpdates(this, next, StaticsSchema);
});

aquilaEvents.emit('staticsSchemaInit', StaticsSchema);

module.exports = StaticsSchema;
