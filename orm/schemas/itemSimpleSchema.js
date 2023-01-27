/*
 * Product    : AQUILA-CMS
 * Author     : Nextsourcia - contact@aquila-cms.com
 * Copyright  : 2023 © Nextsourcia - All rights reserved.
 * License    : Open Software License (OSL 3.0) - https://opensource.org/licenses/OSL-3.0
 * Disclaimer : Do not edit or add to this file if you wish to upgrade AQUILA CMS to newer versions in the future.
 */

const mongoose   = require('mongoose');
const Schema     = mongoose.Schema;
const {ObjectId} = Schema.Types;

const ItemSimple = new Schema(
    {
        selected_variant : new Schema({
            id            : {type: ObjectId},
            active        : {type: Boolean},
            default       : {type: Boolean},
            code          : {type: String},
            variant_codes : {type: String},
            name          : {type: String},
            qty           : Number,
            price         : {
                purchase : Number,
                tax      : Number,
                et       : {
                    normal  : Number,
                    special : Number
                },
                ati : {
                    normal  : Number,
                    special : Number
                },
                priceSort : {
                    et  : {type: Number, default: 0},
                    ati : {type: Number, default: 0}
                }
            },
            images : [
                {
                    url              : String,
                    name             : String,
                    title            : String,
                    alt              : String,
                    position         : Number,
                    modificationDate : String,
                    default          : {type: Boolean, default: false},
                    extension        : {type: String, default: '.jpg'}
                }
            ],
            weight : Number,
            stock  : {
                qty          : {type: Number, default: 0},
                qty_booked   : {type: Number, default: 0},
                date_selling : Date,
                date_supply  : Date,
                orderable    : {type: Boolean, default: false},
                status       : {type: String, default: 'liv', enum: ['liv', 'dif', 'epu']},
                label        : String,
                translation  : {}
            }
        }, {strict: false})
    },
    {
        discriminatorKey : 'type',
        id               : false
    }
);

ItemSimple.methods.populateItem = async function () {
    const {Products} = require('../models');
    const self       = this;
    if (self.id && self.id._id === undefined) self.id = await Products.findById(self.id);
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