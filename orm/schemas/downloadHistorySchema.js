const mongoose = require('mongoose');
const Schema   = mongoose.Schema;
const ObjectId = Schema.ObjectId;

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
            priceSort : {type: Number, default: 0}
        },
        code_ean    : String,
        translation : {}
    },
    firstDownloadDate : {type: Date, default: Date.now, required: true},
    lastDownloadDate  : {type: Date, required: true},
    countDownloads    : {type: Number, default: 0, required: true}
});

module.exports = DownloadHistory;