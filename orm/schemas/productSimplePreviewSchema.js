/*
 * Product    : AQUILA-CMS
 * Author     : Nextsourcia - contact@aquila-cms.com
 * Copyright  : 2023 © Nextsourcia - All rights reserved.
 * License    : Open Software License (OSL 3.0) - https://opensource.org/licenses/OSL-3.0
 * Disclaimer : Do not edit or add to this file if you wish to upgrade AQUILA CMS to newer versions in the future.
 */

const mongoose           = require('mongoose');
const Schema             = mongoose.Schema;
const ObjectId           = Schema.Types.ObjectId;
const VariantValueSchema = require('./variantValueSchema');

const ProductSimplePreviewSchema = new Schema({
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
    variants : [{
        code        : {type: String},
        type        : {type: String, enum: ['list', 'radio', 'image', 'list2']},
        sort        : {type: Number},
        id          : {type: ObjectId, ref: 'attributes', index: true},
        translation : {
            /**
             *  lang: {
             *      values: Array,
             *      name: String
             *
             */
        }
    }],
    variants_values : {type: [VariantValueSchema]}
}, {
    discriminatorKey : 'type',
    toObject         : {virtuals: true},
    toJSON           : {virtuals: true},
    id               : false
});

module.exports = ProductSimplePreviewSchema;