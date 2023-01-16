/*
 * Product    : AQUILA-CMS
 * Author     : Nextsourcia - contact@aquila-cms.com
 * Copyright  : 2022 © Nextsourcia - All rights reserved.
 * License    : Open Software License (OSL 3.0) - https://opensource.org/licenses/OSL-3.0
 * Disclaimer : Do not edit or add to this file if you wish to upgrade AQUILA CMS to newer versions in the future.
 */

const ProductsPreview               = require('./productsPreview');
const {ProductVirtualPreviewSchema} = require('../schemas');

module.exports = ProductsPreview.discriminator('virtualPreview', ProductVirtualPreviewSchema);
