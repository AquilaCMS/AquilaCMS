/*
 * Product    : AQUILA-CMS
 * Author     : Nextsourcia - contact@aquila-cms.com
 * Copyright  : 2021 © Nextsourcia - All rights reserved.
 * License    : Open Software License (OSL 3.0) - https://opensource.org/licenses/OSL-3.0
 * Disclaimer : Do not edit or add to this file if you wish to upgrade AQUILA CMS to newer versions in the future.
 */

const mongoose = require('mongoose');

const Schema     = mongoose.Schema;
const {ObjectId} = Schema.Types;

const NewslettersSchema = new Schema({
    _id     : {type: ObjectId, auto: true},
    email   : {type: String, required: true, unique: true},
    segment : [{
        name             : {type: String, index: true},
        optin            : {type: Boolean},
        date_subscribe   : {type: Date, default: Date.now},
        date_unsubscribe : {type: Date}
    }]
}, {
    id : false
});

module.exports = NewslettersSchema;