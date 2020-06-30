const mongoose = require('mongoose');
const {ContactsSchema} = require("../schemas");

ContactsSchema.pre('save', function (next) {
    this.creationDate = Date.now();
    next();
});

module.exports = mongoose.model('contacts', ContactsSchema, 'contacts');
