/*
 * Product    : AQUILA-CMS
 * Author     : Nextsourcia - contact@aquila-cms.com
 * Copyright  : 2021 © Nextsourcia - All rights reserved.
 * License    : Open Software License (OSL 3.0) - https://opensource.org/licenses/OSL-3.0
 * Disclaimer : Do not edit or add to this file if you wish to upgrade AQUILA CMS to newer versions in the future.
 */

const mongoose = require('mongoose');
const Schema   = mongoose.Schema;

const SpecialCondSchema = new Schema({
    price     : {type: Number},
    priceType : {type: String},
    supplier  : {type: String},
    startDate : {type: Number},
    endDate   : {type: Number},
    active    : {type: String},
    product   : {type: String},
    user      : {type: String}
});

SpecialCondSchema.index(
    {supplier: 1, startDate: 1, endDate: 1, product: 1, user: 1},
    {name: 'specialCond', unique: true}
);

module.exports = SpecialCondSchema;