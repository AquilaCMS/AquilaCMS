/*
 * Product    : AQUILA-CMS
 * Author     : Nextsourcia - contact@aquila-cms.com
 * Copyright  : 2022 © Nextsourcia - All rights reserved.
 * License    : Open Software License (OSL 3.0) - https://opensource.org/licenses/OSL-3.0
 * Disclaimer : Do not edit or add to this file if you wish to upgrade AQUILA CMS to newer versions in the future.
 */

const mongoose         = require('mongoose');
const {aquilaEvents}   = require('aql-utils');
const utils            = require('../../utils/utils');
const translationUtils = require('../../utils/translation');
const utilsDatabase    = require('../../utils/database');
const Schema           = mongoose.Schema;
const {ObjectId}       = Schema.Types;

const CategoriesSchema = new Schema({
    code         : {type: String, required: true, unique: true},
    active       : {type: Boolean, default: false},
    clickable    : {type: Boolean, default: true},
    isDisplayed  : {type: Boolean, default: true},
    action       : {type: String, default: 'container', enum: ['catalog', 'url', 'page', 'container', 'categorylist']},
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
}, {
    usePushEach : true,
    timestamps  : true,
    id          : false
});

CategoriesSchema.index({displayOrder: 1});
CategoriesSchema.index({'productsList.sortWeight': -1});

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
        if (self.translation === undefined) return errors; // No translation

        let translationKeys = Object.keys(self.translation);
        if (translationKeys.length === 0) {
            self.translation[global.defaultLang] = {};
            translationKeys                      = Object.keys(self.translation);
        }
        for (let i = 0; i < translationKeys.length; i++) {
            const lang = self.translation[translationKeys[i]];

            if (Object.keys(lang).length > 0) {
                if (updateQuery.action === 'catalog') {
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
                    if (await mongoose.model('categories').countDocuments({_id: {$ne: self._id}, [`translation.${translationKeys[i]}.slug`]: lang.slug}) > 0) {
                        lang.slug = `${utils.slugify(lang.name)}_${Date.now()}`;
                        if (await mongoose.model('categories').countDocuments({_id: {$ne: self._id}, [`translation.${translationKeys[i]}.slug`]: lang.slug}) > 0) {
                            errors.push('slug déjà existant');
                        }
                    }
                }
                errors = errors.concat(translationUtils.checkCustomFields(lang, `translation.${translationKeys[i]}`, [
                    {key: 'slug'}, {key: 'pageSlug'}, {key: 'name'}, {key: 'extraLib'}, {key: 'extraText'}, {key: 'extraText2'}, {key: 'extraText3'}
                ]));
            }
        }
        if (updateQuery) {
            updateQuery.updateOne(self);
        }
    } else {
        if (updateQuery.translation === undefined) return errors; // No translation

        let translationKeys = Object.keys(updateQuery.translation);
        if (translationKeys.length === 0) {
            self.translation[global.defaultLang] = {};
            translationKeys                      = Object.keys(self.translation);
        }
        for (let i = 0; i < translationKeys.length; i++) {
            const lang = updateQuery.translation[translationKeys[i]];

            if (Object.keys(lang).length > 0) {
                if (updateQuery.action === 'catalog') {
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
                        updateQuery.translation[translationKeys[i]] = Object.assign(updateQuery.translation[translationKeys[i]], lang);
                    }
                    if (await mongoose.model('categories').countDocuments({_id: {$ne: updateQuery._id}, [`translation.${translationKeys[i]}.slug`]: lang.slug}) > 0) {
                        lang.slug = `${utils.slugify(lang.name)}_${Date.now()}`;
                        if (await mongoose.model('categories').countDocuments({_id: {$ne: updateQuery._id}, [`translation.${translationKeys[i]}.slug`]: lang.slug}) > 0) {
                            errors.push('slug déjà existant');
                        }
                    }
                }
                errors = errors.concat(translationUtils.checkCustomFields(lang, `translation.${translationKeys[i]}`, [
                    {key: 'slug'}, {key: 'pageSlug'}, {key: 'name'}, {key: 'extraLib'}, {key: 'extraText'}, {key: 'extraText2'}, {key: 'extraText3'}
                ]));
            }
        }
        if (self) {
            self.updateOne(self);
        }
    }

    return errors;
};

CategoriesSchema.statics.checkCode = async function (that) {
    await utilsDatabase.checkCode('categories', that._id, that.code);
};

CategoriesSchema.statics.checkSlugExist = async function (that) {
    // Check slug if the action type is catalog only
    if (that.action === 'catalog') {
        await utilsDatabase.checkSlugExist(that, 'categories');
    }
};

CategoriesSchema.pre('updateOne', async function (next) {
    await utilsDatabase.preUpdates(this, next, CategoriesSchema);
});

CategoriesSchema.pre('findOneAndUpdate', async function (next) {
    await utilsDatabase.preUpdates(this, next, CategoriesSchema);
});

CategoriesSchema.pre('save', async function (next) {
    await utilsDatabase.preUpdates(this, next, CategoriesSchema);
    const errors = await CategoriesSchema.statics.translationValidation(undefined, this);
    next(errors.length > 0 ? new Error(errors.join('\n')) : undefined);
});

aquilaEvents.emit('categoriesSchemaInit', CategoriesSchema);

module.exports = CategoriesSchema;
