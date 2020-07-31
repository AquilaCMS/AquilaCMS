const mongoose = require('mongoose');
const {SetAttributesSchema} = require('../schemas');

module.exports = mongoose.model('setAttributes', SetAttributesSchema);
