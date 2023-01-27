/*
 * Product    : AQUILA-CMS
 * Author     : Nextsourcia - contact@aquila-cms.com
 * Copyright  : 2023 © Nextsourcia - All rights reserved.
 * License    : Open Software License (OSL 3.0) - https://opensource.org/licenses/OSL-3.0
 * Disclaimer : Do not edit or add to this file if you wish to upgrade AQUILA CMS to newer versions in the future.
 */

const path                   = require('path');
const Products               = require('./products');
const {ProductVirtualSchema} = require('../schemas');

ProductVirtualSchema.methods.preUpdateVirtualProduct = function (data) {
    // do things here with data
    if (data.downloadLink && !data.filename) data.filename = path.basename(data.downloadLink);
    return data;
};

module.exports = Products.discriminator('virtual', ProductVirtualSchema);
