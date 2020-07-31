const mongoose = require('mongoose');
const {NewslettersSchema} = require('../schemas');

module.exports = mongoose.model('newsletters', NewslettersSchema);
