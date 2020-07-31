const mongoose = require('mongoose');
const ModulesSchema = require('../schemas/modulesSchema');

module.exports = mongoose.model('modules', ModulesSchema);
