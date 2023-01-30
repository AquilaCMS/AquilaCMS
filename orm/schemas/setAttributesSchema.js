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

const SetAttributesSchema = new Schema({
    code       : {type: String, required: true, unique: false},
    name       : {type: String, required: true},
    attributes : [{type: ObjectId, ref: 'attributes'}],
    type       : {
        type   : String,
        enum   : ['products', 'users'],
        unique : false
    },
    questions : [{
        translation : {}
    }]
}, {
    id : false
});

SetAttributesSchema.index({code: 1, type: 1}, {unique: true});

SetAttributesSchema.statics.checkCode = async function (that) {
    await utilsDatabase.checkCode('setAttributes', that._id, that.code, {type: that.type});
};

SetAttributesSchema.pre('updateOne', async function (next) {
    await utilsDatabase.preUpdates(this.$getAllSubdocs, next, SetAttributesSchema);
});

SetAttributesSchema.pre('findOneAndUpdate', async function (next) {
    await utilsDatabase.preUpdates(this.$getAllSubdocs, next, SetAttributesSchema);
});

SetAttributesSchema.pre('save', async function (next) {
    await utilsDatabase.preUpdates(this.$getAllSubdocs, next, SetAttributesSchema);
});

aquilaEvents.emit('setAttributesSchemaInit', SetAttributesSchema);

module.exports = SetAttributesSchema;