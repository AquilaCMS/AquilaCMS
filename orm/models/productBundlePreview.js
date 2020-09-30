const ProductsPreview       = require('./productsPreview');
const {ProductBundleSchema} = require('../schemas');

module.exports = ProductsPreview.discriminator('BundleProductPreview', ProductBundleSchema);
