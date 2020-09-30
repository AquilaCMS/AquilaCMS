const mongoose         = require('mongoose');
const {ProductsSchema} = require('../schemas');
/**
 * For preview products
 */
module.exports = mongoose.model('productsPreview', ProductsSchema);
