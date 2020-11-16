const mongoose         = require('mongoose');
const {ContactsSchema} = require('../schemas');

ContactsSchema.pre('save', function (next) {
    next();
}, {timestamps: true});

module.exports = mongoose.model('contacts', ContactsSchema, 'contacts');
