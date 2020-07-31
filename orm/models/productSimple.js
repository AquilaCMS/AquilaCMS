const Products = require('./products');
const {ProductSimpleSchema} = require('../schemas');

module.exports = Products.discriminator('SimpleProduct', ProductSimpleSchema);
