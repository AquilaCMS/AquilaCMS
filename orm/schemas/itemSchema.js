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
    name         : String,
    code         : String,
    image        : String,
    slug         : String,
    description1 : {
        title : String,
        text  : String
    },
    description2 : {
        title : String,
        text  : String
    },
    canonical          : String,
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
    attributes : [
        {
            id          : {type: ObjectId, ref: 'attributes', index: true},
            code        : String,
            values      : String,
            param       : String,
            type        : {type: String, default: 'unset'},
            translation : {},
            position    : {type: Number, default: 1},
            visible     : {type: Boolean, default: true}
        }
    ],
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
    lang : {type: String}
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