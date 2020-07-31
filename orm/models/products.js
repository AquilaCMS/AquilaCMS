const mongoose = require('mongoose');
const {ProductsSchema} = require('../schemas');

module.exports = mongoose.model('products', ProductsSchema);
