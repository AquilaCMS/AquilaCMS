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

const SuppliersSchema = new Schema({
    code               : {type: String, required: true, unique: true},
    name               : {type: String, required: true},
    type               : {type: String},
    contactPrenom      : {type: String},
    contactNom         : {type: String},
    addr_1             : String,
    addr_2             : String,
    cpostal            : String,
    city               : String,
    mail               : String,
    phone              : String,
    purchasing_manager : String,
    active             : {type: Boolean, default: true}
}, {
    timestamps : true,
    id         : false
});

SuppliersSchema.statics.checkCode = async function (that) {
    await utilsDatabase.checkCode('suppliers', that._id, that.code);
};

SuppliersSchema.pre('updateOne', async function (next) {
    await utilsDatabase.preUpdates(this, next, SuppliersSchema);
});

SuppliersSchema.pre('findOneAndUpdate', async function (next) {
    await utilsDatabase.preUpdates(this, next, SuppliersSchema);
});

SuppliersSchema.pre('save', async function (next) {
    await utilsDatabase.preUpdates(this, next, SuppliersSchema);
});

aquilaEvents.emit('suppliersSchemaInit', SuppliersSchema);

module.exports = SuppliersSchema;