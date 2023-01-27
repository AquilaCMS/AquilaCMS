/*
 * Product    : AQUILA-CMS
 * Author     : Nextsourcia - contact@aquila-cms.com
 * Copyright  : 2023 © Nextsourcia - All rights reserved.
 * License    : Open Software License (OSL 3.0) - https://opensource.org/licenses/OSL-3.0
 * Disclaimer : Do not edit or add to this file if you wish to upgrade AQUILA CMS to newer versions in the future.
 */

const {ProductBundle} = require('../orm/models');
const NSErrors        = require('../utils/errors/NSErrors');

module.exports = function (app) {
    app.get('/v2/products/bundle/:code', getProduct);
};

async function getProduct(req, res, next) {
    try {
        const product = await ProductBundle
            .findOne({code: req.params.code})
            .populate('bundle_sections.products.id');
        if (!product) return next(NSErrors.ProductNotFound);
        res.send(product);
    } catch (err) {
        return next(err);
    }
}