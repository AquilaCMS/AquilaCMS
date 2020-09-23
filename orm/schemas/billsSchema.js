const crypto           = require('crypto');
const autoIncrement    = require('mongoose-plugin-autoinc-fix');
const mongoose         = require('mongoose');
const ItemBundleSchema = require('./itemBundleSchema');
const ItemSchema       = require('./itemSchema');
const ItemSimpleSchema = require('./itemSimpleSchema');
const AddressSchema    = require('./addressSchema');
const aquilaEvents     = require('../../utils/aquilaEvents');
const Schema           = mongoose.Schema;
const ObjectId         = Schema.ObjectId;

/**
 * @typedef {object} BillsSchema
 * @property {string} order_id.required order objectId
 * @property {string} facture.required
 * @property {string} montant.required
 * @property {boolean} withTaxes.required
 * @property {string} client.required users objectId
 * @property {string} nom.required
 * @property {string} prenom.required
 * @property {string} societe
 * @property {string} coordonnees
 * @property {string} email.required
 * @property {string} creationDate default:Date.now
 * @property {string} filename
 * @property {string} paymentDate
 * @property {string} checksum
 * @property {string} isPaid.required
 * @property {string} lang
 * @property {string} items
 * @property {string} taxes
 * @property {AddressSchema} address
 * @property {BillsSchemaDelivery} delivery
 * @property {BillsSchemaPromos} promos
 * @property {boolean} avoir default:false
 * @property {BillsSchemaAdditionnalFees} additionnalFees
 * @property {BillsSchemaPriceSubTotal} priceSubTotal
 */

/**
 * @typedef {object} BillsSchemaPromos
 * @property {} promoId promo ObjectId
 * @property {} promoCodeId ObjectId
 * @property {number} discountATI default:null
 * @property {number} discountET default:null
 * @property {string} name
 * @property {string} description
 * @property {string} code
 * @property {array<BillsSchemaProductsId>} productsId
 */

/**
 * @typedef {object} BillsSchemaProductsId
 * @property {number} productId products ObjectId
 * @property {number} discountATI default:null
 * @property {number} discountET default:null
 * @property {number} basePriceET default:null
 * @property {number} basePriceATI default:null
 */

/**
 * @typedef {object} BillsSchemaAdditionnalFees
 * @property {number} ati default:0
 * @property {number} et default:0
 * @property {number} tax default:0
 */

/**
 * @typedef {object} BillsSchemaPriceSubTotal
 * @property {number} ati default:0
 * @property {number} et default:0
 */

/**
 * @typedef {object} BillsSchemaDelivery
 * @property {BillsSchemaPrice} price
 * @property {string} code
 * @property {string} name
 */

/**
 * @typedef {object} BillsSchemaPrice
 * @property {number} ati
 * @property {number} et
 * @property {number} vat
 */

const BillsSchema = new Schema({
    order_id     : {type: ObjectId, ref: 'orders', required: true},
    facture      : {type: String, required: true},
    montant      : {type: String, required: true},
    withTaxes    : {type: Boolean, required: true},
    client       : {type: ObjectId, ref: 'users', required: true},
    nom          : {type: String, required: true},
    prenom       : {type: String, required: true},
    societe      : {type: String},
    coordonnees  : {type: String},
    email        : {type: String, required: true},
    creationDate : {type: Date, default: Date.now},
    filename     : {type: String},
    paymentDate  : {type: Date},
    checksum     : {type: String},
    isPaid       : {type: Boolean, required: true},
    lang         : {type: String},
    items        : [ItemSchema],
    taxes        : {},
    address      : AddressSchema,
    delivery     : {
        price : {
            ati : {type: Number},
            et  : {type: Number},
            vat : {type: Number}
        },
        code : String,
        name : String
    },
    promos : {
        promoId     : {type: ObjectId, ref: 'promo'},
        promoCodeId : {type: ObjectId}, // L'id d'un promo.codes[i].code
        discountATI : {type: Number, default: null},
        discountET  : {type: Number, default: null},
        name        : {type: String},
        description : {type: String},
        code        : {type: String},
        productsId  : [{
            productId    : {type: ObjectId, ref: 'products'},
            discountATI  : {type: Number, default: null}, // Chaque produit a une discount différente car son prix est différent
            discountET   : {type: Number, default: null},
            basePriceET  : {type: Number, default: null},
            basePriceATI : {type: Number, default: null}
        }] // Si des items sont dans ce tableau alors la promo s'appliquera a ces produits
    },
    avoir           : {type: Boolean, default: false},
    additionnalFees : {ati: {type: Number, default: 0}, et: {type: Number, default: 0}, tax: {type: Number, default: 0}},
    priceSubTotal   : {ati: {type: Number, default: 0}, et: {type: Number, default: 0}}
});

const docArray = BillsSchema.path('items');

docArray.discriminator('simple', ItemSimpleSchema);
docArray.discriminator('bundle', ItemBundleSchema);

BillsSchema.plugin(autoIncrement.plugin, {model: 'bills', field: 'id', startAt: 1});

BillsSchema.pre('save', async function (next) {
    if (!this.facture || this.facture === '' || this.facture === 'unset') {
        const config = global.envConfig.environment;
        if (config.billsPattern && config.billsPattern !== '') {
            this.facture = config.billsPattern.replace('{year}', new Date().getFullYear())
                .replace('{numAuto}', this.id);
        } else {
            this.facture = `F_${new Date().getFullYear()}_${this.id}`;
        }
    }
    const obj = require('../../services/bills').cleanBillObject(this.toObject());
    this.checksum = crypto.createHash('md5').update(obj, 'utf8').digest('hex');
    next();
});

aquilaEvents.emit('billsSchemaInit', BillsSchema);

module.exports = BillsSchema;