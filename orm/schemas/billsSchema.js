/*
 * Product    : AQUILA-CMS
 * Author     : Nextsourcia - contact@aquila-cms.com
 * Copyright  : 2023 © Nextsourcia - All rights reserved.
 * License    : Open Software License (OSL 3.0) - https://opensource.org/licenses/OSL-3.0
 * Disclaimer : Do not edit or add to this file if you wish to upgrade AQUILA CMS to newer versions in the future.
 */

const crypto           = require('crypto');
const autoIncrement    = require('mongoose-plugin-autoinc-fix');
const mongoose         = require('mongoose');
const {aquilaEvents}   = require('aql-utils');
const ItemBundleSchema = require('./itemBundleSchema');
const ItemSchema       = require('./itemSchema');
const ItemSimpleSchema = require('./itemSimpleSchema');
const AddressSchema    = require('./addressSchema');
const Schema           = mongoose.Schema;
const {ObjectId}       = Schema.Types;

const BillsSchema = new Schema({
    order_id    : {type: ObjectId, ref: 'orders', required: true},
    facture     : {type: String, required: true},
    montant     : {type: String, required: true},
    withTaxes   : {type: Boolean, required: true},
    client      : {type: ObjectId, ref: 'users'/* , required: true */},
    nom         : {type: String, required: true},
    prenom      : {type: String, required: true},
    societe     : {type: String},
    coordonnees : {type: String},
    email       : {type: String, required: true},
    filename    : {type: String},
    paymentDate : {type: Date},
    checksum    : {type: String},
    isPaid      : {type: Boolean, required: true},
    lang        : {type: String},
    items       : [ItemSchema],
    taxes       : {},
    address     : AddressSchema,
    delivery    : {
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
    priceSubTotal   : {ati: {type: Number, default: 0}, et: {type: Number, default: 0}},
    anonymized      : {type: Boolean, default: false}
}, {
    timestamps : true,
    id         : false
});

const docArray = BillsSchema.path('items');

docArray.discriminator('simple', ItemSimpleSchema);
docArray.discriminator('bundle', ItemBundleSchema);

BillsSchema.plugin(autoIncrement.plugin, {model: 'bills', field: 'id', startAt: 1});

BillsSchema.pre('save', async function (next) {
    if (!this.facture || this.facture === '' || this.facture === 'unset') {
        const config = global.aquila.envConfig.environment;
        if (config.billsPattern && config.billsPattern !== '') {
            this.facture = config.billsPattern.replace('{year}', new Date().getFullYear())
                .replace('{numAuto}', this.id);
        } else {
            this.facture = `F_${new Date().getFullYear()}_${this.id}`;
        }
    }
    const obj     = require('../../services/bills').cleanBillObject(this.toObject());
    this.checksum = crypto.createHash('md5').update(obj, 'utf8').digest('hex');
    next();
});

aquilaEvents.emit('billsSchemaInit', BillsSchema);

module.exports = BillsSchema;