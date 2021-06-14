/*
 * Product    : AQUILA-CMS
 * Author     : Nextsourcia - contact@aquila-cms.com
 * Copyright  : 2021 © Nextsourcia - All rights reserved.
 * License    : Open Software License (OSL 3.0) - https://opensource.org/licenses/OSL-3.0
 * Disclaimer : Do not edit or add to this file if you wish to upgrade AQUILA CMS to newer versions in the future.
 */

const mongoose         = require('mongoose');
const translationUtils = require('../../utils/translation');
const Schema           = mongoose.Schema;
const utilsDatabase    = require('../../utils/database');

const CmsBlocksSchema = new Schema({
    code        : {type: String, required: true, unique: true},
    group       : {type: String, default: ''},
    description : String,
    translation : {}
}, {
    id : false
});

CmsBlocksSchema.statics.translationValidation = async function (self) {
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
        if (Object.keys(self.translation[translationKeys[i]]).length > 0) {
            errors = translationUtils.checkCustomFields(self.translation[translationKeys[i]], `translation.${translationKeys[i]}`, [
                {key: 'content'}
            ]);
        }
    }

    return errors;
};

CmsBlocksSchema.statics.checkCode = async function (that) {
    await utilsDatabase.checkCode('cmsBlocks', that._id, that.code);
};

CmsBlocksSchema.pre('save', async function (next) {
    utilsDatabase.preUpdates(this, next, CmsBlocksSchema);
});

CmsBlocksSchema.pre('updateOne', async function (next) {
    utilsDatabase.preUpdates(this, next, CmsBlocksSchema);
});

CmsBlocksSchema.pre('findOneAndUpdate', async function (next) {
    utilsDatabase.preUpdates(this, next, CmsBlocksSchema);
});

module.exports = CmsBlocksSchema;