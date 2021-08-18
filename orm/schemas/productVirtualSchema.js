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

const ProductVirtualSchema = new Schema({
    downloadLink  : {type: String, default: null},
    downloadInfos : {type: String, default: null}
}, {
    discriminatorKey : 'kind',
    toObject         : {virtuals: true},
    toJSON           : {virtuals: true},
    id               : false
});

ProductVirtualSchema.methods.updateData = async function (data) {
    data.price.priceSort = {
        et  : data.price.et.special || data.price.et.normal,
        ati : data.price.ati.special || data.price.ati.normal
    };
    reviewService.computeAverageRateAndCountReviews(data);
    try {
        if (!data.set_options || data.set_options === '') {
            data.set_options = null;
        }
        if (!data.options) {
            data.options = [];
        }
        const updPrd = await this.model('VirtualProduct').findOneAndUpdate({_id: this._id}, {$set: data}, {new: true});
        return updPrd;
    } catch (error) {
        return error;
    }
};

ProductVirtualSchema.methods.addToCart = async function (cart, item, user, lang) {
    item.type   = 'virtual';
    const _cart = await this.basicAddToCart(cart, item, user, lang);
    return _cart;
};
// Permet de récupérer les champs virtuel après un lean
ProductVirtualSchema.plugin(mongooseLeanVirtuals);

module.exports = ProductVirtualSchema;