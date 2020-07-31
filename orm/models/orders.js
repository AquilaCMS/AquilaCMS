const mongoose = require('mongoose');
const {OrdersSchema} = require('../schemas');

module.exports = mongoose.model('orders', OrdersSchema);
