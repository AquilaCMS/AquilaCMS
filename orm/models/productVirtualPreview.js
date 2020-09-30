const ProductsPreview               = require('./productsPreview');
const {ProductVirtualPreviewSchema} = require('../schemas');

module.exports = ProductsPreview.discriminator('VirtualProductPreview', ProductVirtualPreviewSchema);
