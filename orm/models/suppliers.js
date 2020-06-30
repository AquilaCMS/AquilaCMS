const mongoose = require('mongoose');
const {SuppliersSchema} = require("../schemas");

module.exports = mongoose.model('suppliers', SuppliersSchema);