const mongoose = require('mongoose');
const {MailSchema} = require("../schemas");

module.exports = mongoose.model('mail', MailSchema);
