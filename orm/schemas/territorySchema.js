/*
 * Product    : AQUILA-CMS
 * Author     : Nextsourcia - contact@aquila-cms.com
 * Copyright  : 2021 © Nextsourcia - All rights reserved.
 * License    : Open Software License (OSL 3.0) - https://opensource.org/licenses/OSL-3.0
 * Disclaimer : Do not edit or add to this file if you wish to upgrade AQUILA CMS to newer versions in the future.
 */

const mongoose      = require('mongoose');
const Schema        = mongoose.Schema;
const ObjectId      = Schema.ObjectId;
const utilsDatabase = require('../../utils/database');

const TerritorySchema = new Schema({
    translation : {},
    code        : {type: String, required: true, index: true},
    type        : {type: String, enum: ['country', 'district', 'department', 'city']},
    taxeFree    : Boolean,
    children    : [{type: ObjectId, ref: 'territory'}]
});

TerritorySchema.index({code: 1, name: 1}, {unique: true});
TerritorySchema.index({name: 1, type: 1});
TerritorySchema.index({code: 1, type: 1});

async function preUpdates(next, that) {
    await utilsDatabase.checkCode('territory', that._id, that.code);
}

TerritorySchema.pre('save', async function (next) {
    await preUpdates(next, this);
});

TerritorySchema.pre('updateOne', async function (next) {
    await preUpdates(next, this._update.$set ? this._update.$set : this._update);
});

TerritorySchema.pre('findOneAndUpdate', async function (next) {
    await preUpdates(next, this._update.$set ? this._update.$set : this._update);
});

module.exports = TerritorySchema;