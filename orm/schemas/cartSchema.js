const mongoose          = require('mongoose');
const fs                = require('../../utils/fsp');

const ItemSchema        = require('./itemSchema');
const ItemSimpleSchema  = require('./itemSimpleSchema');
const ItemBundleSchema  = require('./itemBundleSchema');
const ItemVirtualSchema = require('./itemVirtualSchema');
const AddressSchema     = require('./addressSchema');

const utils             = require('../../utils/utils');
const utilsDatabase     = require('../../utils/database');
const aquilaEvents      = require('../../utils/aquilaEvents');
const Schema            = mongoose.Schema;
const ObjectId          = Schema.ObjectId;
const defaultVAT        = 20;

/**
 * @typedef {object} CartSchemaPromo
 * @property {string} promoId.required
 * @property {number} promoCodeId.required
 * @property {number} discountATI default:null
 * @property {string} discountET default:null
 * @property {string} name.required
 * @property {string} description.required
 * @property {string} code.required
 * @property {array<ItemSchema>} gifts
 * @property {array<CartSchemaPromoProductsId>} productsId
 */

/**
 * @typedef {object} CartSchemaPromoProductsId
 * @property {string} productId.required products ObjectId
 * @property {number} discountATI default:null
 * @property {number} discountET default:null
 * @property {number} basePriceET default:null
 * @property {number} basePriceATI default:null
 */

/**
 * @typedef {object} CartSchemaCustomer
 * @property {string} id users ObjectId
 * @property {string} email
 * @property {string} phone
 */

/**
 * @typedef {object} CartSchema
 * @property {AddressSchema} delivery
 * @property {AddressSchema} billing
 */

/**
 * @typedef {object} CartSchemaDiscount
 * @property {string} code
 * @property {string} type enum:PERCENT,PRICE,FREE_DELIVERY
 * @property {number} value
 * @property {string} description
 * @property {number} minimumATI
 * @property {boolean} onAllSite
 * @property {string} openDate Date
 * @property {string} closeDate Date
 * @property {array<string>} slugMenus
 * @property {number} priceATI.required
 */

/**
 * @typedef {object} CartSchemaDelivery
 * @property {string} method shipments ObjectId
 * @property {CartSchemaDeliveryValue} value
 * @property {number} freePriceLimit
 * @property {string} code
 * @property {string} name
 * @property {string} url
 * @property {string} date Date
 * @property {object} dateDelivery
 */

/**
 * @typedef {object} CartSchemaDeliveryDateDelivery
 * @property {number} delayDelivery
 * @property {string} unitDelivery
 * @property {number} delayPreparation
 * @property {string} unitPreparation
 */

/**
 * @typedef {object} CartSchemaDeliveryValue
 * @property {number} ati default:0
 * @property {number} et default:0
 * @property {number} vat default:0
 */

/**
 * @typedef {object} CartSchemaOrderReceipt
 * @property {string} method enum:delivery,withdrawal - default:delivery
 * @property {string} date Date
 */

/**
 * @typedef {object} CartSchema
 * @property {string} updated Date - default:Date.now
 * @property {string} paidTax default:true
 * @property {string} status default:IN_PROGRESS - enum:IN_PROGRESS,EXPIRING,EXPIRED
 * @property {array<CartSchemaPromo>} promos
 * @property {CartSchemaCustomer} customer
 * @property {string} addresses
 * @property {string} comment
 * @property {array<ItemSchema>} items
 * @property {array<CartSchemaDiscount>} discount
 * @property {string} delivery
 * @property {CartSchemaOrderReceipt} orderReceipt
 */

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
    // TODO P5 : A supprimer: discount (??)
    discount : [
        {
            code        : {type: String},
            type        : {type: String, enum: ['PERCENT', 'PRICE', 'FREE_DELIVERY']},
            value       : {type: Number},
            description : {type: String},
            minimumATI  : Number,
            onAllSite   : Boolean,
            openDate    : Date,
            closeDate   : Date,
            slugMenus   : [String],
            priceATI    : {type: Number, required: true} // TODO P3 : renommer en amountATI - 2X - (y a til une raison de renommer ?)
        }
    ],
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
}, {usePushEach: true, timestamps: true});

CartSchema.set('toJSON', {virtuals: true});
CartSchema.set('toObject', {virtuals: true});

/* CartSchema.pre('findOneAndUpdate', function () {
 this.findOneAndUpdate({},{ $set: { updated: Date.now() } });
 }); */

const itemsSchema = CartSchema.path('items');

itemsSchema.discriminator('simple', ItemSimpleSchema);
itemsSchema.discriminator('bundle', ItemBundleSchema);
itemsSchema.discriminator('virtual', ItemVirtualSchema);

CartSchema.methods.calculateBasicTotal = function () {
    const cart = this;
    const priceTotal = {et: 0, ati: 0};
    for (let i = 0, l = cart.items.length; i < l; i++) {
        const item = cart.items[i];

        if (item.get('price.special.ati') !== undefined) {
            if (item.price.special === undefined || item.price.special.ati === undefined) {
                item.price.special = {
                    et  : item.id.price.et.special,
                    ati : item.id.price.ati.special * ((item.price.vat.rate / 100) + 1)
                };
            }
            priceTotal.et += item.price.special.et * item.quantity;
            priceTotal.ati += item.price.special.ati * item.quantity;
        } else {
            priceTotal.et += item.price.unit.et * item.quantity;
            priceTotal.ati += item.price.unit.ati * item.quantity;
        }
    }
    return priceTotal;
};

CartSchema.virtual('delivery.price').get(function () {
    const self = this;
    if (self.delivery && self.delivery.value) {
        const priceTotal = this.calculateBasicTotal();
        const deliveryPrice = {ati: 0, et: 0};

        if (!self.delivery.freePriceLimit || priceTotal.ati < self.delivery.freePriceLimit) {
            deliveryPrice.ati = self.delivery.value.ati;
            deliveryPrice.et = utils.toET(self.delivery.value.ati, defaultVAT);
        }
        return deliveryPrice;
    }
});

CartSchema.virtual('additionnalFees').get(function () {
    // const self = this;
    const {et, tax} = global.envConfig.stockOrder.additionnalFees;
    return {
        ati : Number(et + (et * (tax / 100))),
        et  : Number(et),
        tax : Number(tax)
    };
});

CartSchema.virtual('priceTotal').get(function () {
    const self = this;
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
            const item = self.items.find((_item) => _item.id.id.toString() === promoProduct.productId.toString());
            if (item && priceTotal.et && priceTotal.ati) {
                priceTotal.et -= promoProduct.discountET * item.quantity;
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

    if (self.orderReceipt && self.orderReceipt.method === 'delivery') {
        priceTotal.et += self.delivery.price.et || 0;
        priceTotal.ati += self.delivery.price.ati || 0;
    }
    // ajout additional
    if (global.envConfig.stockOrder.additionnalFees) {
        const {et, tax} = global.envConfig.stockOrder.additionnalFees;
        priceTotal.ati += et + (et * (tax / 100));
        priceTotal.et += et;
    }
    return priceTotal;
});

CartSchema.virtual('priceSubTotal').get(function () {
    // const self = this;
    const priceSubTotal = this.calculateBasicTotal();

    return priceSubTotal;
});

CartSchema.pre('save', function (next) {
    this.wasNew = this.isNew;
    next();
});

CartSchema.post('save', async function (doc, next) {
    if (doc.wasNew) {
        aquilaEvents.emit('aqNewCart', doc, next);
    } else {
        await updateCarts(this._update, doc._id, next);
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
    if (doc && doc.items && doc.items.length) {
        await utilsDatabase.populateItems(doc.items);
    }
    next();
});

CartSchema.post('findOne', async function (doc, next) {
    if (doc && doc.items && doc.items.length) {
        await utilsDatabase.populateItems(doc.items);
    }
    next();
});

CartSchema.post('findById', async function (doc, next) {
    if (doc && doc.items && doc.items.length) {
        await utilsDatabase.populateItems(doc.items);
    }
    next();
});

// Permet d'envoyer un evenement avant que le schema cart ne soit crée
// ex: le mondule mondial-relay va écouter cet evenement afin d'ajouter au schema cart de nouveaux attributs
aquilaEvents.emit('cartSchemaInit', CartSchema);

async function updateCarts(update, id, next) {
    const {Modules} = require('../models');
    const _modules = await Modules.find({active: true});
    for (let i = 0; i < _modules.length; i++) {
        if (await fs.access(`${global.appRoot}/modules/${_modules[i].name}/updateCart.js`)) {
            const updateCart = require(`${global.appRoot}/modules/${_modules[i].name}/updateCart.js`);
            await updateCart(update, id, next);
        }
    }
}

module.exports = CartSchema;
