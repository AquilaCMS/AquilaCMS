const mongoose      = require('mongoose');
const {BillsSchema} = require('../schemas');

module.exports = mongoose.model('bills', BillsSchema);
