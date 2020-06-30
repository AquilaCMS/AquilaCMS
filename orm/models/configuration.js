const mongoose = require('mongoose');
const {ConfigurationSchema} = require("../schemas");

module.exports = mongoose.model("configuration", ConfigurationSchema, "configurations");
