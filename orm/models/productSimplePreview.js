const ProductsPreview              = require('./productsPreview');
const {ProductSimplePreviewSchema} = require('../schemas');

module.exports = ProductsPreview.discriminator('SimpleProductPreview', ProductSimplePreviewSchema);
