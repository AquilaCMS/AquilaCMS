/*
 * Product    : AQUILA-CMS
 * Author     : Nextsourcia - contact@aquila-cms.com
 * Copyright  : 2023 © Nextsourcia - All rights reserved.
 * License    : Open Software License (OSL 3.0) - https://opensource.org/licenses/OSL-3.0
 * Disclaimer : Do not edit or add to this file if you wish to upgrade AQUILA CMS to newer versions in the future.
 */

const mongoose = require('mongoose');
const Schema   = mongoose.Schema;
const ObjectId = Schema.Types.ObjectId;

const ProductBundlePreviewSchema = new Schema({
    qty             : {type: Number},
    bundle_sections : [
        {
            ref         : {type: String, required: true},
            title       : {type: String},
            displayMode : {type: String, enum: ['RADIO_BUTTON', 'SELECT']}, // Ne sert que pour le type 'SINGLE'
            type        : {type: String, enum: ['SINGLE', 'MULTIPLE']},
            products    : [{
                id             : {type: ObjectId, ref: 'products'},
                isDefault      : Boolean,
                modifier_price : {
                    ati : {type: Number},
                    et  : {type: Number}
                },
                modifier_weight : {type: Number}
            }],
            isRequired : Boolean,
            minSelect  : Number,
            maxSelect  : Number
        }
    ],
    stock : {
        date_selling : Date,
        date_supply  : Date,
        orderable    : {type: Boolean, default: false},
        status       : {type: String, default: 'liv', enum: ['liv', 'dif', 'epu']},
        label        : String,
        translation  : {}
    }
}, {
    discriminatorKey : 'type',
    id               : false
});

module.exports = ProductBundlePreviewSchema;