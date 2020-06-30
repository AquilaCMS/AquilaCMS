const mongoose = require('mongoose');
const {TerritorySchema} = require("../schemas");

module.exports = mongoose.model("territory", TerritorySchema);
