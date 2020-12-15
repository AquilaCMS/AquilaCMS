const mongoose         = require('mongoose');
const {ContactsSchema} = require('../schemas');

module.exports = mongoose.model('contacts', ContactsSchema, 'contacts');
