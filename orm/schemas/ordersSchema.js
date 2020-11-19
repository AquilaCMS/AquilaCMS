const autoIncrement = require('mongoose-plugin-autoinc-fix');

const mongoose     = require('mongoose');
const aquilaEvents = require('../../utils/aquilaEvents');

const ItemSchema        = require('./itemSchema');
const ItemSimpleSchema  = require('./itemSimpleSchema');
const ItemBundleSchema  = require('./itemBundleSchema');
const ItemVirtualSchema = require('./itemVirtualSchema');

const Schema   = mongoose.Schema;
const ObjectId = Schema.ObjectId;

const OrdersSchema = new Schema({
    number : {type: String, unique: true}, // pcf : W0000001 ++
    bills  : [
        {
            billId : {type: String, ref: 'bills'},
            avoir  : {type: Boolean, default: false}
        }
    ],
    invoiceFileName : {type: String},
    lang            : {type: String}, // Permet de connaitre la langue utilisé lors de la commande
    cartId          : {type: ObjectId, ref: 'cart'},
    promos          : [
        {
            promoId     : {type: ObjectId, ref: 'promo', required: true},
            promoCodeId : {type: ObjectId, required: true}, // L'id d'un promo.codes[i].code
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
        }
    ],
    customer : {
        id       : {type: ObjectId, ref: 'users', index: true},
        email    : {type: String, required: true},
        code     : String,
        fullname : String,
        phone    : String,
        civility : {
            type : Number,
            enum : [0, 1] // 0 pour homme, 1 pour femme
        },
        phone_mobile : String,
        company      : {
            name        : String,
            siret       : String,
            intracom    : String,
            address     : String,
            postal_code : String,
            town        : String,
            country     : String,
            contact     : {
                first_name : String,
                last_name  : String,
                email      : String,
                phone      : String
            }
        },
        status   : String,
        campaign : {
            referer      : String,
            utm_campaign : String,
            utm_medium   : String,
            utm_source   : String,
            utm_content  : String,
            utm_term     : String
        },
        birthDate : Date,
        details   : {},
        type      : {type: String} // garder sous cette forme, sinon il croit qu'on définit le type de "customer"
    },
    historyStatus : [
        {
            date   : {type: Date, default: Date.now},
            status : {type: String, required: true, index: true}
        }
    ],
    status : {
        type : String,
        enum : [
            'PAYMENT_PENDING',
            'PAYMENT_RECEIPT_PENDING',
            'PAYMENT_CONFIRMATION_PENDING',
            'PAYMENT_FAILED',
            'PAID',
            'PROCESSING',
            'PROCESSED', // Préparé. A ne pas à confondre avec Finished (Traité)
            'BILLED',
            'DELIVERY_PROGRESS',
            'DELIVERY_PARTIAL_PROGRESS',
            'FINISHED',
            'CANCELED',
            'ASK_CANCEL',
            'RETURNED'
        ],
        default : 'PAYMENT_PENDING'
    },
    priceTotal : {
        vat     : {type: Number},
        ati     : {type: Number, required: true},
        et      : {type: Number},
        paidTax : Boolean
    },
    priceSubTotal : {
        ati : {default: 0, type: Number, required: true},
        et  : {default: 0, type: Number}
    },
    comment  : String,
    items    : [ItemSchema],
    discount : [
        {
            code        : {type: String},
            type        : {type: String, enum: ['PERCENT', 'PRICE', 'FREE_DELIVERY']},
            value       : {type: Number},
            description : {type: String},
            priceATI    : {type: Number, required: true} // TODO P3 : renommer en amountATI - 2X - (y a til une raison de renommer ?)
        }
    ],
    addresses : {
        delivery : {
            firstname         : String,
            lastname          : String,
            companyName       : String,
            phone             : String,
            phone_mobile      : String,
            line1             : String,
            line2             : String,
            zipcode           : String,
            city              : String,
            isoCountryCode    : String,
            country           : String,
            complementaryInfo : String
        },
        billing : {
            firstname      : String,
            lastname       : String,
            companyName    : String,
            phone          : String,
            phone_mobile   : String,
            line1          : String,
            line2          : String,
            zipcode        : String,
            city           : String,
            isoCountryCode : String,
            country        : String
        }
    },
    delivery : {
        method : {type: ObjectId, ref: 'shipments'},
        price  : {
            ati : {type: Number},
            et  : {type: Number},
            vat : {type: Number}
            // free : {type: Boolean, default: false}
        },
        // priceLimit     : {type: Boolean}
        // freePriceLimit : Number,
        code         : String,
        name         : String,
        url          : String,
        date         : Date,
        dateDelivery : {
            delayDelivery    : Number,
            unitDelivery     : String,
            delayPreparation : Number,
            unitPreparation  : String
        },
        // vatCountry     : {type: Number},
        package : [{
            date     : {type: Date, default: Date.now},
            tracking : {type: String, required: true},
            products : [{
                product_id   : {type: ObjectId, ref: 'products', required: true},
                product_code : {type: String, required: true},
                qty_shipped  : {type: Number, required: true},
                selections   : [{
                    bundle_section_ref : {type: String},
                    products           : [{type: ObjectId, ref: 'products'}]
                }]
            }]
        }]
    },
    payment : [
        {
            type          : {type: String, enum: ['DEBIT', 'CREDIT']},
            creationDate  : {type: Date, default: Date.now},
            operationDate : {type: Date},
            status        : {type: String, enum: ['TODO', 'DONE', 'CANCELED', 'FAILED']},
            mode          : {type: String, required: true},
            transactionId : String,
            amount        : Number,
            comment       : String
        }
    ],
    orderReceipt : {
        method        : {type: String, enum: ['delivery', 'withdrawal']},
        date          : Date,
        confirmedDate : Date
    },
    details : {},
    rma     : [
        {
            date     : {type: Date, default: Date.now},
            comment  : String,
            in_stock : {type: Boolean, required: true},
            refund   : {type: Number, required: true},
            products : [
                {
                    product_id   : {type: ObjectId, ref: 'products', required: true},
                    product_code : {type: String, required: true},
                    qty_returned : {type: Number, required: true},
                    selections   : [{
                        bundle_section_ref : {type: String},
                        products           : [{type: ObjectId, ref: 'products'}]
                    }]
                }
            ]
        }
    ],
    additionnalFees : {
        ati : {type: Number, default: 0},
        et  : {type: Number, default: 0},
        tax : {type: Number, default: 0}
    }
}, {usePushEach : true,
    timestamps  : true});

OrdersSchema.set('toJSON', {virtuals: true});
OrdersSchema.set('toObject', {virtuals: true});

/* OrdersSchema.virtual("delivery.date").get(function () {
    if (this.delivery.dateDelivery !== undefined && this.delivery.dateDelivery.delayPreparation && this.delivery.dateDelivery.delayPreparation) {
        const mDate = moment(new Date()).add(this.delivery.dateDelivery.delayPreparation, this.delivery.dateDelivery.unitPreparation);
        mDate.add(this.delivery.dateDelivery.delayDelivery, this.delivery.dateDelivery.unitDelivery);
        return mDate;
    }
    return null;
}); */

const docArray = OrdersSchema.path('items');

docArray.discriminator('simple', ItemSimpleSchema);
docArray.discriminator('bundle', ItemBundleSchema);
docArray.discriminator('virtual', ItemVirtualSchema);

OrdersSchema.plugin(autoIncrement.plugin, {model: 'orders', field: 'id', startAt: 1});

OrdersSchema.pre('save', function (next) {
    const s     = `0000000${this.id}`;
    this.number = `W${s.substr(s.length - 7)}`;

    // On conserve certaines valeurs pour le post middleware
    this.wasNew             = this.isNew;
    this.modifiedPathsArray = this.modifiedPaths();

    next();
});

OrdersSchema.post('save', function (doc) {
    if (doc.wasNew) {
        aquilaEvents.emit('aqNewOrder', doc);
    } else {
        aquilaEvents.emit('aqUpdateOrder', doc, doc.modifiedPathsArray);
        aquilaEvents.emit('aqUpdateStatusOrder', this._update, doc._id);
    }
});

OrdersSchema.post('updateOne', function (result) {
    if ((result.ok && result.nModified === 1) || (result.result && result.result.ok && result.result.nModified === 1)) {
        aquilaEvents.emit('aqUpdateOrder', {number: this.getQuery().number}, this.getUpdate());
        aquilaEvents.emit('aqUpdateStatusOrder', this.getUpdate(), this.getQuery()._id);
    }
});

OrdersSchema.post('findOneAndUpdate', function (result) {
    if (result) {
        aquilaEvents.emit('aqUpdateOrder', {number: result.number}, this.getUpdate());
        aquilaEvents.emit('aqUpdateStatusOrder', this.getUpdate(), result._id.toString());
    }
});

// Permet d'envoyer un evenement avant que le schema order ne soit crée
// ex: le mondule mondial-relay va écouter cet evenement afin d'ajouter au schema order de nouveaux attributs
aquilaEvents.emit('orderSchemaInit', OrdersSchema);

module.exports = OrdersSchema;