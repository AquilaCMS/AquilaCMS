/*
 * Product    : AQUILA-CMS
 * Author     : Nextsourcia - contact@aquila-cms.com
 * Copyright  : 2023 © Nextsourcia - All rights reserved.
 * License    : Open Software License (OSL 3.0) - https://opensource.org/licenses/OSL-3.0
 * Disclaimer : Do not edit or add to this file if you wish to upgrade AQUILA CMS to newer versions in the future.
 */

const mongoose                 = require('mongoose');
const {toET, fs, aquilaEvents} = require('aql-utils');
const ItemSchema               = require('./itemSchema');
const ItemSimpleSchema         = require('./itemSimpleSchema');
const ItemBundleSchema         = require('./itemBundleSchema');
const ItemVirtualSchema        = require('./itemVirtualSchema');
const AddressSchema            = require('./addressSchema');
const utilsDatabase            = require('../../utils/database');

const Schema     = mongoose.Schema;
const {ObjectId} = Schema.Types;
const defaultVAT = 20;

const CartSchema = new Schema({
    updated : {type: Date, default: Date.now},
    paidTax : {type: Boolean, default: true},
    status  : {type: String, enum: ['IN_PROGRESS', 'EXPIRING', 'EXPIRED'], default: 'IN_PROGRESS', index: true},
    promos  : [{
        promoId     : {type: ObjectId, ref: 'promo', required: true},
        promoCodeId : {type: ObjectId, required: true, index: true}, // L'id d'un promo.codes[i].code
        discountATI : {type: Number, default: null},
        discountET  : {type: Number, default: null},
        name        : {type: String, required: true},
        description : {type: String, required: true},
        code        : {type: String, required: true},
        gifts       : [ItemSchema],
        productsId  : [{
            productId    : {type: ObjectId, ref: 'products', required: true},
            discountATI  : {type: Number, default: null}, // Chaque produit a une discount différente car son prix est différent
            discountET   : {type: Number, default: null},
            basePriceET  : {type: Number, default: null},
            basePriceATI : {type: Number, default: null}
        }] // Si des items sont dans ce tableau alors la promo s'appliquera a ces produits
    }],
    customer : {
        id    : {type: ObjectId, ref: 'users', index: true},
        email : {type: String, index: true},
        phone : {type: String}
    },
    addresses : {
        delivery : AddressSchema,
        billing  : AddressSchema
    },
    comment  : String,
    items    : [ItemSchema],
    delivery : {
        method : {type: ObjectId, ref: 'shipments'},
        value  : {
            ati : {type: Number, default: 0},
            et  : {type: Number, default: 0},
            vat : {type: Number, default: 0}
        },
        freePriceLimit : Number,
        code           : String,
        name           : String,
        url            : String,
        date           : Date,
        dateDelivery   : {
            delayDelivery    : Number,
            unitDelivery     : String,
            delayPreparation : Number,
            unitPreparation  : String
        }
        // vatCountry     : Number
    },
    orderReceipt : {
        method : {type: String, enum: ['delivery', 'withdrawal'], default: 'delivery'},
        date   : Date
    }
}, {
    usePushEach : true,
    timestamps  : true,
    id          : false
});

CartSchema.set('toJSON', {virtuals: true});
CartSchema.set('toObject', {virtuals: true});

const itemsSchema = CartSchema.path('items');

itemsSchema.discriminator('simple', ItemSimpleSchema);
itemsSchema.discriminator('bundle', ItemBundleSchema);
itemsSchema.discriminator('virtual', ItemVirtualSchema);

CartSchema.methods.getItemsStock = async function () {
    const cart = this;
    for (let i = 0; i < cart.items.length; i++) {
        if (typeof cart.items[i].toObject === 'function') cart.items[i] = cart.items[i].toObject();
        cart.items[i].stock = await utilsDatabase.populateStockData(cart.items[i].id._id || cart.items[i].id);
    }
    return cart;
};

CartSchema.methods.calculateBasicTotal = function () {
    const cart       = this;
    const priceTotal = {et: 0, ati: 0};
    for (let i = 0, l = cart.items.length; i < l; i++) {
        const item = cart.items[i];

        if ((item.get && item.get('price.special.ati') !== undefined) || (item.price.special && item.price.special.ati)) {
            if (item.price.special === undefined || item.price.special.ati === undefined) {
                item.price.special = {
                    et  : item.id.price.et.special,
                    ati : item.id.price.ati.special * ((item.price.vat.rate / 100) + 1)
                };
            }
            priceTotal.et  += item.price.special.et * item.quantity;
            priceTotal.ati += item.price.special.ati * item.quantity;
        } else {
            priceTotal.et  += item.price.unit.et * item.quantity;
            priceTotal.ati += item.price.unit.ati * item.quantity;
        }
    }
    return priceTotal;
};

CartSchema.virtual('delivery.price').get(function () {
    const self = this;
    if (self.delivery && self.delivery.value) {
        const priceTotal    = this.calculateBasicTotal();
        const deliveryPrice = {ati: 0, et: 0};

        if (!self.delivery.freePriceLimit || priceTotal.ati < self.delivery.freePriceLimit) {
            deliveryPrice.ati = self.delivery.value.ati;
            deliveryPrice.et  = toET(self.delivery.value.ati, defaultVAT);
        }
        return deliveryPrice;
    }
});

CartSchema.virtual('additionnalFees').get(function () {
    const {et, tax} = global.aquila.envConfig.stockOrder.additionnalFees;
    return {
        ati : Number(et + (et * (tax / 100))),
        et  : Number(et),
        tax : Number(tax)
    };
});

CartSchema.virtual('priceTotal').get(function () {
    const self       = this;
    const priceTotal = this.calculateBasicTotal();
    if (self.discount && self.discount.length > 0) {
        if (self.discount[0].priceET) {
            priceTotal.et -= self.discount[0].priceET;
        }

        if (self.discount[0].priceATI) {
            priceTotal.ati -= self.discount[0].priceATI;
        }
    }
    // Si des promos s'appliquant sur certain item du panier sont disponibles
    if (self.promos && self.promos.length && self.promos[0].productsId) {
        for (let i = 0; i < self.promos[0].productsId.length; i++) {
            const promoProduct = self.promos[0].productsId[i];
            const item         = self.items.find((_item) => _item.id.id.toString() === promoProduct.productId.toString());
            if (item && priceTotal.et && priceTotal.ati) {
                priceTotal.et  -= promoProduct.discountET * item.quantity;
                priceTotal.ati -= promoProduct.discountATI * item.quantity;
            }
        }
    }
    // Permet de calculer le nouveau prix total ttc et ht en fonction des promos
    if (self.promos && self.promos.length > 0) {
        if (self.promos[0].discountATI) {
            priceTotal.ati -= self.promos[0].discountATI;
        }
        if (self.promos[0].discountET) {
            priceTotal.et -= self.promos[0].discountET;
        }
    }

    if (self.orderReceipt) {
        priceTotal.et  += self.delivery.price.et || 0;
        priceTotal.ati += self.delivery.price.ati || 0;
    }
    // ajout additional
    if (global.aquila.envConfig.stockOrder.additionnalFees) {
        const {et, tax} = global.aquila.envConfig.stockOrder.additionnalFees;
        priceTotal.ati += et + (et * (tax / 100));
        priceTotal.et  += et;
    }
    return priceTotal;
});

CartSchema.virtual('priceSubTotal').get(function () {
    const priceSubTotal = this.calculateBasicTotal();

    return priceSubTotal;
});

CartSchema.pre('save', function (next) {
    this.wasNew = this.isNew;
    next();
});

/**
 * @this mongoose.Query
 * @param {mongoose.Document} doc
 * @param {mongoose.HookNextFunction} next
 */
CartSchema.post('save', async function (doc, next) {
    if (doc.wasNew) {
        aquilaEvents.emit('aqNewCart', doc, next);
    } else {
        await updateCarts(this, doc._id, next);
    }
    next();
});

CartSchema.post('updateOne', async function (doc, next) {
    if ((doc.ok && doc.nModified === 1) || (doc.result && doc.result.ok && doc.result.nModified === 1)) {
        await updateCarts(this.getUpdate(), this.getQuery()._id, next);
    }
    next();
});

CartSchema.post('findOneAndUpdate', async function (doc, next) {
    if (doc) {
        await updateCarts(this.getUpdate(), this.getQuery()._id, next);
    }
    next();
});

// Permet d'envoyer un evenement avant que le schema cart ne soit crée
// ex: le mondule mondial-relay va écouter cet evenement afin d'ajouter au schema cart de nouveaux attributs
aquilaEvents.emit('cartSchemaInit', CartSchema);

async function updateCarts(update, id, next) {
    const {Modules} = require('../models');
    const _modules  = await Modules.find({active: true});
    for (let i = 0; i < _modules.length; i++) {
        if (await fs.hasAccess(`${global.aquila.appRoot}/modules/${_modules[i].name}/updateCart.js`)) {
            const updateCart = require(`${global.aquila.appRoot}/modules/${_modules[i].name}/updateCart.js`);
            await updateCart(update, id, next);
        }
    }
}

module.exports = CartSchema;
