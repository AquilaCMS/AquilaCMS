const mongoose     = require('mongoose');
const {NewsSchema} = require('../schemas');

module.exports = mongoose.model('news', NewsSchema);
