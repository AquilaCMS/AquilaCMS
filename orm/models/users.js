const mongoose     = require('mongoose');
const {UserSchema} = require('../schemas');

module.exports = mongoose.model('users', UserSchema);
