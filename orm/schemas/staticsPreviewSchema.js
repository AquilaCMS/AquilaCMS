/*
 * Product    : AQUILA-CMS
 * Author     : Nextsourcia - contact@aquila-cms.com
 * Copyright  : 2023 © Nextsourcia - All rights reserved.
 * License    : Open Software License (OSL 3.0) - https://opensource.org/licenses/OSL-3.0
 * Disclaimer : Do not edit or add to this file if you wish to upgrade AQUILA CMS to newer versions in the future.
 */

const mongoose = require('mongoose');
const Schema   = mongoose.Schema;

/**
 * @typedef {StaticsSchema} StaticsPreviewSchema
 */
const StaticsPreviewSchema = new Schema({
    code        : {type: String, required: true, unique: true},
    type        : {type: String, required: true},
    active      : {type: Boolean, default: false},
    group       : {type: String, default: ''},
    // index        : {type: Boolean, default: true},
    translation : {}
}, {
    timestamps : true,
    id         : false
});

module.exports = StaticsPreviewSchema;