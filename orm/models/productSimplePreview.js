const ProductsPreview       = require('./productsPreview');
const {ProductSimpleSchema} = require('../schemas');

module.exports = ProductsPreview.discriminator('SimpleProductPreview', ProductSimpleSchema);
