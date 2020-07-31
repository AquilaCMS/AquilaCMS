const mongoose = require('mongoose');
const {ShipmentSchema} = require('../schemas');

module.exports = mongoose.model('shipments', ShipmentSchema);
