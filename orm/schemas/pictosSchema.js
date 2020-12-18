/*
 * Product    : AQUILA-CMS
 * Author     : Nextsourcia - contact@aquila-cms.com
 * Copyright  : 2021 © Nextsourcia - All rights reserved.
 * License    : Open Software License (OSL 3.0) - https://opensource.org/licenses/OSL-3.0
 * Disclaimer : Do not edit or add to this file if you wish to upgrade AQUILA CMS to newer versions in the future.
 */

const mongoose = require('mongoose');
const Schema   = mongoose.Schema;

const PictosSchema = new Schema({
    _id           : {type: Schema.ObjectId, auto: true},
    code          : {type: String, required: true, unique: true},
    filename      : {type: String},
    title         : {type: String},
    location      : {type: String}, // Lieux d'affichage du picto sur l'image du produit...
    enabled       : {type: Boolean, default: false},
    usedInFilters : {type: Boolean, default: false}
});

module.exports = PictosSchema;