/*
 * Product    : AQUILA-CMS
 * Author     : Nextsourcia - contact@aquila-cms.com
 * Copyright  : 2023 © Nextsourcia - All rights reserved.
 * License    : Open Software License (OSL 3.0) - https://opensource.org/licenses/OSL-3.0
 * Disclaimer : Do not edit or add to this file if you wish to upgrade AQUILA CMS to newer versions in the future.
 */

const mongoose       = require('mongoose');
const {aquilaEvents} = require('aql-utils');
const utilsDatabase  = require('../../utils/database');
const Schema         = mongoose.Schema;
const {ObjectId}     = Schema.Types;

const PictosSchema = new Schema({
    _id           : {type: ObjectId, auto: true},
    code          : {type: String, required: true, unique: true},
    filename      : {type: String},
    title         : {type: String},
    location      : {type: String}, // Lieux d'affichage du picto sur l'image du produit...
    enabled       : {type: Boolean, default: false},
    usedInFilters : {type: Boolean, default: false},
    startDate     : {type: Date},
    endDate       : {type: Date}
}, {
    id : false
});

PictosSchema.statics.checkCode = async function (that) {
    await utilsDatabase.checkCode('pictos', that._id, that.code);
};

PictosSchema.pre('updateOne', async function (next) {
    await utilsDatabase.preUpdates(this, next, PictosSchema);
});

PictosSchema.pre('findOneAndUpdate', async function (next) {
    await utilsDatabase.preUpdates(this, next, PictosSchema);
});

PictosSchema.pre('save', async function (next) {
    await utilsDatabase.preUpdates(this, next, PictosSchema);
});

aquilaEvents.emit('pictosSchemaInit', PictosSchema);

module.exports = PictosSchema;