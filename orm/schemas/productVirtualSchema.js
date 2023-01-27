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
const Schema               = mongoose.Schema;

const ProductVirtualSchema = new Schema({
    downloadLink  : {type: String, default: null},
    downloadInfos : {type: String, default: null},
    filename      : {type: String, default: null},
    stock         : {
        qty        : {type: Number, default: 0},
        qty_booked : {type: Number, default: 0}
    }
}, {
    discriminatorKey : 'type',
    toObject         : {virtuals: true},
    toJSON           : {virtuals: true},
    id               : false
});

ProductVirtualSchema.methods.addToCart = async function (cart, item, user, lang) {
    item.type   = 'virtual';
    const _cart = await this.basicAddToCart(cart, item, user, lang);
    return _cart;
};
// Permet de récupérer les champs virtuel après un lean
ProductVirtualSchema.plugin(mongooseLeanVirtuals);

aquilaEvents.emit('productVirtualSchemaInit', ProductVirtualSchema);

module.exports = ProductVirtualSchema;