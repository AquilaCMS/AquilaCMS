/*
 * Product    : AQUILA-CMS
 * Author     : Nextsourcia - contact@aquila-cms.com
 * Copyright  : 2021 © Nextsourcia - All rights reserved.
 * License    : Open Software License (OSL 3.0) - https://opensource.org/licenses/OSL-3.0
 * Disclaimer : Do not edit or add to this file if you wish to upgrade AQUILA CMS to newer versions in the future.
 */

const mongoose      = require('mongoose');
const helper        = require('../../utils/utils');
const utilsDatabase = require('../../utils/database');
const Schema        = mongoose.Schema;

const LanguagesSchema = new Schema({
    code            : {type: String, required: true, unique: true},
    name            : {type: String, required: true, unique: true},
    img             : {type: String},
    position        : {type: Number, default: 1},
    defaultLanguage : {type: Boolean, default: false},
    status          : {type: String, enum: ['visible', 'invisible', 'removing'], default: 'invisible'}
});

async function preUpdates(that) {
    await utilsDatabase.checkCode('languages', that._id, that.code);
}

LanguagesSchema.pre('updateOne', async function () {
    await preUpdates(this._update.$set ? this._update.$set : this._update);
});

LanguagesSchema.pre('findOneAndUpdate', async function () {
    await preUpdates(this._update.$set ? this._update.$set : this._update);
});

LanguagesSchema.pre('save', async function (next) {
    await preUpdates(this);
    this.code = helper.slugify(this.code);
    next();
});

module.exports = LanguagesSchema;