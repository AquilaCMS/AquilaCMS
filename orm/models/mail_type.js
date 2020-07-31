const mongoose = require('mongoose');
const {MailTypeSchema} = require('../schemas');

module.exports = mongoose.model('mailtype', MailTypeSchema);