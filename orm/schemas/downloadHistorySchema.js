/*
 * Product    : AQUILA-CMS
 * Author     : Nextsourcia - contact@aquila-cms.com
 * Copyright  : 2023 © Nextsourcia - All rights reserved.
 * License    : Open Software License (OSL 3.0) - https://opensource.org/licenses/OSL-3.0
 * Disclaimer : Do not edit or add to this file if you wish to upgrade AQUILA CMS to newer versions in the future.
 */

const mongoose   = require('mongoose');
const Schema     = mongoose.Schema;
const {ObjectId} = Schema.Types;

const DownloadHistory = new Schema({
    user : {
        email          : {type: String, required: true},
        lastname       : {type: String, required: false},
        firstname      : {type: String, required: false},
        civility       : {type: Number, required: false},
        details        : {},
        set_attributes : {type: ObjectId, ref: 'setAttributes', index: true},
        attributes     : [{
            id          : {type: ObjectId, ref: 'attributes', index: true},
            code        : String,
            values      : String,
            param       : String,
            type        : {type: String, default: 'unset'},
            translation : {},
            position    : {type: Number, default: 1}
        }]
    },
    product : {
        code           : {type: String, required: true},
        set_attributes : {type: ObjectId, ref: 'setAttributes', index: true},
        attributes     : [{
            id          : {type: ObjectId, ref: 'attributes', index: true},
            code        : String,
            values      : String,
            param       : String,
            type        : {type: String, default: 'unset'},
            translation : {},
            position    : {type: Number, default: 1}
        }],
        type  : {type: String, required: true},
        price : {
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
        code_ean    : String,
        translation : {}
    },
    firstDownloadDate : {type: Date, default: Date.now, required: true},
    lastDownloadDate  : {type: Date, required: true},
    countDownloads    : {type: Number, default: 0, required: true}
}, {
    id : false
});

module.exports = DownloadHistory;