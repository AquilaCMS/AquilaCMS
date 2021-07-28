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
    code   : {type: String, unique: true},
    name   : {type: String, required: true, unique: true},
    active : {type: Boolean, default: true}
}, {
    timestamps : true,
    id         : false
});

TrademarksSchema.statics.insertIfNotExists = async function ( trademarkName, cb ) {
    const res = await this.find({name: trademarkName});
    if (res.length === 0) {
        const t               = {name: trademarkName};
        const ModelTrademarks = mongoose.model('trademarks', TrademarksSchema);
        const tm              = new ModelTrademarks(t);
        tm.save();
    }
    cb(trademarkName, res);
};

TrademarksSchema.statics.checkCode = async function (that) {
    await utilsDatabase.checkCode('trademarks', that._id, that.code);
};

/*
TrademarksSchema.pre('updateOne', async function () {
    await utilsDatabase.preUpdates(this, next, TrademarksSchema);
});

TrademarksSchema.pre('findOneAndUpdate', async function () {
    await utilsDatabase.preUpdates(this, next, TrademarksSchema);
    //we don't update the code but the name
});
*/

TrademarksSchema.pre('save', async function (next) {
    this.code = slugify(this.name);
    await utilsDatabase.preUpdates(this, next, TrademarksSchema);
});

module.exports = TrademarksSchema;