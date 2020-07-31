const mongoose = require('mongoose');
const {PaymentMethodsSchema} = require('../schemas');

module.exports = mongoose.model('paymentMethods', PaymentMethodsSchema);
