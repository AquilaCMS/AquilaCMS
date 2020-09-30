const mongoose            = require('mongoose');
const {SpecialCondSchema} = require('../schemas');

module.exports = mongoose.model('specialCond', SpecialCondSchema);