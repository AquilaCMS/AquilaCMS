const mongoose = require('mongoose');
const Schema   = mongoose.Schema;

const VariantValueSchema = new Schema({
    active        : {type: Boolean},
    default       : {type: Boolean},
    code          : {type: String},
    variant_codes : {type: String},
    qty           : Number,
    price         : {
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
    translation : {},
    weight      : Number
});

module.exports = VariantValueSchema;