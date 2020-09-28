const mongoose           = require('mongoose');
const {TrademarksSchema} = require('../schemas');

module.exports = mongoose.model('trademarks', TrademarksSchema);
