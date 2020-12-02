const autoIncrement  = require('mongoose-plugin-autoinc-fix');
const mongoose       = require('mongoose');
const {OrdersSchema} = require('../schemas');

OrdersSchema.plugin(autoIncrement.plugin, {model: 'orders', field: 'id', startAt: 1});

module.exports = mongoose.model('orders', OrdersSchema);
