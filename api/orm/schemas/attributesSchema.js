/*
 * Product    : AQUILA-CMS
 * Author     : Nextsourcia - contact@aquila-cms.com
 * Copyright  : 2023 © Nextsourcia - All rights reserved.
 * License    : Open Software License (OSL 3.0) - https://opensource.org/licenses/OSL-3.0
 * Disclaimer : Do not edit or add to this file if you wish to upgrade AQUILA CMS to newer versions in the future.
 */

const mongoose            = require('mongoose');
const {aquilaEvents}      = require('aql-utils');
const utilsDatabase       = require('../../utils/database');
const {checkCustomFields} = require('../../utils/translation');
const Schema              = mongoose.Schema;
const {ObjectId}          = Schema.Types;
const NSErrors            = require('../../utils/errors/NSErrors');

const AttributesSchema = new Schema({
    code  : {type: String, required: true, unique: false},
    type  : {type: String, required: true},
    _type : {
        type    : String,
        enum    : ['products', 'users'],
        default : 'products',
        unique  : false
    },
    param          : {type: String, required: true},
    set_attributes : [{type: ObjectId, ref: 'setAttributes'}],
    position       : {type: Number, default: 1},
    default_value  : {},
    visible        : {type: Boolean, default: true},
    usedInRules    : {type: Boolean, default: true},
    usedInFilters  : {type: Boolean, default: false},
    usedInSearch   : {type: Boolean, default: false},
    parents        : [{type: ObjectId, ref: 'attributes'}],
    translation    : {},
    isVariantable  : Boolean
}, {
    id : false
});

AttributesSchema.index({code: 1, _type: 1}, {unique: true});

AttributesSchema.statics.translationValidation = async function (self) {
    if (self.translation === undefined) return; // No translation

    let translationKeys = Object.keys(self.translation);

    if (translationKeys.length === 0) {
        self.translation[global.aquila.defaultLang] = {};
        translationKeys                             = Object.keys(self.translation);
    }

    for (let i = 0; i < translationKeys.length; i++) {
        const lang = self.translation[translationKeys[i]];

        if (Object.keys(lang).length > 0) {
            if (lang.name === undefined) {
                throw NSErrors.NameMissing;
            }
            checkCustomFields(lang, `translation.${translationKeys[i]}`, [
                {key: 'name'},
                {key: 'values', type: 'object'}
            ]);
        }
    }
};

AttributesSchema.statics.checkCode = async function (data) {
    await utilsDatabase.checkCode('attributes', data._id, data.code, {_type: data._type});
};

/**
 * Si un attribut est supprimé alors il faut reporter ces modifications dans les categories.filters.attributes et supprimer du tableau categories.filters.attributes
 * l'objet correspondant a l'attribut supprimé
 */
AttributesSchema.post('remove', async function (doc, next) {
    try {
        // On supprime du tableau categorie.filters.attributes l'objet attribut correspondant à l'attribut venant d'être supprimé
        const {_id}        = doc;
        const {Categories} = require('../models');
        await Categories.updateMany({'filters.attributes._id': _id}, {$pull: {'filters.attributes': {_id}}}, {new: true, runValidators: true});
    } catch (error) {
        return next(error);
    }
});

AttributesSchema.pre('updateOne', async function (next) {
    await utilsDatabase.preUpdates(this, next, AttributesSchema);
});

AttributesSchema.pre('findOneAndUpdate', async function (next) {
    await utilsDatabase.preUpdates(this, next, AttributesSchema);
});

/**
 * Lorsqu'un attribut est modifié alors on reporte la modification dans categorie.filters.attributes qui est un tableau d'attribut
 * @deprecated seem like it's not used, because the service setAttribute handle all modifications
 */
AttributesSchema.post('updateOne', async function ({next}) {
    try {
        const attribute = await this.findOne(this.getQuery());
        if (attribute) {
            const {Categories} = require('../models');
            await Categories.updateMany({}, {
                $set : {
                    'filters.attributes.$[attribute].position'    : attribute.position,
                    'filters.attributes.$[attribute].type'        : attribute.type,
                    'filters.attributes.$[attribute].translation' : attribute.translation
                }
            }, {
                arrayFilters  : [{'attribute._id': attribute._id}],
                new           : true,
                runValidators : true
            });
        }
    } catch (err) {
        return next(err);
    }
});

AttributesSchema.pre('save', async function (next) {
    await utilsDatabase.preUpdates(this, next, AttributesSchema);
});

aquilaEvents.emit('attributesSchemaInit', AttributesSchema);

module.exports = AttributesSchema;