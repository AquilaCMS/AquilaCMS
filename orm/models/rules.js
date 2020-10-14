const mongoose      = require('mongoose');
const {RulesSchema} = require('../schemas');

module.exports = mongoose.model('rules', RulesSchema, 'rules');
