const mongoose         = require('mongoose');
const {FamiliesSchema} = require('../schemas');

module.exports = mongoose.model('families', FamiliesSchema);
