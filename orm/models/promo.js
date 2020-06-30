const mongoose = require('mongoose');
const {PromoSchema} = require("../schemas");

module.exports = mongoose.model("promo", PromoSchema);
