/*
 * Product    : AQUILA-CMS
 * Author     : Nextsourcia - contact@aquila-cms.com
 * Copyright  : 2021 © Nextsourcia - All rights reserved.
 * License    : Open Software License (OSL 3.0) - https://opensource.org/licenses/OSL-3.0
 * Disclaimer : Do not edit or add to this file if you wish to upgrade AQUILA CMS to newer versions in the future.
 */

const mongoose         = require('mongoose');
const utils            = require('../../utils/utils');
const translationUtils = require('../../utils/translation');
const utilsDatabase    = require('../../utils/database');
const Schema           = mongoose.Schema;
const ObjectId         = Schema.ObjectId;

const CategoriesSchema = new Schema({
    code         : {type: String, required: true, unique: true},
    active       : {type: Boolean, default: false},
    clickable    : {type: Boolean, default: true},
    isDisplayed  : {type: Boolean, default: true},
    action       : {type: String, default: 'catalog'},
    // thumbnailUrl : {type: String},
    colorName    : {type: String},
    openDate     : {type: Date, default: Date.now},
    closeDate    : {type: Date},
    ancestors    : [{type: ObjectId, ref: 'categories'}],
    children     : [{type: ObjectId, ref: 'categories'}],
    productsList : [{
        id         : {type: ObjectId, ref: 'products', index: true},
        checked    : {type: Boolean, default: true},
        sortWeight : {type: Number, default: 0}
    }],
    // headerUrl    : {type: String},
    img          : {type: String},
    alt          : {type: String},
    displayOrder : {type: Number, default: 99}, // Revoir la valeur par défaut
    filters      : {
        attributes : [
            {
                id_attribut : {type: ObjectId, ref: 'attributes', required: true},
                type        : {type: String, required: true},
                code        : {type: String, required: true},
                position    : {type: Number}, // string ?
                translation : {}
            }],
        attributesValues : {},
        pictos           : []
    },
    translation      : {},
    canonical_weight : {type: Number, default: 0}
}, {usePushEach : true,
    timestamps  : true});

/* translation:
 slug: requis, unique entre les categories, pas entre ses langues
 pageSlug
 name
 extraLib
 extraText
 extraText2
 extraText3
 */

CategoriesSchema.statics.translationValidation = async function (updateQuery, self) {
    let errors = [];

    if (self && updateQuery === undefined || self.code !== undefined) {
        while (self.translation === undefined) {
            self.translation = {};
        }
        let translationKeys = Object.keys(self.translation);
        if (translationKeys.length === 0) {
            self.translation[global.defaultLang] = {};
            translationKeys                      = Object.keys(self.translation);
        }
        for (let i = 0; i < translationKeys.length; i++) {
            const lang = self.translation[translationKeys[i]];

            if (Object.keys(lang).length > 0) {
                if (lang.slug === undefined || lang.slug === '') {
                    lang.slug = utils.slugify(lang.name);
                } else {
                    lang.slug = utils.slugify(lang.slug);
                }
                if (lang.slug.length <= 2) {
                    errors.push('slug trop court');
                    return errors;
                }
                if (updateQuery) {
                    self.translation[translationKeys[i]] = Object.assign(self.translation[translationKeys[i]], lang);
                }
                if (await mongoose.model('categories').countDocuments({_id: {$ne: self._id}, translation: {slug: lang.slug}}) > 0) {
                    errors.push('slug déjà existant');
                }
                errors = errors.concat(translationUtils.checkCustomFields(lang, `translation.${translationKeys[i]}`, [
                    {key: 'slug'}, {key: 'pageSlug'}, {key: 'name'}, {key: 'extraLib'}, {key: 'extraText'}, {key: 'extraText2'}, {key: 'extraText3'}
                ]));
            }
        }
        if (updateQuery) {
            updateQuery.updateOne(self);
        }
    }

    return errors;
};

async function preUpdates(that) {
    await utilsDatabase.checkCode('categories', that._id, that.code);
    await utilsDatabase.checkSlugExist(that, 'categories');
}

CategoriesSchema.pre('updateOne', async function (next) {
    await preUpdates(this._update.$set ? this._update.$set : this._update);
    utilsDatabase.preUpdates(this, next, CategoriesSchema);
});

CategoriesSchema.pre('findOneAndUpdate', async function (next) {
    await preUpdates(this._update.$set ? this._update.$set : this._update);
    utilsDatabase.preUpdates(this, next, CategoriesSchema);
});

CategoriesSchema.pre('save', async function (next) {
    await preUpdates(this);
    const errors = await CategoriesSchema.statics.translationValidation(undefined, this);
    next(errors.length > 0 ? new Error(errors.join('\n')) : undefined);
});

module.exports = CategoriesSchema;
