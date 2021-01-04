/*
 * Product    : AQUILA-CMS
 * Author     : Nextsourcia - contact@aquila-cms.com
 * Copyright  : 2021 © Nextsourcia - All rights reserved.
 * License    : Open Software License (OSL 3.0) - https://opensource.org/licenses/OSL-3.0
 * Disclaimer : Do not edit or add to this file if you wish to upgrade AQUILA CMS to newer versions in the future.
 */

const mongoose = require('mongoose');
const Schema   = mongoose.Schema;

const ItemSimple = new Schema({}, {
    discriminatorKey : 'type'
});

ItemSimple.methods.populateItem = async function () {
    const {Products} = require('../models');
    const self       = this;
    if (self.id._id === undefined) self.id = await Products.findById(self.id);
};

ItemSimple.methods.decreaseStock = function (cartId, cb) {
    const SimpleProduct = require('../models/productSimple');
    SimpleProduct.findOneAndUpdate(
        {_id: this.id, qty: {$gt: this.quantity}},
        {$inc: -this.quantity, $push: {carted: {id_cart: cartId, qty: this.quantity}}},
        function (err, product) {
            if (err) return cb(err);
            if (!product) return cb({code: 'INADEQUATE_INVENTORY', message: 'Inventaire inadéquat.'});
            cb();
        }
    );
};

ItemSimple.methods.rollbackStock = async function (cb) {
    const SimpleProduct = require('../models/productSimple');
    try {
        await SimpleProduct.updateOne({_id: this.id}, {$inc: this.quantity});
        return cb();
    } catch (err) {
        return cb(err);
    }
};

module.exports = ItemSimple;