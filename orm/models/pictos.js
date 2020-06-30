const mongoose = require('mongoose');
const {PictosSchema} = require("../schemas");

module.exports = mongoose.model('pictos', PictosSchema);
