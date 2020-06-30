const mongoose = require('mongoose');
const {SetOptionsSchema} = require("../schemas");

module.exports = mongoose.model('setOptions', SetOptionsSchema);
