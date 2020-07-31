const mongoose = require('mongoose');
const {CartSchema} = require('../schemas');

module.exports = mongoose.model('cart', CartSchema);
