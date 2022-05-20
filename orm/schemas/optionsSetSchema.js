/*
 * Product    : AQUILA-CMS
 * Author     : Nextsourcia - contact@aquila-cms.com
 * Copyright  : 2021 © Nextsourcia - All rights reserved.
 * License    : Open Software License (OSL 3.0) - https://opensource.org/licenses/OSL-3.0
 * Disclaimer : Do not edit or add to this file if you wish to upgrade AQUILA CMS to newer versions in the future.
 */

const mongoose      = require('mongoose');
const utilsDatabase = require('../../utils/database');
const Schema        = mongoose.Schema;
const {ObjectId}    = Schema.Types;

const OptionsSetSchema = new Schema({
    code    : {type: String, required: true, unique: true},
    name    : {}, // we have translation for name
    options : [{type: ObjectId, ref: 'options'}]
}, {
    id : false
});

OptionsSetSchema.statics.checkCode = async function (that) {
    await utilsDatabase.checkCode('optionsSet', that._id, that.code);
};

OptionsSetSchema.pre('updateOne', async function (next) {
    await utilsDatabase.preUpdates(this.$getAllSubdocs, next, OptionsSetSchema);
});

OptionsSetSchema.pre('findOneAndUpdate', async function (next) {
    await utilsDatabase.preUpdates(this.$getAllSubdocs, next, OptionsSetSchema);
});

OptionsSetSchema.pre('save', async function (next) {
    await utilsDatabase.preUpdates(this.$getAllSubdocs, next, OptionsSetSchema);
});

module.exports = OptionsSetSchema;