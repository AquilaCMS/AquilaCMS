/*
 * Product    : AQUILA-CMS
 * Author     : Nextsourcia - contact@aquila-cms.com
 * Copyright  : 2023 © Nextsourcia - All rights reserved.
 * License    : Open Software License (OSL 3.0) - https://opensource.org/licenses/OSL-3.0
 * Disclaimer : Do not edit or add to this file if you wish to upgrade AQUILA CMS to newer versions in the future.
 */

const mongooseLeanVirtuals = require('mongoose-lean-virtuals');
const mongoose             = require('mongoose');
const {aquilaEvents}       = require('aql-utils');
const VariantValueSchema   = require('./variantValueSchema');
const Schema               = mongoose.Schema;
const {ObjectId}           = Schema.Types;
const NSErrors             = require('../../utils/errors/NSErrors');

const ProductSimpleSchema = new Schema({
    stock : {
        qty          : {type: Number, default: 0},
        qty_booked   : {type: Number, default: 0},
        date_selling : Date,
        date_supply  : Date,
        orderable    : {type: Boolean, default: false},
        status       : {type: String, default: 'liv', enum: ['liv', 'dif', 'epu']},
        label        : String,
        translation  : {}
    },
    variants : [{
        code        : {type: String},
        type        : {type: String, enum: ['list', 'radio', 'image', 'list2']},
        sort        : {type: Number},
        id          : {type: ObjectId, ref: 'attributes', index: true},
        translation : {
            /**
             *  lang: {
             *      values: Array,
             *      name: String
             *
             */
        }
    }],
    variants_values : {type: [VariantValueSchema]}
}, {
    discriminatorKey : 'type',
    toObject         : {virtuals: true},
    toJSON           : {virtuals: true},
    id               : false
});

ProductSimpleSchema.virtual('stock.qty_real').get(function () {
    return this.stock.qty - this.stock.qty_booked;
});

ProductSimpleSchema.methods.addToCart = async function (cart, item, user, lang) {
    const prdServices = require('../../services/products');

    if (item.selected_variant) {
        item = {
            ...item,
            ...item.selected_variant,
            id : item.id,
            lang
        };
    }
    // On gère le stock
    // Commandable et on gère la reservation du stock
    if (global.aquila.envConfig.stockOrder.bookingStock === 'panier') {
        if (!(await prdServices.checkProductOrderable(this.stock, item.quantity, item.selected_variant)).ordering.orderable) throw NSErrors.ProductNotInStock;
        // Reza de la qte
        await prdServices.updateStock(this._id, -item.quantity, undefined, item.selected_variant);
    }
    item.type   = 'simple';
    const _cart = await this.basicAddToCart(cart, item, user, lang);
    return _cart;
};
// Permet de récupérer les champs virtuel après un lean
ProductSimpleSchema.plugin(mongooseLeanVirtuals);

aquilaEvents.emit('productSimpleSchemaInit', ProductSimpleSchema);

module.exports = ProductSimpleSchema;