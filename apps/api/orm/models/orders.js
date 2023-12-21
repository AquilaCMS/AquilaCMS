/*
 * Product    : AQUILA-CMS
 * Author     : Nextsourcia - contact@aquila-cms.com
 * Copyright  : 2023 © Nextsourcia - All rights reserved.
 * License    : Open Software License (OSL 3.0) - https://opensource.org/licenses/OSL-3.0
 * Disclaimer : Do not edit or add to this file if you wish to upgrade AQUILA CMS to newer versions in the future.
 */

const autoIncrement  = require('mongoose-plugin-autoinc-fix');
const mongoose       = require('mongoose');
const {OrdersSchema} = require('../schemas');

OrdersSchema.plugin(autoIncrement.plugin, {model: 'orders', field: 'id', startAt: 1});

module.exports = mongoose.model('orders', OrdersSchema);
