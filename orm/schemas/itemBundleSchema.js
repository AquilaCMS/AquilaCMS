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

const ItemBundle = new Schema({
    selections : [{
        bundle_section_ref : {type: String, required: true},
        products           : [
            {
                id           : {type: ObjectId, ref: 'products'},
                name         : String,
                code         : String,
                image        : String,
                description1 : {
                    title : String,
                    text  : String
                },
                description2 : {
                    title : String,
                    text  : String
                },
                canonical : String,
                type      : {type: String, enum: ['simple', 'bundle', 'virtual']}
            }
        ]
    }],
    bundle_sections : [
        {
            ref         : {type: String, required: true},
            title       : {type: String},
            displayMode : {type: String, enum: ['RADIO_BUTTON', 'SELECT']}, // Ne sert que pour le type 'SINGLE'
            type        : {type: String, enum: ['SINGLE', 'MULTIPLE']},
            products    : [{
                id             : {type: ObjectId, ref: 'products'},
                isDefault      : Boolean,
                modifier_price : {
                    ati : {type: Number},
                    et  : {type: Number}
                },
                modifier_weight : {type: Number}
            }],
            isRequired : Boolean,
            minSelect  : Number,
            maxSelect  : Number
        }
    ],
    stock : {
        qty          : {type: Number, default: 0},
        qty_booked   : {type: Number, default: 0},
        date_selling : Date,
        date_supply  : Date,
        orderable    : {type: Boolean, default: false},
        status       : {type: String, default: 'liv', enum: ['liv', 'dif', 'epu']},
        label        : String,
        translation  : {}
    }
}, {
    discriminatorKey : 'type',
    id               : false
});

ItemBundle.methods.decreaseStock = async function (cartId, cb) {
    const BundleProduct = require('../models/productBundle');
    try {
        const _product = await BundleProduct.findOneAndUpdate(
            {
                _id : this.id,
                qty : {$gt: this.quantity}
            },
            {
                $inc  : -this.quantity,
                $push : {
                    carted : {
                        id_cart : cartId,
                        qty     : this.quantity
                    }
                }
            }
        );
        if (!_product) return cb({code: 'INADEQUATE_INVENTORY', message: 'Inventaire inadéquat.'});
        return cb();
    } catch (err) {
        return cb(err);
    }
};

ItemBundle.methods.rollbackStock = async function (cb) {
    const BundleProduct = require('../models/productBundle');
    try {
        await BundleProduct.updateOne({_id: this.id}, {$inc: this.quantity});
        return cb();
    } catch (err) {
        return cb(err);
    }
};

ItemBundle.methods.populateItem = async function () {
    const {Products} = require('../models');
    const self       = this;
    for (const selection of self.selections) {
        for (const [index, _product] of Object.entries(selection.products)) {
            if (selection.products[index].type === undefined) selection.products[index] = await Products.findById(_product);
        }
    }
    if (self.id._id === undefined) self.id = await Products.findById(self.id);
};

module.exports = ItemBundle;