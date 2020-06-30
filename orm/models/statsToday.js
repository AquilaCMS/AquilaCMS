const mongoose = require('mongoose');
const {StatsTodaySchema} = require("../schemas");

module.exports = mongoose.model("statstoday", StatsTodaySchema);