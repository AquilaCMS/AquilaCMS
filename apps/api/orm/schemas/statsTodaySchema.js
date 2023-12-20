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
 * @typedef {object} StatsTodaySchema
 * @property {object[]} visit default:[]
 * @property {number} oldCart default:0
 */
const StatsTodaySchema = new Schema({
    visit   : {type: Array, default: []},
    oldCart : {type: Number, default: 0}
}, {
    id : false
});

module.exports = StatsTodaySchema;