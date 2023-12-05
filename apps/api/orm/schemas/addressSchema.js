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

const AddressSchema = new Schema({
    firstname         : {type: String, require: true},
    lastname          : {type: String, require: true},
    companyName       : {type: String},
    phone             : {type: String},
    phone_mobile      : {type: String},
    line1             : {type: String, require: true},
    line2             : {type: String},
    zipcode           : {type: String, require: true},
    city              : {type: String, require: true},
    isoCountryCode    : {type: String, require: true},
    country           : {type: String, require: true},
    complementaryInfo : {type: String},
    civility          : {type: Number, enum: [0, 1]} // 0 for man, 1 woman
}, {
    id : false
});

aquilaEvents.emit('addressSchemaInit', AddressSchema);

module.exports = AddressSchema;