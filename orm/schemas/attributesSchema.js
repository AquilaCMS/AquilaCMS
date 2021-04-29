/*
 * Product    : AQUILA-CMS
 * Author     : Nextsourcia - contact@aquila-cms.com
 * Copyright  : 2021 © Nextsourcia - All rights reserved.
 * License    : Open Software License (OSL 3.0) - https://opensource.org/licenses/OSL-3.0
 * Disclaimer : Do not edit or add to this file if you wish to upgrade AQUILA CMS to newer versions in the future.
 */

const mongoose      = require('mongoose');
const aquilaEvents  = require('../../utils/aquilaEvents');
const utilsDatabase = require('../../utils/database');
const Schema        = mongoose.Schema;
const ObjectId      = Schema.ObjectId;

const AttributesSchema = new Schema({
    code  : {type: String, required: true, unique: true},
    type  : {type: String, required: true},
    _type : {
        type    : String,
        enum    : ['products', 'users'],
        default : 'products'
    },
    param          : {type: String, required: true},
    set_attributes : [{type: ObjectId, ref: 'setAttributes'}],
    position       : {type: Number, default: 1},
    default_value  : {},
    visible        : {type: Boolean, default: true},
    usedInRules    : {type: Boolean, default: true},
    usedInFilters  : {type: Boolean, default: false},
    translation    : {}
});

AttributesSchema.statics.translationValidation = async function (self) {
    let errors = [];

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
            if (lang.name === undefined) {
                errors.push('name manquant');
            }

            const {checkCustomFields} = require('../../utils/translation');
            errors                    = errors.concat(checkCustomFields(lang, `translation.${translationKeys[i]}`, [
                {key: 'name'},
                {key: 'values', type: 'object'}
            ]));
        }
    }

    return errors;
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

async function preUpdates(that) {
    await utilsDatabase.checkCode('attributes', that._id, that.code);
}

AttributesSchema.pre('updateOne', async function (next) {
    await preUpdates(this._update.$set ? this._update.$set : this._update);
    utilsDatabase.preUpdates(this, next, AttributesSchema);
});

AttributesSchema.pre('findOneAndUpdate', async function (next) {
    await preUpdates(this._update.$set ? this._update.$set : this._update);
    utilsDatabase.preUpdates(this, next, AttributesSchema);
});

/**
 * Lorsqu'un attribut est modifié alors on reporte la modification dans categorie.filters.attributes qui est un tableau d'attribut
 * @deprecated seem like it's not used, because the service setAttribute handle all modifications
 */
AttributesSchema.post('updateOne', async function ({next}) {
    console.warn("If you see that, AttributesSchema.post('updateOne') is not deprecated. Please remove this message");
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
    await preUpdates(this);
    const errors = await AttributesSchema.statics.translationValidation(this);
    next(errors.length > 0 ? new Error(errors.join('\n')) : undefined);
});

aquilaEvents.emit('attributesSchemaInit', AttributesSchema);

module.exports = AttributesSchema;