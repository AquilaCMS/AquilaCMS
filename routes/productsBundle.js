const {ProductBundle} = require('../orm/models');
const NSErrors        = require("../utils/errors/NSErrors");

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