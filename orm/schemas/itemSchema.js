/*
 * Product    : AQUILA-CMS
 * Author     : Nextsourcia - contact@aquila-cms.com
 * Copyright  : 2023 © Nextsourcia - All rights reserved.
 * License    : Open Software License (OSL 3.0) - https://opensource.org/licenses/OSL-3.0
 * Disclaimer : Do not edit or add to this file if you wish to upgrade AQUILA CMS to newer versions in the future.
 */

const mongoose       = require('mongoose');
const {aquilaEvents} = require('aql-utils');
const Schema         = mongoose.Schema;
const {ObjectId}     = Schema.Types;

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
    typeDisplay : {type: String, default: undefined}
}, {
    discriminatorKey : 'type',
    id               : false
});

itemsSchema.set('toJSON', {virtuals: true});
itemsSchema.set('toObject', {virtuals: true});

itemsSchema.virtual('price.total').get(function () {
    const self = this;
    let price  = self.price.unit.ati;

    if (self.price.special && self.price.special.ati !== undefined) {
        price = self.price.special.ati;
    }

    return {ati: price * self.quantity};
});

itemsSchema.virtual('stock').get(function () {
    const self = this;
    if (self.id?._id) {
        const originalPrd = self.id;
        if (self.selected_variant) {
            const variantValue = originalPrd.variants_values.find((vv) => vv._id.toString() === self.selected_variant.id.toString());
            if (variantValue) {
                return variantValue.stock;
            }
            return {};
        }
        return originalPrd.stock;
    }
    return {};
});

// Par défaut, le populate spécifique ne fait rien
itemsSchema.methods.populateItem = function () {
    return Promise.resolve();
};

aquilaEvents.emit('itemSchemaInit', itemsSchema);
module.exports = itemsSchema;