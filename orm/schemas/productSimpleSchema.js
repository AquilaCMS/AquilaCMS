/*
 * Product    : AQUILA-CMS
 * Author     : Nextsourcia - contact@aquila-cms.com
 * Copyright  : 2021 © Nextsourcia - All rights reserved.
 * License    : Open Software License (OSL 3.0) - https://opensource.org/licenses/OSL-3.0
 * Disclaimer : Do not edit or add to this file if you wish to upgrade AQUILA CMS to newer versions in the future.
 */

const mongooseLeanVirtuals = require('mongoose-lean-virtuals');
const mongoose             = require('mongoose');
const reviewService        = require('../../services/reviews');
const Schema               = mongoose.Schema;
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
    }
}, {
    discriminatorKey : 'kind',
    toObject         : {virtuals: true},
    toJSON           : {virtuals: true},
    id               : false
});

ProductSimpleSchema.virtual('stock.qty_real').get(function () {
    return this.stock.qty - this.stock.qty_booked;
});

ProductSimpleSchema.methods.updateData = async function (data) {
    data.price.priceSort = {
        et  : data.price.et.special || data.price.et.normal,
        ati : data.price.ati.special || data.price.ati.normal
    };
    for (const attribute of data.attributes) {
        for (const lang of Object.keys(attribute.translation)) {
            const translationValues     = attribute.translation[lang];
            attribute.translation[lang] = {
                value : translationValues.value,
                name  : translationValues.name
            };
        }
    }

    reviewService.computeAverageRateAndCountReviews(data);
    const updPrd = await this.model('SimpleProduct').findOneAndUpdate({_id: this._id}, {$set: data}, {new: true});
    return updPrd;
};

ProductSimpleSchema.methods.addToCart = async function (cart, item, user, lang) {
    const prdServices = require('../../services/products');
    // On gère le stock
    // Commandable et on gère la reservation du stock
    if (global.envConfig.stockOrder.bookingStock === 'panier') {
        if (!(await prdServices.checkProductOrderable(this.stock, item.quantity)).ordering.orderable) throw NSErrors.ProductNotInStock;
        // Reza de la qte
        await prdServices.updateStock(this._id, -item.quantity);
    }
    item.type   = 'simple';
    const _cart = await this.basicAddToCart(cart, item, user, lang);
    return _cart;
};
// Permet de récupérer les champs virtuel après un lean
ProductSimpleSchema.plugin(mongooseLeanVirtuals);

module.exports = ProductSimpleSchema;