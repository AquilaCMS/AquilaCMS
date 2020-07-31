const mongoose = require('mongoose');
const {StaticsSchema} = require('../schemas');

module.exports = mongoose.model('statics', StaticsSchema);
