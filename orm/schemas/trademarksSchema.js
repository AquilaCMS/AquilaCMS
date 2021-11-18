/*
 * Product    : AQUILA-CMS
 * Author     : Nextsourcia - contact@aquila-cms.com
 * Copyright  : 2021 © Nextsourcia - All rights reserved.
 * License    : Open Software License (OSL 3.0) - https://opensource.org/licenses/OSL-3.0
 * Disclaimer : Do not edit or add to this file if you wish to upgrade AQUILA CMS to newer versions in the future.
 */

const mongoose      = require('mongoose');
const {slugify}     = require('../../utils/utils');
const utilsDatabase = require('../../utils/database');
const Schema        = mongoose.Schema;

const TrademarksSchema = new Schema({
    code        : {type: String, unique: true},
    name        : {type: String, required: true, unique: true},
    active      : {type: Boolean, default: true},
    logo        : {type: String},
    translation : {}
}, {
    timestamps : true,
    id         : false
});

TrademarksSchema.statics.checkCode = async function (that) {
    await utilsDatabase.checkCode('trademarks', that._id, that.code);
};

TrademarksSchema.pre('save', async function (next) {
    this.code = slugify(this.name);
    await utilsDatabase.preUpdates(this, next, TrademarksSchema);
});

module.exports = TrademarksSchema;