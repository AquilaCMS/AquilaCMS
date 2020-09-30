const mongoose           = require('mongoose');
const {AttributesSchema} = require('../schemas');

module.exports = mongoose.model('attributes', AttributesSchema);
