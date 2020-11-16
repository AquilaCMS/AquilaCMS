const mongoose         = require('mongoose');
const {ContactsSchema} = require('../schemas');

ContactsSchema.pre('save', function (next) {
    this.createdAt = Date.now();
    next();
});

module.exports = mongoose.model('contacts', ContactsSchema, 'contacts');
