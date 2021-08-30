/*
 * Product    : AQUILA-CMS
 * Author     : Nextsourcia - contact@aquila-cms.com
 * Copyright  : 2021 © Nextsourcia - All rights reserved.
 * License    : Open Software License (OSL 3.0) - https://opensource.org/licenses/OSL-3.0
 * Disclaimer : Do not edit or add to this file if you wish to upgrade AQUILA CMS to newer versions in the future.
 */

const mongoose     = require('mongoose');
const aquilaEvents = require('../../utils/aquilaEvents');
const Schema       = mongoose.Schema;
const {ObjectId}   = Schema.Types;

const itemsSchema = new Schema({
    id     : {type: ObjectId, ref: 'products', required: true},
    status : {type : String,
        enum : [
            'PROCESSING',
            'DELIVERY_PROGRESS',
            'DELIVERY_PARTIAL_PROGRESS',
            'RETURNED',
            'RETURNED_PARTIAL'
        ],
        default : 'PROCESSING'
    },
    name               : String,
    code               : String,
    image              : String,
    parent             : {type: ObjectId, ref: 'products'},
    children           : [{type: ObjectId, ref: 'products'}],
    quantity           : {type: Number, required: true},
    weight             : {type: Number, default: 0},
    noRecalculatePrice : {type: Boolean, default: false},
    price              : {
        vat : {
            rate : {type: Number, required: true}
        },
        unit : {
            et  : {type: Number, required: true},
            ati : {type: Number, required: true},
            vat : {type: Number}
        },
        special : {
            et  : {type: Number},
            ati : {type: Number},
            vat : {type: Number}
        }
    },
    atts        : [],
    typeDisplay : {type: String, default: undefined},
    variants    : [{
        code        : {type: String},
        type        : {type: String, enum: ['list', 'radio', 'checkbox']},
        sort        : {type: Number},
        id          : {type: ObjectId, ref: 'attributes', index: true},
        translation : {
            /**
             *  lang: {
             *      name: String
             *  }
             */
        }
    }],
    selected_variants : [{
        code  : {type: String},
        type  : {type: String, enum: ['list', 'radio', 'checkbox']},
        sort  : {type: Number},
        id    : {type: ObjectId, ref: 'attributes', index: true},
        value : {
            active  : {type: Boolean},
            name    : {type: String},
            default : {type: Boolean},
            code    : {type: String},
            qty     : Number,
            price   : {
                purchase : Number,
                tax      : Number,
                et       : {
                    normal  : Number,
                    special : Number
                },
                ati : {
                    normal  : Number,
                    special : Number
                },
                priceSort : {
                    et  : {type: Number, default: 0},
                    ati : {type: Number, default: 0}
                }
            },
            images : [
                {
                    url              : String,
                    name             : String,
                    title            : String,
                    alt              : String,
                    position         : Number,
                    modificationDate : String,
                    default          : {type: Boolean, default: false},
                    extension        : {type: String, default: '.jpg'}
                }
            ],
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
            weight : Number
        }
    }]
}, {
    discriminatorKey : 'type',
    id               : false
});

itemsSchema.set('toJSON', {virtuals: true});
itemsSchema.set('toObject', {virtuals: true});

itemsSchema.virtual('price.total').get(function () {
    const self = this;
    // const isChildKart = self.name && self.name.indexOf("enfant") > -1;
    let price = self.price.unit.ati;

    if (self.price.special && self.price.special.ati !== undefined) {
        price = self.price.special.ati;
    }

    return {ati: price * self.quantity};
});

// Par défaut, le populate spécifique ne fait rien
itemsSchema.methods.populateItem = function () {
    return Promise.resolve();
};

aquilaEvents.emit('itemSchemaInit', itemsSchema);
module.exports = itemsSchema;