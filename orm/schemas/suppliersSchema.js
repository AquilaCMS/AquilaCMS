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

SuppliersSchema.statics.insertIfNotExists = async function (supplierName, cb) {
    const res = await this.find({name: supplierName});
    if (res.length === 0) {
        const s     = {name: supplierName};
        const Model = mongoose.model('suppliers', SuppliersSchema);
        const sp    = new Model(s);
        sp.save();
        cb(sp._id, res);
    }
};

async function preUpdates(that) {
    await utilsDatabase.checkCode('suppliers', that._id, that.code);
}

SuppliersSchema.pre('updateOne', async function () {
    await preUpdates(this._update.$set ? this._update.$set : this._update);
});

SuppliersSchema.pre('findOneAndUpdate', async function () {
    await preUpdates(this._update.$set ? this._update.$set : this._update);
});

SuppliersSchema.pre('save', async function (next) {
    await preUpdates(this);
    next();
});

module.exports = SuppliersSchema;