/*
 * Product    : AQUILA-CMS
 * Author     : Nextsourcia - contact@aquila-cms.com
 * Copyright  : 2023 © Nextsourcia - All rights reserved.
 * License    : Open Software License (OSL 3.0) - https://opensource.org/licenses/OSL-3.0
 * Disclaimer : Do not edit or add to this file if you wish to upgrade AQUILA CMS to newer versions in the future.
 */

const mongoose                = require('mongoose');
const {slugify, aquilaEvents} = require('aql-utils');
const utilsDatabase           = require('../../utils/database');
const Schema                  = mongoose.Schema;

const LanguagesSchema = new Schema({
    code            : {type: String, required: true, unique: true},
    name            : {type: String, required: true, unique: true},
    img             : {type: String},
    position        : {type: Number, default: 1},
    defaultLanguage : {type: Boolean, default: false},
    status          : {type: String, enum: ['visible', 'invisible', 'removing'], default: 'invisible'}
}, {
    id : false
});

LanguagesSchema.statics.checkCode = async function (that) {
    await utilsDatabase.checkCode('languages', that._id, that.code);
};

LanguagesSchema.pre('updateOne', async function (next) {
    await utilsDatabase.preUpdates(this, next, LanguagesSchema);
});

LanguagesSchema.pre('findOneAndUpdate', async function (next) {
    await utilsDatabase.preUpdates(this, next, LanguagesSchema);
});

LanguagesSchema.pre('save', async function (next) {
    await utilsDatabase.preUpdates(this, next, LanguagesSchema);
    this.code = slugify(this.code);
    next();
});

aquilaEvents.emit('languagesSchemaInit', LanguagesSchema);

module.exports = LanguagesSchema;