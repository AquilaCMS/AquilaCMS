const mongoose = require('mongoose');
const {SequencesSchema} = require('../schemas');

module.exports = mongoose.model('sequences', SequencesSchema);