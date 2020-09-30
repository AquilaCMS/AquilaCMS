const ProductsPreview        = require('./productsPreview');
const {ProductVirtualSchema} = require('../schemas');

module.exports = ProductsPreview.discriminator('VirtualProductPreview', ProductVirtualSchema);
