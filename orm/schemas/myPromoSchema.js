// Refactoring promoSchema not finished

const mongoose   = require('mongoose');
const ItemSchema = require('./itemSchema');
const Schema     = mongoose.Schema;
const ObjectId   = mongoose.Types.ObjectId;

const PromoSchema = new Schema({
    promoId     : {type: ObjectId, ref: 'promo'},
    promoCodeId : {type: ObjectId}, // L'id d'un promo.codes[i].code
    discountATI : {type: Number, default: null},
    discountET  : {type: Number, default: null},
    name        : String,
    description : String,
    code        : String,
    gifts       : [ItemSchema],
    productsId  : [{
        productId    : {type: ObjectId, ref: 'products'},
        discountATI  : {type: Number, default: null}, // Chaque produit a une discount différente car son prix est différent
        discountET   : {type: Number, default: null},
        basePriceET  : {type: Number, default: null},
        basePriceATI : {type: Number, default: null}
    }] // Si des items sont dans ce tableau alors la promo s'appliquera a ces produits
});

module.exports = PromoSchema;