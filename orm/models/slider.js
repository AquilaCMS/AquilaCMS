const mongoose = require('mongoose');
const {SliderSchema} = require("../schemas");

module.exports = mongoose.model('slider', SliderSchema, "slider");