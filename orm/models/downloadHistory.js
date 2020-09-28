const mongoose                = require('mongoose');
const {DownloadHistorySchema} = require('../schemas');

module.exports = mongoose.model('downloadHistory', DownloadHistorySchema);