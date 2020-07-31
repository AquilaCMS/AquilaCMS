const mongoose = require('mongoose');
const {StatsHistorySchema} = require('../schemas');

module.exports = mongoose.model('statshistory', StatsHistorySchema);