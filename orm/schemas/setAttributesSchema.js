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

const SetAttributesSchema = new Schema({
    code       : {type: String, required: true, unique: true},
    name       : {type: String, required: true},
    attributes : [{type: ObjectId, ref: 'attributes'}],
    type       : {
        type : String,
        enum : ['products', 'users']
    },
    questions : [{
        translation : {}
    }]
}, {
    id : false
});

async function preUpdates(that) {
    await utilsDatabase.checkCode('setAttributes', that._id, that.code);
}

SetAttributesSchema.pre('updateOne', async function () {
    await preUpdates(this._update.$set ? this._update.$set : this._update);
});

SetAttributesSchema.pre('findOneAndUpdate', async function () {
    await preUpdates(this._update.$set ? this._update.$set : this._update);
});

SetAttributesSchema.pre('save', async function (next) {
    await preUpdates(this);
    next();
});

module.exports = SetAttributesSchema;