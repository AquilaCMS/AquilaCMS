const ProductsPreview              = require('./productsPreview');
const {ProductBundlePreviewSchema} = require('../schemas');

module.exports = ProductsPreview.discriminator('BundleProductPreview', ProductBundlePreviewSchema);
