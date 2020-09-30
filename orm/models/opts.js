const mongoose     = require('mongoose');
const {OptsSchema} = require('../schemas');

module.exports = mongoose.model('opts', OptsSchema);
