/*
 * Product    : AQUILA-CMS
 * Author     : Nextsourcia - contact@aquila-cms.com
 * Copyright  : 2021 © Nextsourcia - All rights reserved.
 * License    : Open Software License (OSL 3.0) - https://opensource.org/licenses/OSL-3.0
 * Disclaimer : Do not edit or add to this file if you wish to upgrade AQUILA CMS to newer versions in the future.
 */

const mongoose      = require('mongoose');
const aquilaEvents  = require('../../utils/aquilaEvents');
const Schema        = mongoose.Schema;
const utilsDatabase = require('../../utils/database');

const ShipmentSchema = new Schema({
    code        : {type: String, unique: true, sparse: true},
    type        : {type: String, enum: ['DELIVERY', 'RELAY_POINT']},
    active      : {type: Boolean, default: true},
    translation : {},
    countries   : [{
        country : {type: String}, // Code territories
        delay   : {type: Number}, // Anciennement dans translation
        unit    : {type: String}, // Anciennement dans translation
        prices  : [
            {
                weight_min : {type: Number, default: 0}, // Poids min
                weight_max : {type: Number, default: 1}, // Poids max
                price      : {type: Number, default: 0} // ati ttc
            }
        ]
    }],
    url_logo    : {type: String},
    preparation : {
        delay : {type: Number, default: 1},
        unit  : {type: String, default: 'day'}
    },
    address : {
        name           : String,
        line1          : String,
        line2          : String,
        zipcode        : String,
        city           : String,
        isoCountryCode : String,
        country        : String
    },
    freePriceLimit           : Number,
    vat_rate                 : Number,
    forAllPos                : {type: Boolean, default: false},
    component_template       : String,
    component_template_front : String
}, {
    discriminatorKey : 'type',
    id               : false
});

async function preUpdates(that) {
    await utilsDatabase.checkCode('shipments', that._id, that.code);
}

ShipmentSchema.pre('updateOne', async function () {
    await preUpdates(this._update.$set ? this._update.$set : this._update);
});

ShipmentSchema.pre('findOneAndUpdate', async function () {
    await preUpdates(this._update.$set ? this._update.$set : this._update);
});

ShipmentSchema.pre('save', async function (next) {
    await preUpdates(this);
    next();
});

aquilaEvents.emit('shipmentSchemaInit', ShipmentSchema);

module.exports = ShipmentSchema;