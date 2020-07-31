const mongoose = require('mongoose');
const {AdminInformationSchema} = require('../schemas');

module.exports = mongoose.model('admininformation', AdminInformationSchema);
